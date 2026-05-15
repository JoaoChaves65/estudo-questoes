import { createHash, randomBytes } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

const COOKIE_NAME = 'estudo_questoes_session';
const SESSION_BYTES = 32;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export { COOKIE_NAME, SESSION_DURATION_MS };

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function newSessionTokenRaw(): string {
  return randomBytes(SESSION_BYTES).toString('hex');
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) {
    return out;
  }
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = part.slice(0, eq).trim();
    let val = part.slice(eq + 1).trim();
    try {
      val = decodeURIComponent(val);
    } catch {
      /* keep raw */
    }
    out[key] = val;
  }
  return out;
}

export function readSessionTokenFromRequest(cookieHeader: string | undefined): string | undefined {
  const cookies = parseCookies(cookieHeader);
  const raw = cookies[COOKIE_NAME];
  return raw?.trim() || undefined;
}

export function buildSetSessionCookieHeader(rawToken: string, useSecure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
  ];
  if (useSecure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearSessionCookieHeader(useSecure: boolean): string {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (useSecure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function shouldUseSecureCookie(req: { headers?: IncomingHttpHeaders }): boolean {
  const raw = req.headers?.['x-forwarded-proto'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === 'https';
}
