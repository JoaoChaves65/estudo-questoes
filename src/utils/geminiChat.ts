/**
 * Chama a rota serverless `/api/chat` (Gemini na Vercel). Não envia chave do cliente.
 */

export type ChatGeminiOptions = {
  model?: string;
};

export type ChatGeminiResult = {
  text: string;
  /** ID do modelo usado no servidor (eco da API quando disponível). */
  model?: string;
};

export async function chatGemini(prompt: string, options?: ChatGeminiOptions): Promise<ChatGeminiResult> {
  const body: { prompt: string; model?: string } = { prompt };
  if (options?.model?.trim()) {
    body.model = options.model.trim();
  }

  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await r.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
    code?: string;
    model?: string;
  };

  if (!r.ok) {
    const msg =
      data.error ??
      (r.status === 429
        ? 'Limite de uso ou quota atingida. Tenta outro modelo ou mais tarde.'
        : r.statusText);
    throw new Error(msg);
  }

  if (typeof data.text !== 'string') {
    throw new Error('Resposta inválida do servidor.');
  }

  return {
    text: data.text,
    model: typeof data.model === 'string' ? data.model : undefined,
  };
}
