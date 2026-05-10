import { copyFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const configDir =
  typeof import.meta.dirname !== 'undefined'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

/** GitHub Pages: servir SPA em URLs diretas antes do SW estar ativo. */
function copyIndexAs404HtmlPlugin(): Plugin {
  return {
    name: 'copy-index-as-404-html',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(configDir, 'dist');
      const indexPath = path.resolve(distDir, 'index.html');
      if (existsSync(indexPath)) {
        copyFileSync(indexPath, path.resolve(distDir, '404.html'));
      }
    },
  };
}

// Produção na Vercel: `VERCEL` definido no build → base `/`. Build local/Pages: `/estudo-questoes/`.
// `vite-plugin-pwa` em modo dev faz o `index.html` passar pelo `vite:import-analysis` e falha (parece JS inválido).
// Em `serve`: não carregar PWA — só alias `virtual:pwa-register` → shim. Em `build`: PWA completo.
//
// Nota: não use rewrite catch-all SPA em `vercel.json` se você depende de `vercel dev`: o CLI aplica
// essas rewrites ao servidor do Vite e quebra `/@vite/*`, `/src/*`, etc. Para fallback em rotas no deploy,
// configure um Rewrite no projeto Vercel (UI) ou outro mecanismo que não interfira no dev server.
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, configDir, '');
  const devApiProxy = env.DEV_API_PROXY?.trim();

  const base =
    Boolean(process.env.VERCEL) || process.env.VITE_USE_ROOT_BASE === '1'
      ? '/'
      : mode === 'production'
        ? '/estudo-questoes/'
        : '/';

  const alias: Record<string, string> =
    command === 'serve'
      ? { 'virtual:pwa-register': path.resolve(configDir, 'src/pwaRegisterDevShim.ts') }
      : {};

  const pwaPlugins =
    command === 'build'
      ? [
          VitePWA({
            registerType: 'prompt',
            injectRegister: false,
            includeAssets: ['pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png'],
            manifest: {
              name: 'Estudo de Questões',
              short_name: 'Estudo',
              description:
                'Monte disciplinas, importe questões e estude com feedback imediato, inclusive offline.',
              lang: 'pt-BR',
              theme_color: '#0f172a',
              background_color: '#0f172a',
              display: 'standalone',
              orientation: 'portrait-primary',
              icons: [
                {
                  src: 'pwa-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: 'pwa-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: 'pwa-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
              navigateFallback: 'index.html',
              navigateFallbackDenylist: [/^\/api\//],
              cleanupOutdatedCaches: true,
            },
          }),
        ]
      : [];

  const server =
    command === 'serve' && devApiProxy
      ? {
          proxy: {
            '/api': {
              target: devApiProxy.replace(/\/$/, ''),
              changeOrigin: true,
            },
          },
        }
      : undefined;

  return {
    base,
    resolve: {
      alias,
    },
    ...(server ? { server } : {}),
    plugins: [react(), copyIndexAs404HtmlPlugin(), ...pwaPlugins],
  };
});
