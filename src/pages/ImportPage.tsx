import { useMemo, useState } from 'react';

import { Layout } from '../components/Layout';
import type { Disciplina } from '../types';
import { parseQuestoesComDiagnostico } from '../utils/parser';

type ImportPageProps = {
  disciplina: Disciplina;
  onVoltar: () => void;
  onSalvarQuestoes: (disciplinaId: string, texto: string) => number;
};

export function ImportPage({
  disciplina,
  onVoltar,
  onSalvarQuestoes,
}: ImportPageProps) {
  const [textoBruto, setTextoBruto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  const resultadoPreview = useMemo(
    () => parseQuestoesComDiagnostico(textoBruto),
    [textoBruto],
  );
  const previewQuestoes = resultadoPreview.questoes;
  const errosPreview = resultadoPreview.erros;
  const avisosPreview = resultadoPreview.avisos;

  const handleProcessar = () => {
    if (errosPreview.length > 0) {
      setErro(
        `Existem ${errosPreview.length} questao(oes) com problema no parsing. Corrija o texto antes de salvar.`,
      );
      setMensagem('');
      return;
    }

    const quantidade = onSalvarQuestoes(disciplina.id, textoBruto);

    if (quantidade === 0) {
      setErro('Nenhuma questão válida foi encontrada. Confira se o texto bruto está completo.');
      setMensagem('');
      return;
    }

    setErro('');
    if (avisosPreview.length > 0) {
      setMensagem(
        `${quantidade} questão(ões) adicionada(s) em ${disciplina.nome}, com ${avisosPreview.length} aviso(s) de parsing para revisão.`,
      );
    } else {
      setMensagem(`${quantidade} questão(ões) adicionada(s) em ${disciplina.nome}.`);
    }
    setTextoBruto('');
    setExpandidas({});
  };

  const toggleExpandir = (questaoId: string) => {
    setExpandidas((estadoAtual) => ({
      ...estadoAtual,
      [questaoId]: !estadoAtual[questaoId],
    }));
  };

  const modeloExemplo = `1) Digite aqui o enunciado completo da questão.

A) Texto da alternativa A.

B) Texto da alternativa B.

C) Texto da alternativa C.

D) Texto da alternativa D.

E) Texto da alternativa E.

Justificativa: GABARITO: A FEEDBACK/COMENTÁRIO: Explique aqui por que a alternativa correta é a letra A.`;

  return (
    <Layout
      titulo={`Importar questões em ${disciplina.nome}`}
      subtitulo="Cole o texto bruto exatamente como veio da prova. O parser ignora cabeçalho, nota, peso e blocos colados."
      acoes={
        <button type="button" className="button button--secondary" onClick={onVoltar}>
          Voltar
        </button>
      }
    >
      <section className="card">
        <h2>Texto bruto</h2>
        <textarea
          className="textarea-input"
          placeholder="Cole aqui todo o bloco com questões, alternativas, gabarito e comentário."
          value={textoBruto}
          onChange={(event) => {
            setTextoBruto(event.target.value);
            if (erro) {
              setErro('');
            }
            if (mensagem) {
              setMensagem('');
            }
          }}
        />

        <div className="actions-row">
          <button
            type="button"
            className="button"
            onClick={handleProcessar}
            disabled={previewQuestoes.length === 0 || errosPreview.length > 0}
          >
            Processar questões
          </button>
          <span className="muted">Prévia detectada: {previewQuestoes.length} questão(ões)</span>
        </div>

        {erro ? <p className="error-text">{erro}</p> : null}
        {mensagem ? <p className="success-text">{mensagem}</p> : null}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Prévia do parser</h2>
          <span className="tag">{previewQuestoes.length} encontradas</span>
        </div>

        {errosPreview.length > 0 ? (
          <div className="parser-warning-box">
            <h3>Problemas detectados</h3>
            <ul className="parser-warning-list">
              {errosPreview.map((erroQuestao) => (
                <li key={`${erroQuestao.numeroQuestao}-${erroQuestao.indice}`}>
                  <strong>Questão {erroQuestao.numeroQuestao}:</strong> {erroQuestao.motivo}
                </li>
              ))}
            </ul>
            <p className="muted">
              Enquanto houver problema de enunciado, alternativas ou gabarito, o sistema nao salva.
            </p>
          </div>
        ) : null}

        {avisosPreview.length > 0 ? (
          <div className="parser-warning-box">
            <h3>Avisos de parsing</h3>
            <ul className="parser-warning-list">
              {avisosPreview.map((avisoQuestao) => (
                <li key={`${avisoQuestao.numeroQuestao}-${avisoQuestao.indice}-${avisoQuestao.motivo}`}>
                  <strong>Questão {avisoQuestao.numeroQuestao}:</strong> {avisoQuestao.motivo}
                </li>
              ))}
            </ul>
            <p className="muted">
              O salvamento continua liberado, mas vale revisar a prévia para evitar ambiguidades.
            </p>
          </div>
        ) : null}

        {previewQuestoes.length === 0 ? (
          <div className="preview-empty-state">
            <p className="muted">
              A prévia aparece automaticamente conforme você cola o texto.
            </p>

            <div className="parser-template-box">
              <h3>Modelo de questão</h3>
              <p className="muted">
                Se quiser montar uma questão manualmente, use este esqueleto:
              </p>
              <pre className="parser-template-box__code">{modeloExemplo}</pre>
            </div>
          </div>
        ) : (
          <div className="preview-list">
            {previewQuestoes.map((questao, index) => (
              <article key={questao.id} className="preview-item">
                <h3>Questão {index + 1}</h3>
                <p>{questao.enunciado}</p>
                <p className="muted">
                  {questao.alternativas.length} alternativas | Gabarito {questao.respostaCorreta}
                </p>

                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => toggleExpandir(questao.id)}
                >
                  {expandidas[questao.id] ? 'Recolher' : 'Expandir'}
                </button>

                {expandidas[questao.id] ? (
                  <div className="preview-details">
                    <div className="preview-details__block">
                      <strong>Alternativas</strong>
                      <ul className="preview-details__list">
                        {questao.alternativas.map((alternativa) => (
                          <li key={`${questao.id}-${alternativa.letra}`}>
                            <strong>{alternativa.letra})</strong> {alternativa.texto}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="preview-details__block">
                      <strong>Explicação</strong>
                      <p className="muted">
                        {questao.explicacao || 'Sem explicação extraída.'}
                      </p>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}

      </section>
    </Layout>
  );
}
