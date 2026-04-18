import type { Disciplina } from '../types';

type DisciplinaCardProps = {
  disciplina: Disciplina;
  onCadastrarQuestoes: (disciplinaId: string) => void;
  onEstudar: (disciplinaId: string) => void;
  onExportar: (disciplinaId: string) => void;
};

export function DisciplinaCard({
  disciplina,
  onCadastrarQuestoes,
  onEstudar,
  onExportar,
}: DisciplinaCardProps) {
  return (
    <article className="card disciplina-card">
      <div>
        <h3>{disciplina.nome}</h3>
        <p className="muted">
          {disciplina.questoes.length} questão
          {disciplina.questoes.length === 1 ? '' : 'ões'} cadastrada
          {disciplina.questoes.length === 1 ? '' : 's'}
        </p>
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
          className="button"
          onClick={() => onEstudar(disciplina.id)}
          disabled={disciplina.questoes.length === 0}
        >
          Estudar
        </button>
      </div>
    </article>
  );
}
