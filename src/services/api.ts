import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  ApiError,
  AuthResponse,
  Client,
  ClientRequest,
  LoginRequest,
  Order,
  OrderDiscountRequest,
  OrderItemRequest,
  OrderRequest,
  OrderStatus,
  PageResponse,
  Payment,
  PaymentMethod,
  PaymentRequest,
  Product,
  ProductRequest,
  ProductVendor,
  ProductVendorRequest,
  RegisterRequest,
  User,
  UserCreateRequest,
  UserRole,
  UserStatus,
  UserUpdateRequest,
} from '../types/index';

interface UserListParams {
  search?: string;
  role?: UserRole | '';
  status?: UserStatus | '';
  page?: number;
  size?: number;
}

interface OrderListParams {
  status?: OrderStatus | '';
  clientId?: string;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
}

function backendMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
  }
  return null;
}

function handleErrors(error: AxiosError): ApiError {
  const status = error.response?.status ?? 500;
  const data = error.response?.data;
  const message = backendMessage(data);

  if (message) {
    return { status, message, errors: data };
  }

  const fallback = {
    400: 'Dados inválidos. Revise os campos e tente novamente.',
    401: 'Email ou senha incorretos.',
    403: 'Você não tem permissão para esta ação.',
    404: 'Registro não encontrado.',
    409: 'A operação violou uma regra de negócio.',
  }[status];

  return {
    status,
    message: fallback ?? 'Não foi possível concluir a operação. Tente novamente.',
    errors: data,
  };
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function normalizeUser(user: User): User {
  return {
    ...user,
    status: user.status ?? UserStatus.ACTIVE,
  };
}

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    totalAmount: normalizeNumber(order.totalAmount),
    discountAmount: normalizeNumber(order.discountAmount),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: normalizeNumber(item.unitPrice),
      subtotal: normalizeNumber(item.subtotal),
    })),
  };
}

function normalizePayment(payment: Payment): Payment {
  return {
    ...payment,
    amount: normalizeNumber(payment.amount),
  };
}

