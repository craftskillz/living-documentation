import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export function imagesRouter(docsPath: string): Router {
  const router = Router();

  // POST /api/images/upload — save a base64-encoded image to DOCS_FOLDER/images/
  router.post('/upload', (req: Request, res: Response) => {
    const { data, ext, name } = req.body as { data?: string; ext?: string; name?: string };

    if (typeof data !== 'string' || !data) {
      return res.status(400).json({ error: 'data is required' });
    }

    const safeExt = (typeof ext === 'string' ? ext.replace(/[^a-z0-9]/gi, '') : 'png').toLowerCase() || 'png';

    // Strip base64 data URL prefix if present
    const base64 = data.replace(/^data:image\/[^;]+;base64,/, '');

    const imagesDir = path.join(docsPath, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    let baseName: string;
    if (typeof name === 'string' && name.trim()) {
      baseName = name.trim().replace(/[^a-z0-9_\-]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    } else {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp =
        `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}` +
        `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const random = Math.random().toString(36).slice(2, 6);
      baseName = `image_${timestamp}_${random}`;
    }
    const filename = `${baseName}.${safeExt}`;
    const filePath = path.join(imagesDir, filename);

    try {
      fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
      res.json({ filename });
    } catch {
      res.status(500).json({ error: 'Failed to save image' });
    }
  });

  return router;
}
