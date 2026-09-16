import { useState, useEffect, useRef } from 'react';
import StatsCards from './components/StatsCards';
import ProductList from './components/ProductList';
import AddProductForm from './components/AddProductForm';
import SaleForm from './components/SaleForm';
import SalesSummary from './components/SalesSummary';
import SalesHistory from './components/SalesHistory';
import SalesChart from './components/SalesChart';

const LOW_STOCK_THRESHOLD = 5;

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'sales', label: 'Sales' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [parts, setParts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const mainRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch parts, recent sales (chart), and full sales history in parallel
  async function fetchData() {
    try {
      setLoading(true);
      const [partsRes, recentRes, historyRes] = await Promise.all([
        fetch('/api/parts'),
        fetch('/api/sales/recent'),
        fetch('/api/sales'),
      ]);
      if (!partsRes.ok || !recentRes.ok || !historyRes.ok) throw new Error('Could not load data');
      setParts(await partsRes.json());
      setRecentSales(await recentRes.json());
      setSalesHistory(await historyRes.json());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Load data once when the app starts
  useEffect(() => {
    fetchData();
  }, []);

  // Scroll-spy: highlight the sidebar item for the section nearest to the
  // top of the scrollable content area (IntersectionObserver beats scroll events).
  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;

    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        if (visible.length > 0 && visible[0].target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { root: container, rootMargin: '0px 0px -70% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Smooth-scroll to a section, highlight it, and close the mobile drawer
  function handleNavClick(event, sectionId) {
    event.preventDefault();
    setActiveSection(sectionId);
    setSidebarOpen(false);
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  const inventoryValue = parts.reduce(
    (sum, p) => sum + Number(p.price) * p.stock_quantity,
    0
  );
  const lowStockCount = parts.filter((p) => p.stock_quantity < LOW_STOCK_THRESHOLD).length;

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
      <div ref={mainRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:pl-60">
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
            <StatsCards
              inventoryValue={inventoryValue}
              totalParts={parts.length}
              lowStockCount={lowStockCount}
            />
          </section>

          <section id="sales" className="space-y-6 scroll-mt-16">
            <SalesSummary sales={salesHistory} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart data={recentSales} loading={loading} />
              <SaleForm parts={parts} onLogSale={handleLogSale} />
            </div>

            <SalesHistory
              sales={salesHistory}
              loading={loading}
              error={error}
              onRetry={fetchData}
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