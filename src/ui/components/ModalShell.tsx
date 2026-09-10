import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface ModalShellProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
  size?: 'compact' | 'wide';
}

export function ModalShell({
  title,
  eyebrow,
  description,
  children,
  actions,
  onClose,
  dismissible = true,
  size = 'compact',
}: ModalShellProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const initialFocus = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (!node.open) node.showModal();
    initialFocus.current?.focus();
    return () => {
      if (node.open) node.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`gfl-modal gfl-modal--${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        if (!dismissible) {
          event.preventDefault();
          return;
        }
        onClose?.();
      }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose?.();
      }}
    >
      <section className="gfl-modal__surface">
        <header className="gfl-modal__header">
          <div>
            {eyebrow && <p className="gfl-eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          {dismissible && (
            <button
              ref={initialFocus}
              className="gfl-icon-button"
              type="button"
              aria-label={`Close ${title}`}
              onClick={onClose}
            >
              <span aria-hidden="true">X</span>
            </button>
          )}
        </header>
        <div className="gfl-modal__body">{children}</div>
        {actions && <footer className="gfl-modal__actions">{actions}</footer>}
      </section>
    </dialog>
  );
}
