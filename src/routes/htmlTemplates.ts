import { Router, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { renderMarkdownWithCompareBlocks } from "../lib/compareBlock";
import { readConfig } from "../lib/config";
import { getDocumentLanguage } from "../lib/documentLanguage";
import { isAllowedExtraFile } from "../lib/extraFiles";
import { fillHtmlTemplate, structureHtml } from "../lib/htmlDocument";
import { getDocumentHtmlTemplate } from "../lib/htmlTemplateField";
import { HTML_TEMPLATE_LIBRARY, readHtmlTemplate } from "../lib/htmlTemplates";
import { parseDocMetadata } from "../lib/parser";
import { safeFilePath, stripFrontmatter } from "./documents";

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

// A document can embed raw HTML and this page lives on the application's origin: no script runs.
const GENERATED_PAGE_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; base-uri 'none'; form-action 'none'";

function resolveDocFile(docsPath: string, id: string, extraFiles: string[]): string | null {
  if (path.isAbsolute(id)) {
    const filePath = `${id}.md`;
    return isAllowedExtraFile(extraFiles, filePath) ? filePath : null;
  }
  return safeFilePath(docsPath, `${id}.md`);
}

export function htmlTemplatesRouter(docsPath: string): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    res.json({ folders: HTML_TEMPLATE_LIBRARY });
  });

  router.get("/render", (req: Request, res: Response) => {
    // Document ids are themselves URI-encoded.
    const id = typeof req.query.doc === "string" ? decodeURIComponent(req.query.doc) : "";
    const { extraFiles = [], markdownSoftBreaks } = readConfig(docsPath);
    const filePath = resolveDocFile(docsPath, id, extraFiles);
    if (!filePath) return res.status(HTTP_FORBIDDEN).type("text/plain").send("Access denied");
    if (!fs.existsSync(filePath)) return res.status(HTTP_NOT_FOUND).type("text/plain").send("Document not found");

    const source = fs.readFileSync(filePath, "utf-8");
    const templateId = getDocumentHtmlTemplate(source);
    const template = templateId ? readHtmlTemplate(templateId) : null;
    if (!template) return res.status(HTTP_NOT_FOUND).type("text/plain").send("HTML template not found");

    const html = renderMarkdownWithCompareBlocks(stripFrontmatter(source), { breaks: !!markdownSoftBreaks }, { tagMarkers: true });
    const { title } = parseDocMetadata(path.basename(filePath), source);
    const page = fillHtmlTemplate(template, {
      ...structureHtml(html, title),
      language: getDocumentLanguage(source) ?? "",
    });
    res.set("Content-Security-Policy", GENERATED_PAGE_CSP).set("Cache-Control", "no-store").type("html").send(page);
  });

  return router;
}
