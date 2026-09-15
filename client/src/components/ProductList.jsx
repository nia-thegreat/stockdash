import { useState } from 'react';
import EditPartModal from './EditPartModal';
import ConfirmDialog from './ConfirmDialog';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'instock', label: 'In Stock' },
  { id: 'lowstock', label: 'Low Stock' },
  { id: 'outofstock', label: 'Out of Stock' },
];

const STATUS_META = {
  instock: { label: 'In stock', className: 'bg-green-100 text-green-800' },
  lowstock: { label: 'Low stock', className: 'bg-red-100 text-red-800' },
  outofstock: { label: 'Out of stock', className: 'bg-gray-100 text-gray-800' },
};

function getStockStatus(stock, threshold) {
  if (stock === 0) return 'outofstock';
  if (stock < threshold) return 'lowstock';
  return 'instock';
}

export default function ProductList({ parts, lowStockThreshold, loading, error, onUpdatePart, onDeletePart }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPart, setEditingPart] = useState(null);
  const [deletingPart, setDeletingPart] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredParts = parts.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(normalizedQuery);
    const matchesStatus =
      statusFilter === 'all' || getStockStatus(p.stock_quantity, lowStockThreshold) === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const isFiltering = statusFilter !== 'all' || normalizedQuery !== '';

  async function handleConfirmDelete() {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await onDeletePart(deletingPart.id);
      setDeletingPart(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900">Parts Inventory</h2>
        <span className="text-sm text-gray-500">
          {isFiltering ? `${filteredParts.length} of ${parts.length} parts` : `${parts.length} parts`}
        </span>
      </div>

      {/* Search + status filter toolbar */}
      <div className="px-5 py-4 border-b space-y-3">
        <div className="relative">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parts by name..."
            aria-label="Search parts by name"
            className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatusFilter(filter.id)}
                className={`
                  rounded-full px-3 py-1.5 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredParts.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-500">
          No parts match your search or filters.
        </div>
      ) : (
        <>
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
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((p) => (
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
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <PartActions part={p} onEdit={setEditingPart} onDelete={setDeletingPart} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (shown instead of table on small screens) */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredParts.map((p) => (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">
                      {p.stock_quantity} in stock — ${Number(p.price).toFixed(2)}
                    </p>
                  </div>
                  <StatusBadge stock={p.stock_quantity} threshold={lowStockThreshold} />
                </div>
                <div className="mt-2">
                  <PartActions part={p} onEdit={setEditingPart} onDelete={setDeletingPart} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editingPart && (
        <EditPartModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={onUpdatePart}
        />
      )}

      {deletingPart && (
        <ConfirmDialog
          title="Delete part"
          message={`Delete "${deletingPart.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          loading={deleteLoading}
          error={deleteError}
          onCancel={() => {
            setDeletingPart(null);
            setDeleteError('');
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

function PartActions({ part, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onEdit(part)}
        aria-label={`Edit ${part.name}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11 14H8v-3l9.6-9.4z"
          />
        </svg>
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(part)}
        aria-label={`Delete ${part.name}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v4m4-4v4m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete
      </button>
    </div>
  );
}

function StatusBadge({ stock, threshold }) {
  const meta = STATUS_META[getStockStatus(stock, threshold)];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}