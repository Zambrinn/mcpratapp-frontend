import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 ${
          error
            ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/30 dark:border-rose-500/60'
            : 'border-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs font-medium text-rose-500 dark:text-rose-400 animate-fadeIn">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
}
