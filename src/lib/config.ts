import fs from 'fs';
import path from 'path';

export interface LivingDocConfig {
  docsFolder: string;
  filenamePattern: string;
  title: string;
  theme: 'light' | 'dark' | 'system';
  port: number;
  extraFiles: string[];
}

const CONFIG_FILENAME = '.living-doc.json';

const DEFAULTS: LivingDocConfig = {
  docsFolder: '.',
  filenamePattern: 'YYYY_MM_DD_[Category]_title',
  title: 'Living Documentation',
  theme: 'system',
  port: 4321,
  extraFiles: [],
};

export function getConfigPath(docsPath: string): string {
  return path.join(docsPath, CONFIG_FILENAME);
}

export function readConfig(docsPath: string): LivingDocConfig {
  const configPath = getConfigPath(docsPath);
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<LivingDocConfig>;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // corrupt config — return defaults
  }
  return { ...DEFAULTS, docsFolder: docsPath };
}

export function writeConfig(
  docsPath: string,
  patch: Partial<LivingDocConfig>,
): LivingDocConfig {
  const current = readConfig(docsPath);
  const updated: LivingDocConfig = { ...current, ...patch };
  const configPath = getConfigPath(docsPath);
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
