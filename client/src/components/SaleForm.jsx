import { useState } from 'react';

export default function SaleForm({ parts, onLogSale }) {
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await onLogSale({
        part_id: parseInt(partId, 10),
        quantity_sold: parseInt(quantity, 10),
      });
      setPartId('');
      setQuantity('');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
          disabled={saving}
          className="w-full bg-green-600 text-white text-sm font-medium py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400"
        >
          {saving ? 'Logging...' : 'Log Sale'}
        </button>

        {success && <p className="text-sm text-green-600">Sale logged</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}