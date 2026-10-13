// Pure helper shared by the server and the frontend (no Node imports).

const DIACRITICS = /[̀-ͯ]/g;
const DEFAULT_SLUG = "document";

/** File stem for a new document: "Mon guide" → "mon-guide". */
export function docSlug(title: string): string {
  return (title || "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || DEFAULT_SLUG;
}
