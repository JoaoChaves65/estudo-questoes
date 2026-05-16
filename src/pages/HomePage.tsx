import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { DisciplinaCard } from '../components/DisciplinaCard';
import { HomeHeaderMenu } from '../components/HomeHeaderMenu';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import type { Disciplina, ResultadoImportacao } from '../types';

type HomePageProps = {
  disciplinas: Disciplina[];
  pendentesSrsPorDisciplina: Record<string, number>;
  onCriarDisciplina: (nome: string) => string | null;
  onAbrirCadastro: (disciplinaId: string) => void;
  onAbrirEstudo: (disciplinaId: string) => void;
  onAbrirEstudoInteligente: (disciplinaId: string) => void;
  onAbrirGerenciamento: () => void;
  onAbrirDesempenho: () => void;
  onAbrirTesteIa: () => void;
  onExportarTudo: () => void;
  onExportarDisciplina: (disciplinaId: string) => void;
  onImportarArquivo: (arquivo: File) => Promise<ResultadoImportacao>;
};

export function HomePage({
  disciplinas,
  pendentesSrsPorDisciplina,
  onCriarDisciplina,
  onAbrirCadastro,
  onAbrirEstudo,
  onAbrirEstudoInteligente,
  onAbrirGerenciamento,
  onAbrirDesempenho,
  onAbrirTesteIa,
  onExportarTudo,
  onExportarDisciplina,
  onImportarArquivo,
}: HomePageProps) {
  const { user, loading: authLoading, logout } = useAuth();
  const [nomeDisciplina, setNomeDisciplina] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const inputArquivoRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const disciplinaId = onCriarDisciplina(nomeDisciplina);

    if (!disciplinaId) {
      setErro('Informe um nome válido para a disciplina.');
      return;
    }

    setNomeDisciplina('');
    setErro('');
  };

  const handleAbrirImportacao = () => {
    inputArquivoRef.current?.click();
  };

  const handleSelecionarArquivo = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];

    if (!arquivo) {
      return;
    }

    try {
      const resultado = await onImportarArquivo(arquivo);
      setErro('');
      setMensagem(
        `${resultado.totalImportado} disciplina(s) importada(s): ${resultado.adicionadas} nova(s) e ${resultado.atualizadas} atualizada(s).`,
      );
    } catch (error) {
      const mensagemErro =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel importar o arquivo selecionado.';
      setMensagem('');
      setErro(mensagemErro);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <Layout
      titulo="Painel"
      omitirEyebrow
      subtitulo="Crie disciplinas, importe texto ou JSON das provas e estude por disciplina ou com SRS. Com conta (opcional), a biblioteca sincroniza entre dispositivos."
      classNameHeroAcoes="hero__actions--compact-toolbar"
      acoes={
        <HomeHeaderMenu
          authLoading={authLoading}
          disciplinasLength={disciplinas.length}
          userEmail={user?.email}
          onAbrirImportacao={handleAbrirImportacao}
          onExportarTudo={onExportarTudo}
          onAbrirDesempenho={onAbrirDesempenho}
          onAbrirTesteIa={onAbrirTesteIa}
          onLogout={() => logout()}
        />
      }
    >
      <input
        ref={inputArquivoRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden visually-hidden-file"
        aria-label="Escolher arquivo JSON para importação"
        onChange={handleSelecionarArquivo}
      />
      <section className="card">
        <h2>Nova disciplina</h2>
        <form className="stack-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ex.: Direito Constitucional"
            value={nomeDisciplina}
            onChange={(event) => setNomeDisciplina(event.target.value)}
          />
          {erro ? <p className="error-text">{erro}</p> : null}
          <button type="submit" className="button">
            Criar disciplina
          </button>
        </form>
        {mensagem ? <p className="success-text">{mensagem}</p> : null}
      </section>

      <section className="content-section">
        <div className="section-header">
          <div className="section-header__title">
            <h2>Disciplinas cadastradas</h2>
            <span className="tag">{disciplinas.length} total</span>
          </div>
          <button
            type="button"
            className="button button--secondary"
            onClick={onAbrirGerenciamento}
            disabled={disciplinas.length === 0}
          >
            Gerenciar questões
          </button>
        </div>

        {disciplinas.length === 0 ? (
          <div className="card empty-state">
            <p>Nenhuma disciplina cadastrada ainda.</p>
            <p className="muted">
              Crie a primeira disciplina para começar a importar suas questões.
            </p>
          </div>
        ) : (
          <div className="grid-list">
            {disciplinas.map((disciplina) => (
              <DisciplinaCard
                key={disciplina.id}
                disciplina={disciplina}
                pendentesSrs={pendentesSrsPorDisciplina[disciplina.id] ?? 0}
                onCadastrarQuestoes={onAbrirCadastro}
                onEstudar={onAbrirEstudo}
                onEstudarInteligente={onAbrirEstudoInteligente}
                onExportar={onExportarDisciplina}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
