import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type AppSelectOption = { value: string; label: string };

type AppSelectProps = {
  id: string;
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  /** Para leitores de tela quando a lista está aberta. */
  listaAriaLabel?: string;
};

export function AppSelect({
  id,
  value,
  options,
  onChange,
  className = '',
  listaAriaLabel = 'Opções',
}: AppSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const [hilite, setHilite] = useState(0);

  const selectedIdx = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value],
  );
  const displayLabel =
    selectedIdx >= 0 ? (options[selectedIdx]?.label ?? value) : value;

  useEffect(() => {
    if (!aberto) {
      return;
    }
    setHilite(selectedIdx >= 0 ? selectedIdx : 0);
  }, [aberto, selectedIdx]);

  useEffect(() => {
    if (!aberto) {
      return;
    }
    function onPointerDown(e: Event) {
      const node = e.target;
      if (!(node instanceof Node)) {
        return;
      }
      if (rootRef.current && !rootRef.current.contains(node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setAberto(false);
        triggerRef.current?.focus();
        return;
      }
      if (options.length === 0) {
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHilite((i) => Math.min(i + 1, options.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHilite((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = options[hilite];
        if (opt) {
          onChange(opt.value);
          setAberto(false);
          triggerRef.current?.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto, hilite, onChange, options]);

  const abrirOuAlternar = () => {
    setAberto((v) => !v);
    if (!aberto) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const aoEscolher = (next: string) => {
    onChange(next);
    setAberto(false);
    triggerRef.current?.focus();
  };

  const wrapClassName = ['app-select', className].filter(Boolean).join(' ');

  return (
    <div className={wrapClassName} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`app-select__trigger${aberto ? ' app-select__trigger--aberto' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listId}
        onClick={abrirOuAlternar}
      >
        <span className="app-select__valor">{displayLabel}</span>
        <ChevronDown className="app-select__chevron" size={18} strokeWidth={2} aria-hidden />
      </button>
      {aberto ? (
        <ul
          id={listId}
          className="app-select__list"
          role="listbox"
          aria-label={listaAriaLabel}
        >
          {options.map((opt, i) => (
            <li key={opt.value === '' ? '__empty__' : opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                tabIndex={-1}
                className={`app-select__option${opt.value === value ? ' app-select__option--selected' : ''}${i === hilite ? ' app-select__option--highlight' : ''}`}
                onMouseEnter={() => setHilite(i)}
                onClick={() => aoEscolher(opt.value)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
