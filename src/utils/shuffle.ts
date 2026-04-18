export function shuffleArray<T>(items: T[]): T[] {
  const copia = [...items];

  for (let i = copia.length - 1; i > 0; i -= 1) {
    const indiceAleatorio = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[indiceAleatorio]] = [copia[indiceAleatorio], copia[i]];
  }

  return copia;
}
