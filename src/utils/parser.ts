import { v4 as uuidv4 } from 'uuid';

import type { Alternativa, Questao, QuestaoParseErro, ResultadoParseQuestoes } from '../types';

const REGEX_GABARITO = /GABARITO\s*:\s*([A-Z])/i;
const REGEX_FEEDBACK = /FEEDBACK\/COMENT[ÁA]RIO\s*:/i;

function normalizarTextoBase(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\(Peso:[^)]+\)/gi, ' ')
    .replace(/Nota:[^\n]+/gi, ' ')
    .replace(/Você foiAprovado[\s\S]*?Dados Consultados com Sucesso/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function limparCampo(texto: string): string {
  return texto
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function primeiroIndiceValido(...indices: number[]): number {
  const validos = indices.filter((indice) => indice >= 0);
  return validos.length > 0 ? Math.min(...validos) : -1;
}

function detectarIniciosDeQuestoes(texto: string): number[] {
  const marcadores = [...texto.matchAll(/(\d+)\)/g)];
  const indices: number[] = [];

  for (let i = 0; i < marcadores.length; i += 1) {
    const marcadorAtual = marcadores[i];
    const inicioAtual = marcadorAtual.index ?? -1;

    if (inicioAtual < 0) {
      continue;
    }

    const proximoInicio = marcadores[i + 1]?.index ?? texto.length;
    const blocoCandidato = texto.slice(inicioAtual, proximoInicio);
    const possuiAlternativaA = /A\)\s*/i.test(blocoCandidato);
    const possuiGabarito = REGEX_GABARITO.test(blocoCandidato);

    if (possuiAlternativaA && possuiGabarito) {
      indices.push(inicioAtual);
    }
  }

  return indices;
}

function detectarMarcadoresNumerados(texto: string): number[] {
  return [...texto.matchAll(/(\d+)\)/g)]
    .map((match) => match.index ?? -1)
    .filter((indice) => indice >= 0);
}

function extrairAlternativas(secao: string): Alternativa[] {
  const correspondencias = [...secao.matchAll(/([A-Z])\)\s*/g)];

  if (correspondencias.length === 0) {
    return [];
  }

  return correspondencias
    .map((match, index) => {
      const inicioMarcador = match.index ?? 0;
      const inicioTexto = inicioMarcador + match[0].length;
      const fimTexto =
        index + 1 < correspondencias.length
          ? (correspondencias[index + 1].index ?? secao.length)
          : secao.length;

      return {
        letra: match[1].toUpperCase(),
        texto: limparCampo(secao.slice(inicioTexto, fimTexto)),
      };
    })
    .filter((alternativa) => alternativa.texto.length > 0);
}

function extrairQuestao(
  bloco: string,
  indice: number,
): { questao: Questao | null; erro: QuestaoParseErro | null } {
  const numeroQuestao = bloco.match(/^\s*(\d+)\)/)?.[1] ?? `${indice + 1}`;
  const corpo = bloco.replace(/^\s*\d+\)\s*/, '').trim();
  const indiceAlternativaA = corpo.search(/A\)\s*/i);

  if (indiceAlternativaA < 0) {
    return {
      questao: null,
      erro: {
        indice,
        numeroQuestao,
        motivo: 'Nao foi encontrada a alternativa A) nesta questao.',
        blocoOriginal: bloco,
      },
    };
  }

  const indiceJustificativa = corpo.search(/Justificativa\s*:/i);
  const indiceGabarito = corpo.search(/GABARITO\s*:/i);
  const indiceFeedback = corpo.search(REGEX_FEEDBACK);
  const fimAlternativas = primeiroIndiceValido(
    indiceJustificativa,
    indiceGabarito,
    indiceFeedback,
  );

  const enunciado = limparCampo(corpo.slice(0, indiceAlternativaA));
  const secaoAlternativas = corpo.slice(
    indiceAlternativaA,
    fimAlternativas >= 0 ? fimAlternativas : corpo.length,
  );
  const alternativas = extrairAlternativas(secaoAlternativas);
  const respostaCorreta = (corpo.match(REGEX_GABARITO)?.[1] ?? '').toUpperCase();

  let explicacao = '';
  const matchFeedback = corpo.match(REGEX_FEEDBACK);

  if (matchFeedback?.index !== undefined) {
    explicacao = limparCampo(
      corpo.slice(matchFeedback.index + matchFeedback[0].length),
    );
  } else if (indiceGabarito >= 0) {
    explicacao = limparCampo(corpo.slice(indiceGabarito));
  }

  if (!enunciado) {
    return {
      questao: null,
      erro: {
        indice,
        numeroQuestao,
        motivo: 'O enunciado da questao nao foi identificado.',
        blocoOriginal: bloco,
      },
    };
  }

  if (alternativas.length === 0) {
    return {
      questao: null,
      erro: {
        indice,
        numeroQuestao,
        motivo: 'Nenhuma alternativa valida foi extraida.',
        blocoOriginal: bloco,
      },
    };
  }

  if (!respostaCorreta) {
    return {
      questao: null,
      erro: {
        indice,
        numeroQuestao,
        motivo: 'O gabarito nao foi encontrado.',
        blocoOriginal: bloco,
      },
    };
  }

  return {
    questao: {
      id: uuidv4(),
      enunciado,
      alternativas,
      respostaCorreta,
      explicacao,
    },
    erro: null,
  };
}

export function parseQuestoesComDiagnostico(texto: string): ResultadoParseQuestoes {
  const textoNormalizado = normalizarTextoBase(texto);

  if (!textoNormalizado) {
    return {
      questoes: [],
      erros: [],
    };
  }

  const inicios = detectarIniciosDeQuestoes(textoNormalizado);
  const marcadoresNumerados = detectarMarcadoresNumerados(textoNormalizado);

  if (inicios.length === 0) {
    if (marcadoresNumerados.length > 0) {
      const blocosParciais = marcadoresNumerados.map((inicio, index) =>
        textoNormalizado.slice(
          inicio,
          marcadoresNumerados[index + 1] ?? textoNormalizado.length,
        ),
      );

      const resultadosParciais = blocosParciais.map((bloco, index) =>
        extrairQuestao(bloco, index),
      );

      const errosEspecificos = resultadosParciais
        .map((resultado) => resultado.erro)
        .filter((erro): erro is QuestaoParseErro => erro !== null);

      if (errosEspecificos.length > 0) {
        return {
          questoes: [],
          erros: errosEspecificos,
        };
      }
    }

    return {
      questoes: [],
      erros: [
        {
          indice: 0,
          numeroQuestao: 'N/A',
          motivo: 'Nenhum bloco de questao valido foi detectado no texto informado.',
          blocoOriginal: textoNormalizado,
        },
      ],
    };
  }

  const blocos = inicios.map((inicio, index) =>
    textoNormalizado.slice(inicio, inicios[index + 1] ?? textoNormalizado.length),
  );

  const resultados = blocos.map((bloco, index) => extrairQuestao(bloco, index));

  return {
    questoes: resultados
      .map((resultado) => resultado.questao)
      .filter((questao): questao is Questao => questao !== null),
    erros: resultados
      .map((resultado) => resultado.erro)
      .filter((erro): erro is QuestaoParseErro => erro !== null),
  };
}

export function parseQuestoes(texto: string): Questao[] {
  return parseQuestoesComDiagnostico(texto).questoes;
}
