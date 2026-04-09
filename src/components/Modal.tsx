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
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-4xl'
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
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/75 px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top)+0.5rem)] backdrop-blur-md sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        className={clsx(
          'w-full overflow-hidden border border-white/10 bg-slate-950/92 shadow-[0_36px_100px_rgba(0,0,0,0.5)]',
          'max-w-[calc(100vw-1.5rem)] max-h-[82dvh] rounded-[26px] sm:max-h-[88vh] sm:rounded-[30px]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          sizeClass[size]
        )}
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
        ref={initialFocusRef}
      >
        <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-white/12 sm:hidden" />
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-2.5 sm:px-6 sm:py-4">
          <h2 className="text-[15px] font-semibold text-white sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭弹窗"
          >
            ×
          </button>
        </div>
        <div className="max-h-[calc(82dvh-7rem)] overflow-y-auto px-4 py-3 text-sm text-slate-200 sm:max-h-[calc(88vh-8.5rem)] sm:px-6 sm:py-5">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-white/8 bg-slate-950/96 px-4 py-2.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6 sm:py-4 sm:pb-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
