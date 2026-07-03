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
      [OrderStatus.PENDING]: 'bg-amber-50 text-amber-700',
      [OrderStatus.CONFIRMED]: 'bg-primary-50 text-primary-700',
      [OrderStatus.SENT]: 'bg-blue-50 text-blue-700',
      [OrderStatus.DELIVERED]: 'bg-emerald-50 text-emerald-700',
      [OrderStatus.CANCELED]: 'bg-rose-50 text-rose-700',
      [OrderStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700',
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
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
        <Icon name={icon} className="h-3.5 w-3.5" />
        {orderStatusLabel(orderStatus)}
      </span>
    );
  }

  const statusValue = String(status);
  const isActive = statusValue === UserStatus.ACTIVE || statusValue === 'OK';
  const label = statusValue === 'LOW' ? 'Baixo' : isActive ? 'Ativo' : statusValue === UserStatus.DELETED ? 'Excluído' : 'Inativo';
  const styles = statusValue === 'LOW'
    ? 'bg-rose-50 text-rose-700'
    : isActive
      ? 'bg-primary-50 text-primary-700'
      : 'bg-slate-100 text-slate-600';

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}
