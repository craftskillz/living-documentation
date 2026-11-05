import net from 'node:net';
import os from 'node:os';
import { test, expect } from '../helpers/ld-fixture';

const EVIL_HOST = { Host: 'evil.example' };
const EVIL_ORIGIN = { Origin: 'http://evil.example' };

const READ_PATHS = ['/', '/admin', '/api/tree', '/api/config', '/api/blueprint/file-content?path=.env', '/images/a.png'];

for (const path of READ_PATHS) {
  test(`GET ${path} refuses a DNS rebinding page and another site`, async ({ request, ld }) => {
    expect((await request.get(`${ld.baseURL}${path}`, { headers: EVIL_HOST })).status()).toBe(403);
    expect((await request.get(`${ld.baseURL}${path}`, { headers: EVIL_ORIGIN })).status()).toBe(403);
  });
}

test('writes and /mcp refuse another site', async ({ request, ld }) => {
  const mkdir = await request.post(`${ld.baseURL}/api/browse/mkdir`, { headers: EVIL_ORIGIN, data: { path: 'x' } });
  expect(mkdir.status()).toBe(403);
  const mcp = await request.post(`${ld.baseURL}/mcp`, { headers: EVIL_ORIGIN, data: {} });
  expect(mcp.status()).toBe(403);
});

test('the application itself keeps working', async ({ request, ld }) => {
  const sameOrigin = await request.get(`${ld.baseURL}/api/tree`, { headers: { Origin: ld.baseURL } });
  expect(sameOrigin.status()).toBe(200);
  expect((await request.get(`${ld.baseURL}/`)).status()).toBe(200);
  const byIp = `http://127.0.0.1:${new URL(ld.baseURL).port}`;
  expect((await request.get(`${byIp}/api/tree`)).status()).toBe(200);
});

const lanAddress = Object.values(os.networkInterfaces())
  .flat()
  .find((candidate) => candidate && candidate.family === 'IPv4' && !candidate.internal)?.address;

test('the port is closed on the network address', async ({ ld }) => {
  test.skip(!lanAddress, 'this machine has no network address');
  const outcome = await new Promise<string>((resolve) => {
    const socket = net.connect({ host: lanAddress, port: Number(new URL(ld.baseURL).port) });
    socket.once('connect', () => {
      socket.destroy();
      resolve('open');
    });
    socket.once('error', (error: NodeJS.ErrnoException) => resolve(error.code ?? 'error'));
  });
  expect(outcome).toBe('ECONNREFUSED');
});
