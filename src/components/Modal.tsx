import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  widthClass?: string;
}

export function Modal({ title, children, onClose, widthClass = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Travar scroll do body quando o modal estiver aberto
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop cobrindo 100% da tela */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Caixa do Modal */}
      <div
        className={`relative z-10 flex max-h-[90vh] w-full flex-col rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-modal ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-7 py-5 dark:border-slate-800 dark:bg-slate-900 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fechar modal"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body com scroll */}
        <div className="overflow-y-auto p-7">{children}</div>
      </div>
    </div>,
    document.body
  );
}
