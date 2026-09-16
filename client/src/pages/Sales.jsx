import { useStockDash } from '../context/StockDashContext';
import { scopeLabelOf } from '../utils/salesFilters';
import SalesAnalytics from '../components/SalesAnalytics';
import TopSellingParts from '../components/TopSellingParts';
import SaleForm from '../components/SaleForm';
import SalesHistory from '../components/SalesHistory';

export default function Sales() {
  const {
    parts,
    salesHistory,
    analytics,
    loading,
    historyLoading,
    error,
    historyError,
    salesQuery,
    setSalesQuery,
    fetchData,
    handleLogSale,
  } = useStockDash();

  return (
    <div className="space-y-6">
      <SalesAnalytics
        data={analytics}
        loading={loading || historyLoading}
        error={error || historyError}
        onRetry={fetchData}
        scopeLabel={scopeLabelOf(salesQuery)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSellingParts parts={analytics?.topParts || []} loading={loading || historyLoading} />
        <SaleForm parts={parts} onLogSale={handleLogSale} />
      </div>

      <SalesHistory
        sales={salesHistory}
        loading={loading || historyLoading}
        error={error || historyError}
        onRetry={fetchData}
        filters={salesQuery}
        onFilterChange={setSalesQuery}
      />
    </div>
  );
}