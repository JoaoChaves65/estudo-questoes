/**
 * Validar corpo PUT /api/study-library (sem depender do bundle da app React).
 */

export type AlternativaValidated = {
  letra: string;
  texto: string;
};

export type QuestaoValidated = {
  id: string;
  enunciado: string;
  alternativas: AlternativaValidated[];
  respostaCorreta: string;
  explicacao: string;
};

export type DisciplinaValidated = {
  id: string;
  nome: string;
  questoes: QuestaoValidated[];
};

export type SrsUltimaValid = 'acerto' | 'erro' | 'pular';

export type SrsQuestaoProgressValidated = {
  proximaRevisaoMs: number;
  intervaloDias: number;
  ease: number;
  congelada: boolean;
  visto: boolean;
  ultimaResposta?: SrsUltimaValid;
  ultimaRespostaEm?: string;
};

export type SrsDisciplinaPrefsValidated = {
  diaCalendario: string;
  novasFeitasHoje: number;
  revisoesFeitasHoje: number;
  metaDiaria?: number;
  limiteNovas?: number;
  limiteRevisoes?: number;
  boostAteMs?: number;
};

export type SrsDisciplinaProgressValidated = {
  prefs: SrsDisciplinaPrefsValidated;
  questoes: Record<string, SrsQuestaoProgressValidated>;
};

export type SrsProgressSnapshotValidated = {
  porDisciplina: Record<string, SrsDisciplinaProgressValidated>;
};

export type EstatQuestaoValidated = {
  acertos: number;
  erros: number;
  puladas: number;
};

export type DesempenhoSnapshotValidated = {
  porDisciplina: Record<string, Record<string, EstatQuestaoValidated>>;
};

export type StudyLibraryPutValidated = {
  disciplinas: DisciplinaValidated[];
  progressoInteligente: SrsProgressSnapshotValidated;
  estatisticasDesempenho: DesempenhoSnapshotValidated | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validarAlternativa(alternativa: unknown): alternativa is AlternativaValidated {
  return (
    isRecord(alternativa) &&
    typeof alternativa.letra === 'string' &&
    alternativa.letra.trim().length > 0 &&
    typeof alternativa.texto === 'string'
  );
}

function validarQuestao(questao: unknown): questao is QuestaoValidated {
  return (
    isRecord(questao) &&
    typeof questao.id === 'string' &&
    typeof questao.enunciado === 'string' &&
    Array.isArray(questao.alternativas) &&
    questao.alternativas.every(validarAlternativa) &&
    typeof questao.respostaCorreta === 'string' &&
    typeof questao.explicacao === 'string'
  );
}

function validarDisciplina(disciplina: unknown): disciplina is DisciplinaValidated {
  return (
    isRecord(disciplina) &&
    typeof disciplina.id === 'string' &&
    typeof disciplina.nome === 'string' &&
    Array.isArray(disciplina.questoes) &&
    disciplina.questoes.every(validarQuestao)
  );
}

function validarSrsQuestaoProgress(value: unknown): value is SrsQuestaoProgressValidated {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.proximaRevisaoMs === 'number' &&
    typeof value.intervaloDias === 'number' &&
    typeof value.ease === 'number' &&
    typeof value.congelada === 'boolean' &&
    typeof value.visto === 'boolean' &&
    (value.ultimaResposta === undefined ||
      value.ultimaResposta === 'acerto' ||
      value.ultimaResposta === 'erro' ||
      value.ultimaResposta === 'pular') &&
    (value.ultimaRespostaEm === undefined || typeof value.ultimaRespostaEm === 'string')
  );
}

function validarSrsDisciplinaPrefs(value: unknown): value is SrsDisciplinaPrefsValidated {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.diaCalendario === 'string' &&
    typeof value.novasFeitasHoje === 'number' &&
    typeof value.revisoesFeitasHoje === 'number' &&
    (value.metaDiaria === undefined || typeof value.metaDiaria === 'number') &&
    (value.limiteNovas === undefined || typeof value.limiteNovas === 'number') &&
    (value.limiteRevisoes === undefined || typeof value.limiteRevisoes === 'number') &&
    (value.boostAteMs === undefined || typeof value.boostAteMs === 'number')
  );
}

function validarSrsDisciplinaProgress(value: unknown): value is SrsDisciplinaProgressValidated {
  if (!isRecord(value) || !validarSrsDisciplinaPrefs(value.prefs)) {
    return false;
  }
  if (!isRecord(value.questoes)) {
    return false;
  }
  return Object.values(value.questoes).every(validarSrsQuestaoProgress);
}

function validarProgressoInteligente(value: unknown): value is SrsProgressSnapshotValidated {
  if (!isRecord(value) || !isRecord(value.porDisciplina)) {
    return false;
  }
  return Object.values(value.porDisciplina).every(validarSrsDisciplinaProgress);
}

