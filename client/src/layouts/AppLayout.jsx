import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useStockDash } from '../context/StockDashContext';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/activity': 'Activity',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { parts, error } = useStockDash();
  const title = PAGE_TITLES[location.pathname] || 'StockDash';

  return (
    <div className="h-dvh bg-gray-100 flex overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
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

          <Outlet />
        </main>
      </div>
    </div>
  );
}