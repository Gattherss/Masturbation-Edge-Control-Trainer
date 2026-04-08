import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl'
};

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const initialFocusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      initialFocusRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={clsx(
          'w-full overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/92 shadow-[0_36px_100px_rgba(0,0,0,0.5)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          sizeClass[size]
        )}
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
        ref={initialFocusRef}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭弹窗"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5 text-sm text-slate-200">{children}</div>
        {footer ? <div className="border-t border-white/8 px-6 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
