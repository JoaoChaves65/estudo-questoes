import { useCallback, useEffect, useRef, useState } from 'react';

import { LogIn, LogOut, Menu, Upload, UserPen, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ConfirmDialog } from './ConfirmDialog';

type HomeHeaderMenuProps = {
  authLoading: boolean;
  disciplinasLength: number;
  userEmail: string | undefined;
  onAbrirImportacao: () => void;
  onExportarTudo: () => void;
  onAbrirDesempenho: () => void;
  onAbrirTesteIa: () => void;
  onLogout: () => void | Promise<void>;
};

export function HomeHeaderMenu({
  authLoading,
  disciplinasLength,
  userEmail,
  onAbrirImportacao,
  onExportarTudo,
  onAbrirDesempenho,
  onAbrirTesteIa,
  onLogout,
}: HomeHeaderMenuProps) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [confirmarSairAberto, setConfirmarSairAberto] = useState(false);
  const [saindoConta, setSaindoConta] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    if (!aberto) {
      return;
    }
    const clicouFora = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        fechar();
      }
    };
    document.addEventListener('mousedown', clicouFora);
    return () => document.removeEventListener('mousedown', clicouFora);
  }, [aberto, fechar]);

  useEffect(() => {
    if (!aberto) {
      return;
    }
    const aoTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        fechar();
      }
    };
    window.addEventListener('keydown', aoTecla);
    return () => window.removeEventListener('keydown', aoTecla);
  }, [aberto, fechar]);

  const executarLogoutConfirmado = async () => {
    if (saindoConta) {
      return;
    }
    setSaindoConta(true);
    try {
      await Promise.resolve(onLogout());
      setConfirmarSairAberto(false);
    } finally {
      setSaindoConta(false);
    }
  };

  return (
    <>
    <div className="home-header-menu" ref={rootRef}>
      <button
        type="button"
        className="button button--secondary home-header-menu__trigger"
        aria-expanded={aberto}
        aria-haspopup="true"
        aria-controls="painel-menu-inicio"
        onClick={() => setAberto((v) => !v)}
      >
        <Menu size={18} aria-hidden />
        <span className="home-header-menu__trigger-label">Menu</span>
      </button>
      {aberto ? (
        <div
          id="painel-menu-inicio"
          role="region"
          aria-label="Backup, ferramentas e conta"
          className="home-header-menu__painel card"
        >
          <nav className="home-header-menu__nav" aria-label="Menu inicial">
            <div className="home-header-menu__secao">
              <p className="home-header-menu__rotulo muted">Backup</p>
              <div className="home-header-menu__acoes">
                <button
                  type="button"
                  className="button button--secondary home-header-menu__item"
                  onClick={() => {
                    fechar();
                    onAbrirImportacao();
                  }}
                >
                  <Upload size={16} aria-hidden />
                  Importar JSON
                </button>
                <button
                  type="button"
                  className="button home-header-menu__item"
                  disabled={disciplinasLength === 0}
                  onClick={() => {
                    fechar();
                    onExportarTudo();
                  }}
                >
                  Exportar tudo
                </button>
              </div>
            </div>

            <div className="home-header-menu__secao">
              <p className="home-header-menu__rotulo muted">Ferramentas</p>
              <div className="home-header-menu__acoes">
                <button
                  type="button"
                  className="button button--secondary home-header-menu__item"
                  onClick={() => {
                    fechar();
                    onAbrirDesempenho();
                  }}
                >
                  <Workflow size={16} aria-hidden />
                  Desempenho
                </button>
                <button
                  type="button"
                  className="button button--secondary home-header-menu__item"
                  onClick={() => {
                    fechar();
                    onAbrirTesteIa();
                  }}
                >
                  Testar IA
                </button>
              </div>
            </div>

            {!authLoading ? (
              <div className="home-header-menu__secao home-header-menu__secao--conta">
                <p className="home-header-menu__rotulo muted">Conta</p>
                {userEmail ? (
                  <>
                    <p
                      className="home-header-menu__email muted"
                      title={userEmail}
                    >
                      {userEmail}
                    </p>
                    <button
                      type="button"
                      className="button button--secondary home-header-menu__item"
                      onClick={() => {
                        fechar();
                        navigate('/conta');
                      }}
                    >
                      <UserPen size={16} aria-hidden />
                      Dados da conta
                    </button>
                    <button
                      type="button"
                      className="button button--secondary home-header-menu__item"
                      onClick={() => {
                        fechar();
                        setConfirmarSairAberto(true);
                      }}
                    >
                      <LogOut size={16} aria-hidden />
                      Sair
                    </button>
                  </>
                ) : (
                  <div className="home-header-menu__acoes">
                    <button
                      type="button"
                      className="button button--secondary home-header-menu__item"
                      onClick={() => {
                        fechar();
                        navigate('/login');
                      }}
                    >
                      <LogIn size={16} aria-hidden />
                      Entrar
                    </button>
                    <button
                      type="button"
                      className="button home-header-menu__item"
                      onClick={() => {
                        fechar();
                        navigate('/registo');
                      }}
                    >
                      Cadastrar
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
    <ConfirmDialog
      open={confirmarSairAberto}
      title="Sair da conta?"
      description={
        <>
          <p className="ia-dialog-limpar-conversa-intro">
            Para biblioteca e chat IA voltarem a sincronizar na nuvem, será preciso entrar de novo neste navegador.
          </p>
          <p className="ia-dialog-limpar-conversa-fim">Quer sair mesmo?</p>
        </>
      }
      confirmLabel={saindoConta ? 'Saindo…' : 'Sair'}
      cancelLabel="Cancelar"
      dialogBusy={saindoConta}
      onCancel={() => {
        if (!saindoConta) {
          setConfirmarSairAberto(false);
        }
      }}
      onConfirm={() => void executarLogoutConfirmado()}
    />
    </>
  );
}
