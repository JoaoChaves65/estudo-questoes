import type { Questao } from '../types';
import { shuffleArray } from './shuffle';

export function extrairUltimoBlocoCoerente(alternativas: Questao['alternativas']) {
  const blocos: Questao['alternativas'][] = [];

  for (let i = 0; i < alternativas.length; i += 1) {
    if (alternativas[i]?.letra !== 'A') {
      continue;
    }

    const blocoAtual: Questao['alternativas'] = [alternativas[i]];
    const usadas = new Set<string>(['A']);

    for (let j = i + 1; j < alternativas.length; j += 1) {
      const letra = alternativas[j]?.letra;

      if (!letra || usadas.has(letra)) {
        break;
      }

      blocoAtual.push(alternativas[j]);
      usadas.add(letra);

      if (letra === 'E') {
        break;
      }
    }

    if (blocoAtual.length >= 2) {
      blocos.push(blocoAtual);
    }
  }

  return blocos[blocos.length - 1] ?? [];
}

export function normalizarQuestaoLegada(questao: Questao): Questao {
  const blocoFinal = extrairUltimoBlocoCoerente(questao.alternativas);

  if (blocoFinal.length === 0) {
    return questao;
  }

  const letrasValidas = new Set(blocoFinal.map((alternativa) => alternativa.letra));
  const respostaCorreta = letrasValidas.has(questao.respostaCorreta)
    ? questao.respostaCorreta
    : blocoFinal[0]?.letra ?? questao.respostaCorreta;

  return {
    ...questao,
    alternativas: blocoFinal,
    respostaCorreta,
  };
}

export function embaralharTextosDasAlternativas(questao: Questao): Questao {
  const textosEmbaralhados = shuffleArray(
    questao.alternativas.map((alternativa) => ({
      texto: alternativa.texto,
      letraOriginal: alternativa.letra,
    })),
  );

  const alternativas = questao.alternativas.map((alternativa, index) => ({
    letra: alternativa.letra,
    texto: textosEmbaralhados[index]?.texto ?? alternativa.texto,
  }));

  const novaRespostaCorreta =
    alternativas.find(
      (_alternativa, index) =>
        textosEmbaralhados[index]?.letraOriginal === questao.respostaCorreta,
    )?.letra ?? questao.respostaCorreta;

  return {
    ...questao,
    alternativas,
    respostaCorreta: novaRespostaCorreta,
  };
}

export function prepararQuestaoParaExibicao(questao: Questao): Questao {
  return embaralharTextosDasAlternativas(normalizarQuestaoLegada(questao));
}
