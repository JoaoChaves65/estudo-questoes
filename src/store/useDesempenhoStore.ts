import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DesempenhoSnapshot, EstatQuestao } from '../types';
import { registrarNoEstat, type TipoRegistroDesempenho } from '../utils/desempenhoStats';

type DesempenhoState = {
  porDisciplina: DesempenhoSnapshot['porDisciplina'];
  registrar: (disciplinaId: string, questaoId: string, tipo: TipoRegistroDesempenho) => void;
  removerQuestao: (disciplinaId: string, questaoId: string) => void;
  removerDisciplina: (disciplinaId: string) => void;
  importarSnapshot: (snapshot: DesempenhoSnapshot) => void;
  exportarSnapshot: () => DesempenhoSnapshot;
};

function combinarEstat(a: EstatQuestao, b: EstatQuestao): EstatQuestao {
  return {
    acertos: a.acertos + b.acertos,
    erros: a.erros + b.erros,
    puladas: a.puladas + b.puladas,
  };
}

/** Importação: soma totais quando a mesma questão aparece nos dois snapshots. */
export function mergeDesempenhoPorDisciplina(
  atual: DesempenhoSnapshot['porDisciplina'],
  incoming: DesempenhoSnapshot['porDisciplina'],
): DesempenhoSnapshot['porDisciplina'] {
  const proximo = { ...atual };
  for (const [did, quests] of Object.entries(incoming)) {
    const existente = proximo[did] ?? {};
    const mergedQuest: Record<string, EstatQuestao> = { ...existente };
    for (const [qid, est] of Object.entries(quests)) {
      const cur = mergedQuest[qid];
      mergedQuest[qid] = cur ? combinarEstat(cur, est) : { ...est };
    }
    proximo[did] = mergedQuest;
  }
  return proximo;
}

export const useDesempenhoStore = create<DesempenhoState>()(
  persist(
    (set, get) => ({
      porDisciplina: {},

      registrar: (disciplinaId, questaoId, tipo) => {
        set((state) => {
          const disc = state.porDisciplina[disciplinaId] ?? {};
          const atual = disc[questaoId];
          return {
            porDisciplina: {
              ...state.porDisciplina,
              [disciplinaId]: {
                ...disc,
                [questaoId]: registrarNoEstat(atual, tipo),
              },
            },
          };
        });
      },

      removerQuestao: (disciplinaId, questaoId) => {
        set((state) => {
          const disc = state.porDisciplina[disciplinaId];
          if (!disc || disc[questaoId] === undefined) {
            return state;
          }
          const { [questaoId]: _r, ...rest } = disc;
          const por = { ...state.porDisciplina };
          if (Object.keys(rest).length === 0) {
            const { [disciplinaId]: _d, ...out } = por;
            return { porDisciplina: out };
          }
          por[disciplinaId] = rest;
          return { porDisciplina: por };
        });
      },

      removerDisciplina: (disciplinaId) => {
        set((state) => {
          const { [disciplinaId]: _r, ...rest } = state.porDisciplina;
          return { porDisciplina: rest };
        });
      },

      importarSnapshot: (snapshot) => {
        set((state) => ({
          porDisciplina: mergeDesempenhoPorDisciplina(state.porDisciplina, snapshot.porDisciplina),
        }));
      },

      exportarSnapshot: (): DesempenhoSnapshot => ({
        porDisciplina: JSON.parse(
          JSON.stringify(get().porDisciplina),
        ) as DesempenhoSnapshot['porDisciplina'],
      }),
    }),
    { name: 'estudo-questoes-desempenho' },
  ),
);
