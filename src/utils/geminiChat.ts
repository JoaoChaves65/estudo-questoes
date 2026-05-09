/**
 * Chama a rota serverless `/api/chat` (Gemini na Vercel). Não envia chave do cliente.
 */
export async function chatGemini(prompt: string): Promise<string> {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = (await r.json().catch(() => ({}))) as { text?: string; error?: string };

  if (!r.ok) {
    throw new Error(data.error ?? r.statusText);
  }

  if (typeof data.text !== 'string') {
    throw new Error('Resposta inválida do servidor.');
  }

  return data.text;
}
