import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asc, desc, eq } from 'drizzle-orm';

import { getDb } from '../shared/db/client.js';
import * as schema from '../shared/db/schema.js';
import { findUserBySession, tryGetDbOr503 } from './_lib/authSession.js';

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

type AppendRow = {
  role: 'user' | 'model';
  content: string;
  model?: string | null;
};

async function ensureActiveConversation(db: ReturnType<typeof getDb>, userId: string) {
  const existing = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.userId, userId))
    .orderBy(desc(schema.conversations.updatedAt))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const [created] = await db
    .insert(schema.conversations)
    .values({ userId })
    .returning();
  if (!created) {
    throw new Error('Falha ao criar conversa.');
  }
  return created;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = tryGetDbOr503(res);
  if (!db) {
    return;
  }

  const user = await findUserBySession(req);
  if (!user) {
    res.status(401).json({ error: 'Inicie sessão para sincronizar a conversa.', user: null });
    return;
  }

  if (req.method === 'GET') {
    const conv = await ensureActiveConversation(db, user.id);
    const rows = await db
      .select()
      .from(schema.conversationMessages)
      .where(eq(schema.conversationMessages.conversationId, conv.id))
      .orderBy(asc(schema.conversationMessages.createdAt));

    res.status(200).json({
      conversationId: conv.id,
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role === 'model' ? 'model' : 'user',
        content: m.content,
        model: m.modelId ?? undefined,
      })),
    });
    return;
  }

  if (req.method === 'POST') {
    const conv = await ensureActiveConversation(db, user.id);
    const body = parseJsonBody(req) as { append?: unknown } | undefined;
    const append = body?.append;
    if (!Array.isArray(append) || append.length === 0) {
      res.status(400).json({ error: 'Envie { append: [{ role, content, model? }] }.' });
      return;
    }

    const rowsToInsert: {
      conversationId: string;
      role: string;
      content: string;
      modelId?: string | null;
    }[] = [];

    for (const item of append) {
      if (!item || typeof item !== 'object' || typeof (item as { role?: unknown }).role !== 'string') {
        continue;
      }
      const rec = item as AppendRow & { role: string };
      const role = rec.role === 'model' ? 'model' : rec.role === 'user' ? 'user' : null;
      if (!role || typeof rec.content !== 'string') {
        continue;
      }
      const content = rec.content.trim();
      if (!content) {
        continue;
      }
      rowsToInsert.push({
        conversationId: conv.id,
        role,
        content: content.slice(0, 50_000),
        modelId: typeof rec.model === 'string' && rec.model.trim() ? rec.model.trim().slice(0, 120) : null,
      });
    }

    if (rowsToInsert.length === 0) {
      res.status(400).json({ error: 'Nenhuma mensagem válida em append.' });
      return;
    }

    await db.insert(schema.conversationMessages).values(rowsToInsert);
    await db
      .update(schema.conversations)
      .set({ updatedAt: new Date() })
      .where(eq(schema.conversations.id, conv.id));

    res.status(200).json({ ok: true, conversationId: conv.id });
    return;
  }

  if (req.method === 'DELETE') {
    const rows = await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(eq(schema.conversations.userId, user.id))
      .orderBy(desc(schema.conversations.updatedAt));

    const ids = rows.map((r) => r.id);
    if (ids.length) {
      await db.delete(schema.conversations).where(eq(schema.conversations.userId, user.id));
    }
    res.status(200).json({ ok: true, clearedConversationIds: ids.length });
    return;
  }

  res.status(405).setHeader('Allow', 'GET, POST, DELETE').json({ error: 'Method not allowed' });
}
