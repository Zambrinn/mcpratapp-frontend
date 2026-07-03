import { ReactNode } from 'react';
import { Icon } from './Icons';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  widthClass?: string;
}

export function Modal({ title, children, onClose, widthClass = 'max-w-2xl' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl ${widthClass}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fechar"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
