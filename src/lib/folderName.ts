const DIACRITICS = /[\u0300-\u036f]/g;
const UNSAFE_FOLDER_CHARS = /[^a-zA-Z0-9_.-]+/g;

export function normalizeFolderSegment(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .trim()
    .replace(UNSAFE_FOLDER_CHARS, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeFolderPath(value: string): string {
  return (value || "")
    .split("/")
    .map((segment) => normalizeFolderSegment(segment))
    .filter(Boolean)
    .join("/");
}
