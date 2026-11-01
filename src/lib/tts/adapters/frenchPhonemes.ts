// Kokoro v1 expects eSpeak IPA, with compound phones mapped to its vocabulary.
// Reference: https://github.com/hexgrad/misaki/blob/main/misaki/espeak.py
// phonemizer (used by kokoro-js for English) only ships English language data.
// Keep this multilingual runtime lazy and optional, like Kokoro itself.
interface EspeakWorker {
  set_voice(voice: string): number;
  synthesize_ipa(text: string): { ipa: string };
}

const nativeImport = new Function("s", "return import(s)") as (
  s: string,
) => Promise<{ default(): Promise<{ eSpeakNGWorker: new () => EspeakWorker }> }>;

let loading: Promise<EspeakWorker> | null = null;

function loadWorker(): Promise<EspeakWorker> {
  if (!loading) {
    loading = nativeImport("@echogarden/espeak-ng-emscripten")
      .then((module) => module.default())
      .then((module) => {
        const worker = new module.eSpeakNGWorker();
        // This eSpeak build names French (France) "fr", not "fr-fr".
        if (worker.set_voice("fr") !== 0) {
          throw new Error("The French eSpeak voice could not be loaded.");
        }
        return worker;
      })
      .catch((error: unknown) => {
        loading = null;
        throw new Error(
          "French TTS requires @echogarden/espeak-ng-emscripten. " +
          "Install the optional dependencies with npm install --include=optional.",
          { cause: error },
        );
      });
  }
  return loading;
}

const COMPOUND_PHONES: Record<string, string> = {
  "aɪ": "I", "aʊ": "W", "dz": "ʣ", "dʒ": "ʤ", "eɪ": "A",
  "oʊ": "O", "əʊ": "Q", "ss": "S", "ts": "ʦ", "tʃ": "ʧ", "ɔɪ": "Y",
};

function normalizePhones(ipa: string): string {
  return ipa
    // Strip eSpeak language-switch flags, but retain stress and French nasals.
    .replace(/\([a-z]+(?:-[a-z]+)*\)/g, "")
    .split("_")
    .map((phone) => phone.replace(/aɪ|aʊ|dz|dʒ|eɪ|oʊ|əʊ|ss|ts|tʃ|ɔɪ/g,
      (compound) => COMPOUND_PHONES[compound]))
    .join("")
    .replace(/[-^]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function phonemizeFrench(text: string): Promise<string> {
  const worker = await loadWorker();
  // eSpeak's IPA output drops punctuation. Preserve it for Kokoro's prosody,
  // leaving decimal separators within numbers for eSpeak to read in French.
  const parts = text.split(/([;:!?…—"«»()[\]{}]+|(?<!\d)[,.]|[,.](?!\d))/u);
  return parts.map((part, index) => {
    if (index % 2 === 1) return part;
    if (!part.trim()) return part;
    const leadingSpace = /^\s/.test(part) ? " " : "";
    const trailingSpace = /\s$/.test(part) ? " " : "";
    return leadingSpace + normalizePhones(worker.synthesize_ipa(part.trim()).ipa) + trailingSpace;
  }).join("").trim();
}
