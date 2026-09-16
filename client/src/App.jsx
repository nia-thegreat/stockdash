import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import AddProductForm from './components/AddProductForm';
import SaleForm from './components/SaleForm';
import SalesAnalytics from './components/SalesAnalytics';
import TopSellingParts from './components/TopSellingParts';
import SalesHistory from './components/SalesHistory';

const LOW_STOCK_THRESHOLD = 5;

// Shared (non-hook) date helpers for the sales date filters
function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Monday of the week containing `date` (ISO-style week start)
function mondayOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Map the filter UI state to API query params ("" = omitted)
function buildSalesParams(query) {
  const params = {};
  if (query.search.trim()) params.search = query.search.trim();
  const now = new Date();
  switch (query.range) {
    case 'today':
      params.from = toYMD(now);
      params.to = toYMD(now);
      break;
    case 'week':
      params.from = toYMD(mondayOfWeek(now));
      params.to = toYMD(now);
      break;
    case 'month':
      params.from = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      params.to = toYMD(now);
      break;
    case 'custom':
      if (query.customFrom) params.from = query.customFrom;
      if (query.customTo) params.to = query.customTo;
      break;
    default:
      break;
  }
  return params;
}

// Human-readable label for the active sales filter scope
function scopeLabelOf(query) {
  let scope = 'All time';
  if (query.range === 'today') scope = 'Today';
  else if (query.range === 'week') scope = 'This week';
  else if (query.range === 'month') scope = 'This month';
  else if (query.range === 'custom') scope = query.customFrom || query.customTo ? 'Custom range' : 'All time';
  if (query.search.trim()) scope += ` · "${query.search.trim()}"`;
  return scope;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'sales', label: 'Sales' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [parts, setParts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dashboardAnalytics, setDashboardAnalytics] = useState(null);
  const [overviewSeries, setOverviewSeries] = useState([]);
  const [recentSalesPreview, setRecentSalesPreview] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
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
  }, []);

  // Set a section active, close the mobile drawer, and smooth-scroll to it.
  // Shared by the sidebar nav and the Dashboard quick actions.
  function goToSection(sectionId) {
    setActiveSection(sectionId);
    setSidebarOpen(false);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleNavClick(event, sectionId) {
    event.preventDefault();
    goToSection(sectionId);
  }

  // Send POST /api/parts, then refresh
  async function handleAddPart(newPart) {
    setError('');
    const res = await fetch('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPart),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add part');
    }
    await fetchData();
  }

  // Send POST /api/sales (server decrements stock), then refresh
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
    await fetchData();
  }

  // Send PUT /api/parts/:id, then refresh
  async function handleUpdatePart(id, updates) {
    setError('');
    const res = await fetch(`/api/parts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update part');
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

  const totalRevenue = Number(dashboardAnalytics?.summary?.revenue) || 0;
  const topParts = dashboardAnalytics?.topParts || [];

  return (
    <div className="h-dvh bg-gray-100 flex overflow-hidden">
      {/* Sidebar (fixed full-height; mobile: off-canvas drawer) */}
      <nav
        className={`
          fixed inset-y-0 left-0 w-60 bg-gray-900 text-white transform transition-transform z-30
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold">StockDash</h1>
        </div>
        <ul className="p-4 space-y-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <li
              key={item.id}
              className={`
                px-3 py-2 rounded
                ${activeSection === item.id ? 'bg-blue-600 font-medium' : 'hover:bg-gray-800'}
              `}
            >
              <a
                href={`#${item.id}`}
                className="block"
                onClick={(event) => handleNavClick(event, item.id)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Overlay when mobile sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main column — this is the only scroll container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:pl-60">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden text-gray-600"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            </div>
            <span className="text-sm text-gray-500">{parts.length} parts</span>
          </div>
        </header>

        <main className="p-4 lg:p-6 space-y-6 max-w-7xl w-full mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              Error: {error}
            </div>
          )}

          <section id="dashboard" className="scroll-mt-16">
            <Dashboard
              parts={parts}
              lowStockThreshold={LOW_STOCK_THRESHOLD}
              loading={loading}
              totalRevenue={totalRevenue}
              overviewSeries={overviewSeries}
              topParts={topParts}
              recentSales={recentSalesPreview}
              onNavigate={goToSection}
            />
          </section>

          <section id="sales" className="space-y-6 scroll-mt-16">
            <SalesAnalytics
              data={analytics}
              loading={loading || historyLoading}
              error={error || historyError}
              onRetry={fetchData}
              scopeLabel={scopeLabelOf(salesQuery)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopSellingParts
                parts={analytics?.topParts || []}
                loading={loading || historyLoading}
              />
              <SaleForm parts={parts} onLogSale={handleLogSale} />
            </div>

            <SalesHistory
              sales={salesHistory}
              loading={loading || historyLoading}
              error={error || historyError}
              onRetry={fetchData}
              filters={salesQuery}
              onFilterChange={setSalesQuery}
            />
          </section>

          <section id="inventory" className="space-y-6 scroll-mt-16">
            <AddProductForm onAddPart={handleAddPart} />

            <ProductList
              parts={parts}
              lowStockThreshold={LOW_STOCK_THRESHOLD}
              loading={loading}
              error={error}
              onRetry={fetchData}
              onUpdatePart={handleUpdatePart}
              onDeletePart={handleDeletePart}
            />
          </section>
        </main>
      </div>
    </div>
  );
}