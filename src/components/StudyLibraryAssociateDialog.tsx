import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type VarianteAssociacaoBiblioteca = 'nuvem-vazia' | 'nuvem-com-dados';

type StudyLibraryAssociateDialogProps = {
  open: boolean;
  /** Email da conta com sessão já criada ou recém criada */
  contaEmail: string;
  variant: VarianteAssociacaoBiblioteca;
  ocupado: boolean;
  erro: string | null;
  /** Descrição opcional antes dos botões (ex.: erro de rede) */
  children?: ReactNode;
  aoAssociar: () => void;
  /** Conta só da outra pessoa / não quero mesclar neste equipamento */
  aoNaoAssociar: () => void;
};

export function StudyLibraryAssociateDialog({
  open,
  contaEmail,
  variant,
  ocupado,
  erro,
  children,
  aoAssociar,
  aoNaoAssociar,
}: StudyLibraryAssociateDialogProps) {
  const titleId = useId();
  const descId = useId();
  const primeiroAcaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    primeiroAcaoRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function aoTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    }
    document.addEventListener('keydown', aoTecla);
    return () => document.removeEventListener('keydown', aoTecla);
  }, [open]);

  if (!open) {
    return null;
  }

  const textoPrincipal =
    variant === 'nuvem-vazia' ? (
      <>
        <p>
          Você acabou de entrar como <strong>{contaEmail}</strong>. Como{' '}
          <strong>visitante(a)</strong>, você já tinha conteúdo guardado só neste navegador — quer{' '}
          <strong>enviar esse trabalho para esta conta na nuvem</strong> (equivalente ao backup em JSON
          que você exportaria, só que direto na conta)?
        </p>
        <p>
          Se <strong>só vai usar este computador para criar a conta de outra pessoa</strong>, escolha
          «Não»: apagamos só o que está neste dispositivo para a conta nova continuar limpa na nuvem.
        </p>
        <p className="library-associate-dialog__hint muted">
          Para guardar uma cópia antes de decidir, no menu use <strong>Exportar tudo</strong>.
        </p>
      </>
    ) : (
      <>
        <p>
          Você está logado como <strong>{contaEmail}</strong>. Este navegador tem dados{' '}
          <strong>e sua conta</strong> também já tem biblioteca na nuvem (outra sessão ou dispositivo).
        </p>
        <p>
          Quer <strong>mesclar</strong> o que está aqui com a nuvem (em conflito com o mesmo ID,
          prevalece a nuvem), ou <strong>ignorar o que só está aqui</strong> e ficar apenas com os dados já
          na conta?
        </p>
      </>
    );

  const labelSim =
    variant === 'nuvem-vazia'
      ? 'Sim — enviar para esta conta'
      : 'Sim — mesclar navegador com a nuvem';
  const labelNao =
    variant === 'nuvem-vazia'
      ? 'Não — não usar estes dados (conta nova limpa)'
      : 'Não — manter só a nuvem';

  return createPortal(
    <div className="confirm-dialog-overlay" role="presentation">
      {/* Sem fechar ao clicar fora: é escolha obrigatória */}
      <div className="confirm-dialog-backdrop" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="confirm-dialog-panel card library-associate-dialog"
      >
        <h2 id={titleId} className="confirm-dialog-title">
          Enviar ou mesclar dados?
        </h2>
        <div id={descId} className="confirm-dialog-description">
          <div className="library-associate-dialog__body muted">{textoPrincipal}</div>
          {children}
          {erro ? (
            <p className="error-text library-associate-dialog__erro" role="alert">
              {erro}
            </p>
          ) : null}
        </div>
        <div className="confirm-dialog-actions library-associate-dialog__actions">
          <button
            ref={primeiroAcaoRef}
            type="button"
            className="button button--secondary"
            disabled={ocupado}
            onClick={() => aoNaoAssociar()}
          >
            {labelNao}
          </button>
          <button type="button" className="button" disabled={ocupado} onClick={() => aoAssociar()}>
            {labelSim}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
