import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

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
  const idRaw =
    typeof body?.email === 'string' ? normalizeLoginIdentifier(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const idCheck = validateLoginIdentifierNormalized(idRaw);
  if (!idCheck.ok) {
    res.status(400).json({ error: idCheck.message });
    return;
  }
  const identifier = idCheck.value;

  if (password.length < 8) {
    res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres.' });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(schema.users)
      .values({
        email: identifier,
        passwordHash: hash,
      })
      .returning({ id: schema.users.id });

    if (!user) {
      res.status(500).json({ error: 'Erro ao criar a conta.' });
      return;
    }

    await createSession(res, req, user.id);
    res.status(201).json({ user: { id: user.id, email: identifier } });
  } catch {
    res.status(409).json({ error: 'Este e-mail ou nome de usuário já está cadastrado.' });
  }
}
