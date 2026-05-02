import type {
  Alternativa,
  BackupDisciplinasV1,
  BackupDisciplinasV2,
  Disciplina,
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

export function criarBackupDisciplinasV2(
  disciplinas: Disciplina[],
  progressoInteligente: SrsProgressSnapshot,
): BackupDisciplinasV2 {
  return {
    format: BACKUP_FORMAT,
    version: 2,
    exportedAt: new Date().toISOString(),
    disciplinas: disciplinas.map(sanitizarDisciplina),
    progressoInteligente: sanitizarProgressoInteligente(progressoInteligente),
  };
}

export function serializarBackupDisciplinas(
  disciplinas: Disciplina[],
  progressoInteligente?: SrsProgressSnapshot | null,
): string {
  const progresso: SrsProgressSnapshot = progressoInteligente ?? { porDisciplina: {} };
  return JSON.stringify(criarBackupDisciplinasV2(disciplinas, progresso), null, 2);
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
  return (
    isRecord(payload) &&
    payload.format === BACKUP_FORMAT &&
    payload.version === 2 &&
    typeof payload.exportedAt === 'string' &&
    Array.isArray(payload.disciplinas) &&
    payload.disciplinas.every(validarDisciplina) &&
    validarProgressoInteligente(payload.progressoInteligente)
  );
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
    };
  }

  if (validarBackupV1(payload)) {
    return {
      disciplinas: payload.disciplinas.map(sanitizarDisciplina),
      progressoInteligente: null,
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