function normalizeProductVendor(productVendor: ProductVendor): ProductVendor {
  return {
    ...productVendor,
    price: normalizeNumber(productVendor.price),
  };
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'http://localhost:8080/api/v1',
      timeout: 12000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => Promise.reject(handleErrors(error)),
    );
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', credentials);
    const auth = {
      ...response.data,
      user: normalizeUser(response.data.user),
    };

    localStorage.setItem('authToken', auth.token);
    localStorage.setItem('user', JSON.stringify(auth.user));

    return auth;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', data);
    return {
      ...response.data,
      user: normalizeUser(response.data.user),
    };
  }

  async getUsers(params: UserListParams = {}): Promise<PageResponse<User>> {
    const response = await this.api.get<PageResponse<User>>('/users', { params });
    return {
      ...response.data,
      content: response.data.content.map(normalizeUser),
    };
  }

  async createUser(data: UserCreateRequest): Promise<User> {
    const response = await this.api.post<User>('/users', data);
    return normalizeUser(response.data);
  }

  async updateUser(userId: string, data: UserUpdateRequest): Promise<User> {
    const response = await this.api.put<User>(`/users/${userId}`, data);
    return normalizeUser(response.data);
  }

  async deactivateUser(userId: string): Promise<User> {
    const response = await this.api.put<User>(`/users/${userId}/deactivate`);
    return normalizeUser(response.data);
  }

  async restoreUser(userId: string): Promise<User> {
    const response = await this.api.put<User>(`/users/${userId}/restore`);
    return normalizeUser(response.data);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.api.delete(`/users/${userId}`);
  }

  async getClients(): Promise<Client[]> {
    const response = await this.api.get<Client[]>('/clients');
    return response.data;
  }

  async createClient(data: ClientRequest): Promise<Client> {
    const response = await this.api.post<Client>('/clients', data);
    return response.data;
  }

  async updateClient(clientId: string, data: ClientRequest): Promise<Client> {
    const response = await this.api.put<Client>(`/clients/${clientId}`, data);
    return response.data;
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.api.delete(`/clients/${clientId}`);
  }

  async restoreClient(clientId: string): Promise<Client> {
    const response = await this.api.put<Client>(`/clients/${clientId}/restore`);
    return response.data;
  }

  async getProducts(): Promise<Product[]> {
    const response = await this.api.get<Product[]>('/products');
    return response.data;
  }

  async createProduct(data: ProductRequest): Promise<Product> {
    const response = await this.api.post<Product>('/products', data);
    return response.data;
  }

  async updateProduct(productId: string, data: ProductRequest): Promise<Product> {
    const response = await this.api.put<Product>(`/products/${productId}`, data);
    return response.data;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.api.delete(`/products/${productId}`);
  }

  async restoreProduct(productId: string): Promise<Product> {
    const response = await this.api.put<Product>(`/products/${productId}/restore`);
    return response.data;
  }

  async getProductVendors(): Promise<ProductVendor[]> {
    const response = await this.api.get<ProductVendor[]>('/product-vendors');
    return response.data.map(normalizeProductVendor);
  }

  async getProductVendorsByVendor(vendorId: string): Promise<ProductVendor[]> {
    const response = await this.api.get<ProductVendor[]>(`/product-vendors/by-vendor/${vendorId}`);
    return response.data.map(normalizeProductVendor);
  }

  async createProductVendor(data: ProductVendorRequest): Promise<ProductVendor> {
    const response = await this.api.post<ProductVendor>('/product-vendors', data);
    return normalizeProductVendor(response.data);
  }

  async getOrders(params: OrderListParams = {}): Promise<Order[]> {
    const response = await this.api.get<Order[]>('/orders', { params });
    return response.data.map(normalizeOrder);
  }

  async createOrder(data: OrderRequest): Promise<Order> {
    const response = await this.api.post<Order>('/orders', data);
    return normalizeOrder(response.data);
  }

  async addItem(orderId: string, data: OrderItemRequest): Promise<Order> {
    const response = await this.api.post<Order>(`/orders/${orderId}/items`, data);
    return normalizeOrder(response.data);
  }

  async applyDiscount(orderId: string, data: OrderDiscountRequest): Promise<Order> {
    const response = await this.api.patch<Order>(`/orders/${orderId}/discount`, data);
    return normalizeOrder(response.data);
  }

  async registerPayment(orderId: string, data: PaymentRequest): Promise<Payment> {
    const response = await this.api.post<Payment>(`/orders/${orderId}/payments`, data);
    return normalizePayment(response.data);
  }

  async getOrderPayments(orderId: string): Promise<Payment[]> {
    const response = await this.api.get<Payment[]>(`/orders/${orderId}/payments`);
    return response.data.map(normalizePayment);
  }

  async confirmPayment(orderId: string, paymentId: string): Promise<Order> {
    const response = await this.api.post<Order>(`/orders/${orderId}/payments/${paymentId}/confirm`);
    return normalizeOrder(response.data);
  }

  async deliverOrder(orderId: string): Promise<Order> {
    const response = await this.api.post<Order>(`/orders/${orderId}/deliver`);
    return normalizeOrder(response.data);
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const response = await this.api.post<Order>(`/orders/${orderId}/cancel`);
    return normalizeOrder(response.data);
  }

  async confirmOrderCompatibility(orderId: string, paymentMethod: PaymentMethod): Promise<Order> {
    const response = await this.api.post<Order>(`/orders/${orderId}/confirm`, {
      orderId,
      paymentMethod,
    });
    return normalizeOrder(response.data);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  getStoredUser(): User | null {
    const userData = localStorage.getItem('user');
    return userData ? normalizeUser(JSON.parse(userData) as User) : null;
  }

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('authToken'));
  }
}

export default new ApiService();
