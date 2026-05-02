import { copyFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
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

// GitHub Pages publica em /<nome-do-repo>/; sem isso os assets vão para /assets e quebram (tela em branco).
export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? '/estudo-questoes/' : '/';

  return {
    base,
    plugins: [
      react(),
      copyIndexAs404HtmlPlugin(),
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
    ],
  };
});
