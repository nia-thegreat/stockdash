import { getStockStatus, STATUS_META } from '../utils/stock';

export default function LowStockAlerts({ parts, threshold, loading, onViewAll }) {
  const alerts = parts
    .filter((p) => p.stock_quantity < threshold)
    .sort((a, b) => a.stock_quantity - b.stock_quantity);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Parts at or below {threshold} units remaining.
          </p>
        </div>
        {onViewAll && alerts.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            View inventory →
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-5 space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-900">All parts sufficiently stocked</p>
          <p className="mt-1 text-xs text-gray-500">
            Nothing at or below the {threshold}-unit threshold.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {alerts.map((p) => {
            const meta = STATUS_META[getStockStatus(p.stock_quantity, threshold)];
            return (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {p.stock_quantity} {p.stock_quantity === 1 ? 'unit' : 'units'} left
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}