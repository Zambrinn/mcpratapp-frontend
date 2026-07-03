import { ReactNode } from 'react';
import { Icon, IconName } from './Icons';

interface StatCardProps {
  icon?: IconName;
  label: string;
  value: ReactNode;
  trend?: string;
  tone?: 'primary' | 'green' | 'yellow' | 'red' | 'slate';
}

const toneClasses = {
  primary: 'bg-primary-50 text-primary-600',
  green: 'bg-emerald-50 text-emerald-600',
  yellow: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-500',
};

export function StatCard({ icon, label, value, trend, tone = 'primary' }: StatCardProps) {
  return (
    <div className="min-h-[112px] rounded-lg border border-slate-100 bg-white p-5 shadow-[0_1px_5px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        {icon ? (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon name={icon} className="h-5 w-5" />
          </div>
        ) : (
          <span />
        )}
        {trend && <span className="text-xs font-medium text-emerald-600">{trend}</span>}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
