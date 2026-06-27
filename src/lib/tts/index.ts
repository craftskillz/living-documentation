import type { TtsEngine } from "./types";
import { KokoroTtsEngine } from "./adapters/kokoro";

export type {
  TtsEngine,
  TtsLanguage,
  TtsVoice,
  SynthesizeOptions,
  SynthesizedAudio,
} from "./types";
export { TtsUnsupportedLanguageError } from "./types";

// Engine selection lives here so callers stay behind the TtsEngine port.
export type TtsEngineId = "kokoro";

function createEngine(id: TtsEngineId): TtsEngine {
  switch (id) {
    case "kokoro":
    default:
      return new KokoroTtsEngine();
  }
}

function selectedEngineId(): TtsEngineId {
  const fromEnv = process.env.LD_TTS_ENGINE;
  if (fromEnv === "kokoro") return fromEnv;
  return "kokoro";
}

let engine: TtsEngine | null = null;

// Process-wide singleton: the model is heavy, so we keep one engine (and thus
// one loaded model) for the lifetime of the server.
export function getTtsEngine(): TtsEngine {
  if (!engine) engine = createEngine(selectedEngineId());
  return engine;
}
