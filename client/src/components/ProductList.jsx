import { useState } from 'react';
import EditPartModal from './EditPartModal';
import ConfirmDialog from './ConfirmDialog';
import { getStockStatus, STATUS_META } from '../utils/stock';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'instock', label: 'In Stock' },
  { id: 'lowstock', label: 'Low Stock' },
  { id: 'outofstock', label: 'Out of Stock' },
];

export default function ProductList({
  parts,
  lowStockThreshold,
  loading,
  error,
  onUpdatePart,
  onDeletePart,
  onRetry,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPart, setEditingPart] = useState(null);
  const [deletingPart, setDeletingPart] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (loading) {
    return <ProductListSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center">
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
        <p className="mt-4 font-medium text-gray-900">Could not load parts</p>
        <p className="mt-1 text-sm text-gray-500">
          Make sure the API server is running on port 5001, then try again.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <p className="mt-4 font-medium text-gray-900">No parts in inventory yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Add your first part with the Add Part form in the Sales section.
        </p>
      </div>
    );
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const statusCounts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f.id] =
      f.id === 'all'
        ? parts.length
        : parts.filter((p) => getStockStatus(p.stock_quantity, lowStockThreshold) === f.id).length;
    return acc;
  }, {});

  const filteredParts = parts.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(normalizedQuery);
    const matchesStatus =
      statusFilter === 'all' || getStockStatus(p.stock_quantity, lowStockThreshold) === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const isFiltering = statusFilter !== 'all' || normalizedQuery !== '';

  function clearFilters() {
    setSearchQuery('');
    setStatusFilter('all');
  }

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
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Parts Inventory</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Threshold: {lowStockThreshold} units or fewer is low stock
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
          {isFiltering ? `${filteredParts.length} of ${parts.length} parts` : `${parts.length} parts`}
        </span>
      </div>

      {/* Search + filters */}
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
            className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by stock status">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatusFilter(filter.id)}
                className={`
                  inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {filter.label}
                <span
                  className={`
                    ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold tabular-nums
                    ${isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}
                  `}
                >
                  {statusCounts[filter.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      {filteredParts.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="mt-4 font-medium text-gray-900">No parts match your filters</p>
          <p className="mt-1 text-sm text-gray-500">Try a different search term or status.</p>
          {isFiltering && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b">
                  <th className="px-5 py-3 font-semibold">Part</th>
                  <th className="px-5 py-3 font-semibold text-right">Stock</th>
                  <th className="px-5 py-3 font-semibold text-right">Price</th>
                  <th className="px-5 py-3 font-semibold text-right">Value</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">{p.stock_quantity}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                      ${Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-500">
                      ${(Number(p.price) * p.stock_quantity).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge stock={p.stock_quantity} threshold={lowStockThreshold} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <PartActions part={p} onEdit={setEditingPart} onDelete={setDeletingPart} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredParts.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="mt-1 text-sm text-gray-500 tabular-nums">
                      {p.stock_quantity} in stock
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900 tabular-nums">
                      ${Number(p.price).toFixed(2)}
                      <span className="text-xs font-normal text-gray-400">
                        {' '}· value ${(Number(p.price) * p.stock_quantity).toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <StatusBadge stock={p.stock_quantity} threshold={lowStockThreshold} />
                </div>
                <div className="mt-3">
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

function ProductListSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b animate-pulse">
        <div className="h-5 w-44 bg-gray-200 rounded-md" />
      </div>
      <div className="px-5 py-4 border-b space-y-3 animate-pulse">
        <div className="h-9 w-full bg-gray-100 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-gray-100 rounded-full" />
          <div className="h-7 w-20 bg-gray-100 rounded-full" />
          <div className="h-7 w-20 bg-gray-100 rounded-full" />
          <div className="h-7 w-24 bg-gray-100 rounded-full" />
        </div>
      </div>
      <div className="hidden md:block animate-pulse">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-3.5 border-b last:border-b-0">
            <div className="h-4 w-1/3 bg-gray-200 rounded" />
            <div className="h-4 w-10 bg-gray-200 rounded" />
            <div className="h-4 w-14 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-5 w-24 bg-gray-200 rounded-full ml-auto" />
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-3 p-5 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function PartActions({ part, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(part)}
        aria-label={`Edit ${part.name}`}
        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}