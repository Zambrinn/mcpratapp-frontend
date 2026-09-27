import { useState, useEffect } from 'react';
import { Icon } from './Icons';

interface QuantityStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  error?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  label = 'Quantidade',
  helperText,
  error,
}: QuantityStepperProps) {
  // Use a local string for the input so user can erase/type freely without auto-snapping to 0/1/NaN
  const [textValue, setTextValue] = useState<string>(String(value || min));

  useEffect(() => {
    setTextValue(String(value));
  }, [value]);

  const handleDecrement = () => {
    if (disabled || value <= min) return;
    const next = Math.max(min, value - 1);
    onChange(next);
    setTextValue(String(next));
  };

  const handleIncrement = () => {
    if (disabled) return;
    if (max !== undefined && value >= max) return;
    const next = max !== undefined ? Math.min(max, value + 1) : value + 1;
    onChange(next);
    setTextValue(String(next));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setTextValue(raw);
    if (raw === '') return;
    let num = parseInt(raw, 10);
    if (isNaN(num)) return;
    if (max !== undefined && num > max) num = max;
    onChange(num);
  };

  const handleBlur = () => {
    let num = parseInt(textValue, 10);
    if (isNaN(num) || num < min) {
      num = min;
    } else if (max !== undefined && num > max) {
      num = max;
    }
    setTextValue(String(num));
    onChange(num);
  };

  const handleQuickPick = (amount: number) => {
    if (disabled) return;
    let target = amount;
    if (max !== undefined && target > max) target = max;
    if (target < min) target = min;
    onChange(target);
    setTextValue(String(target));
  };

  const isAtMin = value <= min;
  const isAtMax = max !== undefined && value >= max;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            {label}
          </label>
          {max !== undefined && (
            <span
              className={`text-xs font-medium ${
                max === 0
                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                  : max <= 3
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {max === 0 ? 'Sem estoque' : `Estoque: ${max} un.`}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm transition dark:border-slate-600 dark:bg-slate-700 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || isAtMin}
            aria-label="Diminuir quantidade"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500"
          >
            <Icon name="minus" className="h-4 w-4" />
          </button>

          <input
            type="text"
            inputMode="numeric"
            value={textValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={String(min)}
            className="w-14 bg-transparent text-center font-bold text-slate-800 focus:outline-none dark:text-slate-100 sm:w-16"
          />

          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || isAtMax}
            aria-label="Aumentar quantidade"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition hover:bg-teal-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>

        {/* Quick select pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[1, 2, 5].map((preset) => {
            const isPresetDisabled = disabled || (max !== undefined && preset > max);
            const isSelected = value === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleQuickPick(preset)}
                disabled={isPresetDisabled}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
                } disabled:opacity-30 disabled:pointer-events-none`}
              >
                +{preset}
              </button>
            );
          })}
          {max !== undefined && max > 0 && max <= 50 && (
            <button
              type="button"
              onClick={() => handleQuickPick(max)}
              disabled={disabled || value === max}
              className="rounded-xl bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:opacity-30 disabled:pointer-events-none"
            >
              Máx
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-rose-500 dark:text-rose-400 animate-fadeIn">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
}
