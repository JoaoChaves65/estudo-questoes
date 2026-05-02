import { useEffect, useMemo, useState } from 'react';

import { Layout } from '../components/Layout';
import { QuestionStudyCard } from '../components/QuestionStudyCard';
import { totalEstudadoNoDia, useSrsProgressStore } from '../store/useSrsProgressStore';
import type { Disciplina } from '../types';
import { filaBloqueadaPorLimiteDiario, montarFilaOrdenada } from '../utils/srsScheduler';
import { prepararQuestaoParaExibicao } from '../utils/studyQuestionDisplay';

type SrsStudyPageProps = {
  disciplina: Disciplina;
  onVoltar: () => void;
};

export function SrsStudyPage({ disciplina, onVoltar }: SrsStudyPageProps) {
  const porDisciplina = useSrsProgressStore((s) => s.porDisciplina);
  const obterDisciplina = useSrsProgressStore((s) => s.obterDisciplina);
  const registrarResposta = useSrsProgressStore((s) => s.registrarResposta);
  const definirPreferencias = useSrsProgressStore((s) => s.definirPreferencias);
  const ativarBoost48h = useSrsProgressStore((s) => s.ativarBoost48h);

  const [ignorarLimites, setIgnorarLimites] = useState(false);
  const [filaIds, setFilaIds] = useState<string[]>([]);
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);
  const [puladas, setPuladas] = useState(0);
  const [modoFoco, setModoFoco] = useState(false);

  useEffect(() => {
    const agoraMs = Date.now();
    const disc = useSrsProgressStore.getState().obterDisciplina(disciplina.id, agoraMs);
    const por = useSrsProgressStore.getState().porDisciplina;
    const fila = montarFilaOrdenada({
      disciplinaId: disciplina.id,
      questaoIds: disciplina.questoes.map((q) => q.id),
      porDisciplina: { ...por, [disciplina.id]: disc },
      agoraMs,
      ignorarLimitesDiarios: ignorarLimites,
    });
    setFilaIds(fila);
  }, [porDisciplina, disciplina.id, disciplina.questoes, ignorarLimites]);

  const questaoIdAtual = filaIds[0];
  const questaoBruta = useMemo(
    () => disciplina.questoes.find((q) => q.id === questaoIdAtual),
    [disciplina.questoes, questaoIdAtual],
  );

  const questaoExibicao = useMemo(() => {
    if (!questaoBruta) {
      return null;
    }
    return prepararQuestaoParaExibicao(questaoBruta);
  }, [questaoBruta]);

  useEffect(() => {
    setRespostaSelecionada(null);
  }, [questaoIdAtual]);

  const prefsVisiveis = useMemo(() => {
    const agoraMs = Date.now();
    return obterDisciplina(disciplina.id, agoraMs).prefs;
  }, [disciplina.id, obterDisciplina, porDisciplina]);

  const meta = prefsVisiveis.metaDiaria ?? 10;
  const feitoHoje = totalEstudadoNoDia(prefsVisiveis);
  const metaBatida = meta > 0 && feitoHoje >= meta;

  const maisAlemLimites = useMemo(() => {
    if (filaIds.length > 0 || ignorarLimites) {
      return false;
    }
    const agoraMs = Date.now();
    const disc = useSrsProgressStore.getState().obterDisciplina(disciplina.id, agoraMs);
    const por = useSrsProgressStore.getState().porDisciplina;
    return filaBloqueadaPorLimiteDiario({
      disciplinaId: disciplina.id,
      questaoIds: disciplina.questoes.map((q) => q.id),
      porDisciplina: { ...por, [disciplina.id]: disc },
      agoraMs,
    });
  }, [filaIds.length, disciplina, ignorarLimites, porDisciplina]);

  const handleResponder = (letra: string) => {
    if (!questaoExibicao || respostaSelecionada !== null) {
      return;
    }
    setRespostaSelecionada(letra);
  };

  const handleProxima = () => {
    if (!questaoBruta || !questaoExibicao || respostaSelecionada === null) {
      return;
    }

    const acertou = respostaSelecionada === questaoExibicao.respostaCorreta;
    registrarResposta(
      disciplina.id,
      questaoBruta.id,
      acertou ? 'acerto' : 'erro',
      Date.now(),
    );
    if (acertou) {
      setAcertos((v) => v + 1);
    } else {
      setErros((v) => v + 1);
    }
    setRespostaSelecionada(null);
  };

  const handlePular = () => {
    const id = filaIds[0];
    if (!id || respostaSelecionada !== null) {
      return;
    }
    registrarResposta(disciplina.id, id, 'pular', Date.now());
    setPuladas((v) => v + 1);
  };

  const handleContinuarAlemLimites = () => {
    setIgnorarLimites(true);
  };

  const handleNovaSessaoFila = () => {
    setIgnorarLimites(false);
    setAcertos(0);
    setErros(0);
    setPuladas(0);
  };

  if (disciplina.questoes.length === 0) {
    return (
      <Layout
        titulo={`Estudo inteligente: ${disciplina.nome}`}
        subtitulo="Importe questões para usar a fila inteligente."
        acoes={null}
      >
        <section className="card empty-state">
          <p>Essa disciplina ainda não possui questões cadastradas.</p>
          <button type="button" className="button button--secondary" onClick={onVoltar}>
            Voltar
          </button>
        </section>
      </Layout>
    );
  }

  return (
    <Layout
      titulo={`Estudo inteligente: ${disciplina.nome}`}
      subtitulo="Fila por repetição espaçada: acertos espaçam revisão; erros e puladas voltam mais cedo. Pular conta como erro na fila."
      compactHeader={
        modoFoco ? (
          <>
            <button type="button" className="button button--secondary" onClick={onVoltar}>
              Voltar
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setModoFoco(false)}
            >
              Sair do foco
            </button>
          </>
        ) : undefined
      }
      acoes={
        modoFoco ? undefined : (
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setModoFoco(true)}
            >
              Modo foco
            </button>
            <button type="button" className="button button--secondary" onClick={onVoltar}>
              Voltar
            </button>
          </>
        )
      }
    >
      {!modoFoco ? (
        <>
      <section className="card">
        <h2>Preferências do dia</h2>
        <p className="muted">
          Meta suave: {feitoHoje}/{meta} questões estudadas hoje (novas + revisões). Você pode
          continuar além da meta quando quiser.
        </p>
        {metaBatida ? (
          <p className="success-text">Meta do dia atingida. Parabéns — pode seguir estudando.</p>
        ) : null}

        <details className="srs-help-details" style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            O que é cada opção? (clique para abrir)
          </summary>
          <ul className="muted" style={{ marginTop: 10, marginBottom: 0, paddingLeft: 20, lineHeight: 1.55 }}>
            <li>
              <strong>Meta diária</strong> — Alvo opcional de quantas questões você quer passar
              neste modo hoje (cada vez que você responde ou pula na fila inteligente conta). Só
              orienta o número “feito/meta”; <strong>não trava</strong> o estudo depois de bater a
              meta.
            </li>
            <li>
              <strong>Limite novas/dia</strong> — Máximo de questões que ainda <strong>nunca</strong>{' '}
              foram respondidas no estudo inteligente que podem entrar na <strong>fila do dia</strong>.
              Evita estourar o cérebro com centenas de questões novas de uma vez (estilo cartões
              novos no Anki).
            </li>
            <li>
              <strong>Limite revisões/dia</strong> — Máximo de questões <strong>já vistas</strong>{' '}
              (já tem histórico de resposta neste modo) que podem entrar na fila como revisão no
              mesmo dia. Equilibra novidade e revisão.
            </li>
            <li>
              <strong>Intensificar erros (48 h)</strong> — Por 48 horas, questões que você{' '}
              <strong>errou</strong> ou <strong>pulou</strong> ganham prioridade maior na fila (sobem
              na ordem). Útil perto de prova. Não apaga o histórico nem altera o gabarito; só muda a
              ordem de estudo temporariamente.
            </li>
          </ul>
        </details>

        <div className="manage-filters" style={{ marginTop: 12 }}>
          <label className="muted">
            Meta diária
            <input
              type="number"
              min={1}
              max={500}
              title="Alvo de questões (novas+revisões) respondidas hoje neste modo. Não bloqueia."
              value={prefsVisiveis.metaDiaria ?? 10}
              onChange={(e) =>
                definirPreferencias(
                  disciplina.id,
                  { metaDiaria: Number(e.target.value) || 10 },
                  Date.now(),
                )
              }
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
          <label className="muted">
            Limite novas/dia
            <input
              type="number"
              min={0}
              max={200}
              title="Máximo de questões ainda nunca respondidas no SRS que entram na fila hoje."
              value={prefsVisiveis.limiteNovas ?? 8}
              onChange={(e) =>
                definirPreferencias(
                  disciplina.id,
                  { limiteNovas: Number(e.target.value) || 0 },
                  Date.now(),
                )
              }
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
          <label className="muted">
            Limite revisões/dia
            <input
              type="number"
              min={0}
              max={500}
              title="Máximo de questões já vistas (revisão) que entram na fila hoje."
              value={prefsVisiveis.limiteRevisoes ?? 40}
              onChange={(e) =>
                definirPreferencias(
                  disciplina.id,
                  { limiteRevisoes: Number(e.target.value) || 0 },
                  Date.now(),
                )
              }
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
        </div>
        <div className="actions-row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="button button--secondary"
            title="Por 48 h, erros e puladas sobem na fila. Não apaga histórico."
            onClick={() => ativarBoost48h(disciplina.id, Date.now())}
          >
            Intensificar erros (48 h)
          </button>
        </div>
        {prefsVisiveis.boostAteMs && Date.now() < prefsVisiveis.boostAteMs ? (
          <p className="muted">
            Modo intensivo ativo até {new Date(prefsVisiveis.boostAteMs).toLocaleString()} — erros e
            puladas têm prioridade maior na fila.
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            Fora do modo intensivo, a fila segue a ordem normal de revisão espaçada.
          </p>
        )}
      </section>

      <p className="muted" style={{ marginBottom: 0, lineHeight: 1.5 }}>
        <strong>Na fila hoje</strong> é quantas questões entraram nesta rodada da fila:{' '}
        <strong>novas</strong> (ainda sem resposta no SRS) até o limite do dia +{' '}
        <strong>revisões vencidas</strong> (<code>próxima revisão ≤ agora</code>) até o limite do
        dia — sem puxar revisão que só vence depois. Erro ou pulo deixa a questão vencida de novo na
        hora. O rótulo <strong>Cartão N desta sessão</strong> sobe a cada &quot;Próxima
        questão&quot;.
      </p>

      <section className="stats-grid">
        <div className="card stat-card">
          <span
            className="muted"
            title="Novas (no limite) + revisões vencidas agora (no limite); não inclui revisão futura."
          >
            Na fila hoje
          </span>
          <strong>{filaIds.length}</strong>
        </div>
        <div className="card stat-card">
          <span className="muted">Acertos (sessão)</span>
          <strong className="text-success">{acertos}</strong>
        </div>
        <div className="card stat-card">
          <span className="muted">Erros (sessão)</span>
          <strong className="text-error">{erros}</strong>
        </div>
        <div className="card stat-card">
          <span className="muted">Puladas (sessão)</span>
          <strong>{puladas}</strong>
        </div>
      </section>
        </>
      ) : null}

      {filaIds.length === 0 && maisAlemLimites ? (
        <section className="card">
          <p>
            Você atingiu os limites diários de novas/revisões. Ainda há questões disponíveis para
            outro momento.
          </p>
          <div className="actions-row">
            <button type="button" className="button" onClick={handleContinuarAlemLimites}>
              Continuar além dos limites diários
            </button>
            <button type="button" className="button button--secondary" onClick={onVoltar}>
              Voltar
            </button>
          </div>
        </section>
      ) : null}

      {filaIds.length === 0 && !maisAlemLimites ? (
        <section className="card final-card">
          <h2>Fila vazia</h2>
          <p>
            Não há questões pendentes por agora (ou todas estão congeladas). Sessão: {acertos}{' '}
            acerto(s), {erros} erro(s), {puladas} pulada(s).
          </p>
          <div className="actions-row">
            <button type="button" className="button" onClick={handleNovaSessaoFila}>
              Reconstruir fila
            </button>
            <button type="button" className="button button--secondary" onClick={onVoltar}>
              Voltar
            </button>
          </div>
        </section>
      ) : null}

      {questaoExibicao ? (
        <>
          <QuestionStudyCard
            questao={questaoExibicao}
            indiceAtual={0}
            total={filaIds.length}
            etiquetaContador={`Cartão ${acertos + erros + puladas + 1} desta sessão`}
            respostaSelecionada={respostaSelecionada}
            onResponder={handleResponder}
          />
          <div className="actions-row actions-row--end">
            <button
              type="button"
              className="button button--secondary"
              onClick={handlePular}
              disabled={respostaSelecionada !== null}
            >
              Pular
            </button>
            <button
              type="button"
              className="button"
              onClick={handleProxima}
              disabled={respostaSelecionada === null}
            >
              Próxima questão
            </button>
          </div>
        </>
      ) : null}
    </Layout>
  );
}
