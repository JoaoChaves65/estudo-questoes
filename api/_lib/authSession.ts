import type { VercelRequest, VercelResponse } from '@vercel/node';
import { and, eq, gt } from 'drizzle-orm';

import { getDb } from '../../shared/db/client.js';
import * as schema from '../../shared/db/schema.js';
import {
  SESSION_DURATION_MS,
  buildClearSessionCookieHeader,
  buildSetSessionCookieHeader,
  newSessionTokenRaw,
  readSessionTokenFromRequest,
  sha256Hex,
  shouldUseSecureCookie,
} from './sessionCookie.js';

export type AuthUserRow = Pick<typeof schema.users.$inferSelect, 'id' | 'email'>;

export function tryGetDbOr503(res: VercelResponse): ReturnType<typeof getDb> | null {
  try {
    return getDb();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Base indisponível.';
    res.status(503).json({ error: msg });
    return null;
  }
}

export async function findUserBySession(req: VercelRequest): Promise<AuthUserRow | null> {
  const raw = readSessionTokenFromRequest(req.headers.cookie);
  if (!raw) {
    return null;
  }
  let db;
  try {
    db = getDb();
  } catch {
    return null;
  }

  const tokenHash = sha256Hex(raw);
  const now = new Date();
  const rows = await db
    .select({
      userId: schema.sessions.userId,
      email: schema.users.email,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, tokenHash), gt(schema.sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  return row ? { id: row.userId, email: row.email } : null;
}

export async function createSession(res: VercelResponse, req: VercelRequest, userId: string): Promise<void> {
  const db = getDb();
  const rawToken = newSessionTokenRaw();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(schema.sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  res.setHeader('Set-Cookie', buildSetSessionCookieHeader(rawToken, shouldUseSecureCookie(req)));
}

export async function destroySession(res: VercelResponse, req: VercelRequest): Promise<void> {
  const raw = readSessionTokenFromRequest(req.headers.cookie);
  if (raw) {
    try {
      const db = getDb();
      await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256Hex(raw)));
    } catch {
      /* ignore */
    }
  }
  res.setHeader('Set-Cookie', buildClearSessionCookieHeader(shouldUseSecureCookie(req)));
}
