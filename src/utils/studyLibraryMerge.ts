import type {
  DesempenhoSnapshot,
  Disciplina,
  Questao,
  SrsDisciplinaProgress,
  SrsProgressSnapshot,
} from '../types';
import { mergeDesempenhoPorDisciplina } from '../store/useDesempenhoStore';

function mergeQuestoesPreferServer(serverQs: Questao[], localQs: Questao[]): Questao[] {
  const sm = new Map(serverQs.map((q) => [q.id, q]));
  const lm = new Map(localQs.map((q) => [q.id, q]));
  const ids = [...new Set([...sm.keys(), ...lm.keys()])].sort();
  return ids.map((id) => sm.get(id) ?? lm.get(id)!);
}

/** Em conflitos de mesmo `disciplina.id` ou `questao.id`, ganha o conteúdo do servidor (nuvem). */
export function mergeDisciplinasPreferServer(serverList: Disciplina[], localList: Disciplina[]): Disciplina[] {
  const sm = new Map(serverList.map((d) => [d.id, d]));
  const lm = new Map(localList.map((d) => [d.id, d]));
  const ids = [...new Set([...sm.keys(), ...lm.keys()])].sort();
  return ids.map((id) => {
    const s = sm.get(id);
    const l = lm.get(id);
    if (s && l) {
      return {
        id: s.id,
        nome: s.nome,
        questoes: mergeQuestoesPreferServer(s.questoes, l.questoes),
      };
    }
    return s ?? l!;
  });
}

/** Mapa atual + snapshot “incoming”: chaves repetidas ficam como no `incoming` (servidor). */
export function mergeSrsProgressSnapshots(
  basePorDisciplina: Record<string, SrsDisciplinaProgress>,
  incoming: SrsProgressSnapshot,
): SrsProgressSnapshot {
  const proximo = { ...basePorDisciplina };
  for (const [did, prog] of Object.entries(incoming.porDisciplina)) {
    const existente = proximo[did];
    if (!existente) {
      proximo[did] = {
        prefs: { ...prog.prefs },
        questoes: { ...prog.questoes },
      };
    } else {
      proximo[did] = {
        prefs: { ...existente.prefs, ...prog.prefs },
        questoes: { ...existente.questoes, ...prog.questoes },
      };
    }
  }
  return { porDisciplina: proximo };
}

export type StudyLibraryBundle = {
  disciplinas: Disciplina[];
  progressoInteligente: SrsProgressSnapshot;
  estatisticasDesempenho: DesempenhoSnapshot | null;
};

export function mergeStudyLibraryBundles(server: StudyLibraryBundle, local: StudyLibraryBundle): StudyLibraryBundle {
  const disciplinas = mergeDisciplinasPreferServer(server.disciplinas, local.disciplinas);
  const progressoInteligente = mergeSrsProgressSnapshots(
    local.progressoInteligente.porDisciplina,
    server.progressoInteligente,
  );
  const porDes = mergeDesempenhoPorDisciplina(
    local.estatisticasDesempenho?.porDisciplina ?? {},
    server.estatisticasDesempenho?.porDisciplina ?? {},
  );
  const estatisticasDesempenho: DesempenhoSnapshot | null =
    Object.keys(porDes).length > 0 ? { porDisciplina: porDes } : null;
  return { disciplinas, progressoInteligente, estatisticasDesempenho };
}
