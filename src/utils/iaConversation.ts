/**
 * Persistência da conversa IA no servidor (requer sessão; cookies httpOnly).
 */

export type IaServerChatMessage = {
  id: string;
  role: 'user' | 'model';
  content: string;
  model?: string;
};

export type IaConversationPayload = {
  conversationId: string;
  messages: IaServerChatMessage[];
};

async function parseErrorMessage(r: Response): Promise<string> {
  const data = (await r.json().catch(() => ({}))) as { error?: unknown };
  return typeof data.error === 'string' ? data.error : r.statusText || 'Erro no servidor.';
}

/** Retorna `null` se não autenticado (401). */
export async function fetchIaConversation(): Promise<IaConversationPayload | null> {
  const r = await fetch('/api/conversation', { credentials: 'include' });
  if (r.status === 401) {
    return null;
  }
  if (!r.ok) {
    throw new Error(await parseErrorMessage(r));
  }
  return (await r.json()) as IaConversationPayload;
}

export async function appendIaConversation(
  append: { role: 'user' | 'model'; content: string; model?: string }[],
): Promise<void> {
  const r = await fetch('/api/conversation', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ append }),
  });
  if (!r.ok) {
    throw new Error(await parseErrorMessage(r));
  }
}

export async function clearIaConversationOnServer(): Promise<void> {
  const r = await fetch('/api/conversation', { method: 'DELETE', credentials: 'include' });
  if (!r.ok) {
    throw new Error(await parseErrorMessage(r));
  }
}
