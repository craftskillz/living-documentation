export interface DocSummary {
  id: string;
  title: string;
  folder?: string[];
  filename?: string;
  formattedDate?: string;
}

export interface DocDetail {
  id: string;
  title: string;
  folder?: string[];
  content: string;
  html: string;
  formattedDate?: string;
  // OKF frontmatter fields exposed by GET /api/documents/:id.
  tags?: string[];
  type?: string;
  /** Reserved file (index.md, log.md, liv-doc-main.md): read-only. */
  reserved?: boolean;
}

/** Node of the ordered explorer tree served by GET /api/tree. */
export interface ExplorerNode {
  /** `file`: non-Markdown file, shown greyed with the hidden entries; opened on click, never dragged or renamed. */
  kind: "folder" | "doc" | "file";
  name: string;
  /** POSIX path relative to the docs folder. */
  path: string;
  /** Document id (docs only). */
  id?: string;
  /** Listed in the parent manifest `hidden`. */
  hidden?: boolean;
  /** Reserved file (index.md, log.md, liv-doc-main.md), shown with the hidden entries, read-only. */
  reserved?: boolean;
  /** Symlink to a Markdown file (linked AI instruction file): listed, never dragged, renamed or hidden. */
  linked?: boolean;
  /** Admin "Extra Files" entry outside the docs folder (or their group): never dragged, renamed or hidden. */
  extra?: boolean;
  children?: ExplorerNode[];
}

export interface TableAttrs {
  style: string | null;
  border: string | null;
  color: string | null;
}

/** Answer of GET /api/other-files/content. */
export interface OtherFilePreview {
  type: "text" | "image" | "video" | "binary";
  content?: string;
  language?: string;
  truncated?: boolean;
  url?: string;
}

/** Non-Markdown file shown in the central area in place of the document. */
export interface OpenedFile {
  path: string;
  name: string;
  preview: OtherFilePreview;
}
