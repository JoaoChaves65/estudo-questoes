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

function aplicarBundleNasStores(bundle: StudyLibraryBundle): void {
  useDisciplinasStore.setState({ disciplinas: bundle.disciplinas });
  useSrsProgressStore.setState({ porDisciplina: bundle.progressoInteligente.porDisciplina });
  useSrsProgressStore.getState().sincronizarRolloverGlobal(Date.now());
  useDesempenhoStore.setState({
    porDisciplina: bundle.estatisticasDesempenho?.porDisciplina ?? {},
  });
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
  const localEmpty = local.disciplinas.length === 0;

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
      aplicarBundleNasStores(serverBundle);
      return { ok: true };
    }

    const serverBundle: StudyLibraryBundle = {
      disciplinas: server.disciplinas,
      progressoInteligente: server.progressoInteligente,
      estatisticasDesempenho: server.estatisticasDesempenho,
    };
    const merged = mergeStudyLibraryBundles(serverBundle, local);
    aplicarBundleNasStores(merged);
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
