function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

export default function TopSellingParts({ parts, loading }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Top Selling Parts</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Ranked by units sold within the selected range.
        </p>
      </div>

      {loading ? (
        <div className="p-5 space-y-3 animate-pulse">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : parts.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-gray-500">No sales in this range yet.</p>
        </div>
      ) : (
        <ol className="divide-y divide-gray-100">
          {parts.map((part, index) => (
            <li key={part.part_name} className="flex items-center gap-3 px-5 py-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-700'
                  : index === 1 ? 'bg-gray-200 text-gray-600'
                  : index === 2 ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-500'
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{part.part_name}</p>
                <p className="text-xs text-gray-500 tabular-nums">
                  {part.units_sold} units · {part.sales_count} {part.sales_count === 1 ? 'sale' : 'sales'}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">{money(part.revenue)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}