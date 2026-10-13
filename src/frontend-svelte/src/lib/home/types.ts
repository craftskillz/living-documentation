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
}

/** Node of the ordered explorer tree served by GET /api/tree. */
export interface ExplorerNode {
  kind: "folder" | "doc";
  name: string;
  /** POSIX path relative to the docs folder. */
  path: string;
  /** Document id (docs only). */
  id?: string;
  /** Listed in the parent manifest `hidden`. */
  hidden?: boolean;
  children?: ExplorerNode[];
}

export interface TableAttrs {
  style: string | null;
  border: string | null;
  color: string | null;
}
