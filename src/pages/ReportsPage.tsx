import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppLayout,
  Button,
  Card,
  Icon,
  PageHeader,
  StatCard,
  StatusBadge,
} from '@components/index';
import apiService from '@services/api';
import { useAuth } from '../context/AuthContext';
import { useCommercialData } from '../hooks/useCommercialData';
import { formatDate, money, shortId } from '../utils/erp';
import {
  OrderStatus,
  SalesReportItemResponse,
  SalesReportParams,
  SalesReportResponse,
  UserRole,
} from '../types/index';

type PeriodPreset = 'all' | 'today' | '7days' | 'month' | '30days' | 'custom';

export function ReportsPage() {
  const { user } = useAuth();
  const { clients, vendors } = useCommercialData();

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('');

  const [reportData, setReportData] = useState<SalesReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === UserRole.ADMIN;

  // Calcula datas de início e fim baseadas no preset
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = new Date();

    if (periodPreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (periodPreset === '7days') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (periodPreset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (periodPreset === '30days') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (periodPreset === 'custom') {
      if (customStartDate) start = new Date(customStartDate + 'T00:00:00');
      if (customEndDate) end = new Date(customEndDate + 'T23:59:59');
    } else {
      start = null;
      end = null;
    }

    return {
      startDate: start ? start.toISOString().replace('Z', '') : undefined,
      endDate: end ? end.toISOString().replace('Z', '') : undefined,
    };
  }, [periodPreset, customStartDate, customEndDate]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: SalesReportParams = {
        status: statusFilter || undefined,
        clientId: clientFilter || undefined,
        vendorId: isAdmin ? vendorFilter || undefined : user?.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      const response = await apiService.getSalesReport(params);
      setReportData(response);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível carregar o relatório de vendas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [periodPreset, customStartDate, customEndDate, statusFilter, clientFilter, vendorFilter, user?.id]);

  const exportCsv = () => {
    if (!reportData || reportData.items.length === 0) {
      setError('Nenhum dado disponível para exportação.');
      return;
    }

    const header = ['Pedido ID', 'Data', 'Cliente', 'Vendedor', 'Status', 'Desconto (R$)', 'Total (R$)'];
    const rows = reportData.items.map((item: SalesReportItemResponse) => [
      item.orderId,
      formatDate(item.createdAt),
      item.clientName,
      item.vendorName,
      item.status,
      item.discountAmount.toFixed(2),
      item.totalAmount.toFixed(2),
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-vendas-mcprata-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Relatório CSV exportado com sucesso.');
  };

  return (
    <AppLayout>
      <section className="space-y-6">
        <PageHeader
          title="Relatórios de Vendas"
          subtitle="Análise comercial de faturamento, vendas e pedidos por período"
          actions={
            <Button onClick={exportCsv} disabled={!reportData || reportData.items.length === 0}>
              <Icon name="download" className="h-4 w-4" />
              Exportar CSV
            </Button>
          }
        />

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Barra de Filtros por Período e Parâmetros Reais */}
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filtro por Período
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'today', label: 'Hoje' },
                { id: '7days', label: '7 Dias' },
                { id: 'month', label: 'Este Mês' },
                { id: '30days', label: '30 Dias' },
                { id: 'all', label: 'Tudo' },
                { id: 'custom', label: 'Personalizado' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPeriodPreset(preset.id as PeriodPreset)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    periodPreset === preset.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {periodPreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Data Final
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
              aria-label="Filtrar por status"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-200"
            >
              <option value="">Todos os Status</option>
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              aria-label="Filtrar por cliente"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-200"
            >
              <option value="">Todos os Clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Vendor Filter (visible to Admin) */}
            {isAdmin ? (
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                aria-label="Filtrar por vendedor"
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-850 dark:text-slate-200"
              >
                <option value="">Todos os Vendedores</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs text-slate-500">
                <span>Vendedor: <strong>{user?.name}</strong></span>
              </div>
            )}
          </div>
        </Card>

        {/* Métricas Consolidadas Reais do Relatório */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="wallet"
            label="Receita do Período"
            value={money(reportData?.totalRevenue ?? 0)}
            trend="Faturamento Real"
            tone="primary"
          />
          <StatCard
            icon="cart"
            label="Total de Vendas"
            value={reportData?.totalOrders ?? 0}
            trend="Pedidos no período"
            tone="green"
          />
          <StatCard
            icon="box"
            label="Peças Vendidas"
            value={reportData?.totalItemsSold ?? 0}
            trend="Itens entregues"
            tone="yellow"
          />
          <StatCard
            icon="trend"
            label="Descontos Aplicados"
            value={money(reportData?.totalDiscounts ?? 0)}
            trend="Total concedido"
            tone="slate"
          />
        </div>

        {/* Tabela de Vendas do Relatório */}
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 text-left">Pedido</th>
                  <th className="px-5 py-4 text-left">Data</th>
                  <th className="px-5 py-4 text-left">Cliente</th>
                  <th className="px-5 py-4 text-left">Vendedor</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-right">Desconto</th>
                  <th className="px-5 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                        Carregando dados do relatório...
                      </div>
                    </td>
                  </tr>
                ) : !reportData || reportData.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      Nenhuma venda encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  reportData.items.map((item) => (
                    <tr key={item.orderId} className="transition hover:bg-teal-50/20 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-mono font-bold text-teal-600 dark:text-teal-400">
                        #{shortId(item.orderId)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                        {item.clientName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {item.vendorName}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right text-rose-600 dark:text-rose-400 tabular-nums">
                        {item.discountAmount > 0 ? `- ${money(item.discountAmount)}` : 'R$ 0,00'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                        {money(item.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </AppLayout>
  );
}
