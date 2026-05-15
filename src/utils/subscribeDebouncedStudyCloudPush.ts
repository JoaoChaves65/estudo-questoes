import type { StoreApi } from 'zustand';

import { enviarBibliotecaLocalParaNuvem } from './studyLibrarySync';

function browserReportsOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

/** Escreve o snapshot atual nos stores para a nuvem (debounce) com sessão. Sem rede apenas persiste via Zustand/localStorage até haver sync em `online` ou próximo login. */
export function subscribeDebouncedStudyLibraryPush(opts: {
  debounceMs: number;
  getDisciplinasStore: () => StoreApi<object>;
  getSrsStore: () => StoreApi<object>;
  getDesempenhoStore: () => StoreApi<object>;
}): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight = false;
  let pendingResync = false;

  const flush = () => {
    timer = undefined;
    if (!browserReportsOnline()) {
      return;
    }
    if (inFlight) {
      pendingResync = true;
      return;
    }
    inFlight = true;
    void enviarBibliotecaLocalParaNuvem()
      .then((r) => {
        if (!r.ok) {
          console.warn('[study-library]', r.message);
        }
      })
      .finally(() => {
        inFlight = false;
        if (pendingResync) {
          pendingResync = false;
          schedule();
        }
      });
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!browserReportsOnline()) {
      return;
    }
    timer = setTimeout(flush, opts.debounceMs);
  };

  const u1 = opts.getDisciplinasStore().subscribe(schedule);
  const u2 = opts.getSrsStore().subscribe(schedule);
  const u3 = opts.getDesempenhoStore().subscribe(schedule);

  return () => {
    clearTimeout(timer);
    u1();
    u2();
    u3();
  };
}
