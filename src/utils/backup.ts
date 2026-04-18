import type {
  Alternativa,
  BackupDisciplinas,
  Disciplina,
  Questao,
} from '../types';

const BACKUP_FORMAT = 'estudo-questoes';
const BACKUP_VERSION = 1;

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

export function criarBackupDisciplinas(
  disciplinas: Disciplina[],
): BackupDisciplinas {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    disciplinas: disciplinas.map(sanitizarDisciplina),
  };
}

export function serializarBackupDisciplinas(disciplinas: Disciplina[]): string {
  return JSON.stringify(criarBackupDisciplinas(disciplinas), null, 2);
}

export function validarBackupDisciplinas(
  payload: unknown,
): payload is BackupDisciplinas {
  return (
    isRecord(payload) &&
    payload.format === BACKUP_FORMAT &&
    payload.version === BACKUP_VERSION &&
    typeof payload.exportedAt === 'string' &&
    Array.isArray(payload.disciplinas) &&
    payload.disciplinas.every(validarDisciplina)
  );
}

export function parseBackupDisciplinas(texto: string): BackupDisciplinas {
  let payload: unknown;

  try {
    payload = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo selecionado nao contem um JSON valido.');
  }

  if (!validarBackupDisciplinas(payload)) {
    throw new Error('O arquivo JSON nao segue o formato esperado pelo app.');
  }

  return {
    ...payload,
    disciplinas: payload.disciplinas.map(sanitizarDisciplina),
  };
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
