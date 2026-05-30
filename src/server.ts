import express from 'express';
import type { Server } from 'http';
import path from 'path';
import { exec } from 'child_process';
import { documentsRouter } from './routes/documents';
import { configRouter } from './routes/config';
import { browseRouter } from './routes/browse';
import { imagesRouter } from './routes/images';
import { filesRouter } from './routes/files';
import { diagramsRouter } from './routes/diagrams';
import { shapeLibrariesRouter } from './routes/shape-libraries';
import { wordcloudRouter } from './routes/wordcloud';
import { annotationsRouter } from './routes/annotations';
import { metadataRouter } from './routes/metadata';
import { browseSourceRouter } from './routes/browse-source';
import { exportRouter } from './routes/export';
import { contextRouter } from './routes/context';
import { workspaceRouter } from './routes/workspace';
import { mcpRouter } from './mcp/server';
import { writeConfig } from './lib/config';

const activeServers = new Set<Server>();

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

  // Persist port to .living-doc.json; readAndMigrate runs here and strips any legacy absolute paths.
  writeConfig(docsPath, { port });

  // API
  app.use('/api/documents', documentsRouter(docsPath));
  app.use('/api/config', configRouter(docsPath));
  app.use('/api/browse', browseRouter(docsPath));
  app.use('/api/images', imagesRouter(docsPath));
  app.use('/api/files', filesRouter(docsPath));
  app.use('/api/diagrams', diagramsRouter(docsPath));
  app.use('/api/shape-libraries', shapeLibrariesRouter(docsPath));
  app.use('/api/wordcloud', wordcloudRouter());
  app.use('/api/annotations', annotationsRouter(docsPath));
  app.use('/api/metadata', metadataRouter(docsPath));
  app.use('/api/browse-source', browseSourceRouter(docsPath));
  app.use('/api/export', exportRouter(docsPath));
  app.use('/api/context', contextRouter(docsPath));
  app.use('/api/workspace', workspaceRouter(docsPath));
  app.use('/mcp', mcpRouter(docsPath));

  // Static frontend assets
  // dotfiles: 'allow' so the npx cache (~/.npm/_npx/...) doesn't trip send's
  // dotfile guard on the .npm path segment and 404 every asset.
  const frontendPath = path.join(__dirname, 'frontend');
  app.get('/workspace', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'workspace', 'index.html'), { dotfiles: 'allow' }),
  );
  app.use(express.static(frontendPath, { dotfiles: 'allow' }));

  // Static assets from docs folder (images, etc.)
  app.use('/images', express.static(path.join(docsPath, 'images'), { dotfiles: 'allow' }));
  app.use('/files', express.static(path.join(docsPath, 'files'), { dotfiles: 'allow' }));

  app.get('/', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'index.html'), { dotfiles: 'allow' }),
  );
  app.get('/admin', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'admin.html'), { dotfiles: 'allow' }),
  );
  app.get('/diagram', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'diagram.html'), { dotfiles: 'allow' }),
  );
  app.get('/shape-editor', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'shape-editor.html'), { dotfiles: 'allow' }),
  );
  app.get('/context', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'context.html'), { dotfiles: 'allow' }),
  );

  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    server.once('error', (error) => {
      reject(error);
    });
    server.once('listening', () => {
      activeServers.add(server);
      server.once('close', () => activeServers.delete(server));
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
