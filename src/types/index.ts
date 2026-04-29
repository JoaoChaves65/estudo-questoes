export type Alternativa = {
  letra: string;
  texto: string;
};

export type Questao = {
  id: string;
  enunciado: string;
  alternativas: Alternativa[];
  respostaCorreta: string;
  explicacao: string;
};

export type Disciplina = {
  id: string;
  nome: string;
  questoes: Questao[];
};

export type BackupDisciplinas = {
  format: 'estudo-questoes';
  version: 1;
  exportedAt: string;
  disciplinas: Disciplina[];
};

export type ResultadoImportacao = {
  adicionadas: number;
  atualizadas: number;
  totalImportado: number;
};

export type QuestaoSelecionada = {
  disciplinaId: string;
  questaoId: string;
};

export type QuestaoGerenciada = {
  disciplinaId: string;
  disciplinaNome: string;
  questao: Questao;
};

export type PossivelDuplicata = {
  disciplinaId: string;
  disciplinaNome: string;
  enunciadoNormalizado: string;
  questoes: Questao[];
};

export type QuestaoParseErro = {
  indice: number;
  numeroQuestao: string;
  motivo: string;
  blocoOriginal: string;
};

export type QuestaoParseAviso = {
  indice: number;
  numeroQuestao: string;
  motivo: string;
};

export type ResultadoParseQuestoes = {
  questoes: Questao[];
  erros: QuestaoParseErro[];
  avisos: QuestaoParseAviso[];
};
