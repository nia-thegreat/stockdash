import StatsCards from './StatsCards';
import SalesOverviewChart from './SalesOverviewChart';
import TopSellingParts from './TopSellingParts';
import RecentSales from './RecentSales';
import LowStockAlerts from './LowStockAlerts';

export default function Dashboard({
  parts,
  lowStockThreshold,
  loading,
  totalRevenue,
  overviewSeries,
  topParts,
  recentSales,
  onNavigate,
}) {
  const inventoryValue = parts.reduce((sum, p) => sum + Number(p.price) * p.stock_quantity, 0);
  const lowStockCount = parts.filter((p) => p.stock_quantity < lowStockThreshold).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Part
        </button>
        <button
          type="button"
          onClick={() => onNavigate('sales')}
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
          threshold={lowStockThreshold}
          loading={loading}
          onViewAll={() => onNavigate('inventory')}
        />
        <RecentSales sales={recentSales} loading={loading} onViewAll={() => onNavigate('sales')} />
      </div>
    </div>
  );
}