import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  BackupDisciplinas,
  Disciplina,
  PossivelDuplicata,
  QuestaoGerenciada,
  QuestaoSelecionada,
  Questao,
  ResultadoImportacao,
} from '../types';

function normalizarEnunciado(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

type DisciplinasStore = {
  disciplinas: Disciplina[];
  adicionarDisciplina: (nome: string) => string | null;
  adicionarQuestoes: (disciplinaId: string, questoes: Questao[]) => void;
  buscarDisciplinaPorId: (disciplinaId: string) => Disciplina | undefined;
  importarDisciplinas: (backup: BackupDisciplinas) => ResultadoImportacao;
  obterDisciplinaPorId: (disciplinaId: string) => Disciplina | undefined;
  excluirQuestao: (disciplinaId: string, questaoId: string) => void;
  excluirQuestoesEmLote: (selecionadas: QuestaoSelecionada[]) => number;
  excluirDisciplina: (disciplinaId: string) => void;
  listarQuestoesGerenciadas: () => QuestaoGerenciada[];
  detectarPossiveisDuplicadas: () => PossivelDuplicata[];
};

export const useDisciplinasStore = create<DisciplinasStore>()(
  persist(
    (set, get) => ({
      disciplinas: [],
      adicionarDisciplina: (nome) => {
        const nomeLimpo = nome.trim();

        if (!nomeLimpo) {
          return null;
        }

        const novaDisciplina: Disciplina = {
          id: uuidv4(),
          nome: nomeLimpo,
          questoes: [],
        };

        set((state) => ({
          disciplinas: [...state.disciplinas, novaDisciplina],
        }));

        return novaDisciplina.id;
      },
      adicionarQuestoes: (disciplinaId, questoes) => {
        set((state) => ({
          disciplinas: state.disciplinas.map((disciplina) =>
            disciplina.id === disciplinaId
              ? {
                  ...disciplina,
                  questoes: [...disciplina.questoes, ...questoes],
                }
              : disciplina,
          ),
        }));
      },
      buscarDisciplinaPorId: (disciplinaId) =>
        get().disciplinas.find((disciplina) => disciplina.id === disciplinaId),
      obterDisciplinaPorId: (disciplinaId) =>
        get().disciplinas.find((disciplina) => disciplina.id === disciplinaId),
      excluirQuestao: (disciplinaId, questaoId) => {
        set((state) => ({
          disciplinas: state.disciplinas.map((disciplina) =>
            disciplina.id === disciplinaId
              ? {
                  ...disciplina,
                  questoes: disciplina.questoes.filter((questao) => questao.id !== questaoId),
                }
              : disciplina,
          ),
        }));
      },
      excluirQuestoesEmLote: (selecionadas) => {
        const mapaPorDisciplina = new Map<string, Set<string>>();

        for (const item of selecionadas) {
          const ids = mapaPorDisciplina.get(item.disciplinaId) ?? new Set<string>();
          ids.add(item.questaoId);
          mapaPorDisciplina.set(item.disciplinaId, ids);
        }

        set((state) => ({
          disciplinas: state.disciplinas.map((disciplina) => {
            const idsParaExcluir = mapaPorDisciplina.get(disciplina.id);

            if (!idsParaExcluir) {
              return disciplina;
            }

            return {
              ...disciplina,
              questoes: disciplina.questoes.filter(
                (questao) => !idsParaExcluir.has(questao.id),
              ),
            };
          }),
        }));

        return selecionadas.length;
      },
      excluirDisciplina: (disciplinaId) => {
        set((state) => ({
          disciplinas: state.disciplinas.filter(
            (disciplina) => disciplina.id !== disciplinaId,
          ),
        }));
      },
      listarQuestoesGerenciadas: () =>
        get().disciplinas.flatMap((disciplina) =>
          disciplina.questoes.map((questao) => ({
            disciplinaId: disciplina.id,
            disciplinaNome: disciplina.nome,
            questao,
          })),
        ),
      detectarPossiveisDuplicadas: () =>
        get().disciplinas.flatMap((disciplina) => {
          const grupos = new Map<string, Questao[]>();

          for (const questao of disciplina.questoes) {
            const chave = normalizarEnunciado(questao.enunciado);
            const grupo = grupos.get(chave) ?? [];
            grupo.push(questao);
            grupos.set(chave, grupo);
          }

          return Array.from(grupos.entries())
            .filter(([, questoes]) => questoes.length > 1)
            .map(([enunciadoNormalizado, questoes]) => ({
              disciplinaId: disciplina.id,
              disciplinaNome: disciplina.nome,
              enunciadoNormalizado,
              questoes,
            }));
        }),
      importarDisciplinas: (backup) => {
        const disciplinasAtuais = get().disciplinas;
        const disciplinasImportadas = backup.disciplinas;
        const mapaAtual = new Map(
          disciplinasAtuais.map((disciplina) => [disciplina.id, disciplina]),
        );

        let adicionadas = 0;
        let atualizadas = 0;

        for (const disciplina of disciplinasImportadas) {
          if (mapaAtual.has(disciplina.id)) {
            atualizadas += 1;
          } else {
            adicionadas += 1;
          }

          mapaAtual.set(disciplina.id, disciplina);
        }

        set({
          disciplinas: Array.from(mapaAtual.values()),
        });

        return {
          adicionadas,
          atualizadas,
          totalImportado: disciplinasImportadas.length,
        };
      },
    }),
    {
      name: 'estudo-questoes-storage',
    },
  ),
);
