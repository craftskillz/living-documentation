// Text-to-speech port (hexagonal architecture). The HTTP routes and the
// frontend depend only on this interface — never on a concrete engine — so the
// engine (Kokoro today, a cloud TTS tomorrow, ...) can be swapped by providing
// a new adapter and registering it in the factory.

export type TtsLanguage = "en" | "fr";

export interface TtsVoice {
  id: string; // engine-specific voice identifier, e.g. "af_heart"
  label: string; // human-readable name
  lang: string; // BCP-47-ish, e.g. "en-US"
}

export interface SynthesizeOptions {
  voice?: string; // a TtsVoice.id; engine falls back to its default when absent
  speed?: number; // 1 = normal; engines may clamp or ignore
  language?: TtsLanguage; // document language, used to select/validate voices
}

export interface SynthesizedAudio {
  audio: Buffer; // encoded audio bytes
  format: "wav" | "mp3"; // container/mime hint for the HTTP layer
  sampleRate: number;
}

export interface TtsEngine {
  readonly id: string; // stable engine id, e.g. "kokoro"
  readonly supportedLanguages: readonly TtsLanguage[];

  // True when the engine's (optional) runtime dependency is installed and the
  // model can be loaded. Lets the API return a clean 503 instead of crashing.
  isAvailable(): Promise<boolean>;

  listVoices(): Promise<TtsVoice[]>;

  synthesize(text: string, opts?: SynthesizeOptions): Promise<SynthesizedAudio>;
}

export class TtsUnsupportedLanguageError extends Error {
  constructor(
    readonly language: TtsLanguage,
    readonly engine: string,
  ) {
    super(`TTS engine ${engine} does not support language "${language}"`);
    this.name = "TtsUnsupportedLanguageError";
  }
}
