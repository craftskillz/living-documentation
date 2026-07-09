export interface DocSummary {
  id: string;
  title: string;
  category: string;
  folder?: string[];
  filename?: string;
  formattedDate?: string;
}

export interface DocDetail {
  id: string;
  title: string;
  category: string;
  folder?: string[];
  content: string;
  html: string;
  formattedDate?: string;
  // OKF frontmatter fields exposed by GET /api/documents/:id.
  tags?: string[];
  type?: string;
}

export interface TreeNode {
  categories: Record<string, DocSummary[]>;
  children: Record<string, TreeNode>;
}

export interface TableAttrs {
  style: string | null;
  border: string | null;
  color: string | null;
}
