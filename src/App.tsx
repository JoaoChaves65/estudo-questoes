import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { ConfirmDialog } from './components/ConfirmDialog';
import { DesempenhoPage } from './pages/DesempenhoPage';
import { HomePage } from './pages/HomePage';
import { ImportPage } from './pages/ImportPage';
import { ManageQuestionsPage } from './pages/ManageQuestionsPage';
import { SrsStudyPage } from './pages/SrsStudyPage';
import { IaTestPage } from './pages/IaTestPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudyPage } from './pages/StudyPage';
import { useAuth } from './contexts/AuthContext';
import { useDesempenhoStore } from './store/useDesempenhoStore';
import { useDisciplinasStore } from './store/useDisciplinasStore';
import { useSrsProgressStore } from './store/useSrsProgressStore';
import { useThemeStore } from './store/useThemeStore';
import type { Disciplina, ResultadoImportacao } from './types';
import { criarNomeArquivoBackup, parseBackupDisciplinas, serializarBackupDisciplinas } from './utils/backup';
import { baixarTextoComoArquivo } from './utils/download';
import { parseQuestoesComDiagnostico } from './utils/parser';
import { aplicarAtualizacaoSw, PWA_REFRESH_EVENT } from './pwaRegister';
import { sincronizarBibliotecaComNuvem, enviarBibliotecaLocalParaNuvem } from './utils/studyLibrarySync';
import { contarPendentes } from './utils/srsScheduler';

const THEME_COLOR_META = '#0f172a';
const THEME_COLOR_LIGHT = '#eef6f3';

function ImportDisciplinaRoute({
  disciplinas,
  onVoltar,
  onSalvarQuestoes,
}: {
  disciplinas: Disciplina[];
  onVoltar: () => void;
  onSalvarQuestoes: (disciplinaId: string, texto: string) => number;
}) {
  const { disciplinaId } = useParams<{ disciplinaId: string }>();
  const disciplina = disciplinas.find((d) => d.id === disciplinaId);
  if (!disciplina) {
    return <Navigate to="/" replace />;
  }
  return (
    <ImportPage
      disciplina={disciplina}
      onVoltar={onVoltar}
      onSalvarQuestoes={onSalvarQuestoes}
    />
  );
}

function EstudarDisciplinaRoute({
  disciplinas,
  onVoltar,
}: {
  disciplinas: Disciplina[];
  onVoltar: () => void;
}) {
  const { disciplinaId } = useParams<{ disciplinaId: string }>();
  const disciplina = disciplinas.find((d) => d.id === disciplinaId);
  if (!disciplina) {
    return <Navigate to="/" replace />;
  }
  return <StudyPage disciplina={disciplina} onVoltar={onVoltar} />;
}

function InteligenteDisciplinaRoute({
  disciplinas,
  onVoltar,
}: {
  disciplinas: Disciplina[];
  onVoltar: () => void;
}) {
  const { disciplinaId } = useParams<{ disciplinaId: string }>();
  const disciplina = disciplinas.find((d) => d.id === disciplinaId);
  if (!disciplina) {
    return <Navigate to="/" replace />;
  }
  return <SrsStudyPage disciplina={disciplina} onVoltar={onVoltar} />;
}

