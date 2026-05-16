import { useEffect, useMemo, useState } from 'react';

import { AppSelect, type AppSelectOption } from '../components/AppSelect';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Layout } from '../components/Layout';
import type { Disciplina, PossivelDuplicata, QuestaoGerenciada } from '../types';

type DialogoExclusao =
  | null
  | { tipo: 'questao'; disciplinaId: string; questaoId: string }
  | { tipo: 'lote'; itens: { disciplinaId: string; questaoId: string }[] }
  | { tipo: 'disciplina'; disciplinaId: string; nome: string };

type ManageQuestionsPageProps = {
  disciplinas: Disciplina[];
  questoes: QuestaoGerenciada[];
  possiveisDuplicadas: PossivelDuplicata[];
  onVoltar: () => void;
  onExcluirQuestao: (disciplinaId: string, questaoId: string) => void;
  onExcluirSelecionadas: (selecionadas: { disciplinaId: string; questaoId: string }[]) => number;
  onExcluirDisciplina: (disciplinaId: string) => void;
  srsCongelada?: (disciplinaId: string, questaoId: string) => boolean;
  onToggleSrsCongelar?: (disciplinaId: string, questaoId: string) => void;
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
  srsCongelada,
  onToggleSrsCongelar,
}: ManageQuestionsPageProps) {
  const [filtroDisciplinaId, setFiltroDisciplinaId] = useState('todas');
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<Record<string, boolean>>({});
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [dialogoExclusao, setDialogoExclusao] = useState<DialogoExclusao>(null);

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

  const opcoesFiltroDisciplina = useMemo<AppSelectOption[]>(
    () => [
      { value: 'todas', label: 'Todas as disciplinas' },
      ...disciplinas.map((d) => ({ value: d.id, label: d.nome })),
    ],
    [disciplinas],
  );

  const totalSelecionadas = Object.values(selecionadas).filter(Boolean).length;

  const textoConfirmacao = useMemo(() => {
    if (!dialogoExclusao) {
      return null;
    }
    switch (dialogoExclusao.tipo) {
      case 'questao':
        return {
          title: 'Excluir esta questão?',
          description:
            'Ela sai do cadastro e dos dados de estudo ligados a ela (incluindo SRS e desempenho). Não dá para desfazer.',
          confirmLabel: 'Excluir questão',
        };
      case 'lote': {
        const n = dialogoExclusao.itens.length;
        return {
          title: n === 1 ? 'Excluir 1 questão?' : `Excluir ${n} questões?`,
          description:
            n === 1
              ? 'A questão será removida permanentemente. Esta ação não pode ser desfeita.'
              : `As ${n} questões serão removidas permanentemente. Esta ação não pode ser desfeita.`,
          confirmLabel: n === 1 ? 'Excluir questão' : `Excluir ${n} questões`,
        };
      }
      case 'disciplina':
        return {
          title: `Excluir a disciplina “${dialogoExclusao.nome}”?`,
          description:
            'Todas as questões desta disciplina serão removidas do cadastro e dos dados de estudo. Não dá para desfazer.',
          confirmLabel: 'Excluir disciplina inteira',
        };
      default:
        return null;
    }
  }, [dialogoExclusao]);

  const executarExclusaoConfirmada = () => {
    const d = dialogoExclusao;
    if (!d) {
      return;
    }
    setDialogoExclusao(null);

    switch (d.tipo) {
      case 'questao':
        onExcluirQuestao(d.disciplinaId, d.questaoId);
        setMensagem('Questão excluída com sucesso.');
        setErro('');
        setSelecionadas((estadoAtual) => {
          const proximoEstado = { ...estadoAtual };
          delete proximoEstado[criarChaveQuestao(d.disciplinaId, d.questaoId)];
          return proximoEstado;
        });
        break;

      case 'lote': {
        const removidas = onExcluirSelecionadas(d.itens);
        setSelecionadas({});
        setErro('');
        setMensagem(
          removidas === 1
            ? '1 questão excluída com sucesso.'
            : `${removidas} questões excluídas com sucesso.`,
        );
        break;
      }

      case 'disciplina':
        onExcluirDisciplina(d.disciplinaId);
        setSelecionadas((estadoAtual) => {
          const proximoEstado = { ...estadoAtual };

          for (const chave of Object.keys(proximoEstado)) {
            if (chave.startsWith(`${d.disciplinaId}::`)) {
              delete proximoEstado[chave];
            }
          }

          return proximoEstado;
        });
        setErro('');
        setMensagem(`Disciplina "${d.nome}" excluída com sucesso.`);
        break;

      default:
        break;
    }
  };

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

  const solicitarExcluirQuestao = (disciplinaId: string, questaoId: string) => {
    setDialogoExclusao({ tipo: 'questao', disciplinaId, questaoId });
  };

  const solicitarExcluirSelecionadas = () => {
    const itensSelecionados = Object.entries(selecionadas)
      .filter(([, selecionada]) => selecionada)
      .map(([chave]) => {
        const [disciplinaId, questaoId] = chave.split('::');
        return { disciplinaId, questaoId };
      });

    if (itensSelecionados.length === 0) {
      setErro('Selecione ao menos uma questão para excluir em lote.');
      setMensagem('');
      return;
    }

    setErro('');
    setMensagem('');
    setDialogoExclusao({ tipo: 'lote', itens: itensSelecionados });
  };

  const solicitarExcluirDisciplina = (disciplinaId: string, nome: string) => {
    setDialogoExclusao({ tipo: 'disciplina', disciplinaId, nome });
  };

  return (
    <Layout
      titulo="Gerenciar questões"
      subtitulo="Busque trechos, revise possíveis duplicatas e exclua questões ou disciplinas com segurança."
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

          <AppSelect
            id="manage-filtro-disciplina"
            value={filtroDisciplinaId}
            options={opcoesFiltroDisciplina}
            onChange={(v) => setFiltroDisciplinaId(v)}
            listaAriaLabel="Filtrar questões por disciplina"
          />
        </div>

        <div className="actions-row">
          <span className="tag">
            {questoesFiltradas.length === 1
              ? '1 questão visível'
              : `${questoesFiltradas.length} questões visíveis`}
          </span>
          <button
            type="button"
            className="button"
            onClick={solicitarExcluirSelecionadas}
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
                <p className="muted">
                  {disciplina.questoes.length === 1
                    ? '1 questão cadastrada'
                    : `${disciplina.questoes.length} questões cadastradas`}
                </p>
              </div>
              <button
                type="button"
                className="button button--danger"
                onClick={() => solicitarExcluirDisciplina(disciplina.id, disciplina.nome)}
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

        {srsCongelada && onToggleSrsCongelar ? (
          <p className="muted manage-srs-hint">
            <strong>Estudo inteligente (SRS):</strong> use <strong>Pausar na fila</strong> em questões que
            você já domina — elas deixam de aparecer na fila com repetição espaçada. O estudo normal por
            disciplina não é afetado. <strong>Recolocar na fila</strong> desfaz isso.
          </p>
        ) : null}

        {questoesFiltradas.length === 0 ? (
          <p className="muted">Nenhuma questão encontrada com os filtros atuais.</p>
        ) : (
          <div className="manage-questions-list">
            {questoesFiltradas.map(({ disciplinaId, disciplinaNome, questao }) => {
              const chave = criarChaveQuestao(disciplinaId, questao.id);
              const expandida = Boolean(expandidas[chave]);

              return (
                <article key={chave} className="manage-question-item">
                  <div className="manage-question-item__content">
                    <label className="manage-question-select">
                      <input
                        type="checkbox"
                        className="manage-question-select__native visually-hidden"
                        checked={Boolean(selecionadas[chave])}
                        onChange={() => toggleSelecao(disciplinaId, questao.id)}
                      />
                      <span className="manage-question-select__box" aria-hidden />
                      <span className="manage-question-select__text">
                        <span className="manage-question-select__title">Marcar para exclusão em lote</span>
                        <span className="manage-question-select__hint">
                          Usa o botão &quot;Excluir selecionadas&quot; acima
                        </span>
                      </span>
                    </label>

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
                    {srsCongelada && onToggleSrsCongelar ? (
                      <button
                        type="button"
                        className="button button--secondary"
                        title={
                          srsCongelada(disciplinaId, questao.id)
                            ? 'Esta questão volta a poder entrar na fila do estudo inteligente (repetição espaçada).'
                            : 'Esta questão some da fila do estudo inteligente até você recolocá-la. Não altera o estudo normal por disciplina.'
                        }
                        onClick={() => onToggleSrsCongelar(disciplinaId, questao.id)}
                      >
                        {srsCongelada(disciplinaId, questao.id)
                          ? 'Recolocar na fila do estudo inteligente'
                          : 'Pausar na fila do estudo inteligente'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => solicitarExcluirQuestao(disciplinaId, questao.id)}
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
          <p className="muted">Nenhuma duplicidade provável encontrada no momento.</p>
        ) : (
          <div className="duplicate-list">
            {possiveisDuplicadas.map((grupo) => (
              <article
                key={`${grupo.disciplinaId}-${grupo.enunciadoNormalizado}`}
                className="duplicate-item"
              >
                <div className="section-header">
                  <span className="tag tag--outline">{grupo.disciplinaNome}</span>
                  <span className="muted">
                    {grupo.questoes.length === 1
                      ? '1 questão parecida'
                      : `${grupo.questoes.length} questões parecidas`}
                  </span>
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

      <ConfirmDialog
        open={dialogoExclusao !== null && textoConfirmacao !== null}
        title={textoConfirmacao?.title ?? ''}
        description={textoConfirmacao?.description ?? ''}
        confirmLabel={textoConfirmacao?.confirmLabel ?? 'Confirmar'}
        cancelLabel="Cancelar"
        destructive
        onCancel={() => setDialogoExclusao(null)}
        onConfirm={executarExclusaoConfirmada}
      />
    </Layout>
  );
}
