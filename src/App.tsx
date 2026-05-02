import { useCallback, useEffect, useMemo, useState } from 'react';

import { HomePage } from './pages/HomePage';
import { ImportPage } from './pages/ImportPage';
import { ManageQuestionsPage } from './pages/ManageQuestionsPage';
import { SrsStudyPage } from './pages/SrsStudyPage';
import { StudyPage } from './pages/StudyPage';
import { useDisciplinasStore } from './store/useDisciplinasStore';
import { useSrsProgressStore } from './store/useSrsProgressStore';
import { useThemeStore } from './store/useThemeStore';
import type { ResultadoImportacao } from './types';
import { criarNomeArquivoBackup, parseBackupDisciplinas, serializarBackupDisciplinas } from './utils/backup';
import { baixarTextoComoArquivo } from './utils/download';
import { parseQuestoesComDiagnostico } from './utils/parser';
import { contarPendentes } from './utils/srsScheduler';

type TelaAtiva = 'home' | 'importar' | 'estudar' | 'estudarInteligente' | 'gerenciar';

export default function App() {
  const disciplinas = useDisciplinasStore((state) => state.disciplinas);
  const adicionarDisciplina = useDisciplinasStore((state) => state.adicionarDisciplina);
  const adicionarQuestoes = useDisciplinasStore((state) => state.adicionarQuestoes);
  const importarDisciplinas = useDisciplinasStore((state) => state.importarDisciplinas);
  const obterDisciplinaPorId = useDisciplinasStore((state) => state.obterDisciplinaPorId);
  const excluirQuestaoStore = useDisciplinasStore((state) => state.excluirQuestao);
  const excluirQuestoesEmLoteStore = useDisciplinasStore((state) => state.excluirQuestoesEmLote);
  const excluirDisciplinaStore = useDisciplinasStore((state) => state.excluirDisciplina);
  const listarQuestoesGerenciadas = useDisciplinasStore(
    (state) => state.listarQuestoesGerenciadas,
  );
  const detectarPossiveisDuplicadas = useDisciplinasStore(
    (state) => state.detectarPossiveisDuplicadas,
  );

  const porDisciplinaSrs = useSrsProgressStore((state) => state.porDisciplina);
  const obterDisciplinaSrs = useSrsProgressStore((state) => state.obterDisciplina);
  const importarSnapshotSrs = useSrsProgressStore((state) => state.importarSnapshot);
  const exportarSnapshotSrs = useSrsProgressStore((state) => state.exportarSnapshot);
  const removerQuestaoSrs = useSrsProgressStore((state) => state.removerQuestao);
  const removerDisciplinaSrs = useSrsProgressStore((state) => state.removerDisciplina);
  const toggleCongelarSrs = useSrsProgressStore((state) => state.toggleCongelar);
  const sincronizarRolloverSrs = useSrsProgressStore((state) => state.sincronizarRolloverGlobal);

  const theme = useThemeStore((state) => state.theme);

  const [telaAtiva, setTelaAtiva] = useState<TelaAtiva>('home');
  const [disciplinaSelecionadaId, setDisciplinaSelecionadaId] = useState<string | null>(
    null,
  );

  const disciplinaSelecionada = useMemo(
    () =>
      disciplinas.find((disciplina) => disciplina.id === disciplinaSelecionadaId) ?? null,
    [disciplinas, disciplinaSelecionadaId],
  );

  const pendentesSrsPorDisciplina = useMemo(() => {
    const agoraMs = Date.now();
    const mapa: Record<string, number> = {};
    for (const d of disciplinas) {
      const disc = obterDisciplinaSrs(d.id, agoraMs);
      mapa[d.id] = contarPendentes(
        d.questoes.map((q) => q.id),
        disc,
        agoraMs,
      );
    }
    return mapa;
  }, [disciplinas, obterDisciplinaSrs, porDisciplinaSrs]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    sincronizarRolloverSrs(Date.now());
  }, [sincronizarRolloverSrs]);

  const abrirTela = (tela: TelaAtiva, disciplinaId?: string) => {
    if (disciplinaId) {
      setDisciplinaSelecionadaId(disciplinaId);
    }

    setTelaAtiva(tela);
  };

  const handleSalvarQuestoes = (disciplinaId: string, texto: string) => {
    const resultado = parseQuestoesComDiagnostico(texto);
    const questoes = resultado.questoes;

    if (questoes.length === 0 || resultado.erros.length > 0) {
      return 0;
    }

    adicionarQuestoes(disciplinaId, questoes);
    return questoes.length;
  };

  const handleExportarTudo = () => {
    const conteudo = serializarBackupDisciplinas(disciplinas, exportarSnapshotSrs());
    baixarTextoComoArquivo(conteudo, criarNomeArquivoBackup());
  };

  const handleExportarDisciplina = (disciplinaId: string) => {
    const disciplina = obterDisciplinaPorId(disciplinaId);

    if (!disciplina) {
      throw new Error('Disciplina nao encontrada para exportacao.');
    }

    const snapshot = exportarSnapshotSrs();
    const slice = snapshot.porDisciplina[disciplinaId];
    const progressoParcial = {
      porDisciplina: slice ? { [disciplinaId]: slice } : {},
    };
    const conteudo = serializarBackupDisciplinas([disciplina], progressoParcial);
    baixarTextoComoArquivo(conteudo, criarNomeArquivoBackup(disciplina.nome));
  };

  const handleImportarArquivo = async (arquivo: File): Promise<ResultadoImportacao> => {
    const conteudo = await arquivo.text();
    const parsed = parseBackupDisciplinas(conteudo);
    const resultado = importarDisciplinas({ disciplinas: parsed.disciplinas });
    if (parsed.progressoInteligente) {
      importarSnapshotSrs(parsed.progressoInteligente);
    }
    return resultado;
  };

  const handleExcluirQuestao = useCallback(
    (disciplinaId: string, questaoId: string) => {
      excluirQuestaoStore(disciplinaId, questaoId);
      removerQuestaoSrs(disciplinaId, questaoId);
    },
    [excluirQuestaoStore, removerQuestaoSrs],
  );

  const handleExcluirSelecionadas = useCallback(
    (selecionadas: { disciplinaId: string; questaoId: string }[]) => {
      const n = excluirQuestoesEmLoteStore(selecionadas);
      for (const item of selecionadas) {
        removerQuestaoSrs(item.disciplinaId, item.questaoId);
      }
      return n;
    },
    [excluirQuestoesEmLoteStore, removerQuestaoSrs],
  );

  const handleExcluirDisciplina = useCallback(
    (disciplinaId: string) => {
      excluirDisciplinaStore(disciplinaId);
      removerDisciplinaSrs(disciplinaId);
    },
    [excluirDisciplinaStore, removerDisciplinaSrs],
  );

  const srsCongelada = useCallback(
    (disciplinaId: string, questaoId: string) => {
      const agoraMs = Date.now();
      const q = obterDisciplinaSrs(disciplinaId, agoraMs).questoes[questaoId];
      return Boolean(q?.congelada);
    },
    [obterDisciplinaSrs, porDisciplinaSrs],
  );

  const handleToggleCongelarSrs = useCallback(
    (disciplinaId: string, questaoId: string) => {
      toggleCongelarSrs(disciplinaId, questaoId, Date.now());
    },
    [toggleCongelarSrs],
  );

  const homeProps = {
    disciplinas,
    pendentesSrsPorDisciplina,
    onCriarDisciplina: adicionarDisciplina,
    onAbrirCadastro: (disciplinaId: string) => abrirTela('importar', disciplinaId),
    onAbrirEstudo: (disciplinaId: string) => abrirTela('estudar', disciplinaId),
    onAbrirEstudoInteligente: (disciplinaId: string) =>
      abrirTela('estudarInteligente', disciplinaId),
    onAbrirGerenciamento: () => abrirTela('gerenciar'),
    onExportarTudo: handleExportarTudo,
    onExportarDisciplina: handleExportarDisciplina,
    onImportarArquivo: handleImportarArquivo,
  };

  if (telaAtiva !== 'home' && telaAtiva !== 'gerenciar' && !disciplinaSelecionada) {
    return <HomePage {...homeProps} />;
  }

  if (telaAtiva === 'importar' && disciplinaSelecionada) {
    return (
      <ImportPage
        disciplina={disciplinaSelecionada}
        onVoltar={() => setTelaAtiva('home')}
        onSalvarQuestoes={handleSalvarQuestoes}
      />
    );
  }

  if (telaAtiva === 'estudar' && disciplinaSelecionada) {
    return (
      <StudyPage
        disciplina={disciplinaSelecionada}
        onVoltar={() => setTelaAtiva('home')}
      />
    );
  }

  if (telaAtiva === 'estudarInteligente' && disciplinaSelecionada) {
    return (
      <SrsStudyPage
        disciplina={disciplinaSelecionada}
        onVoltar={() => setTelaAtiva('home')}
      />
    );
  }

  if (telaAtiva === 'gerenciar') {
    return (
      <ManageQuestionsPage
        disciplinas={disciplinas}
        questoes={listarQuestoesGerenciadas()}
        possiveisDuplicadas={detectarPossiveisDuplicadas()}
        onVoltar={() => setTelaAtiva('home')}
        onExcluirQuestao={handleExcluirQuestao}
        onExcluirSelecionadas={handleExcluirSelecionadas}
        onExcluirDisciplina={handleExcluirDisciplina}
        srsCongelada={srsCongelada}
        onToggleSrsCongelar={handleToggleCongelarSrs}
      />
    );
  }

  return <HomePage {...homeProps} />;
}
