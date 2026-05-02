import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  SrsDisciplinaPrefs,
  SrsDisciplinaProgress,
  SrsProgressSnapshot,
} from '../types';
import {
  aplicarResultadoSrs,
  dataCalendarioLocal,
  MS_HORA,
  progressoPadrao,
} from '../utils/srsScheduler';

export type ResultadoSrsRegistro = 'acerto' | 'erro' | 'pular';

function prefsPadrao(agoraMs: number): SrsDisciplinaPrefs {
  const dia = dataCalendarioLocal(agoraMs);
  return {
    diaCalendario: dia,
    novasFeitasHoje: 0,
    revisoesFeitasHoje: 0,
    metaDiaria: 10,
    limiteNovas: 8,
    limiteRevisoes: 40,
  };
}

function garantirDiaCalendario(
  disciplina: SrsDisciplinaProgress,
  agoraMs: number,
): SrsDisciplinaProgress {
  const hoje = dataCalendarioLocal(agoraMs);
  if (disciplina.prefs.diaCalendario === hoje) {
    return disciplina;
  }
  return {
    ...disciplina,
    prefs: {
      ...disciplina.prefs,
      diaCalendario: hoje,
      novasFeitasHoje: 0,
      revisoesFeitasHoje: 0,
    },
  };
}

function mergeSnapshot(
  atual: Record<string, SrsDisciplinaProgress>,
  incoming: SrsProgressSnapshot,
): Record<string, SrsDisciplinaProgress> {
  const proximo = { ...atual };
  for (const [did, prog] of Object.entries(incoming.porDisciplina)) {
    const existente = proximo[did];
    if (!existente) {
      proximo[did] = {
        prefs: { ...prog.prefs },
        questoes: { ...prog.questoes },
      };
    } else {
      proximo[did] = {
        prefs: { ...existente.prefs, ...prog.prefs },
        questoes: { ...existente.questoes, ...prog.questoes },
      };
    }
  }
  return proximo;
}

type SrsProgressState = {
  porDisciplina: Record<string, SrsDisciplinaProgress>;
  /** Persiste virada de dia (contadores) para todas as disciplinas com progresso salvo. */
  sincronizarRolloverGlobal: (agoraMs: number) => void;
  obterDisciplina: (disciplinaId: string, agoraMs: number) => SrsDisciplinaProgress;
  registrarResposta: (
    disciplinaId: string,
    questaoId: string,
    resultado: ResultadoSrsRegistro,
    agoraMs: number,
  ) => void;
  toggleCongelar: (disciplinaId: string, questaoId: string, agoraMs: number) => void;
  ativarBoost48h: (disciplinaId: string, agoraMs: number) => void;
  definirPreferencias: (
    disciplinaId: string,
    parcial: Partial<SrsDisciplinaPrefs>,
    agoraMs: number,
  ) => void;
  importarSnapshot: (snapshot: SrsProgressSnapshot) => void;
  exportarSnapshot: () => SrsProgressSnapshot;
  removerQuestao: (disciplinaId: string, questaoId: string) => void;
  removerDisciplina: (disciplinaId: string) => void;
};

