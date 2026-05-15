import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type VarianteAssociacaoBiblioteca = 'nuvem-vazia' | 'nuvem-com-dados';

type StudyLibraryAssociateDialogProps = {
  open: boolean;
  /** Email da conta com sessão já criada ou recém registada */
  contaEmail: string;
  variant: VarianteAssociacaoBiblioteca;
  ocupado: boolean;
  erro: string | null;
  /** Descrição opcional antes dos botões (ex.: erro de rede) */
  children?: ReactNode;
  aoAssociar: () => void;
  /** Conta só da outra pessoa / não quero fundir neste equipamento */
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
          Acabaste de entrar como <strong>{contaEmail}</strong>. Como <strong>convidado(a)</strong> já tinhas
          coisas guardadas só neste navegador — queres <strong>subir esse trabalho para esta conta na nuvem</strong>{' '}
          (equivale ao backup que exportarias em JSON, mas direto para a conta)?
        </p>
        <p>
          Se estás a usar <strong>só este PC para criar conta de outra pessoa</strong>, escolhe «Não»: apaga‑se só
          o que está neste dispositivo para essa conta continuar limpa lá em cima.
        </p>
        <p className="library-associate-dialog__hint muted">
          Para teres uma cópia teu lado antes de decidir: no menu usa <strong>Exportar tudo</strong>.
        </p>
      </>
    ) : (
      <>
        <p>
          Estás ligado como <strong>{contaEmail}</strong>. Este navegador tem dados{' '}
          <strong>e a tua conta</strong> também já tem biblioteca na nuvem (outra sessão ou dispositivo).
        </p>
        <p>
          Queres <strong>fundir</strong> navegador + nuvem (em conflito de mesmo ID prevalece a nuvem), ou{' '}
          <strong>ignorar o que só está aqui</strong> e ficar apenas com os dados já na conta?
        </p>
      </>
    );

  const labelSim =
    variant === 'nuvem-vazia'
      ? 'Sim — subir para esta conta'
      : 'Sim — fundir navegador com a nuvem';
  const labelNao =
    variant === 'nuvem-vazia'
      ? 'Não — não usar estes dados (conta nova limpa)'
      : 'Não — só nuvem, descarto o extra local';

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
          Subir ou fundir dados?
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
          <button
            type="button"
            className="button"
            disabled={ocupado}
            onClick={() => aoAssociar()}
          >
            {labelSim}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
