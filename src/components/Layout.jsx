import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Hash, GitBranch, FileSpreadsheet, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/cost-codes', icon: Hash, label: 'Cost Codes' },
  { to: '/allocations', icon: GitBranch, label: 'Allocations' },
  { to: '/import-export', icon: FileSpreadsheet, label: 'Import / Export' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Hash size={28} strokeWidth={2.5} />
          <h1>CostTrack</h1>
        </div>
        <nav>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              end={item.to === '/'}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
