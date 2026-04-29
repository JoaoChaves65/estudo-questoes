import { useEffect, useMemo, useState } from 'react';

import { Layout } from '../components/Layout';
import { QuestionStudyCard } from '../components/QuestionStudyCard';
import type { Disciplina, Questao } from '../types';
import { shuffleArray } from '../utils/shuffle';

type StudyPageProps = {
  disciplina: Disciplina;
  onVoltar: () => void;
};

type QuestaoSessao = Questao & {
  sessionKey: string;
};

function extrairUltimoBlocoCoerente(alternativas: Questao['alternativas']) {
  const blocos: Questao['alternativas'][] = [];

  for (let i = 0; i < alternativas.length; i += 1) {
    if (alternativas[i]?.letra !== 'A') {
      continue;
    }

    const blocoAtual: Questao['alternativas'] = [alternativas[i]];
    const usadas = new Set<string>(['A']);

    for (let j = i + 1; j < alternativas.length; j += 1) {
      const letra = alternativas[j]?.letra;

      if (!letra || usadas.has(letra)) {
        break;
      }

      blocoAtual.push(alternativas[j]);
      usadas.add(letra);

      if (letra === 'E') {
        break;
      }
    }

    if (blocoAtual.length >= 2) {
      blocos.push(blocoAtual);
    }
  }

  return blocos[blocos.length - 1] ?? [];
}

function normalizarQuestaoLegada(questao: Questao): Questao {
  const blocoFinal = extrairUltimoBlocoCoerente(questao.alternativas);

  if (blocoFinal.length === 0) {
    return questao;
  }

  const letrasValidas = new Set(blocoFinal.map((alternativa) => alternativa.letra));
  const respostaCorreta = letrasValidas.has(questao.respostaCorreta)
    ? questao.respostaCorreta
    : blocoFinal[0]?.letra ?? questao.respostaCorreta;

  return {
    ...questao,
    alternativas: blocoFinal,
    respostaCorreta,
  };
}

function embaralharTextosDasAlternativas(questao: Questao): Questao {
  const textosEmbaralhados = shuffleArray(
    questao.alternativas.map((alternativa) => ({
      texto: alternativa.texto,
      letraOriginal: alternativa.letra,
    })),
  );

  const alternativas = questao.alternativas.map((alternativa, index) => ({
    letra: alternativa.letra,
    texto: textosEmbaralhados[index]?.texto ?? alternativa.texto,
  }));

  const novaRespostaCorreta =
    alternativas.find(
      (_alternativa, index) =>
        textosEmbaralhados[index]?.letraOriginal === questao.respostaCorreta,
    )?.letra ?? questao.respostaCorreta;

  return {
    ...questao,
    alternativas,
    respostaCorreta: novaRespostaCorreta,
  };
}

function montarSessao(questoes: Questao[]): QuestaoSessao[] {
  return shuffleArray(questoes).map((questao, index) => ({
    ...embaralharTextosDasAlternativas(normalizarQuestaoLegada(questao)),
    sessionKey: `${questao.id}-${index}`,
  }));
}

export function StudyPage({ disciplina, onVoltar }: StudyPageProps) {
  const [questoesSessao, setQuestoesSessao] = useState<QuestaoSessao[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [questoesErradas, setQuestoesErradas] = useState<string[]>([]);
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);
  const [puladas, setPuladas] = useState(0);
  const [modoFoco, setModoFoco] = useState(false);

  const reiniciarSessao = (base: Questao[]) => {
    setQuestoesSessao(montarSessao(base));
    setIndiceAtual(0);
    setRespostas({});
    setQuestoesErradas([]);
    setAcertos(0);
    setErros(0);
    setPuladas(0);
  };

  useEffect(() => {
    reiniciarSessao(disciplina.questoes);
  }, [disciplina]);

  const questaoAtual = questoesSessao[indiceAtual];
  const respostaSelecionada = questaoAtual ? respostas[questaoAtual.sessionKey] ?? null : null;
  const terminou = indiceAtual >= questoesSessao.length;

  const questoesErradasOriginais = useMemo(
    () => disciplina.questoes.filter((questao) => questoesErradas.includes(questao.id)),
    [disciplina.questoes, questoesErradas],
  );

  const handleResponder = (letra: string) => {
    if (!questaoAtual || respostaSelecionada !== null) {
      return;
    }

    setRespostas((estadoAtual) => ({
      ...estadoAtual,
      [questaoAtual.sessionKey]: letra,
    }));

    if (letra === questaoAtual.respostaCorreta) {
      setAcertos((valorAtual) => valorAtual + 1);
      return;
    }

    setErros((valorAtual) => valorAtual + 1);
    setQuestoesErradas((estadoAtual) =>
      estadoAtual.includes(questaoAtual.id)
        ? estadoAtual
        : [...estadoAtual, questaoAtual.id],
    );
  };

  const handlePular = () => {
    if (!questaoAtual || respostaSelecionada !== null) {
      return;
    }

    setPuladas((valorAtual) => valorAtual + 1);
    setIndiceAtual((valorAtual) => valorAtual + 1);
  };

  const handleProxima = () => {
    if (!questaoAtual) {
      return;
    }

    setIndiceAtual((valorAtual) => valorAtual + 1);
  };

  return (
    <Layout
      titulo={`Modo estudo: ${disciplina.nome}`}
      subtitulo="Questões e alternativas são embaralhadas a cada sessão. Ao responder, o feedback aparece imediatamente."
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
        <section className="stats-grid">
          <div className="card stat-card">
            <span className="muted">Questões na sessão</span>
            <strong>{questoesSessao.length}</strong>
          </div>
          <div className="card stat-card">
            <span className="muted">Acertos</span>
            <strong className="text-success">{acertos}</strong>
          </div>
          <div className="card stat-card">
            <span className="muted">Erros</span>
            <strong className="text-error">{erros}</strong>
          </div>
          <div className="card stat-card">
            <span className="muted">Puladas</span>
            <strong>{puladas}</strong>
          </div>
        </section>
      ) : null}

      {disciplina.questoes.length === 0 ? (
        <section className="card empty-state">
          <p>Essa disciplina ainda não possui questões cadastradas.</p>
          <p className="muted">
            Volte para a tela anterior e importe um bloco de texto bruto para começar.
          </p>
        </section>
      ) : terminou ? (
        <section className="card final-card">
          <h2>Sessão concluída</h2>
          <p>
            Você terminou a sessão com {acertos} acerto(s), {erros} erro(s) e {puladas} questão(ões)
            pulada(s).
          </p>

          <div className="actions-row">
            <button
              type="button"
              className="button"
              onClick={() => reiniciarSessao(disciplina.questoes)}
            >
              Nova sessão
            </button>

            <button
              type="button"
              className="button button--secondary"
              onClick={() => reiniciarSessao(questoesErradasOriginais)}
              disabled={questoesErradasOriginais.length === 0}
            >
              Revisar erros
            </button>
          </div>

          {questoesErradasOriginais.length === 0 ? (
            <p className="success-text">Nenhum erro nesta sessão.</p>
          ) : (
            <p className="muted">
              Revisão disponível com {questoesErradasOriginais.length} questão(ões) respondida(s) incorretamente.
            </p>
          )}
        </section>
      ) : questaoAtual ? (
        <>
          <QuestionStudyCard
            questao={questaoAtual}
            indiceAtual={indiceAtual}
            total={questoesSessao.length}
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
              {indiceAtual === questoesSessao.length - 1 ? 'Finalizar sessão' : 'Próxima questão'}
            </button>
          </div>
        </>
      ) : null}
    </Layout>
  );
}
