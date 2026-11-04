import fs from "node:fs";
import path from "node:path";

/**
 * Library of HTML templates shipped with the application. A template carries presentation
 * only: the content always comes from the Markdown document.
 *
 * To add a template:
 *   1. write `html-templates/<id>.html` with the placeholders {{title}}, {{language}}, {{toc}}, {{content}};
 *   2. declare its id below, in a folder;
 *   3. add `htmlTemplates.template.<id>.name` and `.description` to both i18n catalogs
 *      (and `htmlTemplates.folder.<id>` for a new folder).
 */
export interface HtmlTemplateFolder {
  id: string;
  templateIds: string[];
}

export const HTML_TEMPLATE_LIBRARY: readonly HtmlTemplateFolder[] = [
  { id: "interviews", templateIds: ["interview-sheet"] },
];

// Same relative path from src/lib (dev) and dist/src/lib (build).
const TEMPLATES_DIR = path.join(__dirname, "..", "..", "html-templates");

export function readHtmlTemplate(templateId: string): string | null {
  const known = HTML_TEMPLATE_LIBRARY.some((folder) => folder.templateIds.includes(templateId));
  return known ? fs.readFileSync(path.join(TEMPLATES_DIR, `${templateId}.html`), "utf-8") : null;
}