function validarEstatQuestao(value: unknown): value is EstatQuestaoValidated {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.acertos === 'number' &&
    typeof value.erros === 'number' &&
    typeof value.puladas === 'number'
  );
}

function validarEstatisticasDesempenho(value: unknown): value is DesempenhoSnapshotValidated {
  if (!isRecord(value) || !isRecord(value.porDisciplina)) {
    return false;
  }
  for (const [, quests] of Object.entries(value.porDisciplina)) {
    if (!isRecord(quests)) {
      return false;
    }
    if (!Object.values(quests).every(validarEstatQuestao)) {
      return false;
    }
  }
  return true;
}

function sanitizarAlternativa(alternativa: AlternativaValidated): AlternativaValidated {
  return {
    letra: alternativa.letra.trim().toUpperCase(),
    texto: alternativa.texto.trim(),
  };
}

function sanitizarQuestao(questao: QuestaoValidated): QuestaoValidated {
  return {
    id: questao.id.trim(),
    enunciado: questao.enunciado.trim(),
    alternativas: questao.alternativas.map(sanitizarAlternativa),
    respostaCorreta: questao.respostaCorreta.trim().toUpperCase(),
    explicacao: questao.explicacao.trim(),
  };
}

export function sanitizarDisciplinasLista(disciplinas: DisciplinaValidated[]): DisciplinaValidated[] {
  return disciplinas.map((d) => ({
    id: d.id.trim(),
    nome: d.nome.trim(),
    questoes: d.questoes.map(sanitizarQuestao),
  }));
}

export function sanitizarProgressoInteligente(
  snapshot: SrsProgressSnapshotValidated,
): SrsProgressSnapshotValidated {
  const porDisciplina: SrsProgressSnapshotValidated['porDisciplina'] = {};
  for (const [disciplinaId, prog] of Object.entries(snapshot.porDisciplina)) {
    const questoes: Record<string, SrsQuestaoProgressValidated> = {};
    for (const [qid, q] of Object.entries(prog.questoes)) {
      questoes[qid.trim()] = { ...q };
    }
    porDisciplina[disciplinaId.trim()] = {
      prefs: { ...prog.prefs },
      questoes,
    };
  }
  return { porDisciplina };
}

export function sanitizarDesempenho(snapshot: DesempenhoSnapshotValidated): DesempenhoSnapshotValidated {
  const porDisciplina: DesempenhoSnapshotValidated['porDisciplina'] = {};
  for (const [disciplinaId, quests] of Object.entries(snapshot.porDisciplina)) {
    const out: Record<string, EstatQuestaoValidated> = {};
    for (const [qid, e] of Object.entries(quests)) {
      out[qid.trim()] = {
        acertos: Math.max(0, Math.floor(e.acertos)),
        erros: Math.max(0, Math.floor(e.erros)),
        puladas: Math.max(0, Math.floor(e.puladas)),
      };
    }
    porDisciplina[disciplinaId.trim()] = out;
  }
  return { porDisciplina };
}

export type ValidateStudyPutResult =
  | { ok: true; payload: StudyLibraryPutValidated }
  | { ok: false; message: string };

export function validateStudyLibraryPut(body: unknown): ValidateStudyPutResult {
  if (!isRecord(body)) {
    return { ok: false, message: 'Corpo JSON invalido.' };
  }
  const disciplinasRaw = body.disciplinas;
  if (!Array.isArray(disciplinasRaw)) {
    return { ok: false, message: 'Envie disciplinas como array.' };
  }
  if (!disciplinasRaw.every(validarDisciplina)) {
    return { ok: false, message: 'Disciplinas ou questões invalidas.' };
  }

  let progressoInteligente: SrsProgressSnapshotValidated;
  if (body.progressoInteligente === undefined) {
    progressoInteligente = { porDisciplina: {} };
  } else if (!validarProgressoInteligente(body.progressoInteligente)) {
    return { ok: false, message: 'Campo progressoInteligente invalido.' };
  } else {
    progressoInteligente = sanitizarProgressoInteligente(body.progressoInteligente);
  }

  let estatisticasDesempenho: DesempenhoSnapshotValidated | null = null;
  if (
    body.estatisticasDesempenho !== undefined &&
    body.estatisticasDesempenho !== null &&
    !(isRecord(body.estatisticasDesempenho) && Object.keys(body.estatisticasDesempenho).length === 0)
  ) {
    if (!validarEstatisticasDesempenho(body.estatisticasDesempenho)) {
      return { ok: false, message: 'Campo estatisticasDesempenho invalido.' };
    }
    estatisticasDesempenho = sanitizarDesempenho(body.estatisticasDesempenho);
    if (Object.keys(estatisticasDesempenho.porDisciplina).length === 0) {
      estatisticasDesempenho = null;
    }
  }

  return {
    ok: true,
    payload: {
      disciplinas: sanitizarDisciplinasLista(disciplinasRaw),
      progressoInteligente: sanitizarProgressoInteligente(progressoInteligente),
      estatisticasDesempenho,
    },
  };
}
