// Thin ES-module wrapper around the global window.t set by /i18n.js.
// Diagram ES modules import { t } from '/diagram/t.js' to stay clean.
export const t = (key) => (typeof window.t === 'function' ? window.t(key) : key);
