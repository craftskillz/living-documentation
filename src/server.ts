import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { documentsRouter } from './routes/documents';
import { configRouter } from './routes/config';
import { browseRouter } from './routes/browse';
import { imagesRouter } from './routes/images';
import { filesRouter } from './routes/files';
import { diagramsRouter } from './routes/diagrams';
import { wordcloudRouter } from './routes/wordcloud';
import { annotationsRouter } from './routes/annotations';
import { metadataRouter } from './routes/metadata';
import { browseSourceRouter } from './routes/browse-source';
import { exportRouter } from './routes/export';
import { mcpRouter } from './mcp/server';
import { readConfig, writeConfig } from './lib/config';

export interface ServerOptions {
  docsPath: string;
  port: number;
  openBrowser?: boolean;
}

export async function startServer({
  docsPath,
  port,
  openBrowser = false,
}: ServerOptions): Promise<void> {
  const app = express();

  app.use(express.json({ limit: '20mb' }));

  // Persist initial state to .living-doc.json
  const existing = readConfig(docsPath);
  const initPatch: Parameters<typeof writeConfig>[1] = { docsFolder: docsPath, port };
  if (!existing.sourceRoot) {
    initPatch.sourceRoot = path.resolve(path.dirname(path.resolve(docsPath)));
  }
  writeConfig(docsPath, initPatch);

  // API
  app.use('/api/documents', documentsRouter(docsPath));
  app.use('/api/config', configRouter(docsPath));
  app.use('/api/browse', browseRouter(docsPath));
  app.use('/api/images', imagesRouter(docsPath));
  app.use('/api/files', filesRouter(docsPath));
  app.use('/api/diagrams', diagramsRouter(docsPath));
  app.use('/api/wordcloud', wordcloudRouter());
  app.use('/api/annotations', annotationsRouter(docsPath));
  app.use('/api/metadata', metadataRouter(docsPath));
  app.use('/api/browse-source', browseSourceRouter(docsPath));
  app.use('/api/export', exportRouter(docsPath));
  app.use('/mcp', mcpRouter(docsPath));

  // Static frontend assets
  const frontendPath = path.join(__dirname, 'frontend');
  app.use(express.static(frontendPath));

  // Static assets from docs folder (images, etc.)
  app.use('/images', express.static(path.join(docsPath, 'images')));
  app.use('/files', express.static(path.join(docsPath, 'files')));

  app.get('/', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'index.html')),
  );
  app.get('/admin', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'admin.html')),
  );
  app.get('/diagram', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'diagram.html')),
  );

  return new Promise((resolve) => {
    app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log('');
      console.log('  Living Documentation');
      console.log('  ─────────────────────────────────');
      console.log(`  Local:   ${url}`);
      console.log(`  Admin:   ${url}/admin`);
      console.log(`  Docs:    ${docsPath}`);
      console.log('');
      console.log('  Press Ctrl+C to stop.');
      console.log('');

      if (openBrowser) {
        openUrl(url);
      }

      resolve();
    });
  });
}

function openUrl(url: string): void {
  const platform = process.platform;
  if (platform === 'darwin') exec(`open "${url}"`);
  else if (platform === 'win32') exec(`start "" "${url}"`);
  else exec(`xdg-open "${url}"`);
}
