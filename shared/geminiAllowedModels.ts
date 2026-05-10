/**
 * Lista branca de IDs de modelo para texto via generateContent.
 * Manter alinhado com metadados em src/constants/geminiChatModels.ts.
 */
export const GEMINI_CHAT_ALLOWED_MODEL_IDS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash',
] as const;

export type GeminiChatAllowedModelId = (typeof GEMINI_CHAT_ALLOWED_MODEL_IDS)[number];

const ALLOWED_SET = new Set<string>(GEMINI_CHAT_ALLOWED_MODEL_IDS);

export function isAllowedGeminiChatModelId(id: string): id is GeminiChatAllowedModelId {
  return ALLOWED_SET.has(id);
}
