import { money } from '../utils/format';

// Time-aware progress status (documented, no business assumptions): on track
// when the % achieved reaches the % of the month elapsed; near-miss → amber.
function statusFor(pct, now = new Date()) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedPct = (now.getDate() / daysInMonth) * 100;
  if (pct >= 100) return { label: 'Goal reached', color: 'text-green-600' };
  if (pct >= elapsedPct) return { label: 'On track', color: 'text-green-600' };
  if (pct >= elapsedPct * 0.85) return { label: 'Slightly behind', color: 'text-amber-600' };
  return { label: 'Behind', color: 'text-red-600' };
}

export default function MonthlyGoalCard({ revenue, target, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-5 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="mt-4 h-8 w-48 bg-gray-200 rounded" />
        <div className="mt-4 h-2 bg-gray-100 rounded" />
      </div>
    );
  }

  const safeTarget = Number(target) > 0 ? Number(target) : 0;
  const rev = Number(revenue) || 0;
  const pct = safeTarget > 0 ? (rev / safeTarget) * 100 : 0;
  const remaining = Math.max(safeTarget - rev, 0);
  const status = statusFor(pct);

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">Monthly Sales Goal</p>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
          <span className={`h-2 w-2 rounded-full ${status.color.replace('text-', 'bg-')}`} />
          {status.label}
        </span>
      </div>

      <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
        {money(rev)} <span className="text-base font-medium text-gray-400">/ {money(safeTarget)}</span>
      </p>

      <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-sm tabular-nums">
        <span className="text-gray-700">{pct.toFixed(1)}% achieved</span>
        <span className="font-medium text-gray-900">{money(remaining)} remaining</span>
      </div>
    </div>
  );
}