import { useEffect, useMemo, useState } from 'react';

import { HomePage } from './pages/HomePage';
import { ImportPage } from './pages/ImportPage';
import { ManageQuestionsPage } from './pages/ManageQuestionsPage';
import { StudyPage } from './pages/StudyPage';
import { useDisciplinasStore } from './store/useDisciplinasStore';
import { useThemeStore } from './store/useThemeStore';
import type { ResultadoImportacao } from './types';
import { criarNomeArquivoBackup, parseBackupDisciplinas, serializarBackupDisciplinas } from './utils/backup';
import { baixarTextoComoArquivo } from './utils/download';
import { parseQuestoesComDiagnostico } from './utils/parser';

type TelaAtiva = 'home' | 'importar' | 'estudar' | 'gerenciar';

export default function App() {
  const disciplinas = useDisciplinasStore((state) => state.disciplinas);
  const adicionarDisciplina = useDisciplinasStore((state) => state.adicionarDisciplina);
  const adicionarQuestoes = useDisciplinasStore((state) => state.adicionarQuestoes);
  const importarDisciplinas = useDisciplinasStore((state) => state.importarDisciplinas);
  const obterDisciplinaPorId = useDisciplinasStore((state) => state.obterDisciplinaPorId);
  const excluirQuestao = useDisciplinasStore((state) => state.excluirQuestao);
  const excluirQuestoesEmLote = useDisciplinasStore((state) => state.excluirQuestoesEmLote);
  const excluirDisciplina = useDisciplinasStore((state) => state.excluirDisciplina);
  const listarQuestoesGerenciadas = useDisciplinasStore(
    (state) => state.listarQuestoesGerenciadas,
  );
  const detectarPossiveisDuplicadas = useDisciplinasStore(
    (state) => state.detectarPossiveisDuplicadas,
  );
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
    const conteudo = serializarBackupDisciplinas(disciplinas);
    baixarTextoComoArquivo(conteudo, criarNomeArquivoBackup());
  };

  const handleExportarDisciplina = (disciplinaId: string) => {
    const disciplina = obterDisciplinaPorId(disciplinaId);

    if (!disciplina) {
      throw new Error('Disciplina nao encontrada para exportacao.');
    }

    const conteudo = serializarBackupDisciplinas([disciplina]);
    baixarTextoComoArquivo(conteudo, criarNomeArquivoBackup(disciplina.nome));
  };

  const handleImportarArquivo = async (arquivo: File): Promise<ResultadoImportacao> => {
    const conteudo = await arquivo.text();
    const backup = parseBackupDisciplinas(conteudo);
    return importarDisciplinas(backup);
  };

  if (telaAtiva !== 'home' && telaAtiva !== 'gerenciar' && !disciplinaSelecionada) {
    return (
      <HomePage
        disciplinas={disciplinas}
        onCriarDisciplina={adicionarDisciplina}
        onAbrirCadastro={(disciplinaId) => abrirTela('importar', disciplinaId)}
        onAbrirEstudo={(disciplinaId) => abrirTela('estudar', disciplinaId)}
        onAbrirGerenciamento={() => abrirTela('gerenciar')}
        onExportarTudo={handleExportarTudo}
        onExportarDisciplina={handleExportarDisciplina}
        onImportarArquivo={handleImportarArquivo}
      />
    );
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

  if (telaAtiva === 'gerenciar') {
    return (
      <ManageQuestionsPage
        disciplinas={disciplinas}
        questoes={listarQuestoesGerenciadas()}
        possiveisDuplicadas={detectarPossiveisDuplicadas()}
        onVoltar={() => setTelaAtiva('home')}
        onExcluirQuestao={excluirQuestao}
        onExcluirSelecionadas={excluirQuestoesEmLote}
        onExcluirDisciplina={excluirDisciplina}
      />
    );
  }

  return (
    <HomePage
      disciplinas={disciplinas}
      onCriarDisciplina={adicionarDisciplina}
      onAbrirCadastro={(disciplinaId) => abrirTela('importar', disciplinaId)}
      onAbrirEstudo={(disciplinaId) => abrirTela('estudar', disciplinaId)}
      onAbrirGerenciamento={() => abrirTela('gerenciar')}
      onExportarTudo={handleExportarTudo}
      onExportarDisciplina={handleExportarDisciplina}
      onImportarArquivo={handleImportarArquivo}
    />
  );
}
