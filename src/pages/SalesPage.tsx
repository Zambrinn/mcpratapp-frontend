import { FormEvent, useEffect, useMemo, useState } from 'react';
import apiService from '@services/api';
import { Alert, AppLayout, Button, Card, Input } from '@components/index';
import { useAuth } from '../context/AuthContext';
import {
  Client,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductVendor,
  User,
  UserRole,
  UserStatus,
} from '../types/index';

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString('pt-BR');
}

function orderStatusLabel(status: OrderStatus): string {
  return {
    [OrderStatus.PENDING]: 'Pendente',
    [OrderStatus.CONFIRMED]: 'Confirmada',
    [OrderStatus.SENT]: 'Enviada',
    [OrderStatus.DELIVERED]: 'Entregue',
    [OrderStatus.CANCELED]: 'Cancelada',
    [OrderStatus.COMPLETED]: 'Concluída',
  }[status];
}

function paymentMethodLabel(method: PaymentMethod): string {
  return {
    [PaymentMethod.PIX]: 'Pix',
    [PaymentMethod.TICKET]: 'Boleto',
    [PaymentMethod.CREDIT_CARD]: 'Cartão de crédito',
    [PaymentMethod.MONEY]: 'Dinheiro',
  }[method];
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatWhatsApp(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  const areaCode = digits.slice(0, 2);
  const firstPart = digits.slice(2, 7);
  const secondPart = digits.slice(7, 11);

  if (digits.length <= 2) return areaCode ? `(${areaCode}` : '';
  if (digits.length <= 7) return `(${areaCode})${firstPart}`;
  return `(${areaCode})${firstPart}-${secondPart}`;
}

export function SalesPage() {
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<User[]>([]);
  const [productVendors, setProductVendors] = useState<ProductVendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [orderForm, setOrderForm] = useState({
    clientId: '',
    vendorId: user?.role === UserRole.VENDOR ? user.id : '',
  });
  const [itemForm, setItemForm] = useState({ productId: '', quantity: 1 });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(PaymentMethod.PIX);
  const [filters, setFilters] = useState({
    status: '',
    clientId: '',
    vendorId: user?.role === UserRole.VENDOR ? user.id : '',
    startDate: '',
    endDate: '',
  });

  const [clientForm, setClientForm] = useState({
    name: '',
    whatsappNumber: '',
    email: '',
    address: '',
    companyName: '',
  });
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    description: '',
    totalQuantity: 0,
  });
  const [linkForm, setLinkForm] = useState({
    productId: '',
    vendorId: user?.role === UserRole.VENDOR ? user.id : '',
    price: 0,
  });

  const activeClients = useMemo(() => clients.filter((client) => client.isActive), [clients]);
  const activeProducts = useMemo(() => products.filter((product) => product.isActive), [products]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const vendorById = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);

  const availableLinksForOrder = useMemo(() => {
    if (!selectedOrder) return [];
    return productVendors.filter(
      (link) => link.vendorId === selectedOrder.vendorId && link.isActive && productById.get(link.productId)?.isActive,
    );
  }, [productById, productVendors, selectedOrder]);

  const selectedProduct = itemForm.productId ? productById.get(itemForm.productId) : undefined;
  const selectedProductLink = selectedOrder
    ? productVendors.find(
        (link) =>
          link.productId === itemForm.productId &&
          link.vendorId === selectedOrder.vendorId &&
          link.isActive,
      )
    : undefined;
  const pendingPayment = payments.find((payment) => payment.status === PaymentStatus.PENDING);

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

    setOrderForm((current) => ({
      clientId: current.clientId || clientsResponse.find((client) => client.isActive)?.id || '',
      vendorId: current.vendorId || vendorResponse[0]?.id || '',
    }));
    setLinkForm((current) => ({
      ...current,
      productId: current.productId || productsResponse.find((product) => product.isActive)?.id || '',
      vendorId: current.vendorId || vendorResponse[0]?.id || '',
    }));
  };

  const loadOrders = async () => {
    const response = await apiService.getOrders({
      status: filters.status as OrderStatus | '',
      clientId: filters.clientId || undefined,
      vendorId: filters.vendorId || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    });
    setOrders(response);
  };

  const boot = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadReferenceData();
      await loadOrders();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível carregar dados de venda.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void boot();
  }, []);

  const selectOrder = async (order: Order) => {
    setSelectedOrder(order);
    setDiscountAmount(order.discountAmount);
    setItemForm({ productId: '', quantity: 1 });
    setError(null);
    try {
      const response = await apiService.getOrderPayments(order.id);
      setPayments(response);
    } catch (err) {
      setPayments([]);
      setError((err as Error).message || 'Não foi possível carregar pagamentos da venda.');
    }
  };

  const updateOrderInList = (order: Order) => {
    setSelectedOrder(order);
    setOrders((current) => {
      const exists = current.some((item) => item.id === order.id);
      return exists ? current.map((item) => (item.id === order.id ? order : item)) : [order, ...current];
    });
  };

  const runAction = async (action: () => Promise<void>) => {
    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível concluir a operação.');
    } finally {
      setIsWorking(false);
    }
  };

  const createOrder = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      if (!orderForm.clientId || !orderForm.vendorId) {
        throw new Error('Selecione cliente e vendedor.');
      }
      const order = await apiService.createOrder(orderForm);
      updateOrderInList(order);
      setPayments([]);
      setMessage('Venda pendente criada.');
    });
  };

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      if (!itemForm.productId) throw new Error('Selecione um produto.');
      const order = await apiService.addItem(selectedOrder.id, itemForm);
      updateOrderInList(order);
      await loadReferenceData();
      setItemForm({ productId: '', quantity: 1 });
      setMessage('Item adicionado e estoque reservado.');
    });
  };

  const applyDiscount = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      const order = await apiService.applyDiscount(selectedOrder.id, { discountAmount });
      updateOrderInList(order);
      setMessage('Desconto aplicado.');
    });
  };

  const registerPayment = () => {
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      const payment = await apiService.registerPayment(selectedOrder.id, { paymentMethod });
      setPayments([payment]);
      setMessage('Pagamento pendente registrado.');
    });
  };

  const confirmPayment = () => {
    void runAction(async () => {
      if (!selectedOrder || !pendingPayment) throw new Error('Não há pagamento pendente para confirmar.');
      const order = await apiService.confirmPayment(selectedOrder.id, pendingPayment.id);
      updateOrderInList(order);
      setPayments(await apiService.getOrderPayments(order.id));
      await loadReferenceData();
      setMessage('Pagamento confirmado e estoque baixado.');
    });
  };

  const deliverOrder = () => {
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      const order = await apiService.deliverOrder(selectedOrder.id);
      updateOrderInList(order);
      setMessage('Venda entregue.');
    });
  };

  const cancelOrder = () => {
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      const order = await apiService.cancelOrder(selectedOrder.id);
      updateOrderInList(order);
      setPayments(await apiService.getOrderPayments(order.id));
      await loadReferenceData();
      setMessage('Venda pendente cancelada e reserva estornada.');
    });
  };

  const createClient = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      const client = await apiService.createClient({
        ...clientForm,
        whatsappNumber: onlyDigits(clientForm.whatsappNumber),
        companyName: clientForm.companyName || null,
      });
      setClientForm({ name: '', whatsappNumber: '', email: '', address: '', companyName: '' });
      await loadReferenceData();
      setOrderForm((current) => ({ ...current, clientId: client.id }));
      setMessage('Cliente criado.');
    });
  };

  const createProduct = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      const product = await apiService.createProduct({
        ...productForm,
        description: productForm.description || null,
        totalQuantity: Number(productForm.totalQuantity),
      });
      setProductForm({ sku: '', name: '', description: '', totalQuantity: 0 });
      await loadReferenceData();
      setLinkForm((current) => ({ ...current, productId: product.id }));
      setMessage('Produto criado.');
    });
  };

  const createProductVendor = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      await apiService.createProductVendor({
        productId: linkForm.productId,
        vendorId: linkForm.vendorId,
        price: Number(linkForm.price),
      });
      setLinkForm((current) => ({ ...current, price: 0 }));
      await loadReferenceData();
      setMessage('Vínculo produto-vendedor criado.');
    });
  };

  return (
    <AppLayout>
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Registrar Venda</h1>
          </div>
          <Button onClick={() => void boot()} isLoading={isLoading}>
            Atualizar dados
          </Button>
        </div>

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="border border-slate-200 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Novo cliente</h2>
            <form className="space-y-3" onSubmit={createClient}>
              <Input
                label="Nome"
                placeholder="Nome"
                value={clientForm.name}
                onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                label="WhatsApp"
                placeholder="(__)_____-____"
                value={clientForm.whatsappNumber}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    whatsappNumber: formatWhatsApp(event.target.value),
                  }))
                }
              />
              <Input
                label="Email"
                placeholder="Email"
                type="email"
                value={clientForm.email}
                onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))}
              />
              <Input
                label="Endereço"
                placeholder="Endereço"
                value={clientForm.address}
                onChange={(event) => setClientForm((current) => ({ ...current, address: event.target.value }))}
              />
              <Input
                label="Empresa"
                placeholder="Empresa"
                value={clientForm.companyName}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, companyName: event.target.value }))
                }
              />
              <Button type="submit" fullWidth isLoading={isWorking}>
                Criar cliente
              </Button>
            </form>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Novo produto</h2>
            <form className="space-y-3" onSubmit={createProduct}>
              <Input
                label="SKU"
                placeholder="SKU"
                value={productForm.sku}
                onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))}
              />
              <Input
                label="Nome do produto"
                placeholder="Nome"
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                label="Descrição"
                placeholder="Descrição"
                value={productForm.description}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, description: event.target.value }))
                }
              />
              <Input
                label="Quantidade do produto"
                placeholder="Quantidade total em estoque"
                type="number"
                min={0}
                value={productForm.totalQuantity}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    totalQuantity: Number(event.target.value),
                  }))
                }
              />
              <Button type="submit" fullWidth isLoading={isWorking}>
                Criar produto
              </Button>
            </form>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Vínculo e preço</h2>
            <form className="space-y-3" onSubmit={createProductVendor}>
              <select
                value={linkForm.productId}
                onChange={(event) =>
                  setLinkForm((current) => ({ ...current, productId: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="">Produto</option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} · {product.name}
                  </option>
                ))}
              </select>
              <select
                value={linkForm.vendorId}
                onChange={(event) =>
                  setLinkForm((current) => ({ ...current, vendorId: event.target.value }))
                }
                disabled={user?.role === UserRole.VENDOR}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-slate-100"
              >
                <option value="">Vendedor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              <Input
                label="Preço praticado pelo vendedor"
                placeholder="Preço unitário"
                type="number"
                min={0}
                step="0.01"
                value={linkForm.price}
                onChange={(event) =>
                  setLinkForm((current) => ({ ...current, price: Number(event.target.value) }))
                }
              />
              <Button type="submit" fullWidth isLoading={isWorking}>
                Criar vínculo
              </Button>
            </form>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
          <div className="space-y-4">
            <Card className="border border-slate-200 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Nova venda</h2>
              <form className="space-y-3" onSubmit={createOrder}>
                <select
                  value={orderForm.clientId}
                  onChange={(event) =>
                    setOrderForm((current) => ({ ...current, clientId: event.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">Cliente</option>
                  {activeClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <select
                  value={orderForm.vendorId}
                  onChange={(event) =>
                    setOrderForm((current) => ({ ...current, vendorId: event.target.value }))
                  }
                  disabled={user?.role === UserRole.VENDOR}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-slate-100"
                >
                  <option value="">Vendedor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" fullWidth isLoading={isWorking}>
                  Criar venda
                </Button>
              </form>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Venda selecionada</h2>
              {selectedOrder ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-800">#{shortId(selectedOrder.id)}</p>
                    <p>Cliente: {clientById.get(selectedOrder.clientId)?.name ?? shortId(selectedOrder.clientId)}</p>
                    <p>Vendedor: {vendorById.get(selectedOrder.vendorId)?.name ?? shortId(selectedOrder.vendorId)}</p>
                    <p>Status: {orderStatusLabel(selectedOrder.status)}</p>
                    <p>Total: {money(selectedOrder.totalAmount)}</p>
                  </div>

                  <form className="space-y-3" onSubmit={addItem}>
                    <h3 className="font-medium text-slate-800">Adicionar item</h3>
                    <select
                      value={itemForm.productId}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, productId: event.target.value }))
                      }
                      disabled={selectedOrder.status !== OrderStatus.PENDING || payments.length > 0}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-slate-100"
                    >
                      <option value="">Produto vendido por este vendedor</option>
                      {availableLinksForOrder.map((link) => {
                        const product = productById.get(link.productId);
                        if (!product) return null;
                        const available = product.totalQuantity - product.reservedQuantity;
                        return (
                          <option key={link.id} value={link.productId}>
                            {product.sku} · {product.name} · {money(link.price)} · disp. {available}
                          </option>
                        );
                      })}
                    </select>
                    <Input
                      label="Quantidade"
                      type="number"
                      min={1}
                      value={itemForm.quantity}
                      disabled={selectedOrder.status !== OrderStatus.PENDING || payments.length > 0}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, quantity: Number(event.target.value) }))
                      }
                    />
                    {selectedProduct && selectedProductLink && (
                      <p className="text-xs text-slate-500">
                        Preço: {money(selectedProductLink.price)} · disponível:{' '}
                        {selectedProduct.totalQuantity - selectedProduct.reservedQuantity}
                      </p>
                    )}
                    <Button type="submit" fullWidth isLoading={isWorking}>
                      Adicionar item
                    </Button>
                  </form>

                  <form className="space-y-3" onSubmit={applyDiscount}>
                    <h3 className="font-medium text-slate-800">Aplicar desconto</h3>
                    <Input
                      label="Valor do desconto"
                      type="number"
                      min={0}
                      step="0.01"
                      value={discountAmount}
                      disabled={selectedOrder.status !== OrderStatus.PENDING || payments.length > 0}
                      onChange={(event) => setDiscountAmount(Number(event.target.value))}
                    />
                    <Button type="submit" fullWidth isLoading={isWorking}>
                      Aplicar desconto
                    </Button>
                  </form>

                  <div className="space-y-3">
                    <h3 className="font-medium text-slate-800">Pagamento e entrega</h3>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                      disabled={selectedOrder.status !== OrderStatus.PENDING || payments.length > 0}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-slate-100"
                    >
                      {Object.values(PaymentMethod).map((method) => (
                        <option key={method} value={method}>
                          {paymentMethodLabel(method)}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button onClick={registerPayment} disabled={payments.length > 0} isLoading={isWorking}>
                        Registrar pagamento
                      </Button>
                      <Button onClick={confirmPayment} disabled={!pendingPayment} isLoading={isWorking}>
                        Confirmar pagamento
                      </Button>
                      <Button
                        onClick={deliverOrder}
                        disabled={selectedOrder.status !== OrderStatus.CONFIRMED}
                        isLoading={isWorking}
                      >
                        Entregar venda
                      </Button>
                      <Button
                        variant="danger"
                        onClick={cancelOrder}
                        disabled={selectedOrder.status !== OrderStatus.PENDING}
                        isLoading={isWorking}
                      >
                        Cancelar pendente
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-left">Qtd.</th>
                          <th className="px-3 py-2 text-left">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                              Nenhum item.
                            </td>
                          </tr>
                        ) : (
                          selectedOrder.items.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">
                                {productById.get(item.productId)?.name ?? shortId(item.productId)}
                              </td>
                              <td className="px-3 py-2">{item.quantity}</td>
                              <td className="px-3 py-2">{money(item.subtotal)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Método</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                              Sem pagamento registrado.
                            </td>
                          </tr>
                        ) : (
                          payments.map((payment) => (
                            <tr key={payment.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">{paymentMethodLabel(payment.method)}</td>
                              <td className="px-3 py-2">{payment.status}</td>
                              <td className="px-3 py-2">{money(payment.amount)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Crie ou selecione uma venda para iniciar o fluxo.</p>
              )}
            </Card>
          </div>

          <Card className="border border-slate-200 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Consultar vendas</h2>
                <p className="text-sm text-slate-500">Filtros por status, cliente, vendedor e período.</p>
              </div>
              <Button onClick={() => void runAction(loadOrders)} isLoading={isWorking || isLoading}>
                Filtrar
              </Button>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="">Todos os status</option>
                {Object.values(OrderStatus).map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {orderStatusLabel(statusValue)}
                  </option>
                ))}
              </select>
              <select
                value={filters.clientId}
                onChange={(event) => setFilters((current) => ({ ...current, clientId: event.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="">Cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.vendorId}
                onChange={(event) => setFilters((current) => ({ ...current, vendorId: event.target.value }))}
                disabled={user?.role === UserRole.VENDOR}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-slate-100"
              >
                <option value="">Vendedor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              <Input
                type="datetime-local"
                value={filters.startDate}
                onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              />
              <Input
                type="datetime-local"
                value={filters.endDate}
                onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Venda</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Vendedor</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Criada em</th>
                    <th className="px-4 py-3 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Carregando vendas...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Nenhuma venda encontrada.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">#{shortId(order.id)}</td>
                        <td className="px-4 py-3">{clientById.get(order.clientId)?.name ?? shortId(order.clientId)}</td>
                        <td className="px-4 py-3">{vendorById.get(order.vendorId)?.name ?? shortId(order.vendorId)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {orderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{money(order.totalAmount)}</td>
                        <td className="px-4 py-3">{formatDateTime(order.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="secondary" onClick={() => void selectOrder(order)}>
                            Abrir
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>
    </AppLayout>
  );
}
