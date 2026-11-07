// Text-to-speech player store.
//
// Drives playback of a document: builds the reading script (engine-agnostic
// segmentation), synthesises each sentence via the server TTS endpoint, plays
// them in order with one-ahead prefetch, and highlights the current sentence
// using the CSS Custom Highlight API (no DOM mutation, so it never interferes
// with the rendered content or its re-wiring).

import {
  buildReadingScript,
  readingCharacters,
  type ReadingSegment,
  type ReadingScriptOptions,
  type ReadingStart,
} from "./readingScript";

export type TtsStatus = "idle" | "loading" | "playing" | "paused";
export type TtsLanguage = "en" | "fr";

const HIGHLIGHT_NAME = "tts-sentence";

// Injected at runtime: the build's CSS minifier strips unknown pseudo-elements
// like `::highlight()`, so the rule cannot live in a stylesheet. Injected into the
// document being read, which may be a frame (HTML view) rather than the application.
function ensureHighlightStyle(doc: Document): void {
  if (doc.getElementById("tts-highlight-style")) return;
  const style = doc.createElement("style");
  style.id = "tts-highlight-style";
  style.textContent = `::highlight(${HIGHLIGHT_NAME}){background-color:rgba(250,204,21,0.45);color:inherit;}` +
    `.dark ::highlight(${HIGHLIGHT_NAME}){background-color:rgba(250,204,21,0.35);}` +
    // Same as home.css, which a frame does not load.
    `.tts-active{background-color:rgba(250,204,21,0.35);border-radius:3px;}`;
  doc.head.appendChild(style);
}

// Highlights are registered per document: a frame has its own registry and constructor.
type HighlightWindow = Window & {
  CSS?: { highlights?: Map<string, Highlight> };
  Highlight?: new (...ranges: Range[]) => Highlight;
};

function highlightRegistry(view: HighlightWindow | null): Map<string, Highlight> | null {
  return view?.CSS?.highlights ?? null;
}

interface PlayUnit {
  seg: ReadingSegment;
  text: string;
  start: number; // sentence offset within seg (normalised text)
  end: number;
  whole: boolean; // highlight the whole element (announced widget)
}

// Maps normalised-text offsets (matching readingScript's collapsed/​trimmed
// spokenText) back to a DOM Range inside `el`, for sentence-level highlighting.
function rangeForOffsets(el: HTMLElement, start: number, end: number): Range | null {
  const positions = readingCharacters(el);
  if (start >= positions.length || end <= start) return null;
  const a = positions[start];
  const range = el.ownerDocument.createRange();
  range.setStart(a.node, a.offset);
  // End on the last spoken character, before any skipped trailing marker.
  const last = positions[Math.min(end, positions.length) - 1];
  range.setEnd(last.node, last.offset + 1);
  return range;
}

class TtsPlayer {
  status = $state<TtsStatus>("idle");
  index = $state(-1); // current unit
  total = $state(0);
  error = $state<string | null>(null);

  private units: PlayUnit[] = [];
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private cache = new Map<number, Promise<AudioBuffer>>();
  private token = 0; // invalidates async work after stop()
  private voice: string | undefined;
  private speed: number | undefined;
  private language: TtsLanguage = "en";
  private fallbackEl: HTMLElement | null = null;
  private highlightView: HighlightWindow | null = null;

  get active(): boolean {
    return this.status === "playing" || this.status === "paused" || this.status === "loading";
  }

  private get nextSectionIndex(): number {
    if (!this.active) return -1;
    const currentSegment = this.units[this.index]?.seg;
    return this.units.findIndex((unit, index) =>
      index > this.index && unit.seg.type === "heading" && unit.seg !== currentSegment,
    );
  }

  get canSkipSection(): boolean {
    return this.nextSectionIndex >= 0;
  }

  async nextSection(): Promise<void> {
    const index = this.nextSectionIndex;
    if (index < 0 || !this.ctx) return;
    // Invalidate pending synthesis/onended callbacks before stopping the source.
    const myToken = ++this.token;
    this.stopSource();
    if (this.status !== "paused") this.status = "loading";
    await this.playFrom(index, myToken);
  }

  async start(
    container: HTMLElement,
    options: Partial<ReadingScriptOptions> & {
      voice?: string;
      speed?: number;
      language?: TtsLanguage;
      from?: ReadingStart | null;
    } = {},
  ): Promise<void> {
    this.stop();
    const { voice, speed, language, from, ...scriptOpts } = options;
    this.voice = voice;
    this.speed = speed;
    this.language = language ?? "en";

    const segments = buildReadingScript(container, scriptOpts);
    this.units = segments.flatMap((seg) =>
      seg.highlightWhole
        ? [{ seg, text: seg.spokenText, start: 0, end: seg.spokenText.length, whole: true }]
        : seg.sentences.map((s) => ({ seg, text: s.text, start: s.start, end: s.end, whole: false })),
    );
    this.total = this.units.length;
    if (this.units.length === 0) return;

    this.ctx = new AudioContext();
    this.error = null;
    const myToken = ++this.token;
    this.status = "loading";
    await this.playFrom(from ? this.startAt(segments[from.segment], from.offset) : 0, myToken);
  }

