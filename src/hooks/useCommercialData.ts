import { useEffect, useMemo, useState } from 'react';
import apiService from '@services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Client,
  Order,
  OrderStatus,
  Product,
  ProductVendor,
  User,
  UserRole,
  UserStatus,
} from '../types/index';

export interface OrderFilters {
  status?: OrderStatus | '';
  clientId?: string;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
}

export function useCommercialData(autoLoad = true) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<User[]>([]);
  const [productVendors, setProductVendors] = useState<ProductVendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeClients = useMemo(() => clients.filter((client) => client.isActive), [clients]);
  const activeProducts = useMemo(() => products.filter((product) => product.isActive), [products]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const vendorById = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);

  const loadReferenceData = async () => {
    if (!user) return;

    const [clientsResponse, productsResponse, linksResponse] = await Promise.all([
      apiService.getClients(),
      apiService.getProducts(),
      apiService.getProductVendors(),
    ]);

    let vendorResponse: User[] = [];
    if (user.role === UserRole.ADMIN) {
      const page = await apiService.getUsers({
        role: UserRole.VENDOR,
        status: UserStatus.ACTIVE,
        size: 100,
      });
      vendorResponse = page.content;
    } else {
      vendorResponse = [user];
    }

    setClients(clientsResponse);
    setProducts(productsResponse);
    setProductVendors(linksResponse);
    setVendors(vendorResponse);
  };

  const loadOrders = async (filters: OrderFilters = {}) => {
    const response = await apiService.getOrders({
      status: filters.status,
      clientId: filters.clientId || undefined,
      vendorId: user?.role === UserRole.VENDOR ? user.id : filters.vendorId || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    });
    setOrders(response);
  };

  const boot = async (filters: OrderFilters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      await loadReferenceData();
      await loadOrders(filters);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível carregar dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const runAction = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      return await action();
    } catch (err) {
      const message = (err as Error).message || 'Não foi possível concluir a operação.';
      setError(message);
      showToast(message, 'error');
      return undefined;
    } finally {
      setIsWorking(false);
    }
  };

  const updateOrderInList = (order: Order) => {
    setOrders((current) => {
      const exists = current.some((item) => item.id === order.id);
      return exists ? current.map((item) => (item.id === order.id ? order : item)) : [order, ...current];
    });
  };

  useEffect(() => {
    if (autoLoad) void boot();
  }, []);

  return {
    user,
    clients,
    products,
    vendors,
    productVendors,
    orders,
    activeClients,
    activeProducts,
    productById,
    clientById,
    vendorById,
    isLoading,
    isWorking,
    message,
    error,
    setMessage,
    setError,
    setOrders,
    setClients,
    setProducts,
    setProductVendors,
    loadReferenceData,
    loadOrders,
    boot,
    runAction,
    updateOrderInList,
  };
}
