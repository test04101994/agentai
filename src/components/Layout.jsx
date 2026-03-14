import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Hash, GitBranch, FileSpreadsheet, Menu, X, LogOut, Sun, Moon, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/cost-codes', icon: Hash, label: 'Cost Codes' },
  { to: '/allocations', icon: GitBranch, label: 'Allocations' },
  { to: '/import-export', icon: FileSpreadsheet, label: 'Import / Export' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

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
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          {user && (
            <div className="sidebar-user">
              <div className="user-info">
                <div className="user-name">{user.displayName}</div>
                <div className="user-role">
                  <Shield size={12} />
                  <span className={`badge badge-sm ${isAdmin ? 'badge-danger' : 'badge-info'}`}>{user.role}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
