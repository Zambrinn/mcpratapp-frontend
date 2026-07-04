import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, AppLayout, Button, Card, Icon, Input, Modal, PageHeader, StatCard, StatusBadge } from '@components/index';
import apiService from '@services/api';
import { useToast } from '../context/ToastContext';
import { useCommercialData } from '../hooks/useCommercialData';
import {
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '../types/index';
import {
  formatDate,
  money,
  orderItemCount,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  shortId,
  sumOrders,
} from '../utils/erp';

export function SalesPage() {
  const { showToast } = useToast();
  const {
    user,
    activeClients,
    vendors,
    productVendors,
    orders,
    productById,
    clientById,
    vendorById,
    isLoading,
    isWorking,
    message,
    error,
    setMessage,
    setError,
    loadReferenceData,
    loadOrders,
    runAction,
    updateOrderInList,
  } = useCommercialData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsByOrderId, setPaymentsByOrderId] = useState<Record<string, Payment[]>>({});
  const [orderForm, setOrderForm] = useState({
    clientId: '',
    vendorId: user?.role === UserRole.VENDOR ? user.id : '',
  });
  const [itemForm, setItemForm] = useState({ productId: '', quantity: 1 });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(PaymentMethod.PIX);
  const [itemError, setItemError] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  useEffect(() => {
    setOrderForm((current) => ({
      clientId: current.clientId || activeClients[0]?.id || '',
      vendorId: current.vendorId || vendors[0]?.id || '',
    }));
  }, [activeClients, vendors]);

  useEffect(() => {
    if (orders.length === 0) {
      setPaymentsByOrderId({});
      return;
    }

    let isCurrent = true;

    void Promise.all(
      orders.map(async (order) => {
        try {
          const orderPayments = await apiService.getOrderPayments(order.id);
          return [order.id, orderPayments] as const;
        } catch {
          return [order.id, []] as const;
        }
      }),
    ).then((entries) => {
      if (isCurrent) {
        setPaymentsByOrderId(Object.fromEntries(entries));
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const client = clientById.get(order.clientId);
      const vendor = vendorById.get(order.vendorId);
      const haystack = [
        order.id,
        client?.name ?? '',
        vendor?.name ?? '',
        orderStatusLabel(order.status),
      ].join(' ').toLowerCase();

      return !term || haystack.includes(term);
    });
  }, [clientById, orders, search, vendorById]);

  const availableLinksForOrder = useMemo(() => {
    if (!selectedOrder) return [];
    return productVendors.filter(
      (link) =>
        link.vendorId === selectedOrder.vendorId &&
        link.isActive &&
        productById.get(link.productId)?.isActive,
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
  const hasPayment = payments.length > 0;
  const canEditPendingOrder = selectedOrder?.status === OrderStatus.PENDING && !hasPayment;

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setDiscountAmount(order.discountAmount);
    setItemForm({ productId: '', quantity: 1 });
    setItemError(null);
    setDiscountError(null);
    setIsDetailsOpen(true);
    void runAction(async () => {
      const response = await apiService.getOrderPayments(order.id);
      setPayments(response);
      setPaymentsByOrderId((current) => ({ ...current, [order.id]: response }));
    });
  };

  const storeOrder = (order: Order) => {
    setSelectedOrder(order);
    updateOrderInList(order);
  };

  const refreshByStatus = (status: OrderStatus | '') => {
    setStatusFilter(status);
    void runAction(async () => {
      await loadOrders({ status });
    });
  };

  const createOrder = (event: FormEvent) => {
    event.preventDefault();
    void runAction(async () => {
      if (!orderForm.clientId || !orderForm.vendorId) {
        throw new Error('Selecione cliente e vendedor.');
      }

      const order = await apiService.createOrder(orderForm);
      storeOrder(order);
      setPayments([]);
      setPaymentsByOrderId((current) => ({ ...current, [order.id]: [] }));
      setIsOrderModalOpen(false);
      setIsDetailsOpen(true);
      setMessage('Venda pendente criada.');
    });
  };

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    setItemError(null);
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      if (!canEditPendingOrder) {
        const message = hasPayment
          ? 'Não é possível adicionar itens depois de registrar pagamento.'
          : 'Somente vendas pendentes podem receber itens.';
        setItemError(message);
        showToast(message, 'error');
        return;
      }
      if (!itemForm.productId) {
        const message = 'Selecione um produto.';
        setItemError(message);
        showToast(message, 'error');
        return;
      }
      const product = productById.get(itemForm.productId);
      if (product && itemForm.quantity > product.totalQuantity - product.reservedQuantity) {
        const message = 'Quantidade maior que o estoque disponível.';
        setItemError(message);
        showToast(message, 'error');
        return;
      }

      const order = await apiService.addItem(selectedOrder.id, itemForm);
      storeOrder(order);
      await loadReferenceData();
      setItemForm({ productId: '', quantity: 1 });
      setMessage('Item adicionado e estoque reservado.');
    });
  };

  const applyDiscount = (event: FormEvent) => {
    event.preventDefault();
    setDiscountError(null);
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      if (!canEditPendingOrder) {
        const message = hasPayment
          ? 'Não é possível aplicar desconto depois de registrar pagamento.'
          : 'Somente vendas pendentes podem receber desconto.';
        setDiscountError(message);
        showToast(message, 'error');
        return;
      }
      if (discountAmount < 0 || discountAmount > selectedOrder.totalAmount) {
        const message = 'O desconto não pode ser maior que o total da venda.';
        setDiscountError(message);
        showToast(message, 'error');
        return;
      }
      const order = await apiService.applyDiscount(selectedOrder.id, { discountAmount });
      storeOrder(order);
      setMessage('Desconto aplicado.');
    });
  };

  const registerPayment = () => {
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      if (selectedOrder.items.length === 0) throw new Error('Adicione ao menos um item antes do pagamento.');
      const payment = await apiService.registerPayment(selectedOrder.id, { paymentMethod });
      setPayments([payment]);
      setPaymentsByOrderId((current) => ({ ...current, [selectedOrder.id]: [payment] }));
      setMessage('Pagamento pendente registrado.');
    });
  };

  const confirmPayment = () => {
    void runAction(async () => {
      if (!selectedOrder || !pendingPayment) throw new Error('Não há pagamento pendente para confirmar.');
      const order = await apiService.confirmPayment(selectedOrder.id, pendingPayment.id);
      const updatedPayments = await apiService.getOrderPayments(order.id);
      storeOrder(order);
      setPayments(updatedPayments);
      setPaymentsByOrderId((current) => ({ ...current, [order.id]: updatedPayments }));
      await loadReferenceData();
      setMessage('Pagamento confirmado e estoque baixado.');
    });
  };

  const deliverOrder = () => {
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      const order = await apiService.deliverOrder(selectedOrder.id);
      storeOrder(order);
      setMessage('Venda entregue.');
    });
  };

  const cancelOrder = () => {
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      const order = await apiService.cancelOrder(selectedOrder.id);
      const updatedPayments = await apiService.getOrderPayments(order.id);
      storeOrder(order);
      setPayments(updatedPayments);
      setPaymentsByOrderId((current) => ({ ...current, [order.id]: updatedPayments }));
      await loadReferenceData();
      setMessage('Venda pendente cancelada e reserva estornada.');
    });
  };

  const pendingOrders = orders.filter((order) => order.status === OrderStatus.PENDING).length;
  const approvedOrders = orders.filter((order) => order.status === OrderStatus.CONFIRMED).length;
  const deliveredOrders = orders.filter((order) => order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED).length;
  const canceledOrders = orders.filter((order) => order.status === OrderStatus.CANCELED).length;

  return (
    <AppLayout>
      <section className="space-y-5">
        <PageHeader
          title="Vendas"
          subtitle="Pedidos de bijuterias MCPRATA"
          actions={
            <Button onClick={() => setIsOrderModalOpen(true)}>
              <Icon name="plus" className="h-4 w-4" />
              Nova Venda
            </Button>
          }
        />

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon="wallet" label="Total" value={money(sumOrders(orders))} />
          <StatCard icon="clock" label="Pendentes" value={pendingOrders} tone="yellow" />
          <StatCard icon="check" label="Aprovadas" value={approvedOrders} />
          <StatCard icon="check" label="Entregues" value={deliveredOrders} tone="green" />
          <StatCard icon="x" label="Canceladas" value={canceledOrders} tone="red" />
        </div>

        <Card className="border border-slate-100">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px]">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente ou nº do pedido..."
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => refreshByStatus(event.target.value as OrderStatus | '')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Todos os Status</option>
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden border border-slate-100 p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-[#f5faf8] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left">Pedido</th>
                  <th className="px-5 py-4 text-left">Cliente</th>
                  <th className="px-5 py-4 text-left">Data</th>
                  <th className="px-5 py-4 text-left">Itens</th>
                  <th className="px-5 py-4 text-left">Pagamento</th>
                  <th className="px-5 py-4 text-left">Total</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Ver</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                      Carregando vendas...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const client = clientById.get(order.clientId);
                    const orderPayment = paymentsByOrderId[order.id]?.[0];

                    return (
                      <tr key={order.id} className="border-t border-slate-100 hover:bg-[#f8fbfa]">
                        <td className="px-5 py-4 font-semibold text-primary-600">#{shortId(order.id)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-500">
                              {client?.name.charAt(0).toUpperCase() ?? 'C'}
                            </div>
                            <span className="font-medium text-slate-900">{client?.name ?? shortId(order.clientId)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-4 text-slate-600">{orderItemCount(order)} peça(s)</td>
                        <td className="px-5 py-4 text-slate-600">
                          {orderPayment ? paymentMethodLabel(orderPayment.method) : 'A definir'}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{money(order.totalAmount)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openOrder(order)}
                            className="text-primary-500 transition hover:text-primary-700"
                            aria-label="Ver venda"
                          >
                            <Icon name="eye" className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {isOrderModalOpen && (
        <Modal title="Nova Venda" onClose={() => setIsOrderModalOpen(false)}>
          <form className="space-y-4" onSubmit={createOrder}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Cliente</label>
              <select
                value={orderForm.clientId}
                onChange={(event) => setOrderForm((current) => ({ ...current, clientId: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Cliente</option>
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Vendedor</label>
              <select
                value={orderForm.vendorId}
                onChange={(event) => setOrderForm((current) => ({ ...current, vendorId: event.target.value }))}
                disabled={user?.role === UserRole.VENDOR}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-100"
              >
                <option value="">Vendedor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsOrderModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isWorking}>
                Criar venda
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {isDetailsOpen && selectedOrder && (
        <Modal title={`Pedido #${shortId(selectedOrder.id)}`} onClose={() => setIsDetailsOpen(false)} widthClass="max-w-6xl">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Cliente</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {clientById.get(selectedOrder.clientId)?.name ?? shortId(selectedOrder.clientId)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Vendedor</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {vendorById.get(selectedOrder.vendorId)?.name ?? shortId(selectedOrder.vendorId)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="mt-1 font-semibold text-slate-900">{money(selectedOrder.totalAmount)}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5faf8] text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Produto</th>
                      <th className="px-4 py-3 text-left">Qtd.</th>
                      <th className="px-4 py-3 text-left">Preço</th>
                      <th className="px-4 py-3 text-left">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          Nenhum item.
                        </td>
                      </tr>
                    ) : (
                      selectedOrder.items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">{productById.get(item.productId)?.name ?? shortId(item.productId)}</td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3">{money(item.unitPrice)}</td>
                          <td className="px-4 py-3 font-semibold">{money(item.subtotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5faf8] text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Método</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                          Sem pagamento registrado.
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">{paymentMethodLabel(payment.method)}</td>
                          <td className="px-4 py-3">{paymentStatusLabel(payment.status)}</td>
                          <td className="px-4 py-3 font-semibold">{money(payment.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <form className="space-y-3 rounded-lg border border-slate-100 p-4" onSubmit={addItem}>
                <h3 className="font-semibold text-slate-900">Adicionar item</h3>
                <select
                  value={itemForm.productId}
                  onChange={(event) => setItemForm((current) => ({ ...current, productId: event.target.value }))}
                  disabled={!canEditPendingOrder}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-100"
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
                  error={itemError ?? undefined}
                  onChange={(event) => setItemForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                />
                {selectedProduct && selectedProductLink && (
                  <p className="text-xs text-slate-500">
                    Preço: {money(selectedProductLink.price)} · disponível:{' '}
                    {selectedProduct.totalQuantity - selectedProduct.reservedQuantity}
                  </p>
                )}
                {hasPayment && (
                  <p className="text-xs font-medium text-amber-700">
                    Itens bloqueados após o registro do pagamento.
                  </p>
                )}
                <Button type="submit" fullWidth isLoading={isWorking} disabled={!canEditPendingOrder || !itemForm.productId}>
                  Adicionar item
                </Button>
              </form>

              <form className="space-y-3 rounded-lg border border-slate-100 p-4" onSubmit={applyDiscount}>
                <h3 className="font-semibold text-slate-900">Aplicar desconto</h3>
                <Input
                  label="Valor do desconto"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountAmount}
                  disabled={!canEditPendingOrder}
                  error={discountError ?? undefined}
                  onChange={(event) => setDiscountAmount(Number(event.target.value))}
                />
                {hasPayment && (
                  <p className="text-xs font-medium text-amber-700">
                    Desconto bloqueado após o registro do pagamento.
                  </p>
                )}
                <Button type="submit" variant="secondary" fullWidth isLoading={isWorking} disabled={!canEditPendingOrder}>
                  Aplicar desconto
                </Button>
              </form>

              <div className="space-y-3 rounded-lg border border-slate-100 p-4">
                <h3 className="font-semibold text-slate-900">Pagamento e entrega</h3>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  disabled={!canEditPendingOrder}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-100"
                >
                  {Object.values(PaymentMethod).map((method) => (
                    <option key={method} value={method}>
                      {paymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={registerPayment}
                    disabled={!canEditPendingOrder || selectedOrder.items.length === 0}
                    isLoading={isWorking}
                  >
                    Registrar pagamento
                  </Button>
                  <Button variant="secondary" onClick={confirmPayment} disabled={!pendingPayment} isLoading={isWorking}>
                    Confirmar pagamento
                  </Button>
                  <Button
                    variant="secondary"
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
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
