import { t } from '../i18n.svelte';
export interface DocumentTemplate { id: string; name: string; content: string }
export interface TemplateFolder { id: string; name: string; templates: DocumentTemplate[] }
export interface TemplateLibrary { version: 1; folders: TemplateFolder[] }
export function createTemplatesClient() {
  let revision = '';
  return async function request<T>(route = '', method = 'GET', data?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`/api/templates${route}`, {
        method, headers: { 'Content-Type': 'application/json', ...(method !== 'GET' && revision ? { 'If-Match': revision } : {}) },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
    } catch { throw new Error(t('templates.errors.network')); }
    let result: unknown;
    try { result = await response.json(); }
    catch { throw new Error(t('templates.errors.storage_error')); }
    if (!response.ok) {
      const code = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : 'storage_error';
      const key = `templates.errors.${code}`;
      const translated = t(key);
      throw new Error(translated === key ? t('templates.errors.storage_error') : translated);
    }
    revision = response.headers.get('ETag') || '';
    return result as T;
  };
}
// Short-lived read/creation flows have no shared revision state.
export async function templatesRequest<T>(route = '', method = 'GET', data?: unknown): Promise<T> {
  return createTemplatesClient()<T>(route, method, data);
}
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return { destroy() { node.remove(); } };
}
