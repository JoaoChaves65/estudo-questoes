import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import * as schema from '../../shared/db/schema.js';
import { normalizeLoginIdentifier, validateLoginIdentifierNormalized } from '../../shared/authIdentifier.js';
import { createSession, tryGetDbOr503 } from '../_lib/authSession.js';

function parseJsonBody(req: VercelRequest): unknown {
  const raw = req.body;
  if (raw == null) {
    return undefined;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }
  return raw;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').json({ error: 'Method not allowed' });
    return;
  }

  const db = tryGetDbOr503(res);
  if (!db) {
    return;
  }

  const body = parseJsonBody(req) as { email?: unknown; password?: unknown } | undefined;
  const idRaw = typeof body?.email === 'string' ? normalizeLoginIdentifier(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const idCheck = validateLoginIdentifierNormalized(idRaw);
  if (!idCheck.ok) {
    res.status(400).json({ error: idCheck.message });
    return;
  }
  const identifier = idCheck.value;

  if (!password) {
    res.status(400).json({ error: 'A senha é obrigatória.' });
    return;
  }

  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, identifier))
    .limit(1);

  const userRow = rows[0];
  if (!userRow) {
    res.status(401).json({ error: 'Credenciais inválidas.' });
    return;
  }

  const ok = await bcrypt.compare(password, userRow.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Credenciais inválidas.' });
    return;
  }

  await createSession(res, req, userRow.id);
  res.status(200).json({ user: { id: userRow.id, email: userRow.email } });
}
