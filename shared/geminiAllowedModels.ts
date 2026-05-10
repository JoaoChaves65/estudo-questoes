/**
 * Lista branca de IDs de modelo para texto via generateContent.
 * Manter alinhado com metadados em src/constants/geminiChatModels.ts.
 */
/** Lista curada para o chat; IDs devem existir em generateContent para a chave (ex.: `gemini-3-flash` sozinho → 404, usar `-preview`). */
export const GEMINI_CHAT_ALLOWED_MODEL_IDS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  /** Painel “Gemini 3 Flash”; nome REST estável. */
  'gemini-3-flash-preview',
  /** Painel “Gemini 3.1 Flash Lite”. */
  'gemini-3.1-flash-lite',
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it',
] as const;

export type GeminiChatAllowedModelId = (typeof GEMINI_CHAT_ALLOWED_MODEL_IDS)[number];

const ALLOWED_SET = new Set<string>(GEMINI_CHAT_ALLOWED_MODEL_IDS);

export function isAllowedGeminiChatModelId(id: string): id is GeminiChatAllowedModelId {
  return ALLOWED_SET.has(id);
}
