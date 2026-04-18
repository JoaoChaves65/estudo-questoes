import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// GitHub Pages publica em /<nome-do-repo>/; sem isso os assets vão para /assets e quebram (tela em branco).
export default defineConfig(({ mode }) => ({
    plugins: [react()],
    base: mode === 'production' ? '/estudo-questoes/' : '/',
}));
