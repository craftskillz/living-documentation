// ── Image upload helper ───────────────────────────────────────────────────────
// Converts a File or Blob to base64 and uploads it via POST /api/images/upload.
// Returns the absolute URL path usable in an <img> or ctx.drawImage(), e.g. "/images/foo.png".

async function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function uploadImageFile(file) {
  const ext    = (file.name.split('.').pop() || 'png').toLowerCase();
  const base64 = await toBase64(file);
  return _upload(base64, ext);
}

export async function uploadImageBlob(blob, ext = 'png') {
  const base64 = await toBase64(blob);
  return _upload(base64, ext);
}

async function _upload(base64, ext) {
  const res  = await fetch('/api/images/upload', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ data: base64, ext }),
  });
  if (!res.ok) throw new Error('Upload failed');
  const { filename } = await res.json();
  return `/images/${filename}`;
}
