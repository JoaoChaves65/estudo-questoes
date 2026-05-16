import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import { CircleHelp } from 'lucide-react';

import { AppSelect, type AppSelectOption } from '../components/AppSelect';
import {
  GEMINI_CHAT_MODEL_DEFAULT_ID,
  GEMINI_CHAT_MODELS,
  getGeminiChatModelMeta,
  type GeminiChatAllowedModelId,
} from '../constants/geminiChatModels';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  { value: 'curta', label: 'Curta' },
  { value: 'normal', label: 'Normal' },
  { value: 'detalhada', label: 'Detalhada' },
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
  const [painelAjudaPaginaAberto, setPainelAjudaPaginaAberto] = useState(true);
  const [confirmarLimparAberto, setConfirmarLimparAberto] = useState(false);
  const [confirmarSairAberto, setConfirmarSairAberto] = useState(false);
  const [limpandoHistoricoIa, setLimpandoHistoricoIa] = useState(false);
  const [saindoConta, setSaindoConta] = useState(false);

  const rolagemListaRef = useRef<HTMLDivElement>(null);
  const fimListaRef = useRef<HTMLDivElement>(null);

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
    const el = rolagemListaRef.current;
    if (!el) {
      return;
    }
    const fim = fimListaRef.current;
    if (!fim) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    fim.scrollIntoView({ behavior: messages.length <= 2 ? 'auto' : 'smooth', block: 'end' });
  }, [messages, carregando]);

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
    return user
      ? `Histórico desta conversa salvo na sua conta (${user.email}).`
      : 'Histórico só neste navegador — limpar a conversa ou os dados do site apaga esse histórico.';
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

  const executarLimparConversaConfirmado = async () => {
    if (carregando || limpandoHistoricoIa) {
      return;
    }
    setLimpandoHistoricoIa(true);
    setErro('');
    try {
      if (user) {
        await clearIaConversationOnServer();
      }
      setMessages([]);
      setConfirmarLimparAberto(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao limpar a conversa no servidor.');
    } finally {
      setLimpandoHistoricoIa(false);
    }
  };

  const executarLogoutConfirmado = async () => {
    if (saindoConta) {
      return;
    }
    setSaindoConta(true);
    try {
      await logout();
      setConfirmarSairAberto(false);
    } finally {
      setSaindoConta(false);
    }
  };

  const tituloAjudaCurtaPorModo: Record<string, string> = {
    curta: 'Resposta mais curta; economiza mais tokens.',
    normal: 'Tamanho equilibrado da resposta.',
    detalhada: 'Resposta mais extensa; gasta mais tokens.',
  };

  return (
    <Layout
      titulo="IA · Gemini"
      omitirEyebrow
      classNameHeroAcoes="hero__actions--compact-toolbar hero__actions--ia-chat-toolbar"
      subtitulo={subtituloPagina}
      acoes={
        <div className="hero__action-buttons ia-hero-actions">
          {!authLoading && user ? (
            <button
              type="button"
              className="button button--secondary ia-hero-action-btn"
              onClick={() => setConfirmarSairAberto(true)}
              disabled={carregando || limpandoHistoricoIa}
            >
              Sair
            </button>
          ) : !authLoading ? (
            <>
              <button
                type="button"
                className="button button--secondary ia-hero-action-btn"
                onClick={() => navigate('/login')}
                disabled={carregando}
              >
                Entrar
              </button>
              <button
                type="button"
                className="button ia-hero-action-btn"
                onClick={() => navigate('/registo')}
                disabled={carregando}
              >
                Cadastrar
              </button>
            </>
          ) : null}
          <button type="button" className="button button--secondary ia-hero-action-btn" onClick={onVoltar}>
            Voltar
          </button>
        </div>
      }
    >
      <section className="card ia-chat-page-card">
        <details
          className="ia-chat-informativo"
          open={painelAjudaPaginaAberto}
          onToggle={(e) => setPainelAjudaPaginaAberto(e.currentTarget.open)}
        >
          <summary className="ia-chat-informativo__summary">
            Como funcionam modelo, modo e o contexto desta página
          </summary>
          <div className="ia-chat-informativo__corpo muted">
            <p className="ia-chat-informativo__graf">
              A lista pode mostrar bem mais linhas do que entram na próxima resposta do modelo.
              São reenviadas só as{' '}
              <strong>
                últimas {RECENT_CONTEXT_MESSAGE_LIMIT} mensagens já trocadas aqui — cada texto seu conta 1 e cada resposta da
                Gemini conta 1, na ordem do histórico
              </strong>
              . Dentro desses {RECENT_CONTEXT_MESSAGE_LIMIT} lugares você pode ver só suas falas (se mandou várias seguidas),
              só da IA ou ambas alternando — ex.: 4 perguntas + 4 respostas quando a conversa ficou assim no fim da lista.
              Trechos mais velhos continuam visíveis para leitura, mas saem temporariamente do contexto até voltarem dentro
              dessa última fatia quando você avançar a troca ou até escolher <strong>Limpar conversa</strong> no rodapé.
            </p>
            <ul className="ia-chat-informativo__lista">
              <li>
                <strong>Modelo</strong> — Qual variante Gemini responde; o ícone de ajuda ao lado do seletor mostra texto
                sobre esse modelo.
              </li>
              <li>
                <strong>Modo Curta</strong> — {tituloAjudaCurtaPorModo.curta}
              </li>
              <li>
                <strong>Modo Normal</strong> — {tituloAjudaCurtaPorModo.normal}
              </li>
              <li>
                <strong>Modo Detalhada</strong> — {tituloAjudaCurtaPorModo.detalhada}
              </li>
              <li>
                <strong>Limpar conversa</strong> — Apaga esta conversa com confirmação. Logado(a), remove também a cópia na
                nuvem; sem login, apenas neste navegador (como no texto do topo).
              </li>
            </ul>
          </div>
        </details>

        <div className="ia-chat-shell">
          <div
            ref={rolagemListaRef}
            className="ia-chat-thread"
            role="log"
            aria-relevant="additions"
            aria-label="Histórico da conversa"
          >
            {messages.length === 0 ? (
              <div className="ia-chat-thread__empty muted">
                <p className="ia-chat-thread__empty-title">Digite uma pergunta abaixo para começar.</p>
                <p className="ia-chat-thread__empty-hint">
                  Digite na caixa de baixo. Modelo e modo estão nos controles; o resumo de contexto ficou logo acima.
                </p>
              </div>
            ) : (
              <div className="ia-chat-messages ia-chat-messages--thread">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`ia-chat-message ia-chat-message--${message.role}`}
                  >
                    <div className="ia-chat-message__meta">
                      <strong>{message.role === 'user' ? 'Você' : 'Gemini'}</strong>
                      {message.model ? <span className="ia-chat-msg-model">{message.model}</span> : null}
                    </div>
                    <pre className="ia-chat-message__content">{message.content}</pre>
                  </article>
                ))}
                {carregando ? (
                  <p className="muted ia-chat-typing-indicator" aria-live="polite">
                    …
                  </p>
                ) : null}
                <div ref={fimListaRef} aria-hidden />
              </div>
            )}
          </div>

          <div className="ia-chat-composer">
            <div className="ia-composer-toolbar" aria-label="Modelo e tamanho da resposta">
              <div className="ia-toolbar-field ia-toolbar-field--model">
                <span className="ia-toolbar-chip-label" title="Modelo Gemini">
                  Modelo
                </span>
                <div className="ia-toolbar-control">
                  <AppSelect
                    id="ia-modelo"
                    value={modeloId}
                    options={opcoesModelo}
                    onChange={(v) => setModeloId(v as GeminiChatAllowedModelId)}
                    listaAriaLabel="Modelos Gemini disponíveis"
                    className="ia-model-app-select ia-model-app-select--compact"
                    disabled={carregando}
                  />
                </div>
                <button
                  type="button"
                  className="button button--secondary ia-toolbar-icon-btn"
                  onClick={() => setModalInfoAberto(true)}
                  disabled={carregando}
                  aria-label="Ajuda sobre o modelo selecionado"
                  title="Informação do modelo"
                >
                  <CircleHelp size={16} aria-hidden />
                </button>
              </div>
              <div className="ia-toolbar-field ia-toolbar-field--answer">
                <span
                  className="ia-toolbar-chip-label"
                  title={tituloAjudaCurtaPorModo[answerMode] ?? 'Tamanho da resposta'}
                >
                  Modo
                </span>
                <div className="ia-toolbar-control">
                  <AppSelect
                    id="ia-answer-mode"
                    value={answerMode}
                    options={ANSWER_MODE_OPTIONS}
                    onChange={(v) => setAnswerMode(v as ChatGeminiAnswerMode)}
                    listaAriaLabel="Tamanho da resposta da IA"
                    className="ia-model-app-select ia-model-app-select--compact"
                    disabled={carregando}
                  />
                </div>
              </div>
              <button
                type="button"
                className="button button--secondary ia-composer-clear"
                onClick={() => setConfirmarLimparAberto(true)}
                disabled={carregando || limpandoHistoricoIa || messages.length === 0}
                title="Limpar histórico (confirme antes)."
              >
                Limpar conversa
              </button>
            </div>

            <form className="ia-composer-form" onSubmit={handleSubmit}>
              <label htmlFor="ia-prompt" className="ia-composer-label visually-hidden">
                Mensagem para o Gemini
              </label>
              <textarea
                id="ia-prompt"
                className="textarea-input ia-composer-input"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Pergunta ou instrução…"
                disabled={carregando}
              />
              {erro ? <p className="error-text ia-composer-erro">{erro}</p> : null}
              <div className="ia-composer-actions">
                <p className="muted ia-composer-footnote">
                  Este pedido só reaproveita as últimas {RECENT_CONTEXT_MESSAGE_LIMIT} mensagens como contexto (resumo logo acima).
                </p>
                <button type="submit" className="button" disabled={carregando || !prompt.trim()}>
                  {carregando ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmarLimparAberto}
        title="Limpar esta conversa?"
        description={
          user ? (
            <>
              <p className="ia-dialog-limpar-conversa-intro">
                O histórico desta página some da <strong>sua conta na nuvem</strong> e deste navegador.{' '}
                Não há como desfazer isso automaticamente.
              </p>
              <p className="ia-dialog-limpar-conversa-fim">Quer continuar?</p>
            </>
          ) : (
            <>
              <p className="ia-dialog-limpar-conversa-intro">
                Todas as mensagens desta sessão são apagadas <strong>só neste navegador</strong>.
              </p>
              <p className="ia-dialog-limpar-conversa-fim">Quer continuar?</p>
            </>
          )
        }
        confirmLabel={limpandoHistoricoIa ? 'Limpando…' : 'Limpar'}
        cancelLabel="Cancelar"
        destructive
        dialogBusy={limpandoHistoricoIa}
        onCancel={() => {
          if (!limpandoHistoricoIa) {
            setConfirmarLimparAberto(false);
          }
        }}
        onConfirm={() => void executarLimparConversaConfirmado()}
      />

      <ConfirmDialog
        open={confirmarSairAberto}
        title="Sair da conta?"
        description={
          <>
            <p className="ia-dialog-limpar-conversa-intro">
              Para biblioteca e chat IA voltarem a sincronizar na nuvem, será preciso entrar de novo neste navegador.
            </p>
            <p className="ia-dialog-limpar-conversa-fim">Quer sair mesmo?</p>
          </>
        }
        confirmLabel={saindoConta ? 'Saindo…' : 'Sair'}
        cancelLabel="Cancelar"
        dialogBusy={saindoConta}
        onCancel={() => {
          if (!saindoConta) {
            setConfirmarSairAberto(false);
          }
        }}
        onConfirm={() => void executarLogoutConfirmado()}
      />

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
            <p className="confirm-dialog-description ia-model-modal-destaque">{metaSelecionado.destaque}</p>
            <p className="confirm-dialog-description" style={{ margin: '0 0 8px', lineHeight: 1.55 }}>
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
