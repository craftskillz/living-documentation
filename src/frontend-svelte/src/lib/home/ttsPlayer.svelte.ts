// Text-to-speech player store.
//
// Drives playback of a document: builds the reading script (engine-agnostic
// segmentation), synthesises each sentence via the server TTS endpoint, plays
// them in order with one-ahead prefetch, and highlights the current sentence
// using the CSS Custom Highlight API (no DOM mutation, so it never interferes
// with the rendered content or its re-wiring).

import {
  buildReadingScript,
  type ReadingSegment,
  type ReadingScriptOptions,
} from "./readingScript";

export type TtsStatus = "idle" | "loading" | "playing" | "paused";
export type TtsLanguage = "en" | "fr";

const HIGHLIGHT_NAME = "tts-sentence";

// Injected at runtime: the build's CSS minifier strips unknown pseudo-elements
// like `::highlight()`, so the rule cannot live in a stylesheet.
function ensureHighlightStyle(): void {
  if (typeof document === "undefined" || document.getElementById("tts-highlight-style")) return;
  const style = document.createElement("style");
  style.id = "tts-highlight-style";
  style.textContent = `::highlight(${HIGHLIGHT_NAME}){background-color:rgba(250,204,21,0.45);color:inherit;}` +
    `.dark ::highlight(${HIGHLIGHT_NAME}){background-color:rgba(250,204,21,0.35);}`;
  document.head.appendChild(style);
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
  const positions: { node: Text; offset: number }[] = [];
  let prevWasSpace = true; // drop leading whitespace (mirrors trimStart)
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const s = node.data;
    for (let i = 0; i < s.length; i++) {
      if (/\s/.test(s[i])) {
        if (!prevWasSpace) {
          positions.push({ node, offset: i });
          prevWasSpace = true;
        }
      } else {
        positions.push({ node, offset: i });
        prevWasSpace = false;
      }
    }
    node = walker.nextNode() as Text | null;
  }
  if (start >= positions.length) return null;
  const a = positions[start];
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  if (end < positions.length) {
    const b = positions[end];
    range.setEnd(b.node, b.offset);
  } else {
    const last = positions[positions.length - 1];
    range.setEnd(last.node, last.offset + 1);
  }
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

  get active(): boolean {
    return this.status === "playing" || this.status === "paused" || this.status === "loading";
  }

  async start(
    container: HTMLElement,
    options: Partial<ReadingScriptOptions> & { voice?: string; speed?: number; language?: TtsLanguage } = {},
  ): Promise<void> {
    this.stop();
    const { voice, speed, language, ...scriptOpts } = options;
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
    await this.playFrom(0, myToken);
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
    this.status = "playing";
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
      this.cache.set(i, this.fetchAudio(this.units[i].text).catch((e) => Promise.reject(e)));
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
    return this.ctx!.decodeAudioData(bytes);
  }

  pause(): void {
    if (this.status === "playing" && this.ctx) {
      void this.ctx.suspend();
      this.status = "paused";
    }
  }

  resume(): void {
    if (this.status === "paused" && this.ctx) {
      void this.ctx.resume();
      this.status = "playing";
    }
  }

  toggle(): void {
    if (this.status === "playing") this.pause();
    else if (this.status === "paused") this.resume();
  }

  stop(clearError = true): void {
    this.token++;
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source = null;
    }
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
    ensureHighlightStyle();
    this.clearHighlight();
    const supportsHighlight =
      typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

    if (supportsHighlight && !unit.whole) {
      const range = rangeForOffsets(unit.seg.el, unit.start, unit.end);
      if (range) {
        (CSS as unknown as { highlights: Map<string, Highlight> }).highlights.set(
          HIGHLIGHT_NAME,
          new Highlight(range),
        );
      } else {
        this.fallbackHighlight(unit.seg.el);
      }
    } else if (supportsHighlight) {
      const range = document.createRange();
      range.selectNodeContents(unit.seg.el);
      (CSS as unknown as { highlights: Map<string, Highlight> }).highlights.set(
        HIGHLIGHT_NAME,
        new Highlight(range),
      );
    } else {
      this.fallbackHighlight(unit.seg.el);
    }

    unit.seg.el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  private fallbackHighlight(el: HTMLElement): void {
    el.classList.add("tts-active");
    this.fallbackEl = el;
  }

  private clearHighlight(): void {
    if (typeof CSS !== "undefined" && "highlights" in CSS) {
      (CSS as unknown as { highlights: Map<string, Highlight> }).highlights.delete(HIGHLIGHT_NAME);
    }
    if (this.fallbackEl) {
      this.fallbackEl.classList.remove("tts-active");
      this.fallbackEl = null;
    }
  }
}

export const ttsPlayer = new TtsPlayer();
