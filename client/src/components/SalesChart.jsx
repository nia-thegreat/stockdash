import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export default function SalesChart({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Loading sales...
      </div>
    );
  }

  // API returns 30 rows: { date: 'YYYY-MM-DD', total_quantity: number },
  // including days with no sales (total_quantity = 0).
  const formatted = data.map((d) => ({
    date: d.date.slice(5).replace('-', '/'), // '2026-08-15' -> '08/15'
    quantity: Number(d.total_quantity),
  }));

  const hasSales = formatted.some((d) => d.quantity > 0);

  if (!hasSales) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Recent Sales — Last 30 Days
        </h2>
        <p className="text-gray-400">No sales recorded in the last 30 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Sales — Last 30 Days
      </h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={4} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip formatter={(value) => [`${value} units`, 'Sold']} />
            <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Bars are daily units sold; days without sales show as zero.
      </p>
    </div>
  );
}