import type { Disciplina } from '../types';

type DisciplinaCardProps = {
  disciplina: Disciplina;
  pendentesSrs: number;
  onCadastrarQuestoes: (disciplinaId: string) => void;
  onEstudar: (disciplinaId: string) => void;
  onEstudarInteligente: (disciplinaId: string) => void;
  onExportar: (disciplinaId: string) => void;
};

export function DisciplinaCard({
  disciplina,
  pendentesSrs,
  onCadastrarQuestoes,
  onEstudar,
  onEstudarInteligente,
  onExportar,
}: DisciplinaCardProps) {
  const desabilitadoEstudo = disciplina.questoes.length === 0;

  return (
    <article className="card disciplina-card">
      <div>
        <h3>{disciplina.nome}</h3>
        <p className="muted">
          {disciplina.questoes.length === 1
            ? '1 questão cadastrada'
            : `${disciplina.questoes.length} questões cadastradas`}
        </p>
        {!desabilitadoEstudo && pendentesSrs > 0 ? (
          <p className="muted">
            <strong>{pendentesSrs}</strong> pendente(s) de revisão (estudo inteligente)
          </p>
        ) : null}
      </div>

      <div className="actions-row">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onExportar(disciplina.id)}
        >
          Exportar JSON
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onCadastrarQuestoes(disciplina.id)}
        >
          Adicionar questões
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onEstudarInteligente(disciplina.id)}
          disabled={desabilitadoEstudo}
        >
          Estudo inteligente
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onEstudar(disciplina.id)}
          disabled={desabilitadoEstudo}
        >
          Estudar
        </button>
      </div>
    </article>
  );
}
