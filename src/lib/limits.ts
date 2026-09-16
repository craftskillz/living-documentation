// Shared upload limits — single source of truth for both the Express backend
// and the Svelte frontend (Vite bundles this .ts directly, like lib/folderName).
//
// Uploads transit as base64 inside a JSON body (express.json), so the raw
// request body is ~1.33x the file size. The Express body limit therefore has
// to be derived from this value WITH that inflation, or large uploads get
// rejected by the body parser before the app's own check runs.

/** Maximum size, in bytes, of a file a user can upload to a document. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB

/** Human-readable megabytes, for UI/error messages. */
export const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);

/**
 * Express `json({ limit })` bound in bytes. Accounts for base64 inflation
 * (+33%) plus JSON wrapper/margin so a MAX_UPLOAD_BYTES file always fits.
 */
export const JSON_BODY_LIMIT_BYTES = Math.ceil(MAX_UPLOAD_BYTES * 1.4);
