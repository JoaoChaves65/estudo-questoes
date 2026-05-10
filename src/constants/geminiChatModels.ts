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
    dropdownLabel: 'Gemini 2.5 Flash — ideal para o dia a dia de estudo',
    destaque: 'Rápido, equilibrado e confiável',
    texto:
      'Ótimo para esclarecer dúvidas, resumir matéria e conversar com você enquanto estuda. É a escolha natural quando você quer uma boa resposta sem complicar — e costuma aguentar bem várias perguntas ao longo do dia.',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    dropdownLabel: 'Gemini 2.5 Flash Lite — para muitas perguntas em sequência',
    destaque: 'Ágil e feito para uso frequente',
    texto:
      'Para quando você vai tirando dúvida atrás de dúvida — revisões rápidas, perguntas curtas, aquele ritmo de estudo mais puxado. As respostas vêm mais diretas; em tema bem pesado ou texto bem longo, outro modelo pode te dar mais profundidade.',
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    dropdownLabel: 'Gemini 2.0 Flash — geração anterior, ainda muito sólida',
    destaque: 'Estável e familiar',
    texto:
      'Continua excelente para estudo no geral. Serve para comparar com os modelos mais novos ou quando essa é a versão que você já se acostumou a usar.',
  },
  {
    id: 'gemini-3-flash',
    label: 'Gemini 3 Flash',
    dropdownLabel: 'Gemini 3 Flash — geração mais recente',
    destaque: 'Um passo à frente em nuance e clareza',
    texto:
      'Para quando você quer explicações com um pouco mais de matiz e capricho, sem abrir mão da velocidade. Um bom salto em relação ao 2.5 se na sua conta esse modelo já estiver disponível.',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    dropdownLabel: 'Gemini 2.5 Pro — quando o assunto pede o máximo',
    destaque: 'O mais caprichado para raciocínio exigente',
    texto:
      'Para quando o tema aperta: análises mais longas, problemas difíceis ou texto que precisa de muito rigor. Use com critério — cada conversa “pesa” um pouco mais no seu limite do que os modelos mais rápidos, mas entrega o melhor que a família Gemini tem para texto.',
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
