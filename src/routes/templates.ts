import { Router, type Request, type Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import {
  readTemplateLibrary, writeTemplateLibrary, templateName, templateContent,
  getTemplateFolder, ensureUniqueTemplateName, TemplateError, type TemplateLibrary,
} from '../lib/documentTemplates';

export function templatesRouter(docsPath: string): Router {
  const router = Router();
  const action = (mutate: boolean, handler: (library: TemplateLibrary, req: Request) => unknown) =>
    (req: Request, res: Response) => {
      try {
        const library = readTemplateLibrary(docsPath);
        const revision = (value: TemplateLibrary) => `"${createHash('sha256').update(JSON.stringify(value)).digest('hex')}"`;
        if (mutate && req.headers['if-match'] && req.headers['if-match'] !== revision(library)) {
          throw new TemplateError(409, 'conflict');
        }
        const result = handler(library, req);
        if (mutate) writeTemplateLibrary(docsPath, library);
        res.setHeader('ETag', revision(library));
        res.json(result);
      } catch (error) {
        res.status(error instanceof TemplateError ? error.status : 500).json({
          error: error instanceof TemplateError ? error.message : 'storage_error',
        });
      }
    };
  router.get('/', action(false, (library) => library));
  router.post('/folders', action(true, (library, req) => {
    const name = templateName(req.body?.name);
    ensureUniqueTemplateName(library.folders, name);
    const folder = { id: randomUUID(), name, templates: [] };
    library.folders.push(folder);
    return folder;
  }));
  router.put('/folders/:id', action(true, (library, req) => {
    const folder = getTemplateFolder(library, String(req.params.id));
    const name = templateName(req.body?.name);
    ensureUniqueTemplateName(library.folders, name, folder.id);
    folder.name = name;
    return folder;
  }));
  router.delete('/folders/:id', action(true, (library, req) => {
    const folder = getTemplateFolder(library, String(req.params.id));
    if (folder.templates.length && req.query.confirm !== 'true') throw new TemplateError(409, 'folder_not_empty');
    library.folders = library.folders.filter((item) => item !== folder);
    return { success: true };
  }));
  router.post('/folders/:id/templates', action(true, (library, req) => {
    const folder = getTemplateFolder(library, String(req.params.id));
    const name = templateName(req.body?.name);
    ensureUniqueTemplateName(folder.templates, name);
    const template = { id: randomUUID(), name, content: templateContent(req.body?.content) };
    folder.templates.push(template);
    return template;
  }));
  router.put('/:id', action(true, (library, req) => {
    const folder = library.folders.find((item) => item.templates.some((template) => template.id === req.params.id));
    if (!folder) throw new TemplateError(404, 'template_not_found');
    const template = folder.templates.find((item) => item.id === req.params.id);
    if (!template) throw new TemplateError(404, 'template_not_found');
    const name = templateName(req.body?.name);
    const destination = req.body?.folderId === undefined ? folder : getTemplateFolder(library, req.body.folderId);
    ensureUniqueTemplateName(destination.templates, name, template.id);
    const content = templateContent(req.body?.content);
    if (destination !== folder) {
      folder.templates = folder.templates.filter((item) => item.id !== template.id);
      destination.templates.push(template);
    }
    template.name = name;
    template.content = content;
    return template;
  }));
  router.delete('/:id', action(true, (library, req) => {
    const folder = library.folders.find((item) => item.templates.some((template) => template.id === req.params.id));
    if (!folder) throw new TemplateError(404, 'template_not_found');
    folder.templates = folder.templates.filter((item) => item.id !== req.params.id);
    return { success: true };
  }));
  return router;
}
