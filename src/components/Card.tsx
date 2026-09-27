import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300/80 dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none dark:hover:border-slate-700/80 ${className}`}>
      {children}
    </div>
  );
}

interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export function Alert({ type, message, onClose }: AlertProps) {
  const styles = {
    error: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-300',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/50 dark:text-amber-300',
    info: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/40 dark:border-teal-800/50 dark:text-teal-300',
  }[type];

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-all animate-fadeIn ${styles}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-relaxed">{message}</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100 transition"
            aria-label="Fechar alerta"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
