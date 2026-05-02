import type { EstatQuestao } from '../types';

export type TipoRegistroDesempenho = 'acerto' | 'erro' | 'pular';

export function estatVazia(): EstatQuestao {
  return { acertos: 0, erros: 0, puladas: 0 };
}

export function registrarNoEstat(
  anterior: EstatQuestao | undefined,
  tipo: TipoRegistroDesempenho,
): EstatQuestao {
  const b = anterior ? { ...anterior } : estatVazia();
  if (tipo === 'acerto') {
    b.acertos += 1;
  } else if (tipo === 'erro') {
    b.erros += 1;
  } else {
    b.puladas += 1;
  }
  return b;
}
