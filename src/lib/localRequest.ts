import type { NextFunction, Request, Response } from "express";

// The application has no authentication: it only answers this machine. Listening
// on loopback keeps the network out, but not a web page open in the local browser,
// which localOnly refuses on every route.
export const LOOPBACK_HOST = "127.0.0.1";

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

export function localOnly(req: Request, res: Response, next: NextFunction): void {
  const local = isLocalRequest({
    remoteAddress: req.socket.remoteAddress,
    host: req.headers.host,
    origin: req.headers.origin,
  });
  if (local) next();
  else res.status(403).json({ error: "not_local" });
}
