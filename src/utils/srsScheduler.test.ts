import { describe, expect, it } from 'vitest';

import type { SrsDisciplinaProgress, SrsQuestaoProgress } from '../types';
import {
  aplicarResultadoSrs,
  contarPendentes,
  dataCalendarioLocal,
  filaBloqueadaPorLimiteDiario,
  montarFilaOrdenada,
  MS_DIA,
  progressoPadrao,
} from './srsScheduler';

const agora = 1_700_000_000_000;

function discProg(parcial: Partial<SrsDisciplinaProgress>): SrsDisciplinaProgress {
  return {
    prefs: {
      diaCalendario: '2024-01-01',
      novasFeitasHoje: 0,
      revisoesFeitasHoje: 0,
      metaDiaria: 10,
      limiteNovas: 8,
      limiteRevisoes: 40,
      ...parcial.prefs,
    },
    questoes: parcial.questoes ?? {},
  };
}

describe('dataCalendarioLocal', () => {
  it('formata ano-mes-dia no fuso local da maquina', () => {
    const t = new Date(2024, 5, 7, 15, 30, 0).getTime();
    expect(dataCalendarioLocal(t)).toBe('2024-06-07');
  });
});

describe('aplicarResultadoSrs', () => {
  it('acerto aumenta intervalo e atrasa proxima revisao', () => {
    const base: SrsQuestaoProgress = {
      ...progressoPadrao(),
      intervaloDias: 1,
      ease: 2.5,
      ultimaResposta: 'erro',
      ultimaRespostaEm: new Date(agora - MS_DIA).toISOString(),
    };
    const next = aplicarResultadoSrs(base, 'acerto', agora);
    expect(next.intervaloDias).toBeGreaterThanOrEqual(1);
    expect(next.proximaRevisaoMs).toBeGreaterThan(agora);
    expect(next.ultimaResposta).toBe('acerto');
  });

  it('erro e pular deixam proxima revisao imediata', () => {
    const base = aplicarResultadoSrs(undefined, 'acerto', agora - 10 * MS_DIA);
    const err = aplicarResultadoSrs(base, 'erro', agora);
    expect(err.proximaRevisaoMs).toBe(agora);
    expect(err.ultimaResposta).toBe('erro');

    const pul = aplicarResultadoSrs(base, 'pular', agora);
    expect(pul.proximaRevisaoMs).toBe(agora);
    expect(pul.ultimaResposta).toBe('pular');
  });
});

describe('contarPendentes', () => {
  it('conta novas sem ultimaResposta e revisoes vencidas', () => {
    const d = discProg({
      questoes: {
        a: { ...progressoPadrao(), ultimaResposta: 'acerto', proximaRevisaoMs: agora + MS_DIA },
        b: { ...progressoPadrao(), proximaRevisaoMs: agora - 1 },
      },
    });
    expect(contarPendentes(['a', 'b', 'c'], d, agora)).toBe(2);
  });

  it('ignora congeladas', () => {
    const d = discProg({
      questoes: {
        x: { ...progressoPadrao(), congelada: true },
      },
    });
    expect(contarPendentes(['x'], d, agora)).toBe(0);
  });
});

describe('montarFilaOrdenada', () => {
  it('respeita limite de novas quando ignorarLimitesDiarios e false', () => {
    const ids = ['n1', 'n2', 'n3', 'n4'];
    const por: Record<string, SrsDisciplinaProgress> = {
      d1: discProg({
        prefs: { diaCalendario: '2024-01-01', novasFeitasHoje: 0, revisoesFeitasHoje: 0, limiteNovas: 2, limiteRevisoes: 40 },
        questoes: {},
      }),
    };
    const fila = montarFilaOrdenada({
      disciplinaId: 'd1',
      questaoIds: ids,
      porDisciplina: por,
      agoraMs: agora,
      ignorarLimitesDiarios: false,
    });
    expect(fila).toEqual(['n1', 'n2']);
  });

  it('respeita saldo restante de novas (limite menos ja feitas hoje)', () => {
    const ids = ['n1', 'n2', 'n3', 'n4', 'n5'];
    const por: Record<string, SrsDisciplinaProgress> = {
      d1: discProg({
        prefs: {
          diaCalendario: '2024-01-01',
          novasFeitasHoje: 7,
          limiteNovas: 8,
          limiteRevisoes: 0,
          revisoesFeitasHoje: 0,
        },
        questoes: {},
      }),
    };
    const fila = montarFilaOrdenada({
      disciplinaId: 'd1',
      questaoIds: ids,
      porDisciplina: por,
      agoraMs: agora,
      ignorarLimitesDiarios: false,
    });
    expect(fila).toEqual(['n1']);
  });

  it('nao inclui revisoes com proxima revisao no futuro', () => {
    const ids = ['novo', 'revFutura', 'revVencida'];
    const por: Record<string, SrsDisciplinaProgress> = {
      d1: discProg({
        prefs: {
          diaCalendario: '2024-01-01',
          novasFeitasHoje: 0,
          revisoesFeitasHoje: 0,
          limiteNovas: 10,
          limiteRevisoes: 10,
        },
        questoes: {
          revFutura: {
            ...progressoPadrao(),
            ultimaResposta: 'acerto',
            proximaRevisaoMs: agora + MS_DIA,
          },
          revVencida: {
            ...progressoPadrao(),
            ultimaResposta: 'acerto',
            proximaRevisaoMs: agora - 1,
          },
        },
      }),
    };
    const fila = montarFilaOrdenada({
      disciplinaId: 'd1',
      questaoIds: ids,
      porDisciplina: por,
      agoraMs: agora,
      ignorarLimitesDiarios: false,
    });
    expect(fila).toEqual(['novo', 'revVencida']);
  });

  it('ignora limites quando ignorarLimitesDiarios e true', () => {
    const ids = ['n1', 'n2', 'n3'];
    const por: Record<string, SrsDisciplinaProgress> = {
      d1: discProg({
        prefs: {
          diaCalendario: '2024-01-01',
          novasFeitasHoje: 0,
          revisoesFeitasHoje: 0,
          limiteNovas: 1,
          limiteRevisoes: 0,
        },
        questoes: {},
      }),
    };
    const fila = montarFilaOrdenada({
      disciplinaId: 'd1',
      questaoIds: ids,
      porDisciplina: por,
      agoraMs: agora,
      ignorarLimitesDiarios: true,
    });
    expect(fila).toEqual(['n1', 'n2', 'n3']);
  });
});

describe('filaBloqueadaPorLimiteDiario', () => {
  it('detecta quando so os limites esvaziam a fila', () => {
    const ids = ['a', 'b'];
    const por: Record<string, SrsDisciplinaProgress> = {
      d1: discProg({
        prefs: {
          diaCalendario: '2024-01-01',
          novasFeitasHoje: 0,
          revisoesFeitasHoje: 0,
          limiteNovas: 0,
          limiteRevisoes: 0,
        },
        questoes: {},
      }),
    };
    expect(
      filaBloqueadaPorLimiteDiario({
        disciplinaId: 'd1',
        questaoIds: ids,
        porDisciplina: por,
        agoraMs: agora,
      }),
    ).toBe(true);
  });
});
