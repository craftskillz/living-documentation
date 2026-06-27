import type {
  TtsEngine,
  TtsVoice,
  TtsLanguage,
  SynthesizeOptions,
  SynthesizedAudio,
} from "../types";
import { TtsUnsupportedLanguageError as UnsupportedLanguage } from "../types";

// Adapter for the Kokoro-82M model via the optional `kokoro-js` package.
// `kokoro-js` (transformers.js + onnxruntime-node) is an OPTIONAL dependency:
// it is imported dynamically through a computed specifier so the project still
// builds and runs when it is not installed. The model is loaded once (lazy
// singleton) on the first synthesis request.

interface KokoroModel {
  generate(
    text: string,
    opts: { voice?: string; speed?: number },
  ): Promise<{ audio: Float32Array; sampling_rate: number; toWav(): ArrayBuffer }>;
  list_voices?(): Record<string, { name?: string; language?: string }> | string[];
  voices?: Record<string, { name?: string; language?: string }>;
}

const DEFAULT_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DEFAULT_VOICE = "af_heart";
const SUPPORTED_LANGUAGES = ["en"] as const satisfies readonly TtsLanguage[];

// Native dynamic import. The project compiles to CommonJS, where `tsc` would
// down-level a plain `import()` into a `require()` and break ESM-only packages
// (kokoro-js). Routing through `new Function` keeps a real runtime `import()`.
const nativeImport = new Function("s", "return import(s)") as (
  s: string,
) => Promise<unknown>;

export interface KokoroOptions {
  model?: string;
  dtype?: "fp32" | "fp16" | "q8" | "q4";
  defaultVoice?: string;
}

export class KokoroTtsEngine implements TtsEngine {
  readonly id = "kokoro";
  readonly supportedLanguages = SUPPORTED_LANGUAGES;
  private model: KokoroModel | null = null;
  private loading: Promise<KokoroModel> | null = null;
  private readonly opts: Required<KokoroOptions>;

  constructor(opts: KokoroOptions = {}) {
    this.opts = {
      model: opts.model ?? DEFAULT_MODEL,
      dtype: opts.dtype ?? "q8",
      defaultVoice: opts.defaultVoice ?? DEFAULT_VOICE,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.loadModule();
      return true;
    } catch {
      return false;
    }
  }

  async listVoices(): Promise<TtsVoice[]> {
    const model = await this.load();
    const raw = (model.voices ??
      (typeof model.list_voices === "function" ? model.list_voices() : {})) as
      | Record<string, { name?: string; language?: string }>
      | string[];
    if (Array.isArray(raw)) {
      return raw.map((id) => ({ id, label: id, lang: "en-US" }));
    }
    return Object.entries(raw).map(([id, meta]) => ({
      id,
      label: meta?.name ?? id,
      lang: meta?.language ?? "en-US",
    }));
  }

  async synthesize(
    text: string,
    opts: SynthesizeOptions = {},
  ): Promise<SynthesizedAudio> {
    const language = opts.language ?? "en";
    if (!this.supportsLanguage(language)) {
      throw new UnsupportedLanguage(language, this.id);
    }
    const model = await this.load();
    const result = await model.generate(text, {
      voice: opts.voice ?? this.opts.defaultVoice,
      speed: opts.speed ?? 1,
    });
    return {
      audio: Buffer.from(result.toWav()),
      format: "wav",
      sampleRate: result.sampling_rate,
    };
  }

  private supportsLanguage(language: TtsLanguage): boolean {
    return (this.supportedLanguages as readonly TtsLanguage[]).includes(language);
  }

  // Native dynamic import (see `nativeImport`) — also keeps the optional package
  // out of the compiler's module-resolution graph so the build succeeds without
  // it installed.
  private async loadModule(): Promise<{
    KokoroTTS: { from_pretrained(model: string, o: object): Promise<KokoroModel> };
  }> {
    return nativeImport("kokoro-js") as Promise<{
      KokoroTTS: { from_pretrained(model: string, o: object): Promise<KokoroModel> };
    }>;
  }

  private load(): Promise<KokoroModel> {
    if (this.model) return Promise.resolve(this.model);
    if (!this.loading) {
      this.loading = this.loadModule()
        .then((mod) =>
          mod.KokoroTTS.from_pretrained(this.opts.model, {
            dtype: this.opts.dtype,
            device: "cpu",
          }),
        )
        .then((model) => {
          this.model = model;
          return model;
        })
        .catch((err) => {
          this.loading = null;
          throw err;
        });
    }
    return this.loading;
  }
}
