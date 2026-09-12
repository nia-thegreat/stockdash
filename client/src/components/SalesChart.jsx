export default function SalesChart({ data }) {
  const max = Math.max(...data.map((d) => d.quantity_sold));

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Sales
      </h2>

      <div className="flex items-end gap-2 h-48">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex items-end" style={{ height: '100%' }}>
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${(d.quantity_sold / max) * 100}%` }}
                title={`${d.date}: ${d.quantity_sold} sold`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 mt-1">
        {data.map((d) => (
          <div key={d.date} className="flex-1 text-center text-xs text-gray-500">
            {d.date}
          </div>
        ))}
      </div>

      {/* Lightweight value readout */}
      <div className="mt-4 text-sm text-gray-600">
        Highest day: <span className="font-medium text-gray-900">{max} units</span>
      </div>
    </div>
  );
}