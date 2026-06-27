import { Router, Request, Response } from "express";
import {
  getTtsEngine,
  TtsUnsupportedLanguageError,
  type TtsLanguage,
} from "../lib/tts";

const MAX_TEXT_LEN = 5000; // per-request cap; the client chunks by sentence
const SUPPORTED_REQUEST_LANGUAGES = new Set<TtsLanguage>(["en", "fr"]);

function parseLanguage(language: unknown): TtsLanguage | undefined {
  if (typeof language !== "string") return undefined;
  const normalized = language.trim().toLowerCase();
  if (SUPPORTED_REQUEST_LANGUAGES.has(normalized as TtsLanguage)) return normalized as TtsLanguage;
  return undefined;
}

export function ttsRouter(): Router {
  const router = Router();

  // GET /api/tts/status → { available, engine }
  router.get("/status", async (_req, res) => {
    const engine = getTtsEngine();
    res.json({
      engine: engine.id,
      available: await engine.isAvailable(),
      supportedLanguages: engine.supportedLanguages,
    });
  });

  // GET /api/tts/voices → TtsVoice[]
  router.get("/voices", async (_req, res) => {
    const engine = getTtsEngine();
    if (!(await engine.isAvailable())) {
      res.status(503).json({ error: "TTS engine unavailable" });
      return;
    }
    try {
      res.json(await engine.listVoices());
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/tts  { text, voice?, speed?, language? } → audio bytes
  router.post("/", async (req: Request, res: Response) => {
    const { text, voice, speed, language } = req.body as {
      text?: string;
      voice?: string;
      speed?: number;
      language?: string;
    };
    if (!text || typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    if (text.length > MAX_TEXT_LEN) {
      res.status(413).json({ error: `text too long (max ${MAX_TEXT_LEN} chars)` });
      return;
    }

    const parsedLanguage = parseLanguage(language);
    if (language !== undefined && !parsedLanguage) {
      res.status(400).json({ error: "language must be en or fr" });
      return;
    }

    const engine = getTtsEngine();
    if (!(await engine.isAvailable())) {
      res.status(503).json({
        error:
          "TTS engine unavailable — install the optional dependency (npm install kokoro-js).",
      });
      return;
    }

    try {
      const out = await engine.synthesize(text, {
        voice: typeof voice === "string" ? voice : undefined,
        speed: typeof speed === "number" ? speed : undefined,
        language: parsedLanguage ?? "en",
      });
      res.setHeader("Content-Type", out.format === "wav" ? "audio/wav" : "audio/mpeg");
      res.setHeader("X-Tts-Sample-Rate", String(out.sampleRate));
      res.send(out.audio);
    } catch (err) {
      if (err instanceof TtsUnsupportedLanguageError) {
        res.status(422).json({
          error: `TTS engine ${err.engine} does not support ${err.language} documents yet.`,
        });
        return;
      }
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
