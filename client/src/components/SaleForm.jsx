import { useState } from 'react';

export default function SaleForm({ parts, onLogSale }) {
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState('');

  function handleSubmit(e) {
    e.preventDefault();

    onLogSale({
      part_id: parseInt(partId, 10),
      quantity_sold: parseInt(quantity, 10),
    });

    setPartId('');
    setQuantity('');
  }

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Log a Sale</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Part</label>
          <select
            required
            value={partId}
            onChange={(e) => setPartId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>Select a part</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.stock_quantity} in stock
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold</label>
          <input
            type="number"
            required
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white text-sm font-medium py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          Log Sale
        </button>
      </form>
    </div>
  );
}