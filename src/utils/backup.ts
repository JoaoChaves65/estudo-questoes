import type {
  Alternativa,
  BackupDisciplinasV1,
  BackupDisciplinasV2,
  DesempenhoSnapshot,
  Disciplina,
  EstatQuestao,
  ParsedBackup,
  Questao,
  SrsDisciplinaPrefs,
  SrsDisciplinaProgress,
  SrsQuestaoProgress,
  SrsProgressSnapshot,
} from '../types';

const BACKUP_FORMAT = 'estudo-questoes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validarAlternativa(alternativa: unknown): alternativa is Alternativa {
  return (
    isRecord(alternativa) &&
    typeof alternativa.letra === 'string' &&
    alternativa.letra.trim().length > 0 &&
    typeof alternativa.texto === 'string'
  );
}

function validarQuestao(questao: unknown): questao is Questao {
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

function validarDisciplina(disciplina: unknown): disciplina is Disciplina {
  return (
    isRecord(disciplina) &&
    typeof disciplina.id === 'string' &&
    typeof disciplina.nome === 'string' &&
    Array.isArray(disciplina.questoes) &&
    disciplina.questoes.every(validarQuestao)
  );
}

function validarSrsQuestaoProgress(value: unknown): value is SrsQuestaoProgress {
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

function validarSrsDisciplinaPrefs(value: unknown): value is SrsDisciplinaPrefs {
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

function validarSrsDisciplinaProgress(value: unknown): value is SrsDisciplinaProgress {
  if (!isRecord(value) || !validarSrsDisciplinaPrefs(value.prefs)) {
    return false;
  }
  if (!isRecord(value.questoes)) {
    return false;
  }
  return Object.values(value.questoes).every(validarSrsQuestaoProgress);
}

function validarProgressoInteligente(value: unknown): value is SrsProgressSnapshot {
  if (!isRecord(value) || !isRecord(value.porDisciplina)) {
    return false;
  }
  return Object.values(value.porDisciplina).every(validarSrsDisciplinaProgress);
}

function validarEstatQuestao(value: unknown): value is EstatQuestao {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.acertos === 'number' &&
    typeof value.erros === 'number' &&
    typeof value.puladas === 'number'
  );
}

function validarEstatisticasDesempenho(value: unknown): value is DesempenhoSnapshot {
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

function sanitizarAlternativa(alternativa: Alternativa): Alternativa {
  return {
    letra: alternativa.letra.trim().toUpperCase(),
    texto: alternativa.texto.trim(),
  };
}

function sanitizarQuestao(questao: Questao): Questao {
  return {
    id: questao.id.trim(),
    enunciado: questao.enunciado.trim(),
    alternativas: questao.alternativas.map(sanitizarAlternativa),
    respostaCorreta: questao.respostaCorreta.trim().toUpperCase(),
    explicacao: questao.explicacao.trim(),
  };
}

function sanitizarDisciplina(disciplina: Disciplina): Disciplina {
  return {
    id: disciplina.id.trim(),
    nome: disciplina.nome.trim(),
    questoes: disciplina.questoes.map(sanitizarQuestao),
  };
}

function sanitizarProgressoInteligente(snapshot: SrsProgressSnapshot): SrsProgressSnapshot {
  const porDisciplina: SrsProgressSnapshot['porDisciplina'] = {};
  for (const [disciplinaId, prog] of Object.entries(snapshot.porDisciplina)) {
    const questoes: Record<string, SrsQuestaoProgress> = {};
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

export function sanitizarDesempenho(snapshot: DesempenhoSnapshot): DesempenhoSnapshot {
  const porDisciplina: DesempenhoSnapshot['porDisciplina'] = {};
  for (const [disciplinaId, quests] of Object.entries(snapshot.porDisciplina)) {
    const out: Record<string, EstatQuestao> = {};
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

export function criarBackupDisciplinasV2(
  disciplinas: Disciplina[],
  progressoInteligente: SrsProgressSnapshot,
  estatisticasDesempenho?: DesempenhoSnapshot | null,
): BackupDisciplinasV2 {
  const base: BackupDisciplinasV2 = {
    format: BACKUP_FORMAT,
    version: 2,
    exportedAt: new Date().toISOString(),
    disciplinas: disciplinas.map(sanitizarDisciplina),
    progressoInteligente: sanitizarProgressoInteligente(progressoInteligente),
  };
  if (estatisticasDesempenho && Object.keys(estatisticasDesempenho.porDisciplina).length > 0) {
    base.estatisticasDesempenho = sanitizarDesempenho(estatisticasDesempenho);
  }
  return base;
}

export function serializarBackupDisciplinas(
  disciplinas: Disciplina[],
  progressoInteligente?: SrsProgressSnapshot | null,
  estatisticasDesempenho?: DesempenhoSnapshot | null,
): string {
  const progresso: SrsProgressSnapshot = progressoInteligente ?? { porDisciplina: {} };
  return JSON.stringify(
    criarBackupDisciplinasV2(disciplinas, progresso, estatisticasDesempenho ?? undefined),
    null,
    2,
  );
}

function validarBackupV1(payload: unknown): payload is BackupDisciplinasV1 {
  return (
    isRecord(payload) &&
    payload.format === BACKUP_FORMAT &&
    payload.version === 1 &&
    typeof payload.exportedAt === 'string' &&
    Array.isArray(payload.disciplinas) &&
    payload.disciplinas.every(validarDisciplina)
  );
}

function validarBackupV2(payload: unknown): payload is BackupDisciplinasV2 {
  if (
    !isRecord(payload) ||
    payload.format !== BACKUP_FORMAT ||
    payload.version !== 2 ||
    typeof payload.exportedAt !== 'string' ||
    !Array.isArray(payload.disciplinas) ||
    !payload.disciplinas.every(validarDisciplina) ||
    !validarProgressoInteligente(payload.progressoInteligente)
  ) {
    return false;
  }
  if (
    payload.estatisticasDesempenho !== undefined &&
    !validarEstatisticasDesempenho(payload.estatisticasDesempenho)
  ) {
    return false;
  }
  return true;
}

export function parseBackupDisciplinas(texto: string): ParsedBackup {
  let payload: unknown;

  try {
    payload = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo selecionado nao contem um JSON valido.');
  }

  if (validarBackupV2(payload)) {
    return {
      disciplinas: payload.disciplinas.map(sanitizarDisciplina),
      progressoInteligente: sanitizarProgressoInteligente(payload.progressoInteligente),
      estatisticasDesempenho: payload.estatisticasDesempenho
        ? sanitizarDesempenho(payload.estatisticasDesempenho)
        : null,
    };
  }

  if (validarBackupV1(payload)) {
    return {
      disciplinas: payload.disciplinas.map(sanitizarDisciplina),
      progressoInteligente: null,
      estatisticasDesempenho: null,
    };
  }

  throw new Error('O arquivo JSON nao segue o formato esperado pelo app (v1 ou v2).');
}

export function criarNomeArquivoBackup(nome?: string): string {
  const data = new Date().toISOString().slice(0, 10);

  if (!nome) {
    return `disciplinas-backup-${data}.json`;
  }

  const slug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'disciplina'}-${data}.json`;
}
