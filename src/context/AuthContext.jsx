import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'costTrackAuth';

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  VIEWER: 'Viewer',
};

const APP_USERS = [
  { username: 'admin', displayName: 'System Admin', role: ROLES.ADMIN },
];

function loadAuth() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load auth:', e);
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadAuth);

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  function login(selectedUser) {
    setUser(selectedUser);
  }

  function logout() {
    setUser(null);
  }

  const isAdmin = user?.role === ROLES.ADMIN;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

/**
 * Build the list of login users from employees + the fixed admin account.
 * Each employee gets a role based on their employee role field.
 */
export function buildLoginUsers(employees) {
  const empUsers = employees.map(emp => ({
    username: emp.email || emp.name.toLowerCase().replace(/\s+/g, '.'),
    displayName: emp.name,
    role: emp.role?.toLowerCase().includes('admin') ? ROLES.ADMIN : ROLES.MANAGER,
    employeeId: emp.id,
    department: emp.department,
    designation: emp.designation || '',
    team: emp.team || '',
    employeeRole: emp.role,
  }));

  // Add the built-in admin if not already present
  const hasAdmin = empUsers.some(u => u.role === ROLES.ADMIN);
  const allUsers = hasAdmin ? empUsers : [...APP_USERS, ...empUsers];

  return allUsers;
}
