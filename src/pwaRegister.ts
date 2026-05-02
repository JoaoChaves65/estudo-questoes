import { registerSW } from 'virtual:pwa-register';

/** Evento disparado quando existe build novo para aplicar via service worker */
export const PWA_REFRESH_EVENT = 'estudo-questoes:pwa-refresh';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

/**
 * Chama uma vez no boot (`main.tsx`). O callback de UI deve ouvir {@link PWA_REFRESH_EVENT}.
 */
export function inicializarRegistroSw() {
  updateSW = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent(PWA_REFRESH_EVENT));
    },
  });
}

/** Aplica atualização do service worker e recarrega quando concluído. */
export function aplicarAtualizacaoSw() {
  return updateSW?.(true);
}
