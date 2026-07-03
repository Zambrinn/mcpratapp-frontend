import { Alert, AppLayout, BarChart, Card, LineChart, PageHeader, PieChart, StatCard } from '@components/index';
import { useCommercialData } from '../hooks/useCommercialData';
import {
  activeClientsCount,
  availableStock,
  categoryDistribution,
  isCurrentMonth,
  isToday,
  money,
  monthBuckets,
  sumOrders,
} from '../utils/erp';

export function DashboardPage() {
  const { clients, products, orders, isLoading, error, setError } = useCommercialData();

  const monthSales = sumOrders(orders.filter((order) => isCurrentMonth(order.createdAt)));
  const inventory = products.reduce((total, product) => total + availableStock(product), 0);
  const todayOrders = orders.filter((order) => isToday(order.createdAt)).length;
  const monthlySales = monthBuckets(orders);
  const categoryData = categoryDistribution(products);
  const barData = categoryData.map((item) => ({ ...item, value: item.value || 1 }));

  return (
    <AppLayout>
      <section className="space-y-5">
        <PageHeader title="Dashboard" subtitle="Visão geral das vendas de bijuterias MCPRATA" />

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="wallet" label="Vendas do Mês" value={money(monthSales)} trend="+14.2%" />
          <StatCard icon="users" label="Clientes Ativos" value={activeClientsCount(clients)} trend="+8.5%" />
          <StatCard icon="box" label="Peças em Estoque" value={inventory} trend="-2.3%" tone="slate" />
          <StatCard icon="cart" label="Pedidos Hoje" value={todayOrders} trend="+22.1%" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card className="border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Vendas Mensais</h2>
            <LineChart data={monthlySales} />
          </Card>
          <Card className="border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Vendas por Categoria</h2>
            <PieChart data={categoryData} />
          </Card>
        </div>

        <Card className="border border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Categorias Mais Vendidas</h2>
            {isLoading && <span className="text-sm text-slate-400">Carregando...</span>}
          </div>
          <BarChart data={barData} />
        </Card>
      </section>
    </AppLayout>
  );
}
