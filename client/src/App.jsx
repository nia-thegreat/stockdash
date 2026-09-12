import { useState, useEffect } from 'react';
import StatsCards from './components/StatsCards';
import ProductList from './components/ProductList';
import AddProductForm from './components/AddProductForm';
import SaleForm from './components/SaleForm';
import SalesChart from './components/SalesChart';
import { recentSales as mockSales } from './data';

const LOW_STOCK_THRESHOLD = 5;

export default function App() {
  const [parts, setParts] = useState([]);
  const [sales, setSales] = useState(mockSales);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all parts from GET /api/parts
  async function fetchParts() {
    try {
      setLoading(true);
      const res = await fetch('/api/parts');
      if (!res.ok) throw new Error('Could not load parts');
      setParts(await res.json());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Load parts once when the app starts
  useEffect(() => {
    fetchParts();
  }, []);

  // Send POST /api/parts, then refresh the list
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
    await fetchParts();
  }

  function handleLogSale(sale) {
    // Still mock-only — sales API not implemented yet.
    setSales((prev) => [
      ...prev,
      { date: '09/05', quantity_sold: sale.quantity_sold },
    ]);
  }

  const inventoryValue = parts.reduce(
    (sum, p) => sum + Number(p.price) * p.stock_quantity,
    0
  );
  const lowStockCount = parts.filter((p) => p.stock_quantity < LOW_STOCK_THRESHOLD).length;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar (desktop: always visible; mobile: overlay) */}
      <nav
        className={`
          fixed inset-y-0 left-0 w-60 bg-gray-900 text-white transform transition-transform z-20
          lg:translate-x-0 lg:static
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold">StockDash</h1>
        </div>
        <ul className="p-4 space-y-1 text-sm">
          <li className="px-3 py-2 rounded bg-blue-600 font-medium">
            <a href="#dashboard" className="block">Dashboard</a>
          </li>
          <li className="px-3 py-2 rounded hover:bg-gray-800">
            <a href="#inventory" className="block">Inventory</a>
          </li>
          <li className="px-3 py-2 rounded hover:bg-gray-800">
            <a href="#sales" className="block">Sales</a>
          </li>
          <li className="px-3 py-2 rounded hover:bg-gray-800">
            <a href="#settings" className="block">Settings</a>
          </li>
        </ul>
      </nav>

      {/* Overlay when mobile sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
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

          <section id="dashboard">
            <StatsCards
              inventoryValue={inventoryValue}
              totalParts={parts.length}
              lowStockCount={lowStockCount}
            />
          </section>

          <section id="sales" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesChart data={sales} />
            <div className="space-y-6">
              <AddProductForm onAddPart={handleAddPart} />
              <SaleForm parts={parts} onLogSale={handleLogSale} />
            </div>
          </section>

          <section id="inventory">
            <ProductList
              parts={parts}
              lowStockThreshold={LOW_STOCK_THRESHOLD}
              loading={loading}
              error={error}
            />
          </section>
        </main>
      </div>
    </div>
  );
}