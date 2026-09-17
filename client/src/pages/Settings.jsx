import { useState, useEffect } from 'react';
import { useStockDash } from '../context/StockDashContext';

export default function Settings() {
  const { settings, handleUpdateSettings } = useStockDash();
  const [enabled, setEnabled] = useState(settings.monthly_goal_enabled);
  const [goal, setGoal] = useState(settings.monthly_goal === null ? '' : String(settings.monthly_goal));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setEnabled(settings.monthly_goal_enabled);
    setGoal(settings.monthly_goal === null ? '' : String(settings.monthly_goal));
  }, [settings]);

  function validate() {
    if (!enabled) return '';
    const num = Number(goal);
    if (goal.trim() === '') return 'Enter a monthly sales goal.';
    if (!Number.isFinite(num) || num <= 0) return 'Monthly goal must be a number greater than 0.';
    return '';
  }

  async function save(e) {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      setStatus('error');
      setMessage(invalid);
      return;
    }
    setSaving(true);
    setStatus('');
    setMessage('');
    try {
      await handleUpdateSettings({
        monthly_goal_enabled: enabled,
        monthly_goal: enabled ? Math.round(Number(goal) * 100) / 100 : null,
      });
      setStatus('success');
      setMessage(
        enabled ? `Monthly sales goal saved: $${Number(goal).toFixed(2)}` : 'Goal tracking is turned off.'
      );
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-5 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      <p className="text-xs text-gray-500 mt-0.5">Application preferences are saved server-side.</p>

      <form onSubmit={save} className="mt-6">
        <div className="rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Monthly Sales Goal</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Track progress toward a monthly revenue target on the Dashboard.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              aria-label="Toggle goal tracking"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-5">
            <label htmlFor="monthly-goal" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Target ($)
            </label>
            <input
              id="monthly-goal"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={!enabled}
              placeholder="e.g. 100000.00"
              className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                enabled ? 'bg-white' : 'bg-gray-50 text-gray-400'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">
              {enabled
                ? 'Applied to the current calendar month. Progress uses real sales data.'
                : 'Goal tracking is off — the Dashboard goal card stays hidden.'}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {status && (
              <p
                className={`text-sm ${
                  status === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}