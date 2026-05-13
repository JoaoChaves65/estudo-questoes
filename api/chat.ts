import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  isAllowedGeminiChatModelId,
  type GeminiChatAllowedModelId,
} from '../shared/geminiAllowedModels.js';

const MAX_INPUT_CHARS = 12_000;

const DEFAULT_MODEL: GeminiChatAllowedModelId = 'gemini-2.5-flash';
const DEFAULT_ANSWER_MODE = 'curta';
const BASE_SYSTEM_INSTRUCTION =
  'PT-BR apenas. Sem tradução. Responda só o texto final. Sem raciocínio, etapas, checklist ou notas técnicas. Seja direto. Sem base? diga que não dá para concluir.';

type AnswerMode = 'curta' | 'normal' | 'detalhada';

const ANSWER_MODE_CONFIG: Record<AnswerMode, { maxOutputTokens: number; instruction: string }> = {
  curta: {
    maxOutputTokens: 256,
    instruction: 'Resposta curta: até 3 frases.',
  },
  normal: {
    maxOutputTokens: 512,
    instruction: 'Resposta normal: explique o essencial sem alongar.',
  },
  detalhada: {
    maxOutputTokens: 1024,
    instruction: 'Resposta detalhada quando necessário, sem enrolar.',
  },
};

let localEnvCache: Record<string, string> | undefined;

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readLocalEnv(): Record<string, string> {
  if (localEnvCache) {
    return localEnvCache;
  }

  localEnvCache = {};
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) {
    return localEnvCache;
  }

  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match) {
      localEnvCache[match[1]] = parseEnvValue(match[2]);
    }
  }
  return localEnvCache;
}

function getServerEnv(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) {
    return fromProcess;
  }

  if (process.env.VERCEL_ENV === 'production') {
    return undefined;
  }

  return readLocalEnv()[name]?.trim();
}

function parseBody(req: VercelRequest): unknown {
  const raw = req.body;
  if (raw == null) {
    return undefined;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }
  return raw;
}

function normalizeInputText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveEnvFallbackModel(): GeminiChatAllowedModelId {
  const fromEnv = getServerEnv('GEMINI_MODEL');
  if (fromEnv && isAllowedGeminiChatModelId(fromEnv)) {
    return fromEnv;
  }
  return DEFAULT_MODEL;
}

function resolveAnswerMode(value: unknown): AnswerMode {
  return value === 'normal' || value === 'detalhada' || value === 'curta'
    ? value
    : DEFAULT_ANSWER_MODE;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Modelo inexistente ou não exposto a generateContent nesta chave (ex.: 404 na REST). */
function isModelUnavailableError(e: unknown): boolean {
  const msg = errorMessage(e);
  const lower = msg.toLowerCase();
  if (/\b404\b/.test(msg)) {
    return true;
  }
  return (
    (lower.includes('not found') && lower.includes('models')) ||
    lower.includes('is not supported for generatecontent') ||
    lower.includes('call listmodels')
  );
}

function isQuotaOrRateLimitError(e: unknown): boolean {
  const msg = errorMessage(e);
  if (isModelUnavailableError(e)) {
    return false;
  }
  const lower = msg.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('resource_exhausted') ||
    lower.includes('too many requests') ||
    (lower.includes('exhausted') && !lower.includes('not found'))
  );
}

