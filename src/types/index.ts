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

export type BackupDisciplinasV1 = {
  format: 'estudo-questoes';
  version: 1;
  exportedAt: string;
  disciplinas: Disciplina[];
};

/** Progresso por questão no modo estudo inteligente (repetição espaçada). */
export type SrsUltimaResposta = 'acerto' | 'erro' | 'pular';

export type SrsQuestaoProgress = {
  proximaRevisaoMs: number;
  intervaloDias: number;
  ease: number;
  congelada: boolean;
  visto: boolean;
  ultimaResposta?: SrsUltimaResposta;
  ultimaRespostaEm?: string;
};

export type SrsDisciplinaPrefs = {
  diaCalendario: string;
  novasFeitasHoje: number;
  revisoesFeitasHoje: number;
  metaDiaria?: number;
  limiteNovas?: number;
  limiteRevisoes?: number;
  boostAteMs?: number;
};

export type SrsDisciplinaProgress = {
  prefs: SrsDisciplinaPrefs;
  questoes: Record<string, SrsQuestaoProgress>;
};

export type SrsProgressSnapshot = {
  porDisciplina: Record<string, SrsDisciplinaProgress>;
};

/** Totais cumulativos por questão (estudo clássico + inteligente). */
export type EstatQuestao = {
  acertos: number;
  erros: number;
  puladas: number;
};

export type DesempenhoSnapshot = {
  porDisciplina: Record<string, Record<string, EstatQuestao>>;
};

export type BackupDisciplinasV2 = {
  format: 'estudo-questoes';
  version: 2;
  exportedAt: string;
  disciplinas: Disciplina[];
  progressoInteligente: SrsProgressSnapshot;
  /** Opcional: histórico agregado de respostas por questão. */
  estatisticasDesempenho?: DesempenhoSnapshot;
};

/** Resultado do parse de backup (v1 ou v2 unificado). */
export type ParsedBackup = {
  disciplinas: Disciplina[];
  progressoInteligente: SrsProgressSnapshot | null;
  estatisticasDesempenho: DesempenhoSnapshot | null;
};

/** Alias legado: importação aceita v1; exportação usa v2. */
export type BackupDisciplinas = BackupDisciplinasV1;

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
