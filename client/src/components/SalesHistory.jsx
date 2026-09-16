import { useState } from 'react';

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

// Unit price at the time of sale: total_amount ÷ quantity_sold
function unitPrice(sale) {
  return sale.quantity_sold > 0 ? Number(sale.total_amount) / Number(sale.quantity_sold) : 0;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Reformat the frozen MySQL string 'YYYY-MM-DD HH:MM' without touching timezone math.
function formatSaleDate(value) {
  const [datePart, timePart] = typeof value === 'string' ? value.split(' ') : [null, null];
  if (!datePart) return value;
  const [y, m, d] = datePart.split('-').map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || !MONTHS[m - 1]) {
    return value;
  }
  let time = '';
  if (timePart) {
    const [hh, mm] = timePart.split(':').map(Number);
    if (Number.isInteger(hh) && Number.isInteger(mm)) {
      const period = hh >= 12 ? 'PM' : 'AM';
      const hour12 = hh % 12 === 0 ? 12 : hh % 12;
      time = ` · ${hour12}:${String(mm).padStart(2, '0')} ${period}`;
    }
  }
  return `${MONTHS[m - 1]} ${d}, ${y}${time}`;
}

const DATE_RANGES = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

export default function SalesHistory({ sales, loading, error, onRetry, filters, onFilterChange }) {
  const [retrying, setRetrying] = useState(false);

  const hasFilters = filters.search.trim() !== '' || filters.range !== 'all';
  const invalidCustom =
    filters.range === 'custom' && filters.customFrom !== '' && filters.customTo !== '' && filters.customFrom > filters.customTo;

  function update(next) {
    onFilterChange({ ...filters, ...next });
  }

  function clearFilters() {
    onFilterChange({ search: '', range: 'all', customFrom: '', customTo: '' });
  }

  function retry() {
    setRetrying(true);
    Promise.resolve(onRetry()).then(() => setRetrying(false));
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Unit prices reflect the price when each sale was recorded.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 tabular-nums">
          {sales.length} {sales.length === 1 ? 'sale' : 'sales'}
        </span>
      </div>

      {/* Filter toolbar */}
      <div className="px-5 py-4 border-b space-y-3">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35m2.85-6.4a8.25 8.25 0 11-16.5 0 8.25 8.25 0 0116.5 0z"
            />
          </svg>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search sales by part name..."
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update({ search: '' })}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by date range">
          {DATE_RANGES.map((range) => {
            const active = filters.range === range.id;
            return (
              <button
                key={range.id}
                type="button"
                aria-pressed={active}
                onClick={() => update({ range: range.id })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            );
          })}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {filters.range === 'custom' && (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div>
              <label htmlFor="sales-from" className="block text-xs font-medium text-gray-500 mb-1">
                From
              </label>
              <input
                id="sales-from"
                type="date"
                value={filters.customFrom}
                onChange={(e) => update({ customFrom: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sales-to" className="block text-xs font-medium text-gray-500 mb-1">
                To
              </label>
              <input
                id="sales-to"
                type="date"
                value={filters.customTo}
                onChange={(e) => update({ customTo: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {invalidCustom && (
              <p className="text-xs text-red-600 sm:pb-2">From must be on or before To.</p>
            )}
          </div>
        )}
      </div>

      {/* Body: loading / error / empty / rows */}
      {loading ? (
        <SalesHistorySkeleton />
      ) : error ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.9 5h13.8a2 2 0 001.4-3.4l-6.9-6.9a2 2 0 00-2.8 0l-6.9 6.9a2 2 0 001.4 3.4z"
              />
            </svg>
          </div>
          <p className="mt-4 font-medium text-gray-900">Could not load sales history</p>
          <p className="mt-1 text-sm text-gray-500">
            Make sure the API server is running on port 5001, then try again.
          </p>
          {onRetry && (
            <button
              type="button"
              disabled={retrying}
              onClick={retry}
              className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {retrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      ) : sales.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 10h18M7 15h2m4 0h2m-8 4h4a2 2 0 002-2v-9H5v9a2 2 0 002 2z"
            />
          </svg>
          {hasFilters ? (
            <>
              <p className="mt-4 font-medium text-gray-900">No sales match your filters</p>
              <p className="mt-1 text-sm text-gray-500">
                Try a different search term or a wider date range.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 font-medium text-gray-900">No sales recorded yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Log your first sale with the Sale form to see it here.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Part</th>
                  <th className="px-5 py-3 font-semibold text-right">Qty</th>
                  <th className="px-5 py-3 font-semibold text-right">Unit Price</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b last:border-b-0 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap tabular-nums">{formatSaleDate(s.sold_at)}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">{s.part_name}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">{s.quantity_sold}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">{money(unitPrice(s))}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium text-gray-900">
                      {money(s.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {sales.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.part_name}</p>
                    <p className="mt-0.5 text-xs text-gray-500 tabular-nums">{formatSaleDate(s.sold_at)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">{money(s.total_amount)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span className="tabular-nums">{s.quantity_sold} units sold</span>
                  <span className="tabular-nums">{money(unitPrice(s))} each</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SalesHistorySkeleton() {
  return (
    <div>
      <div className="hidden md:block animate-pulse">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-3.5 border-b last:border-b-0">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-4 w-1/3 bg-gray-200 rounded" />
            <div className="h-4 w-10 bg-gray-200 rounded" />
            <div className="h-4 w-14 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-3 p-5 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}