import { useEffect, useState } from 'react';
import { Alert, AppLayout, BarChart, Card, LineChart, PageHeader, PieChart, StatCard, StatusBadge } from '@components/index';
import apiService from '@services/api';
import { useAuth } from '../context/AuthContext';
import { useCommercialData } from '../hooks/useCommercialData';
import {
  availableStock,
  categoryDistribution,
  money,
  monthBuckets,
} from '../utils/erp';
import { DashboardSummaryResponse, OrderStatus, UserRole } from '../types/index';

export function DashboardPage() {
  const { user } = useAuth();
  const { products, orders, isLoading: isCatalogLoading } = useCommercialData();
  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoadingDashboard(true);
    setError(null);
    try {
      const summary = await apiService.getDashboard();
      setDashboardData(summary);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível carregar as métricas do dashboard.');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [user?.id]);

  const isAdmin = user?.role === UserRole.ADMIN;
  const inventory = products.reduce((total, product) => total + availableStock(product), 0);
  const monthlySales = monthBuckets(orders);
  const categoryData = categoryDistribution(products);
  const barData = categoryData.map((item) => ({ ...item, value: item.value || 1 }));

  const topProductsChart = (dashboardData?.topProducts ?? []).map((p) => ({
    label: p.productName,
    value: p.quantitySold,
  }));

  return (
    <AppLayout>
      <section className="space-y-6">
        <PageHeader
          title={isAdmin ? 'Dashboard Geral' : 'Meu Painel de Vendas'}
          subtitle={
            isAdmin
              ? 'Métricas consolidadas de vendas, faturamento e desempenho da equipe'
              : 'Seus resultados de vendas, ticket médio e produtos mais vendidos'
          }
        />

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Indicadores Principais em Tempo Real do Backend */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="wallet"
            label="Faturamento Total"
            value={money(dashboardData?.totalRevenue ?? 0)}
            trend={isAdmin ? 'Rede MCPRATA' : 'Suas Vendas'}
            tone="primary"
          />
          <StatCard
            icon="cart"
            label="Total de Pedidos"
            value={dashboardData?.totalOrders ?? 0}
            trend="Confirmados/Entregues"
            tone="green"
          />
          <StatCard
            icon="trend"
            label="Ticket Médio"
            value={money(dashboardData?.averageTicket ?? 0)}
            trend="Por pedido pago"
            tone="yellow"
          />
          <StatCard
            icon="box"
            label="Peças no Estoque"
            value={inventory}
            trend="Catálogo 925"
            tone="slate"
          />
        </div>

        {/* Resumo por Status do Pedido */}
        {dashboardData?.ordersByStatus && (
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Distribuição de Pedidos por Status
              </h2>
              {isLoadingDashboard && (
                <span className="text-xs text-slate-400">Atualizando dados...</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(dashboardData.ordersByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-center"
                >
                  <StatusBadge status={status as OrderStatus} />
                  <span className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Gráficos de Faturamento e Categorias */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Evolução Mensal</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Faturamento dos últimos meses</p>
              </div>
              <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                R$
              </span>
            </div>
            <LineChart data={monthlySales} />
          </Card>

          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Mix de Categorias</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição do catálogo em estoque</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Peças
              </span>
            </div>
            <PieChart data={categoryData} />
          </Card>
        </div>

        {/* Top Peças Mais Vendidas & Desempenho de Vendedores (Admin) */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Peças Mais Vendidas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Top produtos com maior saída</p>
              </div>
            </div>
            {topProductsChart.length > 0 ? (
              <BarChart data={topProductsChart} horizontal />
            ) : (
              <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                Nenhum produto vendido no período registrado.
              </p>
            )}
          </Card>

          {/* Ranking de Vendedores — Visível exclusivamente para ADMIN */}
          {isAdmin && dashboardData?.vendorPerformance && (
            <Card>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Desempenho da Equipe</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ranking de vendas por vendedor</p>
                </div>
                <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                  Ranking
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="pb-2">Vendedor</th>
                      <th className="pb-2 text-center">Pedidos</th>
                      <th className="pb-2 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {dashboardData.vendorPerformance.map((vp, index) => (
                      <tr key={vp.vendorId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          <span className="mr-2 text-xs font-bold text-slate-400">#{index + 1}</span>
                          {vp.vendorName}
                        </td>
                        <td className="py-2.5 text-center text-slate-600 dark:text-slate-400 font-semibold tabular-nums">
                          {vp.totalOrders}
                        </td>
                        <td className="py-2.5 text-right font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                          {money(vp.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {!isAdmin && (
            <Card>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Portfólio em Linha</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Volume de peças ativas no catálogo</p>
                </div>
              </div>
              <BarChart data={barData} horizontal />
            </Card>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
