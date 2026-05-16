import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botão principal em estilo perigoso (ex.: exclusões). */
  destructive?: boolean;
  /** Desativa os dois botões (ex.: enquanto um pedido assíncrono corre). */
  dialogBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  dialogBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!dialogBusy) {
          onCancel();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, dialogBusy]);

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
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="confirm-dialog-overlay" role="presentation">
      <button
        type="button"
        className="confirm-dialog-backdrop"
        aria-label={dialogBusy ? undefined : 'Fechar diálogo'}
        aria-disabled={dialogBusy}
        onClick={() => {
          if (!dialogBusy) {
            onCancel();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="confirm-dialog-panel card"
      >
        <h2 id={titleId} className="confirm-dialog-title">
          {title}
        </h2>
        <div id={descId} className="confirm-dialog-description muted">
          {description}
        </div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onCancel}
            disabled={dialogBusy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`button${destructive ? ' button--danger' : ''}`}
            onClick={onConfirm}
            disabled={dialogBusy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
