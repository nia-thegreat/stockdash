import { createContext, useContext, useState, useEffect } from 'react';
import { buildSalesParams, toYMD } from '../utils/salesFilters';

const StockDashContext = createContext(null);

export function useStockDash() {
  const ctx = useContext(StockDashContext);
  if (!ctx) throw new Error('useStockDash must be used within a StockDashProvider');
  return ctx;
}

export function StockDashProvider({ children }) {
  const [parts, setParts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dashboardAnalytics, setDashboardAnalytics] = useState(null);
  const [overviewSeries, setOverviewSeries] = useState([]);
  const [recentSalesPreview, setRecentSalesPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesQuery, setSalesQuery] = useState({ search: '', range: 'all', customFrom: '', customTo: '' });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [activities, setActivities] = useState([]);
  const [activityCategory, setActivityCategory] = useState('all');
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [settings, setSettings] = useState({ monthly_goal_enabled: false, monthly_goal: null });
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const ACTIVITY_PAGE = 20;

  // Fetch the activity log (newest first) with server-side pagination.
  // `replace` clears the list (filter changes); otherwise it appends ("Load more").
  async function runActivitiesFetch(category, offset, mode) {
    const qs = new URLSearchParams({ category, limit: String(ACTIVITY_PAGE), offset: String(offset) });
    const res = await fetch(`/api/activities?${qs.toString()}`);
    if (!res.ok) throw new Error('Could not load activity');
    const data = await res.json();
    if (mode === 'replace') {
      setActivities(data.activities);
    } else {
      setActivities((prev) => [...prev, ...data.activities]);
    }
    setActivityTotal(data.total);
    return data;
  }

  async function fetchActivities() {
    setActivityLoading(true);
    setActivityError('');
    try {
      await runActivitiesFetch(activityCategory, 0, 'replace');
    } catch (err) {
      setActivityError(err.message);
    } finally {
      setActivityLoading(false);
    }
  }

  async function loadMoreActivities() {
    setActivityError('');
    try {
      await runActivitiesFetch(activityCategory, activities.length, 'append');
    } catch (err) {
      setActivityError(err.message);
    }
  }

  function changeActivityCategory(category) {
    if (category === activityCategory) return;
    setActivityCategory(category);
    setActivityLoading(true);
    setActivityError('');
    runActivitiesFetch(category, 0, 'replace')
      .catch((err) => setActivityError(err.message))
      .finally(() => setActivityLoading(false));
  }

  // Fetch sales history honoring the current filters (server-side filtering)
  async function fetchSales(params = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await fetch(`/api/sales${suffix}`);
    if (!res.ok) throw new Error('Could not load sales');
    return res.json();
  }

  // Fetch sales analytics for the same filter (server-side aggregates + charts)
  async function fetchAnalytics(params = {}) {
    const qs = new URLSearchParams();
    if (params.bucket) qs.set('bucket', params.bucket);
    if (params.search) qs.set('search', params.search);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const res = await fetch(`/api/sales/analytics${suffix}`);
    if (!res.ok) throw new Error('Could not load sales analytics');
    return res.json();
  }

  // Chart granularity: daily for spans up to 45 days, monthly beyond that
  function bucketFor(params) {
    if (params.from && params.to) {
      const days = (Date.parse(params.to) - Date.parse(params.from)) / 86400000;
      return days <= 45 ? 'day' : 'month';
    }
    return 'month';
  }

  // Fetch history + analytics together so both always share the same filter
  async function fetchSalesData(params = {}) {
    const [history, analyticsData] = await Promise.all([
      fetchSales(params),
      fetchAnalytics({ ...params, bucket: bucketFor(params) }),
    ]);
    return { history, analytics: analyticsData };
  }

  // Fetch parts, filtered sales data, the Dashboard overview, app settings, and
  // this calendar month's revenue in parallel. The month window reuses the same
  // analytics query as everything else (no duplicated sales math).
  async function fetchData() {
    try {
      setLoading(true);
      const today = new Date();
      const seriesParams = {
        from: toYMD(new Date(today.getTime() - 29 * 86400000)),
        to: toYMD(today),
      };
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthParams = { from: toYMD(monthStart), to: toYMD(today), bucket: 'day' };
      const [partsRes, filteredSales, dashAllTime, dashSeries, allRows, settingsRes, monthlyAnalytics] = await Promise.all([
        fetch('/api/parts'),
        fetchSalesData(buildSalesParams(salesQuery)),
        fetchAnalytics({ bucket: 'month' }),
        fetchAnalytics({ ...seriesParams, bucket: 'day' }),
        fetchSales(),
        fetch('/api/settings'),
        fetchAnalytics(monthParams),
      ]);
      if (!partsRes.ok) throw new Error('Could not load data');
      setParts(await partsRes.json());
      setSalesHistory(filteredSales.history);
      setAnalytics(filteredSales.analytics);
      setDashboardAnalytics(dashAllTime);
      setOverviewSeries(dashSeries.timeseries);
      setRecentSalesPreview(allRows.slice(0, 5));
      if (settingsRes.ok) setSettings(await settingsRes.json());
      setMonthlyRevenue(Number(monthlyAnalytics?.summary?.revenue) || 0);
      setError('');
      setHistoryError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Debounced refetch of history + analytics when the filters change
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setHistoryLoading(true);
        const data = await fetchSalesData(buildSalesParams(salesQuery));
        if (!cancelled) {
          setSalesHistory(data.history);
          setAnalytics(data.analytics);
          setHistoryError('');
        }
      } catch (err) {
        if (!cancelled) setHistoryError(err.message);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // fetchSalesData intentionally excluded — it is recreated each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesQuery]);

  // Load data once when the app starts
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send POST /api/parts, then refresh. `options.force` retries after the user
  // chose "Add Anyway" past a duplicate warning (the server skips its check).
  async function handleAddPart(newPart, options = {}) {
    setError('');
    const res = await fetch('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newPart, force: options.force === true }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to add part');
      if (res.status === 409 && data.duplicate) err.duplicate = data.duplicate;
      throw err;
    }
    await fetchData();
  }

  // Send POST /api/sales (server decrements stock), then refresh.
  // Returns the created sale row (id + invoice_number) for the success UI.
  async function handleLogSale(sale) {
    setError('');
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to log sale');
    }
    const createdSale = data;
    await fetchData();
    return createdSale;
  }

  // Send PUT /api/parts/:id, then refresh. `options.force` skips the server's
  // duplicate check when the user chose "Add Anyway" while editing.
  async function handleUpdatePart(id, updates, options = {}) {
    setError('');
    const res = await fetch(`/api/parts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, force: options.force === true }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to update part');
      if (res.status === 409 && data.duplicate) err.duplicate = data.duplicate;
      throw err;
    }
    await fetchData();
  }

  // Send DELETE /api/parts/:id, then refresh
  async function handleDeletePart(id) {
    setError('');
    const res = await fetch(`/api/parts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete part');
    }
    await fetchData();
  }

  // Save the monthly-sales-goal settings, then refresh (gets fresh monthly revenue)
  async function handleUpdateSettings(updates) {
    setError('');
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save settings');
    }
    setSettings(data);
    await fetchData();
    return data;
  }

  // Keep the activity log fresh after any mutation (add/edit/delete/sale).
  // Every mutation updates the parts list, so parts changes cover all of them.
  useEffect(() => {
    if (!loading) fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts]);

  const value = {
    parts,
    salesHistory,
    analytics,
    dashboardAnalytics,
    overviewSeries,
    recentSalesPreview,
    loading,
    error,
    historyLoading,
    historyError,
    salesQuery,
    setSalesQuery,
    activities,
    activityCategory,
    activityTotal,
    activityLoading,
    activityError,
    changeActivityCategory,
    loadMoreActivities,
    fetchActivities,
    settings,
    monthlyRevenue,
    handleUpdateSettings,
    fetchData,
    handleAddPart,
    handleLogSale,
    handleUpdatePart,
    handleDeletePart,
  };

  return <StockDashContext.Provider value={value}>{children}</StockDashContext.Provider>;
}