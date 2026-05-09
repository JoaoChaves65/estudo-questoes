/**
 * Em `vite`/`vercel dev`, o alias aponta `virtual:pwa-register` para aqui.
 * Com `devOptions.enabled: false` o plugin não expõe o virtual module — sem isto o dev quebra.
 * Em `vite build` não há alias: usa-se o módulo real gerado pelo PWA.
 */
export function registerSW(_options?: {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}): (reloadPage?: boolean) => Promise<void> {
  return async (_reloadPage?: boolean) => {};
}
