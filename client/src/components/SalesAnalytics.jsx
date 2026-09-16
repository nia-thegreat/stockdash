import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

// Server labels: day 'YYYY-MM-DD' → '09/15'; month 'YYYY-MM' → 'Sep 2026'
function formatSeriesLabel(label) {
  const parts = String(label).split('-');
  if (parts.length === 3) {
    const [, m, d] = parts.map(Number);
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
  }
  if (parts.length === 2) {
    const [y, m] = parts.map(Number);
    return `${MONTHS[m - 1] || m} ${y}`;
  }
  return label;
}

const EMPTY = {
  summary: { revenue: 0, units_sold: 0, transactions: 0, avg_sale_value: 0 },
  timeseries: [],
  topParts: [],
};

export default function SalesAnalytics({ data, loading, error, onRetry, scopeLabel }) {
  const [retrying, setRetrying] = useState(false);

  const d = data || EMPTY;
  const summary = {
    revenue: Number(d.summary.revenue) || 0,
    units_sold: Number(d.summary.units_sold) || 0,
    transactions: Number(d.summary.transactions) || 0,
    avg_sale_value: Number(d.summary.avg_sale_value) || 0,
  };
  const series = (d.timeseries || []).map((row) => ({
    label: formatSeriesLabel(row.label),
    revenue: Number(row.revenue),
    quantity: Number(row.quantity),
  }));
  const hasSales = summary.transactions > 0;

  const cards = [
    { label: 'Total Revenue', value: money(summary.revenue), color: 'text-green-600' },
    { label: 'Units Sold', value: summary.units_sold, color: 'text-gray-900' },
    { label: 'Transactions', value: summary.transactions, color: 'text-blue-600' },
    { label: 'Avg Sale Value', value: money(summary.avg_sale_value), color: 'text-indigo-600' },
  ];

  function retry() {
    setRetrying(true);
    Promise.resolve(onRetry()).then(() => setRetrying(false));
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Sales Analytics</h2>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 tabular-nums">
            {loading ? 'Loading…' : `${summary.transactions} ${summary.transactions === 1 ? 'sale' : 'sales'} · ${scopeLabel}`}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 animate-pulse">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-5">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-20 bg-gray-200 rounded mt-3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center">
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
            <p className="mt-4 font-medium text-gray-900">Could not load sales analytics</p>
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {cards.map((card) => (
              <div key={card.label} className="bg-gray-50 rounded-lg p-5">
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className={`text-3xl font-bold mt-1 tabular-nums truncate ${card.color}`}>{loading ? '—' : card.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && !error && (
        hasSales ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChartCard
              title="Revenue over time"
              color="#16a34a"
              series={series}
              dataKey="revenue"
              tooltipLabel="Revenue"
              tooltipMoney
            />
            <ChartCard
              title="Units sold over time"
              color="#3b82f6"
              series={series}
              dataKey="quantity"
              tooltipLabel="Units sold"
              allowDecimals={false}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="font-medium text-gray-900">No sales in this range</p>
            <p className="mt-1 text-sm text-gray-500">
              Log a sale or widen the date range to see revenue and units over time.
            </p>
          </div>
        )
      )}
    </div>
  );
}

function ChartCard({
  title,
  color,
  series,
  dataKey,
  tooltipLabel,
  tooltipMoney,
  allowDecimals = true,
}) {
  const hasPoints = series.some((row) => row[dataKey] > 0);
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {hasPoints ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={18} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={allowDecimals} width={54} />
              <Tooltip
                formatter={(value) => (tooltipMoney ? [money(value), tooltipLabel] : [`${value}`, tooltipLabel])}
              />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="h-56 flex items-center justify-center text-sm text-gray-400">
          No data points yet in this range.
        </p>
      )}
    </div>
  );
}