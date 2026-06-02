const STATUS_LINE_RE = /^(\s*(?:\*\*status:\*\*|status:)\s*).+?\s*$/im;

export function getDocStatus(content: string): string | null {
  if (typeof content !== "string") return null;
  const fence = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fence) return null;
  const m = fence[1].match(/^\s*(?:\*\*status:\*\*|status:)\s*(.+?)\s*$/im);
  return m ? m[1].trim() : null;
}

export function replaceStatus(content: string, newStatus: string): string {
  return content.replace(STATUS_LINE_RE, `$1${newStatus}`);
}

export function isWorklogDocument(docId: string): boolean {
  return /%5BWORKLOG%5D/i.test(docId);
}
