import {
  Client,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductVendor,
} from '../types/index';

export function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatWhatsApp(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  const areaCode = digits.slice(0, 2);
  const firstPart = digits.slice(2, 7);
  const secondPart = digits.slice(7, 11);

  if (digits.length <= 2) return areaCode ? `(${areaCode}` : '';
  if (digits.length <= 7) return `(${areaCode}) ${firstPart}`;
  return `(${areaCode}) ${firstPart}-${secondPart}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-BR');
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString('pt-BR');
}

export function orderStatusLabel(status: OrderStatus): string {
  return {
    [OrderStatus.PENDING]: 'Pendente',
    [OrderStatus.CONFIRMED]: 'Aprovada',
    [OrderStatus.SENT]: 'Enviada',
    [OrderStatus.DELIVERED]: 'Entregue',
    [OrderStatus.CANCELED]: 'Cancelada',
    [OrderStatus.COMPLETED]: 'Concluída',
  }[status];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return {
    [PaymentMethod.PIX]: 'PIX',
    [PaymentMethod.TICKET]: 'Boleto',
    [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
    [PaymentMethod.MONEY]: 'Dinheiro',
  }[method];
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return {
    [PaymentStatus.PENDING]: 'Pendente',
    [PaymentStatus.FAILED]: 'Falhou',
    [PaymentStatus.PAID]: 'Pago',
  }[status];
}

export function availableStock(product: Product): number {
  return Math.max(0, product.totalQuantity - product.reservedQuantity);
}

export function productPrice(productId: string, productVendors: ProductVendor[]): number | null {
  const activeLink = productVendors.find((link) => link.productId === productId && link.isActive);
  return activeLink?.price ?? null;
}

export const PRODUCT_CATEGORIES = ['Anéis', 'Pulseiras', 'Colares', 'Brincos', 'Conjuntos', 'Outros'] as const;

export function productDescriptionWithCategory(category: string, description: string): string {
  const cleanDescription = description.trim();
  return cleanDescription ? `Categoria: ${category} | ${cleanDescription}` : `Categoria: ${category}`;
}

export function displayProductDescription(description?: string | null): string {
  if (!description) return '';
  return description.replace(/^Categoria:\s*[^|]+(?:\|\s*)?/i, '').trim();
}

export function productFormDescription(description?: string | null): string {
  return displayProductDescription(description);
}

export function inferProductCategory(product: Pick<Product, 'name' | 'sku' | 'description'>): string {
  const explicitCategory = product.description?.match(/^Categoria:\s*([^|]+)/i)?.[1]?.trim();
  if (explicitCategory) return explicitCategory;

  const content = `${product.sku} ${product.name} ${product.description ?? ''}`.toLowerCase();
  if (content.includes('anel') || content.includes('an-')) return 'Anéis';
  if (content.includes('pulseira') || content.includes('pu-')) return 'Pulseiras';
  if (content.includes('colar') || content.includes('co-')) return 'Colares';
  if (content.includes('brinco') || content.includes('br-')) return 'Brincos';
  if (content.includes('conjunto') || content.includes('cj-')) return 'Conjuntos';
  return 'Outros';
}

export function categoryTone(category: string): string {
  return {
    Anéis: 'bg-primary-500 text-white',
    Pulseiras: 'bg-primary-600 text-white',
    Colares: 'bg-primary-300 text-primary-900',
    Brincos: 'bg-primary-700 text-white',
    Conjuntos: 'bg-primary-200 text-primary-800',
    Outros: 'bg-slate-100 text-slate-600',
  }[category] ?? 'bg-slate-100 text-slate-600';
}

export function clientCity(address: string): string {
  const clean = address.trim();
  if (!clean) return '-';
  const parts = clean.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(-2).join(' - ') : clean;
}

export function clientInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'C';
}

export function isCurrentMonth(value?: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  const today = new Date();
  return parsed.getMonth() === today.getMonth() && parsed.getFullYear() === today.getFullYear();
}

export function isToday(value?: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  const today = new Date();
  return parsed.toDateString() === today.toDateString();
}

export function sumOrders(orders: Order[]): number {
  return orders.reduce((total, order) => total + order.totalAmount, 0);
}

export function monthBuckets(orders: Order[]): { label: string; value: number }[] {
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: formatter.format(date).replace('.', ''),
      value: 0,
    };
  });

  orders.forEach((order) => {
    const parsed = new Date(order.createdAt);
    if (Number.isNaN(parsed.getTime())) return;
    const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.value += order.totalAmount;
  });

  return buckets.map(({ label, value }) => ({ label, value }));
}

export function categoryDistribution(products: Product[]): { label: string; value: number }[] {
  const totals = products.reduce<Record<string, number>>((acc, product) => {
    const category = inferProductCategory(product);
    acc[category] = (acc[category] ?? 0) + availableStock(product);
    return acc;
  }, {});

  const entries = Object.entries(totals)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ label, value }));

  return entries.length > 0
    ? entries
    : [
        { label: 'Anéis', value: 32 },
        { label: 'Pulseiras', value: 25 },
        { label: 'Colares', value: 22 },
        { label: 'Brincos', value: 21 },
      ];
}

export function orderItemCount(order: Order): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

export function activeClientsCount(clients: Client[]): number {
  return clients.filter((client) => client.isActive).length;
}
