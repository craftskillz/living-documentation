import { t } from '../i18n.svelte';
export interface DocumentTemplate { id: string; name: string; content: string }
export interface TemplateFolder { id: string; name: string; templates: DocumentTemplate[] }
export interface TemplateLibrary { version: 1; folders: TemplateFolder[] }
export async function templatesRequest<T>(route = '', method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(`/api/templates${route}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(t(`templates.errors.${result.error || 'storage_error'}`));
  return result;
}
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return { destroy() { node.remove(); } };
}
