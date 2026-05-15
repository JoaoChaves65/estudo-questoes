const GUEST_EDITOU_BIBLIOTECA_KEY = 'estudoquestoes:guest-lib-dirty-v1';
const UTILIZADORES_ASSOC_COMPLETO_KEY = 'estudoquestoes:library-bound-user-ids-v1';

/** Marcar que houve edição SRS/desempenho/disciplinas enquanto não havia sessão. */
export function marcarBibliotecaEditadaSemSessao(): void {
  try {
    localStorage.setItem(GUEST_EDITOU_BIBLIOTECA_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function limparMarcadorBibliotecaEditadaSemSessao(): void {
  try {
    localStorage.removeItem(GUEST_EDITOU_BIBLIOTECA_KEY);
  } catch {
    /* ignore */
  }
}

export function houveBibliotecaEditadaSemSessaoRecente(): boolean {
  try {
    return localStorage.getItem(GUEST_EDITOU_BIBLIOTECA_KEY) === '1';
  } catch {
    return false;
  }
}

function lerIdsAssociacaoCompleta(): Set<string> {
  try {
    const raw = localStorage.getItem(UTILIZADORES_ASSOC_COMPLETO_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

export function utilizadorJaConcluiuAssociacaoBiblioteca(userId: string): boolean {
  return lerIdsAssociacaoCompleta().has(userId);
}

/** Depois da escolha no diálogo ou sync silencioso bem‑sucedido com este utilizador neste equipamento. */
export function registarAssociacaoBibliotecaCompletaParaUtilizador(userId: string): void {
  try {
    const s = lerIdsAssociacaoCompleta();
    s.add(userId);
    localStorage.setItem(
      UTILIZADORES_ASSOC_COMPLETO_KEY,
      JSON.stringify([...s].sort()),
    );
  } catch {
    /* ignore */
  }
}
