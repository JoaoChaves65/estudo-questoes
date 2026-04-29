import { v4 as uuidv4 } from 'uuid';

import type {
  Alternativa,
  Questao,
  QuestaoParseAviso,
  QuestaoParseErro,
  ResultadoParseQuestoes,
} from '../types';

const REGEX_GABARITO = /GABARITO\s*:\s*([A-Z])/i;
const REGEX_FEEDBACK = /FEEDBACK\/COMENT[ÁA]RIO\s*:/i;
const REGEX_QUESTAO_INICIO = /^\s*(\d+)\)\s+/gm;
const REGEX_ALTERNATIVA_INICIO = /^\s*([A-E])\)\s*/gm;

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

function detectarMarcadoresNumerados(texto: string): number[] {
  return [...texto.matchAll(REGEX_QUESTAO_INICIO)]
    .map((match) => match.index ?? -1)
    .filter((indice) => indice >= 0);
}

function extrairAlternativas(secao: string): Alternativa[] {
  const correspondencias = [...secao.matchAll(REGEX_ALTERNATIVA_INICIO)];

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

type GrupoAlternativas = {
  inicio: number;
  fim: number;
  alternativas: Alternativa[];
};

function extrairGruposAlternativas(secao: string): GrupoAlternativas[] {
  const correspondencias = [...secao.matchAll(REGEX_ALTERNATIVA_INICIO)];

  if (correspondencias.length === 0) {
    return [];
  }

  const grupos: GrupoAlternativas[] = [];

  for (let i = 0; i < correspondencias.length; i += 1) {
    const match = correspondencias[i];
    if (match[1].toUpperCase() !== 'A') {
      continue;
    }

    const inicio = match.index ?? 0;
    let ultimoIndiceNoGrupo = i;
    let letraEsperada = 'B'.charCodeAt(0);

    for (let j = i + 1; j < correspondencias.length; j += 1) {
      const letraAtual = correspondencias[j][1].toUpperCase().charCodeAt(0);

      if (letraAtual === letraEsperada) {
        ultimoIndiceNoGrupo = j;
        letraEsperada += 1;
        continue;
      }

      if (correspondencias[j][1].toUpperCase() === 'A') {
        break;
      }

      break;
    }

    const fim =
      ultimoIndiceNoGrupo + 1 < correspondencias.length
        ? (correspondencias[ultimoIndiceNoGrupo + 1].index ?? secao.length)
        : secao.length;
    const alternativas = extrairAlternativas(secao.slice(inicio, fim));

    if (alternativas.length >= 2) {
      grupos.push({
        inicio,
        fim,
        alternativas,
      });
    }
  }

  return grupos;
}

function extrairQuestao(
  bloco: string,
  indice: number,
): { questao: Questao | null; erro: QuestaoParseErro | null; avisos: QuestaoParseAviso[] } {
  const numeroQuestao = bloco.match(/^\s*(\d+)\)/)?.[1] ?? `${indice + 1}`;
  const corpo = bloco.replace(/^\s*\d+\)\s*/, '').trim();
  const avisos: QuestaoParseAviso[] = [];

  const indiceJustificativa = corpo.search(/Justificativa\s*:/i);
  const indiceGabarito = corpo.search(/GABARITO\s*:/i);
  const indiceFeedback = corpo.search(REGEX_FEEDBACK);
  const indiceExplicacao = corpo.search(/Explica[cç][aã]o\s*:/i);
  const fimAlternativas = primeiroIndiceValido(
    indiceJustificativa,
    indiceGabarito,
    indiceFeedback,
    indiceExplicacao,
  );

  const indiceSecaoAlternativas = corpo.search(/^\s*Alternativas?\s*:?/im);
  const inicioBuscaAlternativas = indiceSecaoAlternativas >= 0 ? indiceSecaoAlternativas : 0;
  const limiteBuscaAlternativas = fimAlternativas >= 0 ? fimAlternativas : corpo.length;
  const secaoBusca = corpo.slice(inicioBuscaAlternativas, limiteBuscaAlternativas);
  const gruposAlternativas = extrairGruposAlternativas(secaoBusca);
  const grupoEscolhido = gruposAlternativas[gruposAlternativas.length - 1];
  const possuiBlocosAssociacao =
    /Bloco\s*1\s*:/i.test(corpo) && /Bloco\s*2\s*:/i.test(corpo);

  if (gruposAlternativas.length > 1 && !possuiBlocosAssociacao) {
    avisos.push({
      indice,
      numeroQuestao,
      motivo:
        'Foram encontrados multiplos blocos de alternativas; o parser utilizou o bloco mais proximo do gabarito.',
    });
  }

  if (!grupoEscolhido) {
    return {
      questao: null,
      erro: {
        indice,
        numeroQuestao,
        motivo: 'Nao foi encontrada uma secao valida de alternativas (A-E).',
        blocoOriginal: bloco,
      },
      avisos,
    };
  }

  const inicioAlternativas = inicioBuscaAlternativas + grupoEscolhido.inicio;
  const fimAlternativasSelecionado = inicioBuscaAlternativas + grupoEscolhido.fim;
  const enunciado = limparCampo(corpo.slice(0, inicioAlternativas));
  const alternativas = grupoEscolhido.alternativas;
  const respostaCorreta = (corpo.match(REGEX_GABARITO)?.[1] ?? '').toUpperCase();

  let explicacao = '';
  const matchFeedback = corpo.match(REGEX_FEEDBACK);
  const matchExplicacao = corpo.match(/Explica[cç][aã]o\s*:/i);

  if (matchFeedback?.index !== undefined) {
    explicacao = limparCampo(
      corpo.slice(matchFeedback.index + matchFeedback[0].length),
    );
  } else if (matchExplicacao?.index !== undefined) {
    explicacao = limparCampo(
      corpo.slice(matchExplicacao.index + matchExplicacao[0].length),
    );
  } else if (indiceGabarito >= 0) {
    explicacao = limparCampo(corpo.slice(indiceGabarito, corpo.length));
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
      avisos,
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
      avisos,
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
      avisos,
    };
  }

  if (!alternativas.some((alternativa) => alternativa.letra === respostaCorreta)) {
    avisos.push({
      indice,
      numeroQuestao,
      motivo: `O gabarito ${respostaCorreta} nao corresponde as alternativas extraidas.`,
    });
  }

  if (indiceSecaoAlternativas < 0 && gruposAlternativas.length > 1 && !possuiBlocosAssociacao) {
    avisos.push({
      indice,
      numeroQuestao,
      motivo:
        'Secao "Alternativas" nao foi encontrada; parser aplicou fallback pelo bloco de alternativas mais proximo do gabarito.',
    });
  }

  if (inicioAlternativas > fimAlternativasSelecionado) {
    avisos.push({
      indice,
      numeroQuestao,
      motivo: 'Bloco de alternativas apresenta delimitacao ambigua.',
    });
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
    avisos,
  };
}

export function parseQuestoesComDiagnostico(texto: string): ResultadoParseQuestoes {
  const textoNormalizado = normalizarTextoBase(texto);

  if (!textoNormalizado) {
    return {
      questoes: [],
      erros: [],
      avisos: [],
    };
  }

  const marcadoresNumerados = detectarMarcadoresNumerados(textoNormalizado);

  if (marcadoresNumerados.length === 0) {
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
      avisos: [],
    };
  }

  const blocos = marcadoresNumerados.map((inicio, index) =>
    textoNormalizado.slice(inicio, marcadoresNumerados[index + 1] ?? textoNormalizado.length),
  );

  const resultados = blocos.map((bloco, index) => extrairQuestao(bloco, index));

  return {
    questoes: resultados
      .map((resultado) => resultado.questao)
      .filter((questao): questao is Questao => questao !== null),
    erros: resultados
      .map((resultado) => resultado.erro)
      .filter((erro): erro is QuestaoParseErro => erro !== null),
    avisos: resultados.flatMap((resultado) => resultado.avisos),
  };
}

export function parseQuestoes(texto: string): Questao[] {
  return parseQuestoesComDiagnostico(texto).questoes;
}
