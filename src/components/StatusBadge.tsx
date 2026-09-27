import { OrderStatus, UserStatus } from '../types/index';
import { orderStatusLabel } from '../utils/erp';
import { Icon } from './Icons';

interface StatusBadgeProps {
  status: OrderStatus | UserStatus | 'ACTIVE' | 'INACTIVE' | 'LOW' | 'OK';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (Object.values(OrderStatus).includes(status as OrderStatus)) {
    const orderStatus = status as OrderStatus;
    const styles = {
      [OrderStatus.PENDING]:
        'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      [OrderStatus.CONFIRMED]:
        'bg-teal-50 text-teal-700 border-teal-200/60 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
      [OrderStatus.SENT]:
        'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
      [OrderStatus.DELIVERED]:
        'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
      [OrderStatus.CANCELED]:
        'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
      [OrderStatus.COMPLETED]:
        'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
    }[orderStatus];

    const icon = {
      [OrderStatus.PENDING]: 'clock',
      [OrderStatus.CONFIRMED]: 'check',
      [OrderStatus.SENT]: 'trend',
      [OrderStatus.DELIVERED]: 'check',
      [OrderStatus.CANCELED]: 'x',
      [OrderStatus.COMPLETED]: 'check',
    }[orderStatus] as 'clock' | 'check' | 'trend' | 'x';

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-xs ${styles}`}>
        <Icon name={icon} className="h-3 w-3" />
        {orderStatusLabel(orderStatus)}
      </span>
    );
  }

  const statusValue = String(status);
  const isActive = statusValue === UserStatus.ACTIVE || statusValue === 'OK';
  const label =
    statusValue === 'LOW'
      ? 'Baixo'
      : isActive
        ? 'Ativo'
        : statusValue === UserStatus.DELETED
          ? 'Excluído'
          : 'Inativo';

  const styles =
    statusValue === 'LOW'
      ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
      : isActive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
        : 'bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-xs ${styles}`}>
      {label}
    </span>
  );
}