export const useSrsProgressStore = create<SrsProgressState>()(
  persist(
    (set, get) => ({
      porDisciplina: {},

      sincronizarRolloverGlobal: (agoraMs) => {
        set((state) => {
          const por = state.porDisciplina;
          let next: Record<string, SrsDisciplinaProgress> | null = null;
          for (const [id, disc] of Object.entries(por)) {
            const rolled = garantirDiaCalendario(disc, agoraMs);
            if (rolled !== disc) {
              if (!next) {
                next = { ...por };
              }
              next[id] = rolled;
            }
          }
          return next ? { porDisciplina: next } : state;
        });
      },

      obterDisciplina: (disciplinaId, agoraMs) => {
        const atual = get().porDisciplina[disciplinaId];
        if (!atual) {
          return {
            prefs: prefsPadrao(agoraMs),
            questoes: {},
          };
        }
        return garantirDiaCalendario(atual, agoraMs);
      },

      registrarResposta: (disciplinaId, questaoId, resultado, agoraMs) => {
        set((state) => {
          let disc = state.porDisciplina[disciplinaId] ?? {
            prefs: prefsPadrao(agoraMs),
            questoes: {},
          };
          disc = garantirDiaCalendario(disc, agoraMs);
          const anterior = disc.questoes[questaoId];
          const eraNovo = !anterior?.ultimaResposta;
          const proxQuestao = aplicarResultadoSrs(anterior, resultado, agoraMs);
          const prefs = { ...disc.prefs };
          if (eraNovo) {
            prefs.novasFeitasHoje += 1;
          } else {
            prefs.revisoesFeitasHoje += 1;
          }
          return {
            porDisciplina: {
              ...state.porDisciplina,
              [disciplinaId]: {
                prefs,
                questoes: {
                  ...disc.questoes,
                  [questaoId]: proxQuestao,
                },
              },
            },
          };
        });
      },

      toggleCongelar: (disciplinaId, questaoId, agoraMs) => {
        set((state) => {
          let disc = state.porDisciplina[disciplinaId] ?? {
            prefs: prefsPadrao(agoraMs),
            questoes: {},
          };
          disc = garantirDiaCalendario(disc, agoraMs);
          const q = disc.questoes[questaoId] ?? progressoPadrao();
          return {
            porDisciplina: {
              ...state.porDisciplina,
              [disciplinaId]: {
                ...disc,
                questoes: {
                  ...disc.questoes,
                  [questaoId]: { ...q, congelada: !q.congelada },
                },
              },
            },
          };
        });
      },

      ativarBoost48h: (disciplinaId, agoraMs) => {
        set((state) => {
          let disc = state.porDisciplina[disciplinaId] ?? {
            prefs: prefsPadrao(agoraMs),
            questoes: {},
          };
          disc = garantirDiaCalendario(disc, agoraMs);
          return {
            porDisciplina: {
              ...state.porDisciplina,
              [disciplinaId]: {
                ...disc,
                prefs: {
                  ...disc.prefs,
                  boostAteMs: agoraMs + 48 * MS_HORA,
                },
              },
            },
          };
        });
      },

      definirPreferencias: (disciplinaId, parcial, agoraMs) => {
        set((state) => {
          let disc = state.porDisciplina[disciplinaId] ?? {
            prefs: prefsPadrao(agoraMs),
            questoes: {},
          };
          disc = garantirDiaCalendario(disc, agoraMs);
          return {
            porDisciplina: {
              ...state.porDisciplina,
              [disciplinaId]: {
                ...disc,
                prefs: { ...disc.prefs, ...parcial },
              },
            },
          };
        });
      },

      importarSnapshot: (snapshot) => {
        set((state) => ({
          porDisciplina: mergeSnapshot(state.porDisciplina, snapshot),
        }));
        get().sincronizarRolloverGlobal(Date.now());
      },

      exportarSnapshot: () => {
        const agoraMs = Date.now();
        get().sincronizarRolloverGlobal(agoraMs);
        return {
          porDisciplina: JSON.parse(
            JSON.stringify(get().porDisciplina),
          ) as Record<string, SrsDisciplinaProgress>,
        };
      },

      removerQuestao: (disciplinaId, questaoId) => {
        set((state) => {
          const disc = state.porDisciplina[disciplinaId];
          if (!disc) {
            return state;
          }
          const { [questaoId]: _rem, ...rest } = disc.questoes;
          return {
            porDisciplina: {
              ...state.porDisciplina,
              [disciplinaId]: { ...disc, questoes: rest },
            },
          };
        });
      },

      removerDisciplina: (disciplinaId) => {
        set((state) => {
          const { [disciplinaId]: _r, ...rest } = state.porDisciplina;
          return { porDisciplina: rest };
        });
      },
    }),
    {
      name: 'estudo-questoes-srs',
      onRehydrateStorage: () => (_rehydrated, error) => {
        if (!error) {
          queueMicrotask(() => {
            useSrsProgressStore.getState().sincronizarRolloverGlobal(Date.now());
          });
        }
      },
    },
  ),
);

export function totalEstudadoNoDia(prefs: SrsDisciplinaPrefs): number {
  return prefs.novasFeitasHoje + prefs.revisoesFeitasHoje;
}
