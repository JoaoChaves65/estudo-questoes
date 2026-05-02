import type {
  SrsDisciplinaProgress,
  SrsQuestaoProgress,
  SrsUltimaResposta,
} from '../types';

export const MS_HORA = 3_600_000;
export const MS_DIA = 86_400_000;

/** Data YYYY-MM-DD no fuso local (não UTC), para limites e reset diário. */
export function dataCalendarioLocal(agoraMs: number): string {
  const d = new Date(agoraMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function progressoPadrao(): SrsQuestaoProgress {
  return {
    proximaRevisaoMs: 0,
    intervaloDias: 0,
    ease: 2.5,
    congelada: false,
    visto: false,
  };
}

export function janelaBoostAtiva(boostAteMs: number | undefined, agoraMs: number): boolean {
  return typeof boostAteMs === 'number' && agoraMs < boostAteMs;
}

function scoreOrdenacao(prog: SrsQuestaoProgress, boostAtivo: boolean): number {
  let score = prog.proximaRevisaoMs;
  if (
    boostAtivo &&
    (prog.ultimaResposta === 'erro' || prog.ultimaResposta === 'pular')
  ) {
    score -= MS_DIA * 3;
  }
  return score;
}

export function contarPendentes(
  questaoIds: string[],
  disciplinaProgress: SrsDisciplinaProgress | undefined,
  agoraMs: number,
): number {
  const mapa = disciplinaProgress?.questoes ?? {};
  let n = 0;
  for (const id of questaoIds) {
    const p = mapa[id];
    if (p?.congelada) {
      continue;
    }
    if (!p?.ultimaResposta) {
      n += 1;
      continue;
    }
    if (p.proximaRevisaoMs <= agoraMs) {
      n += 1;
    }
  }
  return n;
}

export type MontarFilaInput = {
  disciplinaId: string;
  questaoIds: string[];
  porDisciplina: Record<string, SrsDisciplinaProgress>;
  agoraMs: number;
  ignorarLimitesDiarios?: boolean;
};

function quotaRestante(
  ignorar: boolean,
  limite: number,
  feitas: number,
): number {
  if (ignorar) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, limite - feitas);
}

export function montarFilaOrdenada(input: MontarFilaInput): string[] {
  const {
    disciplinaId,
    questaoIds,
    porDisciplina,
    agoraMs,
    ignorarLimitesDiarios = false,
  } = input;

  const disc = porDisciplina[disciplinaId];
  const prefs = disc?.prefs;
  const qmap = disc?.questoes ?? {};
  const boostAtivo = janelaBoostAtiva(prefs?.boostAteMs, agoraMs);

  const novos: string[] = [];
  const revisoes: string[] = [];

  for (const id of [...new Set(questaoIds)].sort()) {
    const p = qmap[id];
    if (p?.congelada) {
      continue;
    }
    const prog = p ?? progressoPadrao();
    if (!prog.ultimaResposta) {
      novos.push(id);
    } else if (prog.proximaRevisaoMs <= agoraMs) {
      revisoes.push(id);
    }
  }

  const ordenar = (ids: string[]) =>
    [...ids].sort((a, b) => {
      const pa = qmap[a] ?? progressoPadrao();
      const pb = qmap[b] ?? progressoPadrao();
      const sa = scoreOrdenacao(pa, boostAtivo);
      const sb = scoreOrdenacao(pb, boostAtivo);
      if (sa !== sb) {
        return sa - sb;
      }
      return a.localeCompare(b);
    });

  const novosOrd = ordenar(novos);
  const revOrd = ordenar(revisoes);

  const limN = prefs?.limiteNovas ?? 8;
  const limR = prefs?.limiteRevisoes ?? 40;
  const qNovas = quotaRestante(
    ignorarLimitesDiarios,
    limN,
    prefs?.novasFeitasHoje ?? 0,
  );
  const qRev = quotaRestante(
    ignorarLimitesDiarios,
    limR,
    prefs?.revisoesFeitasHoje ?? 0,
  );

  const fatiaNovas =
    qNovas === Number.POSITIVE_INFINITY ? novosOrd : novosOrd.slice(0, qNovas);
  const fatiaRev =
    qRev === Number.POSITIVE_INFINITY ? revOrd : revOrd.slice(0, qRev);

  return [...fatiaNovas, ...fatiaRev];
}

export type ResultadoSrsAgendamento = 'acerto' | 'erro' | 'pular';

/** Pular é tratado como erro no intervalo. */
export function aplicarResultadoSrs(
  atual: SrsQuestaoProgress | undefined,
  resultado: ResultadoSrsAgendamento,
  agoraMs: number,
): SrsQuestaoProgress {
  const base = atual ? { ...atual } : progressoPadrao();
  const efetivo: SrsUltimaResposta =
    resultado === 'pular' ? 'pular' : resultado === 'acerto' ? 'acerto' : 'erro';

  base.visto = true;
  base.ultimaResposta = efetivo;
  base.ultimaRespostaEm = new Date(agoraMs).toISOString();

  if (resultado === 'acerto') {
    const ease = Math.min(2.5, base.ease + 0.15);
    base.ease = ease;
    const intervaloAnterior = base.intervaloDias;
    const novoIntervalo =
      intervaloAnterior <= 0 ? 1 : Math.max(1, Math.round(intervaloAnterior * ease));
    base.intervaloDias = novoIntervalo;
    base.proximaRevisaoMs = agoraMs + novoIntervalo * MS_DIA;
    return base;
  }

  base.ease = Math.max(1.3, base.ease - 0.2);
  base.intervaloDias = 1;
  base.proximaRevisaoMs = agoraMs;
  return base;
}

/** Fila vazia só por causa dos limites diários (ainda existiriam cartões com limites ignorados). */
export function filaBloqueadaPorLimiteDiario(
  input: Omit<MontarFilaInput, 'ignorarLimitesDiarios'>,
): boolean {
  const comLimites = montarFilaOrdenada({
    ...input,
    ignorarLimitesDiarios: false,
  });
  const semLimites = montarFilaOrdenada({
    ...input,
    ignorarLimitesDiarios: true,
  });
  return comLimites.length === 0 && semLimites.length > 0;
}
