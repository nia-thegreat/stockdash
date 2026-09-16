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

export default function SalesHistory({ sales, loading, error, onRetry }) {
  const [retrying, setRetrying] = useState(false);

  if (loading) {
    return <SalesHistorySkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center">
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
            onClick={() => {
              setRetrying(true);
              Promise.resolve(onRetry()).then(() => setRetrying(false));
            }}
            className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center">
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
        <p className="mt-4 font-medium text-gray-900">No sales recorded yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Log your first sale with the Sale form to see it here.
        </p>
      </div>
    );
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
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
          {sales.length} {sales.length === 1 ? 'sale' : 'sales'}
        </span>
      </div>

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
    </div>
  );
}

function SalesHistorySkeleton() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b animate-pulse">
        <div className="h-5 w-36 bg-gray-200 rounded-md" />
      </div>
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