import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/inventory', label: 'Inventory' },
  { path: '/sales', label: 'Sales' },
  { path: '/settings', label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <nav
      className={`
        fixed inset-y-0 left-0 w-60 bg-gray-900 text-white transform transition-transform z-30
        lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-xl font-bold">StockDash</h1>
      </div>
      <ul className="p-4 space-y-1 text-sm">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `block px-3 py-2 rounded ${isActive ? 'bg-blue-600 font-medium text-white' : 'hover:bg-gray-800 text-gray-300'}`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}