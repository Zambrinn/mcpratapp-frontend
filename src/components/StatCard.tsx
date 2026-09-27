import { ReactNode } from 'react';
import { Icon, IconName } from './Icons';

interface StatCardProps {
  icon?: IconName;
  label: string;
  value: ReactNode;
  trend?: string;
  tone?: 'primary' | 'green' | 'yellow' | 'red' | 'slate';
}

const toneStyles = {
  primary: {
    iconBg: 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/40',
    glow: 'group-hover:shadow-teal-500/10',
  },
  green: {
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40',
    glow: 'group-hover:shadow-emerald-500/10',
  },
  yellow: {
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40',
    glow: 'group-hover:shadow-amber-500/10',
  },
  red: {
    iconBg: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/40',
    glow: 'group-hover:shadow-rose-500/10',
  },
  slate: {
    iconBg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60',
    glow: 'group-hover:shadow-slate-500/10',
  },
};

export function StatCard({ icon, label, value, trend, tone = 'primary' }: StatCardProps) {
  const currentTone = toneStyles[tone];
  const isPositive = trend?.startsWith('+');

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none dark:hover:border-slate-700/80`}>
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${currentTone.iconBg}`}>
            <Icon name={icon} className="h-5 w-5" />
          </div>
        )}
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/40'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border dark:border-rose-800/40'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}
