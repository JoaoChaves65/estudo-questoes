export function baixarTextoComoArquivo(
  conteudo: string,
  nomeArquivo: string,
  mimeType = 'application/json',
) {
  const blob = new Blob([conteudo], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
