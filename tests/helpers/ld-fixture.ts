import { test as base, expect } from '@playwright/test';
import type { ChildProcess } from 'child_process';
import { setupFixture, teardownFixture, FixtureContext } from './fixture';
import { pickFreePort, spawnLD, killLD } from './server';

export interface LDContext {
  baseURL: string;
  port: number;
  docsAbs: string;
  parent: string;
}

type Options = { fixtureName: string };
type Fixtures = { ld: LDContext };

// Parametrised fixture: override fixtureName per describe via `test.use({ fixtureName: '...' })`.
export const test = base.extend<Options & Fixtures>({
  fixtureName: ['minimal', { option: true }],
  ld: async ({ fixtureName }, use) => {
    const fx: FixtureContext = await setupFixture(fixtureName);
    const port = await pickFreePort();
    let proc: ChildProcess | null = null;
    try {
      proc = await spawnLD({ cwd: fx.parent, docsArg: fx.docsArg, port });
      await use({
        baseURL: `http://localhost:${port}`,
        port,
        docsAbs: fx.docsAbs,
        parent: fx.parent,
      });
    } finally {
      if (proc) await killLD(proc);
      await teardownFixture(fx);
    }
  },
});

export { expect };
