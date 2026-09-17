import { useStockDash } from '../context/StockDashContext';
import { formatSaleDate } from '../utils/format';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'sales', label: 'Sales' },
];

const ACTION_LABELS = {
  part_added: 'Part Added',
  part_edited: 'Part Edited',
  part_deleted: 'Part Deleted',
  sale_recorded: 'Sale Recorded',
};

export default function ActivityHistory() {
  const {
    activities,
    activityCategory,
    activityTotal,
    activityLoading,
    activityError,
    changeActivityCategory,
    loadMoreActivities,
  } = useStockDash();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Activity History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Important inventory and sales actions, newest first.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 tabular-nums">
          {activityTotal} {activityTotal === 1 ? 'action' : 'actions'}
        </span>
      </div>

      <div className="px-5 py-4 border-b flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
        {CATEGORIES.map((cat) => {
          const active = activityCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onClick={() => changeActivityCategory(cat.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {activityError && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 flex items-center gap-2 text-sm text-red-700">
          <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.9 5h13.8a2 2 0 001.4-3.4l-6.9-6.9a2 2 0 00-2.8 0l-6.9 6.9a2 2 0 001.4 3.4z"
            />
          </svg>
          <span>{activityError}</span>
        </div>
      )}

      {activityLoading ? (
        <div className="space-y-3 p-5 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
                <div className="h-3 w-2/3 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 font-medium text-gray-900">No activities yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Add inventory or record a sale to see the actions appear here.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {activities.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-4">
                <ActivityIcon category={a.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900">{ACTION_LABELS[a.action_type] || a.action_type}</h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">
                      {formatSaleDate(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600 break-words">{a.description}</p>
                </div>
              </li>
            ))}
          </ul>
          {activities.length < activityTotal && (
            <div className="px-5 py-4 border-t">
              <button
                type="button"
                onClick={loadMoreActivities}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActivityIcon({ category }) {
  const colors =
    category === 'sales'
      ? 'bg-green-50 text-green-600'
      : 'bg-blue-50 text-blue-600';
  return (
    <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colors}`}>
      {category === 'sales' ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      )}
    </span>
  );
}