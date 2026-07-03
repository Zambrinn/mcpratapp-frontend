import { useMemo } from 'react';
import { Alert, AppLayout, BarChart, Button, Card, Icon, LineChart, PageHeader, PieChart, StatCard } from '@components/index';
import { useCommercialData } from '../hooks/useCommercialData';
import {
  activeClientsCount,
  availableStock,
  categoryDistribution,
  inferProductCategory,
  money,
  monthBuckets,
  sumOrders,
} from '../utils/erp';

export function ReportsPage() {
  const { clients, products, orders, productById, isLoading, message, error, setMessage, setError } = useCommercialData();

  const revenue = sumOrders(orders);
  const profit = revenue * 0.472;
  const stockPieces = products.reduce((total, product) => total + availableStock(product), 0);
  const categoryCount = new Set(products.map((product) => inferProductCategory(product))).size;
  const monthlyRevenue = monthBuckets(orders);

  const categoryRevenue = useMemo(() => {
    const totals = orders.reduce<Record<string, number>>((acc, order) => {
      order.items.forEach((item) => {
        const product = productById.get(item.productId);
        const category = product ? inferProductCategory(product) : 'Outros';
        acc[category] = (acc[category] ?? 0) + item.subtotal;
      });
      return acc;
    }, {});

    const entries = Object.entries(totals).map(([label, value]) => ({ label, value }));
    if (entries.length > 0) return entries.sort((a, b) => b.value - a.value);

    return categoryDistribution(products).map((item) => ({
      label: item.label,
      value: item.value * 100,
    }));
  }, [orders, productById, products]);

  const segmentData = useMemo(() => {
    const totals = clients.reduce(
      (acc, client) => {
        const company = (client.companyName ?? '').toLowerCase();
        if (company.includes('atacado')) acc.atacado += 1;
        else if (company.includes('e-commerce') || company.includes('ecommerce')) acc.ecommerce += 1;
        else if (company) acc.revendedoras += 1;
        else acc.varejo += 1;
        return acc;
      },
      { varejo: 0, revendedoras: 0, ecommerce: 0, atacado: 0 },
    );

    const data = [
      { label: 'Varejo Direto', value: totals.varejo },
      { label: 'Revendedoras', value: totals.revendedoras },
      { label: 'E-commerce', value: totals.ecommerce },
      { label: 'Atacado', value: totals.atacado },
    ].filter((item) => item.value > 0);

    return data.length > 0
      ? data
      : [
          { label: 'Varejo Direto', value: 52 },
          { label: 'Revendedoras', value: 28 },
          { label: 'E-commerce', value: 12 },
          { label: 'Atacado', value: 8 },
        ];
  }, [clients]);

  const clientGrowth = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const value = clients.filter((client) => {
        const createdAt = new Date(client.createdAt);
        return !Number.isNaN(createdAt.getTime()) && createdAt <= date;
      }).length;

      return {
        label: formatter.format(date).replace('.', ''),
        value,
      };
    });
  }, [clients]);

  const exportCsv = () => {
    const header = ['pedido', 'cliente', 'status', 'total'];
    const rows = orders.map((order) => [
      order.id,
      clients.find((client) => client.id === order.clientId)?.name ?? order.clientId,
      order.status,
      order.totalAmount.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-mcprata.csv';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Relatório exportado.');
  };

  return (
    <AppLayout>
      <section className="space-y-5">
        <PageHeader
          title="Relatórios"
          subtitle="Análise de desempenho — MCPRATA Bijuterias"
          actions={
            <>
              <Button variant="secondary">
                <Icon name="calendar" className="h-4 w-4" />
                Período
              </Button>
              <Button onClick={exportCsv}>
                <Icon name="download" className="h-4 w-4" />
                Exportar
              </Button>
            </>
          }
        />

        {message && <Alert type="success" message={message} onClose={() => setMessage(null)} />}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="wallet" label="Receita Total (6 meses)" value={money(revenue)} />
          <StatCard icon="trend" label="Lucro total" value={money(profit)} trend="47.2% margem" tone="green" />
          <StatCard icon="users" label="Clientes Ativos" value={activeClientsCount(clients)} />
          <StatCard icon="box" label="Em estoque ativo" value={`${categoryCount} categorias`} trend={`${stockPieces} peças`} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card className="border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Receita vs Lucro (Últimos 6 Meses)</h2>
            <LineChart data={monthlyRevenue} area />
          </Card>
          <Card className="border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Clientes por Segmento</h2>
            <PieChart data={segmentData} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card className="border border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Categorias Mais Lucrativas</h2>
              {isLoading && <span className="text-sm text-slate-400">Carregando...</span>}
            </div>
            <BarChart data={categoryRevenue} horizontal />
          </Card>
          <Card className="border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Crescimento de Clientes</h2>
            <LineChart data={clientGrowth} />
          </Card>
        </div>
      </section>
    </AppLayout>
  );
}