  // Cuts the sentence holding the start so that speech and highlight begin there.
  private startAt(segment: ReadingSegment | undefined, offset: number): number {
    const index = this.units.findIndex((unit) => unit.seg === segment && unit.end > offset);
    if (index < 0) return 0;
    const unit = this.units[index];
    const start = Math.max(unit.start, offset);
    this.units[index] = { ...unit, start, text: unit.seg.spokenText.slice(start, unit.end) };
    return index;
  }

  private async playFrom(i: number, myToken: number): Promise<void> {
    if (myToken !== this.token) return;
    if (i >= this.units.length) {
      this.stop();
      return;
    }
    this.index = i;
    this.highlight(this.units[i]);

    let buffer: AudioBuffer;
    try {
      buffer = await this.audioFor(i);
    } catch (err) {
      if (myToken !== this.token) return;
      this.error = err instanceof Error ? err.message : String(err);
      this.stop(false);
      return;
    }
    if (myToken !== this.token || !this.ctx) return;

    this.prefetch(i + 1); // one-ahead

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);
    src.onended = () => {
      if (myToken !== this.token) return;
      this.source = null;
      void this.playFrom(i + 1, myToken);
    };
    this.source = src;
    // A jump while paused queues the new section on the suspended context.
    if (this.status !== "paused") this.status = "playing";
    src.start();
  }

  private audioFor(i: number): Promise<AudioBuffer> {
    let p = this.cache.get(i);
    if (!p) {
      p = this.fetchAudio(this.units[i].text);
      this.cache.set(i, p);
    }
    return p;
  }

  private prefetch(i: number): void {
    if (i < this.units.length && !this.cache.has(i)) {
      // A skipped prefetch may fail after navigation. Handle its rejection now;
      // the cached promise still rejects if that unit is actually played later.
      void this.audioFor(i).catch(() => {});
    }
  }

  private async fetchAudio(text: string): Promise<AudioBuffer> {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: this.voice, speed: this.speed, language: this.language }),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        msg = (await res.json()).error || msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const bytes = await res.arrayBuffer();
    return this.ctx?.decodeAudioData(bytes);
  }

  pause(): void {
    if ((this.status === "playing" || this.status === "loading") && this.ctx) {
      void this.ctx.suspend();
      this.status = "paused";
    }
  }

  resume(): void {
    if (this.status === "paused" && this.ctx) {
      void this.ctx.resume();
      this.status = this.source ? "playing" : "loading";
    }
  }

  toggle(): void {
    if (this.status === "playing" || this.status === "loading") this.pause();
    else if (this.status === "paused") this.resume();
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source = null;
    }
  }

  stop(clearError = true): void {
    this.token++;
    this.stopSource();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.cache.clear();
    this.clearHighlight();
    this.status = "idle";
    this.index = -1;
    this.total = 0;
    if (clearError) this.error = null;
  }

  // ── Highlighting ──────────────────────────────────────────────────────────
  private highlight(unit: PlayUnit): void {
    const el = unit.seg.el;
    const doc = el.ownerDocument;
    ensureHighlightStyle(doc);
    this.clearHighlight();
    const view = doc.defaultView as HighlightWindow | null;
    const registry = highlightRegistry(view);
    const HighlightCtor = view?.Highlight;

    let range: Range | null = null;
    if (registry && HighlightCtor) {
      if (unit.whole) {
        range = doc.createRange();
        range.selectNodeContents(el);
      } else {
        range = rangeForOffsets(el, unit.start, unit.end);
      }
    }
    if (registry && HighlightCtor && range) {
      registry.set(HIGHLIGHT_NAME, new HighlightCtor(range));
      this.highlightView = view;
    } else {
      this.fallbackHighlight(el);
    }

    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  private fallbackHighlight(el: HTMLElement): void {
    el.classList.add("tts-active");
    this.fallbackEl = el;
  }

  private clearHighlight(): void {
    highlightRegistry(this.highlightView)?.delete(HIGHLIGHT_NAME);
    this.highlightView = null;
    if (this.fallbackEl) {
      this.fallbackEl.classList.remove("tts-active");
      this.fallbackEl = null;
    }
  }
}

export const ttsPlayer = new TtsPlayer();
