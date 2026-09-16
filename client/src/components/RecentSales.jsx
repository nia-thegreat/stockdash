import { money, formatSaleDate } from '../utils/format';

export default function RecentSales({ sales, loading, onViewAll }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
          <p className="text-xs text-gray-500 mt-0.5">The 5 most recent transactions.</p>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            View all sales →
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-5 space-y-3 animate-pulse">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-gray-500">No sales recorded yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sales.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{s.part_name}</p>
                <p className="text-xs text-gray-500 tabular-nums">{formatSaleDate(s.sold_at)}</p>
              </div>
              <p className="text-xs text-gray-500 tabular-nums shrink-0">
                {s.quantity_sold} {s.quantity_sold === 1 ? 'unit' : 'units'}
              </p>
              <p className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">{money(s.total_amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}