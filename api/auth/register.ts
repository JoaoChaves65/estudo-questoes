import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

import * as schema from '../../shared/db/schema.js';
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
  const emailRaw =
    typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    res.status(400).json({ error: 'E-mail inválido.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres.' });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(schema.users)
      .values({
        email: emailRaw,
        passwordHash: hash,
      })
      .returning({ id: schema.users.id });

    if (!user) {
      res.status(500).json({ error: 'Erro ao criar utilizador.' });
      return;
    }

    await createSession(res, req, user.id);
    res.status(201).json({ user: { id: user.id, email: emailRaw } });
  } catch {
    res.status(409).json({ error: 'Este e-mail já está registado.' });
  }
}
