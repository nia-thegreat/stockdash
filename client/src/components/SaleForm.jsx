import { useState } from 'react';
import { openInvoice, downloadInvoice } from '../utils/invoice';

export default function SaleForm({ parts, onLogSale }) {
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [error, setError] = useState('');

  const selectedPart = parts.find((p) => p.id === Number(partId));
  const qty = parseInt(quantity, 10);
  const total = selectedPart && !Number.isNaN(qty) && qty > 0 ? qty * Number(selectedPart.price) : null;

  function validate() {
    if (!selectedPart) return 'Select a part.';
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 1) return 'Enter a quantity of at least 1.';
    if (qty > selectedPart.stock_quantity) {
      return `Only ${selectedPart.stock_quantity} in stock for ${selectedPart.name}.`;
    }
    return '';
  }

  function handleViewInvoice() {
    if (completedSale) {
      try {
        openInvoice(completedSale.id);
      } catch (err) {
        setError(err.message);
      }
    }
  }

  async function handleDownloadInvoice() {
    if (!completedSale) return;
    try {
      await downloadInvoice(completedSale.id, completedSale.invoice_number);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError('');
    setCompletedSale(null);

    try {
      const created = await onLogSale({
        part_id: parseInt(partId, 10),
        quantity_sold: parseInt(quantity, 10),
      });
      setPartId('');
      setQuantity('');
      setCompletedSale({
        id: created.id,
        invoice_number: created.invoice_number,
      });
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
            onChange={(e) => {
              setPartId(e.target.value);
              setError('');
              setCompletedSale(null);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>Select a part</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                {p.stock_quantity === 0
                  ? `${p.name} — Out of stock`
                  : `${p.name} — ${p.stock_quantity} in stock`}
              </option>
            ))}
          </select>
        </div>

        {selectedPart && (
          <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">Current stock</span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {selectedPart.stock_quantity} units
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold</label>
          <input
            type="number"
            required
            min="1"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setError('');
              setCompletedSale(null);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1"
          />
        </div>

        {selectedPart && (
          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-500">
              Total · {qty > 0 ? qty : 0} × ${Number(selectedPart.price).toFixed(2)}
            </span>
            <span className="font-semibold text-gray-900 tabular-nums">
              ${total ? total.toFixed(2) : '0.00'}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-600 text-white text-sm font-medium py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400"
        >
          {saving ? 'Logging...' : 'Log Sale'}
        </button>

        {completedSale && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-green-800">Sale completed successfully</p>
                <p className="text-sm text-green-700 mt-1 break-all">
                  Invoice: <span className="font-medium">{completedSale.invoice_number}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleViewInvoice}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Invoice
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadInvoice}
                    className="px-3 py-1.5 rounded-md bg-white text-blue-700 text-sm font-medium ring-1 ring-inset ring-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}