import { useEffect, useRef, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useThemeStore } from '../store/useThemeStore';

type LayoutProps = {
  titulo: string;
  subtitulo: string;
  /** Esconder o texto “Estudo Automatizado” quando o hero já comunica bem o propósito. */
  omitirEyebrow?: boolean;
  /** Modifier extra da barra de ações à direita (ex.: toolbar compacta na home). */
  classNameHeroAcoes?: string;
  /** Conteúdo à esquerda da barra (tema + menu), antes deles — ex.: modo convidado no painel. */
  cabecalhoHeroEsquerda?: ReactNode;
  acoes?: ReactNode;
  compactHeader?: ReactNode;
  children: ReactNode;
};

export function Layout({
  titulo,
  subtitulo,
  omitirEyebrow = false,
  classNameHeroAcoes,
  cabecalhoHeroEsquerda,
  acoes,
  compactHeader,
  children,
}: LayoutProps) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

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

        <main ref={mainRef} id="conteudo-principal" className="page-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  const usarBarraLiderTrailing = Boolean(cabecalhoHeroEsquerda);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          {!omitirEyebrow ? (
            <p className="hero__eyebrow">Estudo Automatizado</p>
          ) : null}
          <h1>{titulo}</h1>
          <p className="hero__subtitle">{subtitulo}</p>
        </div>
        <div
          className={
            ['hero__actions', classNameHeroAcoes, usarBarraLiderTrailing ? 'hero__actions--with-leading' : '']
              .filter(Boolean)
              .join(' ')
          }
        >
          {usarBarraLiderTrailing ? (
            <>
              <div className="hero__actions-leading">{cabecalhoHeroEsquerda}</div>
              <div className="hero__actions-trailing">
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </header>

      <main ref={mainRef} id="conteudo-principal" className="page-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
