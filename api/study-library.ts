import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, inArray } from 'drizzle-orm';

import { getDb } from '../shared/db/client.js';
import * as schema from '../shared/db/schema.js';
import { validateStudyLibraryPut, type StudyLibraryPutValidated } from '../shared/studyLibraryValidate.js';
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

async function loadLibraryPayload(
  db: ReturnType<typeof getDb>,
  userId: string,
): Promise<{ empty: boolean; payload: Omit<StudyLibraryPutValidated, 'disciplinas'> & { disciplinas: StudyLibraryPutValidated['disciplinas'] } }> {
  const discRows = await db
    .select()
    .from(schema.studyDisciplines)
    .where(eq(schema.studyDisciplines.userId, userId));

  if (!discRows.length) {
    return {
      empty: true,
      payload: {
        disciplinas: [],
        progressoInteligente: { porDisciplina: {} },
        estatisticasDesempenho: null,
      },
    };
  }

  const discIds = discRows.map((r) => r.id);
  const questionRows =
    discIds.length > 0
      ? await db
          .select()
          .from(schema.studyQuestions)
          .where(inArray(schema.studyQuestions.disciplineId, discIds))
      : [];

  const qsByDisc = new Map<string, typeof questionRows>();
  for (const q of questionRows) {
    const list = qsByDisc.get(q.disciplineId) ?? [];
    list.push(q);
    qsByDisc.set(q.disciplineId, list);
  }

  const disciplinas: StudyLibraryPutValidated['disciplinas'] = discRows.map((row) => {
    const quests = qsByDisc.get(row.id) ?? [];
    const questOrdered = quests.sort((a, b) => a.externalId.localeCompare(b.externalId));
    const questObjects = questOrdered.map((rq) => {
      const payload = rq.payload as Record<string, unknown>;
      const q = payload as StudyLibraryPutValidated['disciplinas'][0]['questoes'][0];
      return {
        ...q,
        id: rq.externalId,
      };
    });
    return {
      id: row.externalId,
      nome: row.name,
      questoes: questObjects,
    };
  });

  disciplinas.sort((a, b) => a.id.localeCompare(b.id));

  const srsRow = await db
    .select()
    .from(schema.userSrsProgress)
    .where(eq(schema.userSrsProgress.userId, userId))
    .limit(1);

  const srsData = srsRow[0]?.data as StudyLibraryPutValidated['progressoInteligente'] | undefined;

  const desRow = await db
    .select()
    .from(schema.userDesempenho)
    .where(eq(schema.userDesempenho.userId, userId))
    .limit(1);

  let estatisticasDesempenho = desRow[0]?.data as StudyLibraryPutValidated['estatisticasDesempenho'] | null ?? null;

  const progressoInteligente = srsData ?? { porDisciplina: {} };

  if (estatisticasDesempenho?.porDisciplina && Object.keys(estatisticasDesempenho.porDisciplina).length === 0) {
    estatisticasDesempenho = null;
  }

  return {
    empty: false,
    payload: {
      disciplinas,
      progressoInteligente,
      estatisticasDesempenho,
    },
  };
}

async function replaceLibrary(
  db: ReturnType<typeof getDb>,
  userId: string,
  validated: StudyLibraryPutValidated,
): Promise<void> {
  const existing = await db
    .select({ id: schema.studyDisciplines.id })
    .from(schema.studyDisciplines)
    .where(eq(schema.studyDisciplines.userId, userId));

  const existingIds = existing.map((r) => r.id);
  if (existingIds.length > 0) {
    await db.delete(schema.studyQuestions).where(inArray(schema.studyQuestions.disciplineId, existingIds));
    await db.delete(schema.studyDisciplines).where(eq(schema.studyDisciplines.userId, userId));
  }

  const now = new Date();

  for (const disc of validated.disciplinas) {
    const [insRow] = await db
      .insert(schema.studyDisciplines)
      .values({
        userId,
        externalId: disc.id,
        name: disc.nome,
        updatedAt: now,
      })
      .returning({ id: schema.studyDisciplines.id });

    if (!insRow) {
      throw new Error('Falha ao inserir disciplina.');
    }

    const qValues = disc.questoes.map((q) => ({
      disciplineId: insRow.id,
      externalId: q.id,
      payload: q as unknown as Record<string, unknown>,
      updatedAt: now,
    }));

    if (qValues.length > 0) {
      await db.insert(schema.studyQuestions).values(qValues);
    }
  }

  await db
    .insert(schema.userSrsProgress)
    .values({
      userId,
      data: validated.progressoInteligente,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.userSrsProgress.userId,
      set: { data: validated.progressoInteligente, updatedAt: now },
    });

  if (validated.estatisticasDesempenho && Object.keys(validated.estatisticasDesempenho.porDisciplina).length > 0) {
    await db
      .insert(schema.userDesempenho)
      .values({
        userId,
        data: validated.estatisticasDesempenho,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.userDesempenho.userId,
        set: { data: validated.estatisticasDesempenho, updatedAt: now },
      });
  } else {
    await db
      .insert(schema.userDesempenho)
      .values({ userId, data: null, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.userDesempenho.userId,
        set: { data: null, updatedAt: now },
      });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = tryGetDbOr503(res);
  if (!db) {
    return;
  }

  const user = await findUserBySession(req);
  if (!user) {
    res.status(401).json({ error: 'Inicie sessão para aceder à biblioteca na nuvem.' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const result = await loadLibraryPayload(db, user.id);
      res.status(200).json({
        empty: result.empty,
        disciplinas: result.payload.disciplinas,
        progressoInteligente: result.payload.progressoInteligente,
        estatisticasDesempenho: result.payload.estatisticasDesempenho,
      });
      return;
    } catch {
      res.status(500).json({ error: 'Erro ao carregar biblioteca.' });
      return;
    }
  }

  if (req.method === 'PUT') {
    const body = parseJsonBody(req);
    const parsed = validateStudyLibraryPut(body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.message });
      return;
    }

    try {
      await replaceLibrary(db, user.id, parsed.payload);
      res.status(200).json({ ok: true });
      return;
    } catch {
      res.status(500).json({ error: 'Erro ao gravar biblioteca.' });
      return;
    }
  }

  res.status(405).setHeader('Allow', 'GET, PUT').json({ error: 'Method not allowed' });
}
