import type {
  DesempenhoSnapshot,
  Disciplina,
  SrsProgressSnapshot,
} from '../types';

export type StudyLibraryApiResponse = {
  empty: boolean;
  disciplinas: Disciplina[];
  progressoInteligente: SrsProgressSnapshot;
  estatisticasDesempenho: DesempenhoSnapshot | null;
};

async function parseJsonErrorMessage(r: Response): Promise<string> {
  const data = (await r.json().catch(() => ({}))) as { error?: unknown };
  return typeof data.error === 'string' ? data.error : r.statusText || 'Erro no servidor.';
}

export async function fetchStudyLibrary(): Promise<StudyLibraryApiResponse> {
  const r = await fetch('/api/study-library', { credentials: 'include' });
  if (r.status === 401) {
    throw new Error('Sessão expirada ou não autenticado.');
  }
  if (!r.ok) {
    throw new Error(await parseJsonErrorMessage(r));
  }
  const data = (await r.json()) as StudyLibraryApiResponse;
  return data;
}

export async function putStudyLibrary(bundle: {
  disciplinas: Disciplina[];
  progressoInteligente: SrsProgressSnapshot;
  estatisticasDesempenho?: DesempenhoSnapshot | null;
}): Promise<void> {
  const body: Record<string, unknown> = {
    disciplinas: bundle.disciplinas,
    progressoInteligente: bundle.progressoInteligente,
  };
  if (bundle.estatisticasDesempenho && Object.keys(bundle.estatisticasDesempenho.porDisciplina).length > 0) {
    body.estatisticasDesempenho = bundle.estatisticasDesempenho;
  }
  const r = await fetch('/api/study-library', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (r.status === 401) {
    throw new Error('Sessão expirada ou não autenticado.');
  }
  if (!r.ok) {
    throw new Error(await parseJsonErrorMessage(r));
  }
}
