import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { and, eq, ne } from 'drizzle-orm';

import * as schema from '../../shared/db/schema.js';
import { normalizeLoginIdentifier, validateLoginIdentifierNormalized } from '../../shared/authIdentifier.js';
import { findUserBySession, tryGetDbOr503 } from '../_lib/authSession.js';

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
  if (req.method !== 'PATCH') {
    res.status(405).setHeader('Allow', 'PATCH').json({ error: 'Method not allowed' });
    return;
  }

  const db = tryGetDbOr503(res);
  if (!db) {
    return;
  }

  const sessionUser = await findUserBySession(req);
  if (!sessionUser) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const parsed = parseJsonBody(req) as {
    currentPassword?: unknown;
    email?: unknown;
    newPassword?: unknown;
  } | undefined;

  const currentPassword = typeof parsed?.currentPassword === 'string' ? parsed.currentPassword : '';
  const newPwdRaw = typeof parsed?.newPassword === 'string' ? parsed.newPassword : '';

  if (!currentPassword) {
    res.status(400).json({ error: 'Informe a senha atual.' });
    return;
  }

  const [fullUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, sessionUser.id))
    .limit(1);

  if (!fullUser) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const pwdOk = await bcrypt.compare(currentPassword, fullUser.passwordHash);
  if (!pwdOk) {
    res.status(401).json({ error: 'Senha atual incorreta.' });
    return;
  }

  const emailProvided = parsed !== undefined && Object.prototype.hasOwnProperty.call(parsed, 'email');

  let nextEmailNormalized: string | null = null;

  if (emailProvided) {
    if (typeof parsed.email !== 'string') {
      res.status(400).json({ error: 'Informe um e-mail ou nome de usuário válido.' });
      return;
    }
    const trimmed = normalizeLoginIdentifier(parsed.email);
    if (!trimmed) {
      res.status(400).json({ error: 'Informe um e-mail ou nome de usuário válido.' });
      return;
    }
    const currentNormalized = normalizeLoginIdentifier(fullUser.email);
    if (trimmed !== currentNormalized) {
      const idCheck = validateLoginIdentifierNormalized(trimmed);
      if (!idCheck.ok) {
        res.status(400).json({ error: idCheck.message });
        return;
      }
      nextEmailNormalized = idCheck.value;
    }
  }

  const wantsPasswordChange = newPwdRaw.length > 0;
  if (wantsPasswordChange && newPwdRaw.length < 8) {
    res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
    return;
  }

  if (nextEmailNormalized === null && !wantsPasswordChange) {
    res.status(400).json({ error: 'Informe um novo e-mail/usuário ou nova senha (ou ambos).' });
    return;
  }

  if (nextEmailNormalized !== null) {
    const collision = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.email, nextEmailNormalized), ne(schema.users.id, sessionUser.id)))
      .limit(1);
    if (collision.length > 0) {
      res.status(409).json({ error: 'Este e-mail ou nome de usuário já está cadastrado.' });
      return;
    }
  }

  const patch: { email?: string; passwordHash?: string } = {};
  if (nextEmailNormalized !== null) {
    patch.email = nextEmailNormalized;
  }
  if (wantsPasswordChange) {
    patch.passwordHash = await bcrypt.hash(newPwdRaw, 12);
  }

  try {
    await db.update(schema.users).set(patch).where(eq(schema.users.id, sessionUser.id));
  } catch {
    res.status(409).json({ error: 'Este e-mail ou nome de usuário já está cadastrado.' });
    return;
  }

  const resolvedEmail = patch.email ?? fullUser.email;

  res.status(200).json({
    user: { id: sessionUser.id, email: resolvedEmail },
  });
}
