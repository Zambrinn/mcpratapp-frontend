import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, AppLayout, Button, Card, Icon, Input, Modal, PageHeader, QuantityStepper, StatCard, StatusBadge } from '@components/index';
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
      vendorId: user?.role === UserRole.VENDOR ? user.id : (current.vendorId || vendors[0]?.id || ''),
    }));
  }, [activeClients, vendors, user]);

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
      await loadReferenceData();
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
      setIsDetailsOpen(false);
      setSelectedOrder(null);
      await loadReferenceData();
      setMessage('Venda entregue.');
    });
  };

  const cancelOrder = () => {
    void runAction(async () => {
      if (!selectedOrder) throw new Error('Selecione uma venda.');
      const order = await apiService.cancelOrder(selectedOrder.id);
      const updatedPayments = await apiService.getOrderPayments(order.id);
      storeOrder(order);
      setSelectedOrder(order);
      setPayments(updatedPayments);
      setPaymentsByOrderId((current) => ({ ...current, [order.id]: updatedPayments }));
      setItemForm({ productId: '', quantity: 1 });
      setDiscountAmount(0);
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon="wallet" label="Faturamento" value={money(sumOrders(orders))} tone="primary" />
          <StatCard icon="clock" label="Pendentes" value={pendingOrders} tone="yellow" />
          <StatCard icon="check" label="Aprovadas" value={approvedOrders} tone="primary" />
          <StatCard icon="check" label="Entregues" value={deliveredOrders} tone="green" />
          <StatCard icon="x" label="Canceladas" value={canceledOrders} tone="red" />
        </div>

        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente ou nº do pedido..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-xs transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => refreshByStatus(event.target.value as OrderStatus | '')}
              aria-label="Filtrar por status"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-xs transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-200"
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

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 text-left">Pedido</th>
                  <th className="px-5 py-4 text-left">Cliente</th>
                  <th className="px-5 py-4 text-left">Data</th>
                  <th className="px-5 py-4 text-left">Itens</th>
                  <th className="px-5 py-4 text-left">Pagamento</th>
                  <th className="px-5 py-4 text-left">Total</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                        Carregando vendas...
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const client = clientById.get(order.clientId);
                    const orderPayment = paymentsByOrderId[order.id]?.[0];

                    return (
                      <tr key={order.id} className="transition hover:bg-teal-50/20 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                          #{shortId(order.id)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-700 shadow-xs dark:bg-teal-950/50 dark:text-teal-300 ring-1 ring-teal-500/20">
                              {client?.name.charAt(0).toUpperCase() ?? 'C'}
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {client?.name ?? shortId(order.clientId)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} peça(s)
                        </td>
                        <td className="px-5 py-4">
                          {orderPayment ? (
                            <div className="text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {paymentMethodLabel(orderPayment.method)}
                              </span>
                              <p className="text-slate-400 dark:text-slate-500">{paymentStatusLabel(orderPayment.status)}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">Pendente</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white tabular-nums">
                          {money(order.totalAmount)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openOrder(order)}
                          >
                            <Icon name="eye" className="h-3.5 w-3.5" />
                            Detalhes
                          </Button>
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
        <Modal title="Nova Venda" onClose={() => setIsOrderModalOpen(false)} widthClass="max-w-2xl">
          <form className="space-y-6" onSubmit={createOrder}>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-50/60 p-5 dark:border-teal-500/20 dark:bg-teal-950/30">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-600/20">
                  <Icon name="cart" className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Abrir Comanda de Venda</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Selecione o cliente para abrir o pedido e adicionar peças de bijuterias finas MCPRATA.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Cliente <span className="text-teal-600 dark:text-teal-400">*</span>
                </label>
                <select
                  value={orderForm.clientId}
                  onChange={(event) => setOrderForm((current) => ({ ...current, clientId: event.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Selecione um cliente...</option>
                  {activeClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.cpf ? `(CPF: ${client.cpf})` : client.cnpj ? `(CNPJ: ${client.cnpj})` : ''} · {client.whatsappNumber}
                    </option>
                  ))}
                </select>
                {activeClients.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Nenhum cliente ativo disponível. Cadastre um cliente antes de criar uma venda.
                  </p>
                )}
              </div>

              {user?.role === UserRole.ADMIN && (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Vendedor Responsável
                  </label>
                  <select
                    value={orderForm.vendorId}
                    onChange={(event) => setOrderForm((current) => ({ ...current, vendorId: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Selecione o vendedor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {user?.role === UserRole.VENDOR && (
                <div className="flex items-center gap-3 rounded-xl bg-slate-100/90 px-4 py-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                  <Icon name="users" className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>Vendedor responsável: <strong className="text-slate-800 dark:text-slate-100">{user.name}</strong></span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setIsOrderModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isWorking} disabled={!orderForm.clientId}>
                Abrir Pedido
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {isDetailsOpen && selectedOrder && (
        <Modal
          title={`Pedido #${shortId(selectedOrder.id)}`}
          onClose={() => setIsDetailsOpen(false)}
          widthClass="max-w-5xl"
        >
          <div className="space-y-6">
            {/* Header info banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700/60 dark:bg-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 font-bold text-white shadow-xs dark:bg-teal-500">
                  {clientById.get(selectedOrder.clientId)?.name.charAt(0).toUpperCase() ?? 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {clientById.get(selectedOrder.clientId)?.name ?? shortId(selectedOrder.clientId)}
                    </h3>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {clientById.get(selectedOrder.clientId)?.whatsappNumber} · Criado em {formatDate(selectedOrder.createdAt)} · Vendedor:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {vendorById.get(selectedOrder.vendorId)?.name ?? shortId(selectedOrder.vendorId)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total do Pedido</p>
                <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
                  {money(selectedOrder.totalAmount)}
                </p>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Left Column: Items & Payments */}
              <div className="space-y-5 lg:col-span-7">
                {/* Items Card */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5 dark:border-slate-700/40 dark:bg-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Icon name="box" className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Peças no Pedido
                      </h4>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {selectedOrder.items.reduce((acc, i) => acc + i.quantity, 0)} un.
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700/40 dark:bg-slate-750 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3 text-left">Peça</th>
                          <th className="px-4 py-3 text-center">Qtd.</th>
                          <th className="px-4 py-3 text-right">Unitário</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {selectedOrder.items.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                              <Icon name="cart" className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
                              <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhuma peça adicionada ainda</p>
                              <p className="mt-1 text-xs">Selecione peças do catálogo ao lado para incluir na venda.</p>
                            </td>
                          </tr>
                        ) : (
                          selectedOrder.items.map((item) => {
                            const product = productById.get(item.productId);
                            return (
                              <tr key={item.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                                    {product?.name ?? shortId(item.productId)}
                                  </p>
                                  {product?.sku && (
                                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                                      SKU: {product.sku}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center rounded-lg bg-teal-50 px-2.5 py-1 font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                                  {money(item.unitPrice)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                  {money(item.subtotal)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payments Card */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5 dark:border-slate-700/40 dark:bg-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Icon name="wallet" className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Histórico Financeiro
                      </h4>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700/40 dark:bg-slate-750 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3 text-left">Forma</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                              Nenhum pagamento registrado até o momento.
                            </td>
                          </tr>
                        ) : (
                          payments.map((payment) => (
                            <tr key={payment.id} className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                {paymentMethodLabel(payment.method)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                                    payment.status === PaymentStatus.PAID
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : payment.status === PaymentStatus.FAILED
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                  }`}
                                >
                                  {paymentStatusLabel(payment.status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                {money(payment.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Actions & Workflow */}
              <div className="space-y-4 lg:col-span-5">
                {selectedOrder.status === OrderStatus.CANCELED ? (
                  <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 p-6 text-center shadow-xs dark:border-rose-900/50 dark:bg-rose-950/30">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-xs dark:bg-rose-900/40 dark:text-rose-400">
                      <Icon name="x" className="h-6 w-6" />
                    </div>
                    <p className="text-base font-bold text-rose-900 dark:text-rose-200">Venda Cancelada</p>
                    <p className="mt-1.5 text-xs text-rose-700 dark:text-rose-300">
                      Esta venda foi cancelada e os formulários de adição de itens, descontos e pagamentos foram desativados. O estoque reservado foi devolvido ao catálogo.
                    </p>
                  </div>
                ) : selectedOrder.status === OrderStatus.DELIVERED || selectedOrder.status === OrderStatus.COMPLETED ? (
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-6 text-center shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs dark:bg-emerald-900/40 dark:text-emerald-400">
                      <Icon name="check" className="h-6 w-6" />
                    </div>
                    <p className="text-base font-bold text-emerald-900 dark:text-emerald-200">Venda Entregue e Concluída</p>
                    <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                      Pedido finalizado com sucesso e todas as peças foram entregues ao cliente.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Add Item Panel */}
                    {canEditPendingOrder && (
                      <form
                        onSubmit={addItem}
                        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="plus" className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Adicionar Peça
                          </h4>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Peça do Catálogo
                          </label>
                          <select
                            value={itemForm.productId}
                            onChange={(event) => setItemForm((current) => ({ ...current, productId: event.target.value }))}
                            disabled={!canEditPendingOrder}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          >
                            <option value="">Selecione uma peça...</option>
                            {availableLinksForOrder.map((link) => {
                              const product = productById.get(link.productId);
                              if (!product) return null;
                              const available = product.totalQuantity - product.reservedQuantity;
                              return (
                                <option key={link.id} value={link.productId} disabled={available <= 0}>
                                  {product.name} ({product.sku}) · {money(link.price)} · {available > 0 ? `${available} disp.` : 'Esgotado'}
                                </option>
                              );
                            })}
                          </select>
                          {availableLinksForOrder.length === 0 && (
                            <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                              Nenhuma peça ativa com preço vinculado a este vendedor. Vincule peças no Catálogo de Produtos para adicionar à venda.
                            </p>
                          )}
                        </div>

                        {selectedProduct && selectedProductLink && (
                          <div className="flex items-center justify-between rounded-xl bg-teal-50/60 px-3.5 py-2 text-xs dark:bg-teal-950/30">
                            <span className="font-semibold text-teal-800 dark:text-teal-200">
                              Unitário: {money(selectedProductLink.price)}
                            </span>
                            <span className="text-teal-700 dark:text-teal-300">
                              Disponível: {selectedProduct.totalQuantity - selectedProduct.reservedQuantity} un.
                            </span>
                          </div>
                        )}

                        {/* Modern Stepper without native spin arrows */}
                        <QuantityStepper
                          label="Quantidade de Peças"
                          value={itemForm.quantity}
                          onChange={(val) => setItemForm((current) => ({ ...current, quantity: val }))}
                          min={1}
                          max={
                            selectedProduct
                              ? selectedProduct.totalQuantity - selectedProduct.reservedQuantity
                              : undefined
                          }
                          disabled={!canEditPendingOrder || !itemForm.productId}
                          error={itemError ?? undefined}
                        />

                        <Button
                          type="submit"
                          fullWidth
                          isLoading={isWorking}
                          disabled={!canEditPendingOrder || !itemForm.productId}
                        >
                          <Icon name="plus" className="h-4 w-4" />
                          Adicionar Peça ao Pedido
                        </Button>
                      </form>
                    )}

                    {/* Discount & Totals Breakdown */}
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
                      {canEditPendingOrder && (
                        <form onSubmit={applyDiscount} className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                              Desconto Promocional
                            </h4>
                            {selectedOrder.discountAmount > 0 && (
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                - {money(selectedOrder.discountAmount)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                R$
                              </span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={discountAmount === 0 ? '' : discountAmount}
                                placeholder="0,00"
                                onChange={(event) => setDiscountAmount(Number(event.target.value))}
                                disabled={!canEditPendingOrder}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              />
                            </div>
                            <Button type="submit" variant="secondary" size="sm" isLoading={isWorking} disabled={!canEditPendingOrder}>
                              Aplicar
                            </Button>
                          </div>
                          {discountError && (
                            <p className="text-xs font-medium text-rose-500 dark:text-rose-400">{discountError}</p>
                          )}
                        </form>
                      )}

                      {/* Totals Summary */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                          <span>Subtotal das peças</span>
                          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                            {money(selectedOrder.totalAmount + selectedOrder.discountAmount)}
                          </span>
                        </div>
                        {selectedOrder.discountAmount > 0 && (
                          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                            <span>Desconto aplicado</span>
                            <span className="tabular-nums font-semibold">- {money(selectedOrder.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-white">Total a Pagar</span>
                          <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
                            {money(selectedOrder.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment & Workflow Actions */}
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Pagamento e Finalização
                      </h4>

                      {/* Visual payment method selector */}
                      {canEditPendingOrder && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Forma de Pagamento
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.values(PaymentMethod).map((method) => {
                              const isSelected = paymentMethod === method;
                              return (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => setPaymentMethod(method)}
                                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                                    isSelected
                                      ? 'border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-500/20 dark:border-teal-500 dark:bg-teal-950/50 dark:text-teal-300'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                  }`}
                                >
                                  {paymentMethodLabel(method)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Contextual Primary Workflow Buttons */}
                      <div className="space-y-2 pt-1">
                        {selectedOrder.status === OrderStatus.PENDING && !hasPayment && (
                          <Button
                            onClick={registerPayment}
                            disabled={selectedOrder.items.length === 0}
                            isLoading={isWorking}
                            fullWidth
                          >
                            <Icon name="wallet" className="h-4 w-4" />
                            Registrar Pagamento ({paymentMethodLabel(paymentMethod)})
                          </Button>
                        )}

                        {pendingPayment && (
                          <Button
                            onClick={confirmPayment}
                            isLoading={isWorking}
                            fullWidth
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Icon name="check" className="h-4 w-4" />
                            Confirmar Recebimento e Baixar Estoque
                          </Button>
                        )}

                        {selectedOrder.status === OrderStatus.CONFIRMED && (
                          <Button
                            onClick={deliverOrder}
                            isLoading={isWorking}
                            fullWidth
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <Icon name="check" className="h-4 w-4" />
                            Marcar Pedido como Entregue
                          </Button>
                        )}

                        {selectedOrder.status === OrderStatus.PENDING && (
                          <button
                            type="button"
                            onClick={cancelOrder}
                            disabled={isWorking}
                            className="w-full rounded-xl border border-rose-200 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          >
                            Cancelar Pedido e Liberar Estoque
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

