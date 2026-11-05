// The server listens on every interface and has no authentication. Routes that
// expose or launch arbitrary files only answer the browser of this machine.
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export interface RequestOrigin {
  remoteAddress?: string;
  host?: string;
  origin?: string;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * True for a loopback connection whose Host names loopback (a DNS rebinding page
 * reaches the socket under its own hostname) and whose Origin, when the browser
 * sends one, is that same host (any other site or local app is refused).
 */
export function isLocalRequest({ remoteAddress, host, origin }: RequestOrigin): boolean {
  if (!remoteAddress || !LOOPBACK_ADDRESSES.has(remoteAddress) || !host) return false;
  const target = parseUrl(`http://${host}`);
  if (!target || !LOOPBACK_HOSTNAMES.has(target.hostname)) return false;
  return origin === undefined || parseUrl(origin)?.host === target.host;
}
