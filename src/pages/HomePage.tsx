import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { DisciplinaCard } from '../components/DisciplinaCard';
import { Layout } from '../components/Layout';
import type { Disciplina, ResultadoImportacao } from '../types';

type HomePageProps = {
  disciplinas: Disciplina[];
  onCriarDisciplina: (nome: string) => string | null;
  onAbrirCadastro: (disciplinaId: string) => void;
  onAbrirEstudo: (disciplinaId: string) => void;
  onAbrirGerenciamento: () => void;
  onExportarTudo: () => void;
  onExportarDisciplina: (disciplinaId: string) => void;
  onImportarArquivo: (arquivo: File) => Promise<ResultadoImportacao>;
};

export function HomePage({
  disciplinas,
  onCriarDisciplina,
  onAbrirCadastro,
  onAbrirEstudo,
  onAbrirGerenciamento,
  onExportarTudo,
  onExportarDisciplina,
  onImportarArquivo,
}: HomePageProps) {
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
      titulo="Monte seu ambiente de estudo"
      subtitulo="Crie disciplinas, cole o texto bruto da prova e deixe o parser estruturar tudo para estudar no navegador."
      acoes={
        <>
          <input
            ref={inputArquivoRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={handleSelecionarArquivo}
          />
          <button
            type="button"
            className="button button--secondary"
            onClick={handleAbrirImportacao}
          >
            Importar JSON
          </button>
          <button
            type="button"
            className="button"
            onClick={onExportarTudo}
            disabled={disciplinas.length === 0}
          >
            Exportar tudo
          </button>
        </>
      }
    >
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
                onCadastrarQuestoes={onAbrirCadastro}
                onEstudar={onAbrirEstudo}
                onExportar={onExportarDisciplina}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
