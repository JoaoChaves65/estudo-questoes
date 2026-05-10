import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_INPUT_CHARS = 12_000;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
    return;
  }

  const body = parseBody(req) as { prompt?: unknown; messages?: unknown } | undefined;
  let textIn = '';

  if (typeof body?.prompt === 'string' && body.prompt.trim()) {
    textIn = body.prompt.trim();
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
    textIn = parts.join('\n').trim();
  }

  if (!textIn) {
    res.status(400).json({ error: 'Envie { prompt: string } ou { messages: [{ role, content }] }.' });
    return;
  }

  if (textIn.length > MAX_INPUT_CHARS) {
    textIn = textIn.slice(0, MAX_INPUT_CHARS);
  }

  const modelId = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction:
        'Responda em português do Brasil. Seja objetivo e conciso. Se não houver base suficiente, diga que não dá para concluir.',
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.35,
      },
    });

    const result = await model.generateContent(textIn);
    const text = result.response.text();

    res.status(200).json({ text });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao chamar o modelo.';
    res.status(502).json({ error: message });
  }
}
