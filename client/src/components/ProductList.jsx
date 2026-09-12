export default function ProductList({ parts, lowStockThreshold, loading, error }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Loading parts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-red-600 font-medium">Could not load parts.</p>
        <p className="text-gray-500 text-sm mt-1">
          Make sure the API server is running on port 5001.
        </p>
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No parts yet. Add your first part with the form above.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Parts Inventory</h2>
        <span className="text-sm text-gray-500">{parts.length} parts</span>
      </div>

      {/* Desktop table (hidden on small screens) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-5 py-3 font-medium">Part</th>
              <th className="px-5 py-3 font-medium">Stock</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Value</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-b last:border-b-0">
                <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-5 py-3 text-gray-700">{p.stock_quantity}</td>
                <td className="px-5 py-3 text-gray-700">${Number(p.price).toFixed(2)}</td>
                <td className="px-5 py-3 text-gray-700">
                  ${(Number(p.price) * p.stock_quantity).toFixed(2)}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge stock={p.stock_quantity} threshold={lowStockThreshold} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (shown instead of table on small screens) */}
      <div className="md:hidden divide-y divide-gray-100">
        {parts.map((p) => (
          <div key={p.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{p.name}</p>
              <p className="text-sm text-gray-500">
                {p.stock_quantity} in stock — ${Number(p.price).toFixed(2)}
              </p>
            </div>
            <StatusBadge stock={p.stock_quantity} threshold={lowStockThreshold} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ stock, threshold }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Out of stock
      </span>
    );
  }
  if (stock < threshold) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      In stock
    </span>
  );
}