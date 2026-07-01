export enum UserRole {
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED',
}

export enum PaymentMethod {
  PIX = 'PIX',
  TICKET = 'TICKET',
  CREDIT_CARD = 'CREDIT_CARD',
  MONEY = 'MONEY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  PAID = 'PAID',
}

export interface ApiError {
  status: number;
  message: string;
  errors?: unknown;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UserUpdateRequest {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface Client {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string;
  address: string;
  companyName?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ClientRequest {
  name: string;
  whatsappNumber: string;
  email: string;
  address: string;
  companyName?: string | null;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  totalQuantity: number;
  reservedQuantity: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductRequest {
  sku: string;
  name: string;
  description?: string | null;
  totalQuantity: number;
}

export interface ProductVendor {
  id: string;
  productId: string;
  vendorId: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductVendorRequest {
  productId: string;
  vendorId: string;
  price: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  clientId: string;
  vendorId: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  items: OrderItem[];
  createdAt: string;
  confirmedAt?: string | null;
  deliveredAt?: string | null;
}

export interface OrderRequest {
  clientId: string;
  vendorId: string;
}

export interface OrderItemRequest {
  productId: string;
  quantity: number;
}

export interface OrderDiscountRequest {
  discountAmount: number;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paidAt?: string | null;
  createdAt: string;
}

export interface PaymentRequest {
  paymentMethod: PaymentMethod;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
}