export default function App() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const bibliotecaSyncUltimoUserRef = useRef<string | null>(null);

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

  const exportarDesempenho = useDesempenhoStore((state) => state.exportarSnapshot);
  const importarDesempenho = useDesempenhoStore((state) => state.importarSnapshot);
  const removerQuestaoDesempenho = useDesempenhoStore((state) => state.removerQuestao);
  const removerDisciplinaDesempenho = useDesempenhoStore((state) => state.removerDisciplina);

  const theme = useThemeStore((state) => state.theme);

  const [pwaAtualizacaoPendente, setPwaAtualizacaoPendente] = useState(false);

  const aoHome = () => navigate('/');

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
    const bg = theme === 'dark' ? THEME_COLOR_META : THEME_COLOR_LIGHT;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }, [theme]);

  useEffect(() => {
    sincronizarRolloverSrs(Date.now());
  }, [sincronizarRolloverSrs]);

  useEffect(() => {
    const aoPedirRefresh = () => setPwaAtualizacaoPendente(true);
    window.addEventListener(PWA_REFRESH_EVENT, aoPedirRefresh);
    return () => window.removeEventListener(PWA_REFRESH_EVENT, aoPedirRefresh);
  }, []);

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
    const conteudo = serializarBackupDisciplinas(
      disciplinas,
      exportarSnapshotSrs(),
      exportarDesempenho(),
    );
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
    const desemp = exportarDesempenho().porDisciplina[disciplinaId];
    const statsParciais =
      desemp && Object.keys(desemp).length > 0
        ? { porDisciplina: { [disciplinaId]: desemp } }
        : null;
    const conteudo = serializarBackupDisciplinas(
      [disciplina],
      progressoParcial,
      statsParciais ?? undefined,
    );
    baixarTextoComoArquivo(conteudo, criarNomeArquivoBackup(disciplina.nome));
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      bibliotecaSyncUltimoUserRef.current = null;
      return;
    }
    if (bibliotecaSyncUltimoUserRef.current === user.id) {
      return;
    }
    bibliotecaSyncUltimoUserRef.current = user.id;
    void sincronizarBibliotecaComNuvem();
  }, [authLoading, user]);

  const handleImportarArquivo = useCallback(async (arquivo: File): Promise<ResultadoImportacao> => {
    const conteudo = await arquivo.text();
    const parsed = parseBackupDisciplinas(conteudo);
    const resultado = importarDisciplinas({ disciplinas: parsed.disciplinas });
    if (parsed.progressoInteligente) {
      importarSnapshotSrs(parsed.progressoInteligente);
    }
    if (parsed.estatisticasDesempenho) {
      importarDesempenho(parsed.estatisticasDesempenho);
    }
    if (user) {
      await enviarBibliotecaLocalParaNuvem();
    }
    return resultado;
  }, [
    importarDesempenho,
    importarDisciplinas,
    importarSnapshotSrs,
    user,
  ]);

  const handleExcluirQuestao = useCallback(
    (disciplinaId: string, questaoId: string) => {
      excluirQuestaoStore(disciplinaId, questaoId);
      removerQuestaoSrs(disciplinaId, questaoId);
      removerQuestaoDesempenho(disciplinaId, questaoId);
    },
    [excluirQuestaoStore, removerQuestaoDesempenho, removerQuestaoSrs],
  );

  const handleExcluirSelecionadas = useCallback(
    (selecionadas: { disciplinaId: string; questaoId: string }[]) => {
      const n = excluirQuestoesEmLoteStore(selecionadas);
      for (const item of selecionadas) {
        removerQuestaoSrs(item.disciplinaId, item.questaoId);
        removerQuestaoDesempenho(item.disciplinaId, item.questaoId);
      }
      return n;
    },
    [excluirQuestoesEmLoteStore, removerQuestaoDesempenho, removerQuestaoSrs],
  );

  const handleExcluirDisciplina = useCallback(
    (disciplinaId: string) => {
      excluirDisciplinaStore(disciplinaId);
      removerDisciplinaSrs(disciplinaId);
      removerDisciplinaDesempenho(disciplinaId);
    },
    [excluirDisciplinaStore, removerDisciplinaDesempenho, removerDisciplinaSrs],
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
    onAbrirCadastro: (disciplinaId: string) => navigate(`/importar/${disciplinaId}`),
    onAbrirEstudo: (disciplinaId: string) => navigate(`/estudar/${disciplinaId}`),
    onAbrirEstudoInteligente: (disciplinaId: string) => navigate(`/inteligente/${disciplinaId}`),
    onAbrirGerenciamento: () => navigate('/gerenciar'),
    onAbrirDesempenho: () => navigate('/desempenho'),
    onAbrirTesteIa: () => navigate('/ia'),
    onExportarTudo: handleExportarTudo,
    onExportarDisciplina: handleExportarDisciplina,
    onImportarArquivo: handleImportarArquivo,
  };

  const aoConfirmarAtualizacaoPwa = () => {
    void aplicarAtualizacaoSw();
    setPwaAtualizacaoPendente(false);
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage {...homeProps} />} />

        <Route
          path="/gerenciar"
          element={
            <ManageQuestionsPage
              disciplinas={disciplinas}
              questoes={listarQuestoesGerenciadas()}
              possiveisDuplicadas={detectarPossiveisDuplicadas()}
              onVoltar={aoHome}
              onExcluirQuestao={handleExcluirQuestao}
              onExcluirSelecionadas={handleExcluirSelecionadas}
              onExcluirDisciplina={handleExcluirDisciplina}
              srsCongelada={srsCongelada}
              onToggleSrsCongelar={handleToggleCongelarSrs}
            />
          }
        />

        <Route path="/desempenho" element={<DesempenhoPage disciplinas={disciplinas} onVoltar={aoHome} />} />

        <Route path="/ia" element={<IaTestPage onVoltar={aoHome} />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/registo" element={<RegisterPage />} />

        <Route
          path="/importar/:disciplinaId"
          element={
            <ImportDisciplinaRoute
              disciplinas={disciplinas}
              onVoltar={aoHome}
              onSalvarQuestoes={handleSalvarQuestoes}
            />
          }
        />

        <Route
          path="/estudar/:disciplinaId"
          element={<EstudarDisciplinaRoute disciplinas={disciplinas} onVoltar={aoHome} />}
        />

        <Route
          path="/inteligente/:disciplinaId"
          element={<InteligenteDisciplinaRoute disciplinas={disciplinas} onVoltar={aoHome} />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ConfirmDialog
        open={pwaAtualizacaoPendente}
        title="Nova versão disponível"
        description="Existe uma atualização instalada que passa a valer quando a página é recarregada. Recarregar agora aplicará a nova versão."
        confirmLabel="Recarregar"
        cancelLabel="Agora não"
        destructive={false}
        onCancel={() => setPwaAtualizacaoPendente(false)}
        onConfirm={aoConfirmarAtualizacaoPwa}
      />
    </>
  );
}
