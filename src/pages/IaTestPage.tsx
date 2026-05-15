import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import { CircleHelp } from 'lucide-react';

import { AppSelect, type AppSelectOption } from '../components/AppSelect';
import {
  GEMINI_CHAT_MODEL_DEFAULT_ID,
  GEMINI_CHAT_MODELS,
  getGeminiChatModelMeta,
  type GeminiChatAllowedModelId,
} from '../constants/geminiChatModels';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  chatGemini,
  type ChatGeminiAnswerMode,
  type ChatGeminiMessage,
} from '../utils/geminiChat';
import {
  appendIaConversation,
  clearIaConversationOnServer,
  fetchIaConversation,
} from '../utils/iaConversation';

const STORAGE_KEY = 'estudo-questoes:gemini-chat-model-id';
const ANSWER_MODE_STORAGE_KEY = 'estudo-questoes:gemini-chat-answer-mode';
const RECENT_CONTEXT_MESSAGE_LIMIT = 8;

const ANSWER_MODE_OPTIONS: AppSelectOption[] = [
  { value: 'curta', label: 'Resposta curta — economiza mais tokens' },
  { value: 'normal', label: 'Resposta normal — equilíbrio' },
  { value: 'detalhada', label: 'Resposta detalhada — usa mais tokens' },
];

function readStoredModelId(): GeminiChatAllowedModelId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return GEMINI_CHAT_MODEL_DEFAULT_ID;
    }
    const found = GEMINI_CHAT_MODELS.some((m) => m.id === raw);
    return found ? (raw as GeminiChatAllowedModelId) : GEMINI_CHAT_MODEL_DEFAULT_ID;
  } catch {
    return GEMINI_CHAT_MODEL_DEFAULT_ID;
  }
}

function readStoredAnswerMode(): ChatGeminiAnswerMode {
  try {
    const raw = localStorage.getItem(ANSWER_MODE_STORAGE_KEY);
    return raw === 'normal' || raw === 'detalhada' || raw === 'curta' ? raw : 'curta';
  } catch {
    return 'curta';
  }
}

type IaTestPageProps = {
  onVoltar: () => void;
};

type IaChatMessage = ChatGeminiMessage & {
  id: string;
  model?: string;
};

function createMessageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function IaTestPage({ onVoltar }: IaTestPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<IaChatMessage[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [modeloId, setModeloId] = useState<GeminiChatAllowedModelId>(() => readStoredModelId());
  const [answerMode, setAnswerMode] = useState<ChatGeminiAnswerMode>(() => readStoredAnswerMode());
  const [modalInfoAberto, setModalInfoAberto] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, modeloId);
    } catch {
      /* ignore */
    }
  }, [modeloId]);

  useEffect(() => {
    try {
      localStorage.setItem(ANSWER_MODE_STORAGE_KEY, answerMode);
    } catch {
      /* ignore */
    }
  }, [answerMode]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchIaConversation();
        if (cancelled || !data) {
          return;
        }
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            ...(m.model ? { model: m.model } : {}),
          })),
        );
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Não foi possível carregar a conversa sincronizada.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  const metaSelecionado = useMemo(() => getGeminiChatModelMeta(modeloId), [modeloId]);

  const subtituloPagina = useMemo(() => {
    const base = 'Chamada experimental ao Gemini pela rota /api/chat (chave só no servidor).';
    if (user) {
      return `${base} Com sessão iniciada, o histórico desta página guarda‑se na sua conta entre dispositivos.`;
    }
    return `${base} Sem conta, o histórico fica só neste navegador até recarregar ou limpar a conversa.`;
  }, [user]);

  const opcoesModelo = useMemo<AppSelectOption[]>(
    () => GEMINI_CHAT_MODELS.map((m) => ({ value: m.id, label: m.dropdownLabel })),
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const texto = prompt.trim();
    if (!texto || carregando) {
      return;
    }
    setErro('');
    setCarregando(true);
    setPrompt('');

    const userMessage: IaChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: texto,
    };
    const nextMessages = [...messages, userMessage];
    const contextMessages = nextMessages
      .slice(-RECENT_CONTEXT_MESSAGE_LIMIT)
      .map(({ role, content }) => ({ role, content }));
    setMessages(nextMessages);

    try {
      const { text, model } = await chatGemini(texto, {
        messages: contextMessages,
        model: modeloId,
        answerMode,
      });
      const modeloResolvido = model ?? modeloId;
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'model',
          content: text,
          model: modeloResolvido,
        },
      ]);
      if (user) {
        try {
          await appendIaConversation([
            { role: 'user', content: texto },
            { role: 'model', content: text, model: modeloResolvido },
          ]);
        } catch (syncErr) {
          const m =
            syncErr instanceof Error ? syncErr.message : 'Erro ao guardar o histórico no servidor.';
          setErro(m);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  const handleClearChat = async () => {
    if (carregando) {
      return;
    }
    if (user) {
      try {
        await clearIaConversationOnServer();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao limpar a conversa no servidor.');
        return;
      }
    }
    setMessages([]);
    setErro('');
  };

  return (
    <Layout
      titulo="Teste da IA"
      subtitulo={subtituloPagina}
      acoes={
        <div className="hero__action-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {!authLoading && user ? (
            <>
              <span className="muted" style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
                {user.email}
              </span>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void logout()}
                disabled={carregando}
              >
                Sair
              </button>
            </>
          ) : !authLoading ? (
            <>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => navigate('/login')}
                disabled={carregando}
              >
                Entrar
              </button>
              <button
                type="button"
                className="button"
                onClick={() => navigate('/registo')}
                disabled={carregando}
              >
                Registar
              </button>
            </>
          ) : null}
          <button type="button" className="button button--secondary" onClick={onVoltar}>
            Voltar
          </button>
        </div>
      }
    >
      <section className="card">
        <div className="ia-model-controls">
          <div className="desempenho-field ia-model-field ia-model-field--model">
            <div className="ia-model-heading">
              <label htmlFor="ia-modelo" className="desempenho-field__label">
                Modelo
              </label>
              <button
                type="button"
                className="button button--secondary ia-model-info-btn"
                onClick={() => setModalInfoAberto(true)}
                disabled={carregando}
                aria-label="Informações sobre o modelo selecionado"
                title="Informações sobre o modelo"
              >
                <CircleHelp size={18} aria-hidden />
              </button>
            </div>
            <AppSelect
              id="ia-modelo"
              value={modeloId}
              options={opcoesModelo}
              onChange={(v) => setModeloId(v as GeminiChatAllowedModelId)}
              listaAriaLabel="Modelos Gemini disponíveis"
              className="ia-model-app-select"
              disabled={carregando}
            />
          </div>

          <div className="desempenho-field ia-model-field ia-model-field--answer-mode">
            <label htmlFor="ia-answer-mode" className="desempenho-field__label">
              Tamanho da resposta
            </label>
            <AppSelect
              id="ia-answer-mode"
              value={answerMode}
              options={ANSWER_MODE_OPTIONS}
              onChange={(v) => setAnswerMode(v as ChatGeminiAnswerMode)}
              listaAriaLabel="Níveis de detalhe da resposta"
              className="ia-model-app-select"
              disabled={carregando}
            />
          </div>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label htmlFor="ia-prompt">Pergunta ou texto para o modelo</label>
          <textarea
            id="ia-prompt"
            className="textarea-input textarea-input--compact"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex.: Explique em 3 frases o que é habeas corpus."
            disabled={carregando}
          />
          {erro ? <p className="error-text">{erro}</p> : null}
          <button type="submit" className="button" disabled={carregando || !prompt.trim()}>
            {carregando ? 'A enviar…' : 'Enviar'}
          </button>
        </form>

        <div className="ia-chat-context-note">
          <p>
            A IA usa só as últimas {RECENT_CONTEXT_MESSAGE_LIMIT} mensagens como contexto para
            economizar tokens.
          </p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void handleClearChat()}
            disabled={carregando || messages.length === 0}
            title="Apaga o histórico usado como contexto. Ajuda a economizar tokens quando mudar de assunto."
          >
            Limpar conversa
          </button>
        </div>
      </section>

      {messages.length ? (
        <section className="card ia-chat-history">
          <div className="ia-chat-history__header">
            <h2>Conversa</h2>
            <p className="muted">
              Limpar conversa apaga o contexto atual; a próxima pergunta começa do zero.
            </p>
          </div>
          <div className="ia-chat-messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`ia-chat-message ia-chat-message--${message.role}`}
              >
                <div className="ia-chat-message__meta">
                  <strong>{message.role === 'user' ? 'Você' : 'IA'}</strong>
                  {message.model ? (
                    <span>
                      Modelo: <code>{message.model}</code>
                    </span>
                  ) : null}
                </div>
                <pre className="ia-chat-message__content">{message.content}</pre>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {modalInfoAberto && metaSelecionado ? (
        <div className="confirm-dialog-overlay" role="presentation">
          <button
            type="button"
            className="confirm-dialog-backdrop"
            aria-label="Fechar"
            onClick={() => setModalInfoAberto(false)}
          />
          <div
            className="confirm-dialog-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ia-model-info-title"
          >
            <h2 id="ia-model-info-title" className="confirm-dialog-title">
              {metaSelecionado.label}
            </h2>
            <p className="confirm-dialog-description ia-model-modal-destaque" style={{ margin: '0 0 12px' }}>
              {metaSelecionado.destaque}
            </p>
            <p className="confirm-dialog-description" style={{ margin: 0, lineHeight: 1.55 }}>
              {metaSelecionado.texto}
            </p>
            <div className="confirm-dialog-actions">
              <button type="button" className="button" onClick={() => setModalInfoAberto(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
