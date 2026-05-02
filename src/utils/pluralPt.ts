/** Frases curtas com plural correto para contadores na UI */

export function contagemQuestoes(n: number): string {
  return n === 1 ? '1 questão' : `${n} questões`;
}

export function questoesAdicionadasEmDisciplina(quantidade: number, nomeDisciplina: string): string {
  const part =
    quantidade === 1
      ? '1 questão adicionada'
      : `${quantidade} questões adicionadas`;
  return `${part} em ${nomeDisciplina}.`;
}

export function errosParsingContagem(n: number): string {
  return n === 1
    ? 'Existe 1 questão com problema no parsing. Corrija o texto antes de salvar.'
    : `Existem ${n} questões com problema no parsing. Corrija o texto antes de salvar.`;
}

export function resumoAcertosErrosPuladas(acertos: number, erros: number, puladas: number): string {
  const a = acertos === 1 ? '1 acerto' : `${acertos} acertos`;
  const e = erros === 1 ? '1 erro' : `${erros} erros`;
  const p =
    puladas === 1
      ? '1 questão pulada'
      : puladas === 0
        ? 'nenhuma questão pulada'
        : `${puladas} questões puladas`;
  return `${a}, ${e} e ${p}.`;
}

export function revisaoErrosDisponivel(n: number): string {
  return n === 1
    ? 'Revisão disponível com 1 questão respondida incorretamente.'
    : `Revisão disponível com ${n} questões respondidas incorretamente.`;
}
