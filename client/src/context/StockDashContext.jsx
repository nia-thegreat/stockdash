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

  // Fetch parts, filtered sales data, and the Dashboard overview in parallel
  async function fetchData() {
    try {
      setLoading(true);
      const today = new Date();
      const seriesParams = {
        from: toYMD(new Date(today.getTime() - 29 * 86400000)),
        to: toYMD(today),
      };
      const [partsRes, filteredSales, dashAllTime, dashSeries, allRows] = await Promise.all([
        fetch('/api/parts'),
        fetchSalesData(buildSalesParams(salesQuery)),
        fetchAnalytics({ bucket: 'month' }),
        fetchAnalytics({ ...seriesParams, bucket: 'day' }),
        fetchSales(),
      ]);
      if (!partsRes.ok) throw new Error('Could not load data');
      setParts(await partsRes.json());
      setSalesHistory(filteredSales.history);
      setAnalytics(filteredSales.analytics);
      setDashboardAnalytics(dashAllTime);
      setOverviewSeries(dashSeries.timeseries);
      setRecentSalesPreview(allRows.slice(0, 5));
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
    fetchData,
    handleAddPart,
    handleLogSale,
    handleUpdatePart,
    handleDeletePart,
  };

  return <StockDashContext.Provider value={value}>{children}</StockDashContext.Provider>;
}