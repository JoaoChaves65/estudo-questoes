import {
  GEMINI_CHAT_ALLOWED_MODEL_IDS,
  type GeminiChatAllowedModelId,
} from '../../shared/geminiAllowedModels';

export type { GeminiChatAllowedModelId };

export type GeminiChatModelMeta = {
  id: GeminiChatAllowedModelId;
  /** Nome curto no título do modal. */
  label: string;
  /** Linha única no dropdown e no botão (como “Todas as disciplinas”). */
  dropdownLabel: string;
  /** Subtítulo elegante no modal. */
  destaque: string;
  /** Corpo do texto de ajuda, linguagem natural. */
  texto: string;
};

export const GEMINI_CHAT_MODEL_DEFAULT_ID: GeminiChatAllowedModelId = 'gemini-2.5-flash';

export const GEMINI_CHAT_MODELS: GeminiChatModelMeta[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    dropdownLabel: 'Gemini 2.5 Flash — bom para a maioria das perguntas',
    destaque: 'Equilíbrio entre velocidade e qualidade',
    texto:
      'Use no dia a dia: tirar dúvidas, pedir resumos e conversar sobre a matéria. É a opção que costuma funcionar bem para quem está estudando — nem muito “pesada”, nem superficial demais.',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    dropdownLabel: 'Gemini 2.5 Flash Lite — econômico para perguntas rápidas',
    destaque: 'Mais leve: gasta menos em revisão rápida',
    texto:
      'Use quando quiser gastar menos em perguntas curtas, uma atrás da outra — tipo revisão antes da prova. As respostas vêm mais diretas; para textos enormes ou assuntos bem difíceis, o modelo “completo” acima pode ajudar mais.',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    dropdownLabel: 'Gemini 3 Flash — modelo mais novo da Google',
    destaque: 'Atualizado em relação ao 2.5',
    texto:
      'Para quem quer experimentar a versão mais recente da linha Flash. Em geral entende bem contexto e explica com clareza. Se um dia aparecer erro de limite de uso, volte ao 2.5 Flash ou experimente outra opção da lista.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    dropdownLabel: 'Gemini 3.1 Flash Lite — leve para economizar tokens',
    destaque: 'Menos “pesado” que o Flash completo',
    texto:
      'Bom para muitas perguntas pequenas ou quando você quer economizar tokens. Pensa na linha 3.1, só que numa versão mais enxuta — ótima para uso em série durante o estudo.',
  },
  {
    id: 'gemma-4-26b-a4b-it',
    label: 'Gemma 4 (26B)',
    dropdownLabel: 'Gemma 4 — 26B (outro assistente da Google)',
    destaque: 'Às vezes funciona quando o Gemini “trava”',
    texto:
      'A Gemma é outra família de modelo da Google — parecida com um assistente de texto. Às vezes o limite de uso é contado separado do Gemini: se uma opção não responder por causa de limite, vale tentar esta e depois a Gemma 31B abaixo.',
  },
  {
    id: 'gemma-4-31b-it',
    label: 'Gemma 4 (31B)',
    dropdownLabel: 'Gemma 4 — 31B (respostas mais elaboradas)',
    destaque: 'Mais “capacidade” que a Gemma 26B',
    texto:
      'Mesma linha da Gemma 26B acima, só que costuma ir melhor em perguntas mais longas ou quando você quer uma explicação mais detalhada. Se a resposta vier grande demais, peça para resumir ou troque para uma opção mais leve.',
  },
];

function assertCoverage(): void {
  const idsInMeta = new Set(GEMINI_CHAT_MODELS.map((m) => m.id));
  for (const id of GEMINI_CHAT_ALLOWED_MODEL_IDS) {
    if (!idsInMeta.has(id)) {
      throw new Error(`geminiChatModels: falta metadados para o id "${id}"`);
    }
  }
}

assertCoverage();

export function getGeminiChatModelMeta(id: GeminiChatAllowedModelId): GeminiChatModelMeta | undefined {
  return GEMINI_CHAT_MODELS.find((m) => m.id === id);
}
