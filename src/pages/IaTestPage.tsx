import { useState, type FormEvent } from 'react';

import { Layout } from '../components/Layout';
import { chatGemini } from '../utils/geminiChat';

type IaTestPageProps = {
  onVoltar: () => void;
};

export function IaTestPage({ onVoltar }: IaTestPageProps) {
  const [prompt, setPrompt] = useState('');
  const [resposta, setResposta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const texto = prompt.trim();
    if (!texto || carregando) {
      return;
    }
    setErro('');
    setResposta('');
    setCarregando(true);
    try {
      const text = await chatGemini(texto);
      setResposta(text);
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
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Em produção ou com <strong>npx vercel dev</strong>, <strong>/api/chat</strong> existe neste host. Com{' '}
          <strong>npm run dev</strong>, define <strong>DEV_API_PROXY</strong> no <strong>.env.local</strong> (URL do
          deploy na Vercel) para o Vite encaminhar <strong>/api</strong> para lá e testares a IA só no front local.
        </p>
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
          <pre className="ia-teste-resposta">{resposta}</pre>
        </section>
      ) : null}
    </Layout>
  );
}
