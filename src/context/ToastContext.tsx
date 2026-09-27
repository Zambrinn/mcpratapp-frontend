import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Icon } from '../components/Icons';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-5 top-5 z-50 flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              'pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs sm:text-sm font-medium shadow-xl backdrop-blur-md animate-fadeIn transition-all',
              toast.type === 'success' &&
                'border-emerald-200 bg-white/95 text-emerald-900 dark:border-emerald-800/60 dark:bg-slate-900/95 dark:text-emerald-300',
              toast.type === 'error' &&
                'border-rose-200 bg-white/95 text-rose-900 dark:border-rose-800/60 dark:bg-slate-900/95 dark:text-rose-300',
              toast.type === 'info' &&
                'border-teal-200 bg-white/95 text-teal-900 dark:border-teal-800/60 dark:bg-slate-900/95 dark:text-teal-300',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/15">
              {toast.type === 'success' && <Icon name="check" className="h-3.5 w-3.5" />}
              {toast.type === 'error' && <Icon name="x" className="h-3.5 w-3.5" />}
              {toast.type === 'info' && <Icon name="trend" className="h-3.5 w-3.5" />}
            </span>
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }
  return context;
}
