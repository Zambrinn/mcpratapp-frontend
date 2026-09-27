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

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function isValidCpf(cpf: string): boolean {
  const clean = onlyDigits(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(clean[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(clean[10], 10);
}

export function isValidCnpj(cnpj: string): boolean {
  const clean = onlyDigits(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(clean[i], 10) * w1[i];
  let rem = sum % 11;
  const d1 = rem < 2 ? 0 : 11 - rem;
  if (parseInt(clean[12], 10) !== d1) return false;

  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(clean[i], 10) * w2[i];
  rem = sum % 11;
  const d2 = rem < 2 ? 0 : 11 - rem;
  return parseInt(clean[13], 10) === d2;
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
  return orders
    .filter((order) => order.status !== OrderStatus.CANCELED)
    .reduce((total, order) => total + order.totalAmount, 0);
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

  orders
    .filter((order) => order.status !== OrderStatus.CANCELED)
    .forEach((order) => {
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

export const CATEGORY_SKU_PREFIXES: Record<string, string> = {
  'Anéis': 'ANE',
  'Brincos': 'BRI',
  'Colares': 'COL',
  'Pulseiras': 'PUL',
  'Conjuntos': 'CON',
  'Tornozeleiras': 'TOR',
  'Pingentes': 'PIN',
};

export function formatSku(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function generateNextSku(category: string, existingProducts: Product[]): string {
  const prefix = CATEGORY_SKU_PREFIXES[category] || category.slice(0, 3).toUpperCase();
  const pattern = new RegExp(`^MC-${prefix}-(\\d+)$`, 'i');

  let maxSeq = 0;
  for (const p of existingProducts) {
    const match = p.sku.trim().match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `MC-${prefix}-${nextSeq}`;
}

export function isValidSku(sku: string): boolean {
  // Aceita MC-XXX-000 ou qualquer padrão alfanumérico limpo (ex: MC-ANE-001, MC-BRI-102, etc.)
  return /^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-\d{2,5}$/.test(sku.trim().toUpperCase());
}

