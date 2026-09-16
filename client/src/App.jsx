import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StockDashProvider } from './context/StockDashContext';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <StockDashProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </StockDashProvider>
    </BrowserRouter>
  );
}