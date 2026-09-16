import { useNavigate } from 'react-router-dom';
import { useStockDash } from '../context/StockDashContext';
import { LOW_STOCK_THRESHOLD } from '../utils/constants';
import StatsCards from '../components/StatsCards';
import SalesOverviewChart from '../components/SalesOverviewChart';
import TopSellingParts from '../components/TopSellingParts';
import RecentSales from '../components/RecentSales';
import LowStockAlerts from '../components/LowStockAlerts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { parts, loading, dashboardAnalytics, overviewSeries, recentSalesPreview } = useStockDash();

  const inventoryValue = parts.reduce((sum, p) => sum + Number(p.price) * p.stock_quantity, 0);
  const lowStockCount = parts.filter((p) => p.stock_quantity < LOW_STOCK_THRESHOLD).length;
  const totalRevenue = Number(dashboardAnalytics?.summary?.revenue) || 0;
  const topParts = dashboardAnalytics?.topParts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Part
        </button>
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h2m4 0h2m-8 4h4a2 2 0 002-2v-9H5v9a2 2 0 002 2z"
            />
          </svg>
          Record Sale
        </button>
      </div>

      <StatsCards
        inventoryValue={inventoryValue}
        totalParts={parts.length}
        lowStockCount={lowStockCount}
        totalRevenue={loading ? 0 : totalRevenue}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesOverviewChart data={overviewSeries} loading={loading} />
        </div>
        <TopSellingParts parts={topParts} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockAlerts
          parts={parts}
          threshold={LOW_STOCK_THRESHOLD}
          loading={loading}
          onViewAll={() => navigate('/inventory')}
        />
        <RecentSales sales={recentSalesPreview} loading={loading} onViewAll={() => navigate('/sales')} />
      </div>
    </div>
  );
}