import type { Questao } from '../types';

type QuestionStudyCardProps = {
  questao: Questao;
  indiceAtual: number;
  total: number;
  respostaSelecionada: string | null;
  onResponder: (letra: string) => void;
};

export function QuestionStudyCard({
  questao,
  indiceAtual,
  total,
  respostaSelecionada,
  onResponder,
}: QuestionStudyCardProps) {
  return (
    <section className="card study-card">
      <div className="study-card__header">
        <span className="tag">
          Questão {indiceAtual + 1} de {total}
        </span>
        <span className="tag tag--outline">Alternativas embaralhadas</span>
      </div>

      <h2 className="study-card__title">{questao.enunciado}</h2>

      <div className="alternativas-list">
        {questao.alternativas.map((alternativa) => {
          const acertou =
            respostaSelecionada === alternativa.letra &&
            alternativa.letra === questao.respostaCorreta;
          const errou =
            respostaSelecionada === alternativa.letra &&
            alternativa.letra !== questao.respostaCorreta;
          const corretaRevelada =
            respostaSelecionada !== null &&
            alternativa.letra === questao.respostaCorreta;

          const classes = ['alternativa'];

          if (acertou) {
            classes.push('alternativa--correct');
          } else if (errou) {
            classes.push('alternativa--wrong');
          } else if (corretaRevelada) {
            classes.push('alternativa--correct-soft');
          }

          return (
            <button
              key={`${questao.id}-${alternativa.letra}`}
              type="button"
              className={classes.join(' ')}
              onClick={() => onResponder(alternativa.letra)}
              disabled={respostaSelecionada !== null}
            >
              <div className="alternativa__content">
                <strong>{alternativa.letra})</strong>
                <span>{alternativa.texto}</span>
              </div>
            </button>
          );
        })}
      </div>

      {respostaSelecionada !== null ? (
        <div className="feedback-box">
          <p className="feedback-box__status">
            {respostaSelecionada === questao.respostaCorreta
              ? 'Resposta correta.'
              : `Você marcou ${respostaSelecionada}. O correto é ${questao.respostaCorreta}.`}
          </p>
          <p>{questao.explicacao || 'Sem comentário adicional para esta questão.'}</p>
        </div>
      ) : null}
    </section>
  );
}