function isTemporaryGoogleError(e: unknown): boolean {
  const msg = errorMessage(e);
  if (isModelUnavailableError(e) || isQuotaOrRateLimitError(e)) {
    return false;
  }
  const lower = msg.toLowerCase();
  return (
    /\b5\d\d\b/.test(msg) ||
    lower.includes('internal server error') ||
    lower.includes('internal error encountered') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('service unavailable')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function looksLikeInternalDraft(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('language:') ||
    lower.includes('constraint:') ||
    lower.includes('constraints:') ||
    lower.includes('only final answer') ||
    lower.includes('only final text') ||
    lower.includes('no internal reasoning') ||
    lower.includes('no reasoning') ||
    lower.includes('no reasoning/steps') ||
    lower.includes('objective and concise') ||
    lower.includes('portuguese (brazil)?') ||
    lower.includes('normal response:') ||
    lower.includes('the user is asking') ||
    lower.includes('as an ai,') ||
    /^\s*[*-]\s+user(?:\s+question)?:/im.test(text)
  );
}

function stripOuterQuotes(text: string): string {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function cleanLeakedInternalDraft(text: string): string {
  const trimmed = text.trim();
  if (!looksLikeInternalDraft(trimmed)) {
    return trimmed;
  }

  const quotedCandidates = [...trimmed.matchAll(/"([^"]{3,})"/g)]
    .map((match) => match[1].trim())
    .filter((candidate) => !looksLikeInternalDraft(candidate));
  const lastQuotedCandidate = quotedCandidates.at(-1);
  if (lastQuotedCandidate) {
    const quotedText = `"${lastQuotedCandidate}"`;
    const lastQuotedIndex = trimmed.lastIndexOf(quotedText);
    const afterLastQuote =
      lastQuotedIndex >= 0 ? stripOuterQuotes(trimmed.slice(lastQuotedIndex + quotedText.length)) : '';

    if (afterLastQuote && !looksLikeInternalDraft(afterLastQuote)) {
      return afterLastQuote;
    }
    return lastQuotedCandidate;
  }

  const fallback = trimmed
    .split(/\r?\n/)
    .map((line) => stripOuterQuotes(line))
    .filter(Boolean)
    .reverse()
    .find((line) => !looksLikeInternalDraft(line) && !/^\s*[*-]\s/.test(line));

  return fallback ?? trimmed;
}

function cleanLeadingTranslation(text: string): string {
  return text.replace(/^\([A-Za-z][A-Za-z\s,.'!?;:-]{2,}\)\s*/, '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = getServerEnv('GEMINI_API_KEY');
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
    return;
  }

  const body = parseBody(req) as
    | { prompt?: unknown; messages?: unknown; model?: unknown; answerMode?: unknown }
    | undefined;
  let textIn = '';

  if (typeof body?.prompt === 'string' && body.prompt.trim()) {
    textIn = body.prompt;
  } else if (Array.isArray(body?.messages)) {
    const parts: string[] = [];
    for (const m of body.messages) {
      if (
        m &&
        typeof m === 'object' &&
        'role' in m &&
        'content' in m &&
        typeof (m as { role: unknown }).role === 'string' &&
        typeof (m as { content: unknown }).content === 'string'
      ) {
        const msg = m as { role: string; content: string };
        parts.push(`${msg.role}: ${msg.content}`);
      }
    }
    textIn = parts.join('\n');
  }

  textIn = normalizeInputText(textIn);

  if (!textIn) {
    res.status(400).json({ error: 'Envie { prompt: string } ou { messages: [{ role, content }] }.' });
    return;
  }

  if (textIn.length > MAX_INPUT_CHARS) {
    textIn = textIn.slice(0, MAX_INPUT_CHARS);
  }

  let modelId: GeminiChatAllowedModelId;
  const requestedRaw = typeof body?.model === 'string' ? body.model.trim() : '';
  if (requestedRaw) {
    if (!isAllowedGeminiChatModelId(requestedRaw)) {
      res.status(400).json({
        error: `Modelo não permitido: "${requestedRaw}". Escolhe um dos modelos da lista na página.`,
      });
      return;
    }
    modelId = requestedRaw;
  } else {
    modelId = resolveEnvFallbackModel();
  }
  const answerMode = resolveAnswerMode(body?.answerMode);
  const answerConfig = ANSWER_MODE_CONFIG[answerMode];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: `${BASE_SYSTEM_INSTRUCTION} ${answerConfig.instruction}`,
      generationConfig: {
        maxOutputTokens: answerConfig.maxOutputTokens,
        temperature: 0.35,
      },
    });

    let result;
    try {
      result = await model.generateContent(textIn);
    } catch (e) {
      if (!isTemporaryGoogleError(e)) {
        throw e;
      }
      await delay(600);
      result = await model.generateContent(textIn);
    }
    const text = cleanLeadingTranslation(cleanLeakedInternalDraft(result.response.text()));

    res.status(200).json({ text, model: modelId, answerMode });
  } catch (e) {
    const message = errorMessage(e);
    if (isModelUnavailableError(e)) {
      res.status(400).json({
        error:
          'Este modelo não está disponível para a sua chave ou mudou de nome na Google. Escolha outro na lista ou confira em Google AI Studio quais modelos a sua API key pode usar.',
        code: 'model_unavailable',
      });
      return;
    }
    if (isQuotaOrRateLimitError(e)) {
      res.status(429).json({
        error:
          'Limite de uso ou quota atingida para este modelo na Google. Tente outro modelo da lista (por exemplo Gemini 2.5 Flash ou Gemma 4), aguarde alguns minutos ou confira quotas no AI Studio.',
        code: 'quota_or_rate_limit',
      });
      return;
    }
    if (isTemporaryGoogleError(e)) {
      res.status(503).json({
        error:
          'A Google teve uma instabilidade temporária com este modelo. Tente de novo em alguns segundos ou escolha outro modelo da lista.',
        code: 'google_temporary_error',
      });
      return;
    }
    res.status(502).json({ error: message });
  }
}
