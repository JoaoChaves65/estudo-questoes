import { useDesempenhoStore } from '../store/useDesempenhoStore';
import { useDisciplinasStore } from '../store/useDisciplinasStore';
import { useSrsProgressStore } from '../store/useSrsProgressStore';
import type { StudyLibraryBundle } from './studyLibraryMerge';
import { mergeStudyLibraryBundles } from './studyLibraryMerge';
import { fetchStudyLibrary, putStudyLibrary } from './studyLibraryApi';

function readBundleFromStores(): StudyLibraryBundle {
  useSrsProgressStore.getState().sincronizarRolloverGlobal(Date.now());
  const disciplinas = useDisciplinasStore.getState().disciplinas;
  const progressoInteligente = useSrsProgressStore.getState().exportarSnapshot();
  const rawDes = useDesempenhoStore.getState().exportarSnapshot();
  const estatisticasDesempenho =
    Object.keys(rawDes.porDisciplina).length > 0 ? rawDes : null;
  return { disciplinas, progressoInteligente, estatisticasDesempenho };
}

/** Aplica um snapshot completo (ex.: apenas nuvem, sem merge com outro lado). */
export function aplicarBibliotecaNasStores(bundle: StudyLibraryBundle): void {
  useDisciplinasStore.setState({ disciplinas: bundle.disciplinas });
  useSrsProgressStore.setState({ porDisciplina: bundle.progressoInteligente.porDisciplina });
  useSrsProgressStore.getState().sincronizarRolloverGlobal(Date.now());
  useDesempenhoStore.setState({
    porDisciplina: bundle.estatisticasDesempenho?.porDisciplina ?? {},
  });
}

export const STUDY_LIBRARY_BUNDLE_VAZIO: StudyLibraryBundle = {
  disciplinas: [],
  progressoInteligente: { porDisciplina: {} },
  estatisticasDesempenho: null,
};

/** SRS/desempenho órfão (sem disciplinas) conta como “sessão anterior” neste browser. */
export function bibliotecaLocalPareceTerDados(): boolean {
  if (useDisciplinasStore.getState().disciplinas.length > 0) {
    return true;
  }
  if (Object.keys(useSrsProgressStore.getState().porDisciplina).length > 0) {
    return true;
  }
  return Object.keys(useDesempenhoStore.getState().porDisciplina).length > 0;
}

export function limparBibliotecaLocalNoBrowser(): void {
  aplicarBibliotecaNasStores(STUDY_LIBRARY_BUNDLE_VAZIO);
}

/** Após GET: substitui o local pela nuvem (sem merge com dados que estavam no browser). */
export async function substituirLocalPelosDadosNuvem(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  let server: Awaited<ReturnType<typeof fetchStudyLibrary>>;
  try {
    server = await fetchStudyLibrary();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao ler biblioteca na nuvem.';
    return { ok: false, message: msg };
  }
  const serverBundle: StudyLibraryBundle = {
    disciplinas: server.disciplinas,
    progressoInteligente: server.progressoInteligente,
    estatisticasDesempenho: server.estatisticasDesempenho,
  };
  aplicarBibliotecaNasStores(serverBundle);
  return { ok: true };
}

/** Conta nova (nuvem vazia): apaga só o dispositivo e confirma snapshot vazio no servidor. */
export async function rejeitarDadosLocaisNuvemVazia(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  limparBibliotecaLocalNoBrowser();
  try {
    await putStudyLibrary({
      disciplinas: STUDY_LIBRARY_BUNDLE_VAZIO.disciplinas,
      progressoInteligente: STUDY_LIBRARY_BUNDLE_VAZIO.progressoInteligente,
      estatisticasDesempenho: STUDY_LIBRARY_BUNDLE_VAZIO.estatisticasDesempenho,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao gravar biblioteca na nuvem.';
    return { ok: false, message: msg };
  }
}

/**
 * Lê o servidor; funde com o local conforme o plano (servidor vence em conflitos de id)
 * e grava o resultado nas stores e na nuvem quando necessário.
 */
export async function sincronizarBibliotecaComNuvem(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  let server: Awaited<ReturnType<typeof fetchStudyLibrary>>;
  try {
    server = await fetchStudyLibrary();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao sincronizar biblioteca.';
    return { ok: false, message: msg };
  }

  const local = readBundleFromStores();
  const serverEmpty = server.empty || server.disciplinas.length === 0;
  const localAlgumDado =
    local.disciplinas.length > 0 ||
    Object.keys(local.progressoInteligente.porDisciplina).length > 0 ||
    (local.estatisticasDesempenho != null &&
      Object.keys(local.estatisticasDesempenho.porDisciplina).length > 0);
  const localEmpty = !localAlgumDado;

  try {
    if (serverEmpty && localEmpty) {
      return { ok: true };
    }

    if (serverEmpty && !localEmpty) {
      await putStudyLibrary({
        disciplinas: local.disciplinas,
        progressoInteligente: local.progressoInteligente,
        estatisticasDesempenho: local.estatisticasDesempenho,
      });
      return { ok: true };
    }

    if (!serverEmpty && localEmpty) {
      const serverBundle: StudyLibraryBundle = {
        disciplinas: server.disciplinas,
        progressoInteligente: server.progressoInteligente,
        estatisticasDesempenho: server.estatisticasDesempenho,
      };
      aplicarBibliotecaNasStores(serverBundle);
      return { ok: true };
    }

    const serverBundle: StudyLibraryBundle = {
      disciplinas: server.disciplinas,
      progressoInteligente: server.progressoInteligente,
      estatisticasDesempenho: server.estatisticasDesempenho,
    };
    const merged = mergeStudyLibraryBundles(serverBundle, local);
    aplicarBibliotecaNasStores(merged);
    await putStudyLibrary({
      disciplinas: merged.disciplinas,
      progressoInteligente: merged.progressoInteligente,
      estatisticasDesempenho: merged.estatisticasDesempenho,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao gravar biblioteca na nuvem.';
    return { ok: false, message: msg };
  }
}

const STORAGE_LIBRARY_BIND_PENDING = 'estudoquestoes:library-bind-pending';

export function associacaoBibliotecaPendenteDeEscolha(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_LIBRARY_BIND_PENDING) !== null;
  } catch {
    return false;
  }
}

export function marcarAssociacaoBibliotecaPendenteEscolha(userId: string): void {
  try {
    sessionStorage.setItem(STORAGE_LIBRARY_BIND_PENDING, userId);
  } catch {
    /* ignore */
  }
}

export function limparMarcadorAssociacaoBibliotecaPendente(): void {
  try {
    sessionStorage.removeItem(STORAGE_LIBRARY_BIND_PENDING);
  } catch {
    /* ignore */
  }
}

/** Envia o estado atual dos stores para o servidor (ex.: após importar JSON). */
export async function enviarBibliotecaLocalParaNuvem(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const local = readBundleFromStores();
  try {
    await putStudyLibrary({
      disciplinas: local.disciplinas,
      progressoInteligente: local.progressoInteligente,
      estatisticasDesempenho: local.estatisticasDesempenho,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao gravar biblioteca na nuvem.';
    return { ok: false, message: msg };
  }
}
