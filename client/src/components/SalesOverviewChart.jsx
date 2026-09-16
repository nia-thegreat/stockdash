import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { money, formatSeriesLabel } from '../utils/format';

export default function SalesOverviewChart({ data, loading }) {
  const series = (data || []).map((row) => ({
    label: formatSeriesLabel(row.label),
    revenue: Number(row.revenue),
  }));
  const hasSales = series.some((row) => row.revenue > 0);

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
          <p className="text-xs text-gray-500 mt-0.5">Revenue per day — last 30 days.</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 tabular-nums">
          {loading ? 'Loading…' : `$${series.reduce((sum, r) => sum + r.revenue, 0).toFixed(2)}`}
        </span>
      </div>

      {loading ? (
        <div className="h-56 mt-4 animate-pulse rounded-lg bg-gray-100" />
      ) : hasSales ? (
        <div className="h-56 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={18} />
              <YAxis tick={{ fontSize: 11 }} width={54} />
              <Tooltip formatter={(value) => [money(value), 'Revenue']} />
              <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="h-56 mt-4 flex items-center justify-center text-sm text-gray-400">
          No sales in the last 30 days.
        </p>
      )}
    </div>
  );
}