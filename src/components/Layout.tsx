import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

import { useThemeStore } from '../store/useThemeStore';

type LayoutProps = {
  titulo: string;
  subtitulo: string;
  acoes?: ReactNode;
  compactHeader?: ReactNode;
  children: ReactNode;
};

export function Layout({
  titulo,
  subtitulo,
  acoes,
  compactHeader,
  children,
}: LayoutProps) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  if (compactHeader) {
    return (
      <div className="app-shell app-shell--focus">
        <div className="focus-topbar">
          <button
            type="button"
            className="button button--secondary theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="focus-topbar__actions">{compactHeader}</div>
        </div>

        <main className="page-content">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="hero__eyebrow">Estudo Automatizado</p>
          <h1>{titulo}</h1>
          <p className="hero__subtitle">{subtitulo}</p>
        </div>
        <div className="hero__actions">
          <button
            type="button"
            className="button button--secondary theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {acoes}
        </div>
      </header>

      <main className="page-content">{children}</main>
    </div>
  );
}
