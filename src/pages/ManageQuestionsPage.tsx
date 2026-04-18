import { useEffect, useMemo, useState } from 'react';

import { Layout } from '../components/Layout';
import type { Disciplina, PossivelDuplicata, QuestaoGerenciada } from '../types';

type ManageQuestionsPageProps = {
  disciplinas: Disciplina[];
  questoes: QuestaoGerenciada[];
  possiveisDuplicadas: PossivelDuplicata[];
  onVoltar: () => void;
  onExcluirQuestao: (disciplinaId: string, questaoId: string) => void;
  onExcluirSelecionadas: (selecionadas: { disciplinaId: string; questaoId: string }[]) => number;
  onExcluirDisciplina: (disciplinaId: string) => void;
};

function criarChaveQuestao(disciplinaId: string, questaoId: string) {
  return `${disciplinaId}::${questaoId}`;
}

export function ManageQuestionsPage({
  disciplinas,
  questoes,
  possiveisDuplicadas,
  onVoltar,
  onExcluirQuestao,
  onExcluirSelecionadas,
  onExcluirDisciplina,
}: ManageQuestionsPageProps) {
  const [filtroDisciplinaId, setFiltroDisciplinaId] = useState('todas');
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<Record<string, boolean>>({});
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    document.body.classList.add('body--manage');

    return () => {
      document.body.classList.remove('body--manage');
    };
  }, []);

  const questoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return questoes.filter(({ disciplinaId, questao }) => {
      const disciplinaOk =
        filtroDisciplinaId === 'todas' || disciplinaId === filtroDisciplinaId;
      const buscaOk =
        termo.length === 0 || questao.enunciado.toLowerCase().includes(termo);

      return disciplinaOk && buscaOk;
    });
  }, [busca, filtroDisciplinaId, questoes]);

  const totalSelecionadas = Object.values(selecionadas).filter(Boolean).length;

  const toggleExpandir = (disciplinaId: string, questaoId: string) => {
    const chave = criarChaveQuestao(disciplinaId, questaoId);

    setExpandidas((estadoAtual) => ({
      ...estadoAtual,
      [chave]: !estadoAtual[chave],
    }));
  };

  const toggleSelecao = (disciplinaId: string, questaoId: string) => {
    const chave = criarChaveQuestao(disciplinaId, questaoId);

    setSelecionadas((estadoAtual) => ({
      ...estadoAtual,
      [chave]: !estadoAtual[chave],
    }));
  };

  const handleExcluirQuestao = (disciplinaId: string, questaoId: string) => {
    const confirmou = window.confirm(
      'Deseja realmente excluir esta questao? Essa acao nao pode ser desfeita.',
    );

    if (!confirmou) {
      return;
    }

    onExcluirQuestao(disciplinaId, questaoId);
    setMensagem('Questao excluida com sucesso.');
    setErro('');
    setSelecionadas((estadoAtual) => {
      const proximoEstado = { ...estadoAtual };
      delete proximoEstado[criarChaveQuestao(disciplinaId, questaoId)];
      return proximoEstado;
    });
  };

  const handleExcluirSelecionadas = () => {
    const itensSelecionados = Object.entries(selecionadas)
      .filter(([, selecionada]) => selecionada)
      .map(([chave]) => {
        const [disciplinaId, questaoId] = chave.split('::');
        return { disciplinaId, questaoId };
      });

    if (itensSelecionados.length === 0) {
      setErro('Selecione ao menos uma questao para excluir em lote.');
      setMensagem('');
      return;
    }

    const confirmou = window.confirm(
      `Deseja excluir ${itensSelecionados.length} questao(oes) selecionada(s)?`,
    );

    if (!confirmou) {
      return;
    }

    const removidas = onExcluirSelecionadas(itensSelecionados);
    setSelecionadas({});
    setErro('');
    setMensagem(`${removidas} questao(oes) excluida(s) com sucesso.`);
  };

  const handleExcluirDisciplina = (disciplinaId: string, nome: string) => {
    const confirmou = window.confirm(
      `Deseja excluir a disciplina "${nome}" inteira? Todas as questoes dela serao removidas.`,
    );

    if (!confirmou) {
      return;
    }

    onExcluirDisciplina(disciplinaId);
    setSelecionadas((estadoAtual) => {
      const proximoEstado = { ...estadoAtual };

      for (const chave of Object.keys(proximoEstado)) {
        if (chave.startsWith(`${disciplinaId}::`)) {
          delete proximoEstado[chave];
        }
      }

      return proximoEstado;
    });
    setErro('');
    setMensagem(`Disciplina "${nome}" excluida com sucesso.`);
  };

  return (
    <Layout
      titulo="Gerenciar questões"
      subtitulo="Busque, revise duplicadas provaveis e apague questoes ou disciplinas com seguranca."
      acoes={
        <button type="button" className="button button--secondary" onClick={onVoltar}>
          Voltar
        </button>
      }
    >
      <section className="card manage-toolbar">
        <div className="manage-filters">
          <input
            type="text"
            placeholder="Buscar por trecho do enunciado"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />

          <select
            className="select-input"
            value={filtroDisciplinaId}
            onChange={(event) => setFiltroDisciplinaId(event.target.value)}
          >
            <option value="todas">Todas as disciplinas</option>
            {disciplinas.map((disciplina) => (
              <option key={disciplina.id} value={disciplina.id}>
                {disciplina.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="actions-row">
          <span className="tag">{questoesFiltradas.length} questoes visiveis</span>
          <button
            type="button"
            className="button"
            onClick={handleExcluirSelecionadas}
            disabled={totalSelecionadas === 0}
          >
            Excluir selecionadas
          </button>
        </div>

        {erro ? <p className="error-text">{erro}</p> : null}
        {mensagem ? <p className="success-text">{mensagem}</p> : null}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Disciplinas</h2>
          <span className="tag">{disciplinas.length} total</span>
        </div>

        <div className="manage-disciplinas-list">
          {disciplinas.map((disciplina) => (
            <div key={disciplina.id} className="manage-disciplina-item">
              <div>
                <strong>{disciplina.nome}</strong>
                <p className="muted">{disciplina.questoes.length} questao(oes)</p>
              </div>
              <button
                type="button"
                className="button button--danger"
                onClick={() => handleExcluirDisciplina(disciplina.id, disciplina.nome)}
              >
                Excluir disciplina
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Todas as questões</h2>
          <span className="tag">{totalSelecionadas} selecionada(s)</span>
        </div>

        {questoesFiltradas.length === 0 ? (
          <p className="muted">Nenhuma questao encontrada com os filtros atuais.</p>
        ) : (
          <div className="manage-questions-list">
            {questoesFiltradas.map(({ disciplinaId, disciplinaNome, questao }) => {
              const chave = criarChaveQuestao(disciplinaId, questao.id);
              const expandida = Boolean(expandidas[chave]);

              return (
                <article key={chave} className="manage-question-item">
                  <label className="manage-question-item__checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(selecionadas[chave])}
                      onChange={() => toggleSelecao(disciplinaId, questao.id)}
                    />
                    <span>Selecionar</span>
                  </label>

                  <div className="manage-question-item__content">
                    <div className="section-header">
                      <span className="tag tag--outline">{disciplinaNome}</span>
                      <div className="manage-question-item__meta">
                        <span className="muted">ID: {questao.id}</span>
                        <span className="muted">
                          {questao.alternativas.length} alternativas
                        </span>
                      </div>
                    </div>
                    <p className="manage-question-item__title">{questao.enunciado}</p>
                    <p className="muted">Gabarito: {questao.respostaCorreta}</p>

                    <div className="actions-row">
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => toggleExpandir(disciplinaId, questao.id)}
                      >
                        {expandida ? 'Recolher' : 'Expandir questão'}
                      </button>
                    </div>

                    {expandida ? (
                      <div className="manage-question-details">
                        <div className="manage-question-details__block">
                          <strong>Alternativas</strong>
                          <ul className="manage-question-details__list">
                            {questao.alternativas.map((alternativa) => (
                              <li key={`${questao.id}-${alternativa.letra}`}>
                                <strong>{alternativa.letra})</strong> {alternativa.texto}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="manage-question-details__block">
                          <strong>Explicação</strong>
                          <p className="muted">
                            {questao.explicacao || 'Sem explicação cadastrada.'}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="manage-question-item__actions">
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => handleExcluirQuestao(disciplinaId, questao.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Possíveis duplicadas</h2>
          <span className="tag">{possiveisDuplicadas.length} grupo(s)</span>
        </div>

        {possiveisDuplicadas.length === 0 ? (
          <p className="muted">Nenhuma duplicidade provavel encontrada no momento.</p>
        ) : (
          <div className="duplicate-list">
            {possiveisDuplicadas.map((grupo) => (
              <article
                key={`${grupo.disciplinaId}-${grupo.enunciadoNormalizado}`}
                className="duplicate-item"
              >
                <div className="section-header">
                  <span className="tag tag--outline">{grupo.disciplinaNome}</span>
                  <span className="muted">{grupo.questoes.length} questoes parecidas</span>
                </div>
                <p className="manage-question-item__title">{grupo.questoes[0]?.enunciado}</p>
                <ul className="duplicate-item__list">
                  {grupo.questoes.map((questao) => (
                    <li key={questao.id}>
                      <span>ID: {questao.id}</span>
                      <span> | Gabarito: {questao.respostaCorreta}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
