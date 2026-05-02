import { describe, expect, it } from 'vitest';

import type { Disciplina, SrsProgressSnapshot } from '../types';

import {
  parseBackupDisciplinas,
  serializarBackupDisciplinas,
  sanitizarDesempenho,
} from './backup';

const disciplinaMinimal: Disciplina = {
  id: 'd1',
  nome: 'Contratos',
  questoes: [
    {
      id: 'q1',
      enunciado: 'Afirma?',
      alternativas: [
        { letra: 'A', texto: 'Sim' },
        { letra: 'B', texto: 'Não' },
      ],
      respostaCorreta: 'A',
      explicacao: 'Motivo.',
    },
  ],
};

const progressoVazio: SrsProgressSnapshot = { porDisciplina: {} };

const snapshotComD1: SrsProgressSnapshot = {
  porDisciplina: {
    d1: {
      prefs: {
        diaCalendario: '2026-05-02',
        novasFeitasHoje: 1,
        revisoesFeitasHoje: 0,
      },
      questoes: {
        q1: {
          proximaRevisaoMs: 171_460_800_000,
          intervaloDias: 1,
          ease: 2.5,
          congelada: false,
          visto: true,
          ultimaResposta: 'acerto',
          ultimaRespostaEm: '2026-05-02T10:00:00.000Z',
        },
      },
    },
  },
};

describe('parseBackupDisciplinas', () => {
  it('aceita formato v1 (sem SRS/desempenho)', () => {
    const texto = JSON.stringify({
      format: 'estudo-questoes',
      version: 1,
      exportedAt: '2026-05-02T12:00:00.000Z',
      disciplinas: [disciplinaMinimal],
    });
    const r = parseBackupDisciplinas(texto);
    expect(r.disciplinas).toHaveLength(1);
    expect(r.disciplinas[0]!.nome).toBe('Contratos');
    expect(r.progressoInteligente).toBeNull();
    expect(r.estatisticasDesempenho).toBeNull();
  });

  it('aceita formato v2 com progressoInteligente e estatísticas', () => {
    const texto = JSON.stringify({
      format: 'estudo-questoes',
      version: 2,
      exportedAt: '2026-05-02T12:00:00.000Z',
      disciplinas: [disciplinaMinimal],
      progressoInteligente: snapshotComD1,
      estatisticasDesempenho: sanitizarDesempenho({
        porDisciplina: {
          d1: {
            q1: { acertos: 3, erros: 1, puladas: 2 },
          },
        },
      }),
    });
    const r = parseBackupDisciplinas(texto);
    expect(r.progressoInteligente).not.toBeNull();
    expect(r.progressoInteligente!.porDisciplina.d1?.questoes.q1?.ease).toBe(2.5);
    expect(r.estatisticasDesempenho?.porDisciplina.d1?.q1?.acertos).toBe(3);
  });

  it('json inválido ou formato errado falha', () => {
    expect(() => parseBackupDisciplinas('not-json')).toThrow();
    expect(() => parseBackupDisciplinas(JSON.stringify({ version: 9 }))).toThrow();
  });
});

describe('serializarBackupDisciplinas + parseBackupDisciplinas', () => {
  it('round-trip mantém dados críticos (disciplinas + SRS + desempenho)', () => {
    const texto = serializarBackupDisciplinas([disciplinaMinimal], snapshotComD1, {
      porDisciplina: {
        d1: { q1: { acertos: 10, erros: 0, puladas: 0 } },
      },
    });
    const r = parseBackupDisciplinas(texto);
    expect(r.disciplinas[0]!.questoes).toHaveLength(1);
    expect(r.progressoInteligente?.porDisciplina.d1?.questoes.q1?.visto).toBe(true);
    expect(r.estatisticasDesempenho?.porDisciplina.d1?.q1?.acertos).toBe(10);
  });

  it('omitir SRS usa snapshot vazio após serialização', () => {
    const texto = serializarBackupDisciplinas([disciplinaMinimal]);
    const payload = JSON.parse(texto);
    expect(payload.version).toBe(2);
    expect(payload.progressoInteligente).toEqual({ porDisciplina: {} });

    const r = parseBackupDisciplinas(texto);
    expect(r.progressoInteligente?.porDisciplina).toEqual({});
    expect(r.estatisticasDesempenho).toBeNull();
  });

  it('v2 apenas com disciplinas usa progresso vazio no parse', () => {
    const raw = JSON.stringify({
      format: 'estudo-questoes',
      version: 2,
      exportedAt: '2026-05-02T12:00:00.000Z',
      disciplinas: [disciplinaMinimal],
      progressoInteligente: progressoVazio,
    });
    const r = parseBackupDisciplinas(raw);
    expect(Object.keys(r.progressoInteligente!.porDisciplina)).toHaveLength(0);
    expect(r.estatisticasDesempenho).toBeNull();
  });
});
