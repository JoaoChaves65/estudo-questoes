import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { CircleHelp } from 'lucide-react';

import { AppSelect, type AppSelectOption } from '../components/AppSelect';
import {
  GEMINI_CHAT_MODEL_DEFAULT_ID,
  GEMINI_CHAT_MODELS,
  getGeminiChatModelMeta,
  type GeminiChatAllowedModelId,
} from '../constants/geminiChatModels';
import { Layout } from '../components/Layout';
import { chatGemini } from '../utils/geminiChat';

const STORAGE_KEY = 'estudo-questoes:gemini-chat-model-id';

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

type IaTestPageProps = {
  onVoltar: () => void;
};

export function IaTestPage({ onVoltar }: IaTestPageProps) {
  const [prompt, setPrompt] = useState('');
  const [resposta, setResposta] = useState('');
  const [modeloUsado, setModeloUsado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [modeloId, setModeloId] = useState<GeminiChatAllowedModelId>(() => readStoredModelId());
  const [modalInfoAberto, setModalInfoAberto] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, modeloId);
    } catch {
      /* ignore */
    }
  }, [modeloId]);

  const metaSelecionado = useMemo(() => getGeminiChatModelMeta(modeloId), [modeloId]);

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
    setResposta('');
    setModeloUsado(null);
    setCarregando(true);
    try {
      const { text, model } = await chatGemini(texto, { model: modeloId });
      setResposta(text);
      setModeloUsado(model ?? modeloId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Layout
      titulo="Teste da IA"
      subtitulo="Chamada experimental ao Gemini pela rota /api/chat (chave só no servidor)."
      acoes={
        <button type="button" className="button button--secondary" onClick={onVoltar}>
          Voltar
        </button>
      }
    >
      <section className="card">
        <div className="desempenho-field ia-model-field">
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
      </section>

      {resposta ? (
        <section className="card">
          <h2>Resposta</h2>
          {modeloUsado ? (
            <p className="muted" style={{ marginBottom: '0.75rem', fontSize: '0.88rem' }}>
              Modelo no servidor: <code>{modeloUsado}</code>
            </p>
          ) : null}
          <pre className="ia-teste-resposta">{resposta}</pre>
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
