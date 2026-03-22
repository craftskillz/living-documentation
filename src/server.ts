import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { documentsRouter } from './routes/documents';
import { configRouter } from './routes/config';
import { browseRouter } from './routes/browse';
import { writeConfig } from './lib/config';

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

  app.use(express.json());

  // Persist initial state to .living-doc.json
  writeConfig(docsPath, { docsFolder: docsPath, port });

  // API
  app.use('/api/documents', documentsRouter(docsPath));
  app.use('/api/config', configRouter(docsPath));
  app.use('/api/browse', browseRouter());

  // Static frontend assets
  const frontendPath = path.join(__dirname, 'frontend');
  app.use(express.static(frontendPath));

  app.get('/', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'index.html')),
  );
  app.get('/admin', (_req, res) =>
    res.sendFile(path.join(frontendPath, 'admin.html')),
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
