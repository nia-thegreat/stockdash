import { useState, useEffect } from 'react';

export default function EditPartModal({ part, onClose, onSave }) {
  const [name, setName] = useState(part?.name || '');
  const [stockQuantity, setStockQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);

  useEffect(() => {
    if (part) {
      setName(part.name);
      setStockQuantity(String(part.stock_quantity));
      setPrice(Number(part.price).toFixed(2));
      setError('');
      setDuplicate(null);
      setPendingPayload(null);
    }
  }, [part]);

  function validate() {
    if (name.trim() === '') return 'Part name is required.';
    const quantity = parseInt(stockQuantity, 10);
    if (Number.isNaN(quantity) || quantity < 0) {
      return 'Stock quantity must be a non-negative whole number.';
    }
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return 'Price must be a number greater than 0.';
    }
    return '';
  }

  function buildPayload() {
    return {
      name: name.trim(),
      stock_quantity: parseInt(stockQuantity, 10),
      price: parseFloat(price),
    };
  }

  // `force` is only true for the "Add Anyway" resubmit of a duplicate warning.
  async function save(payload, force) {
    setSaving(true);
    setError('');
    try {
      await onSave(part.id, payload, { force });
      onClose();
    } catch (err) {
      if (err.duplicate) {
        setDuplicate(err.duplicate);
        setPendingPayload(payload);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setDuplicate(null);
    save(buildPayload(), false);
  }

  function handleAddAnyway() {
    if (pendingPayload) {
      setDuplicate(null);
      setPendingPayload(null);
      save(pendingPayload, true);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Part</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Oil Filter"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Qty</label>
              <input
                type="number"
                required
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {duplicate && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Potential duplicate found</p>
                  <p className="text-sm text-amber-700 mt-1">
                    <span className="font-medium">{duplicate.name}</span> already exists in your
                    inventory. Stock: {duplicate.stock_quantity}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setDuplicate(null)}
                      className="px-3 py-1.5 text-sm font-medium text-amber-900 rounded-md bg-amber-200 hover:bg-amber-300 transition-colors"
                    >
                      Use Existing Part
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAnyway}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm font-medium text-amber-800 rounded-md border border-amber-300 hover:bg-amber-100 transition-colors disabled:opacity-60"
                    >
                      Add Anyway
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}