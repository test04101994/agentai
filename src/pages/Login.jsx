import { useState, useMemo } from 'react';
import { useAuth, buildLoginUsers, ROLES } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { Hash, LogIn, Shield, User } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { state } = useAppContext();
  const [selectedUsername, setSelectedUsername] = useState('');

  const loginUsers = useMemo(() => buildLoginUsers(state.employees), [state.employees]);

  const selectedUser = loginUsers.find(u => u.username === selectedUsername);

  function handleLogin(e) {
    e.preventDefault();
    if (selectedUser) {
      login(selectedUser);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Hash size={36} strokeWidth={2.5} />
          <h1>CostTrack</h1>
          <p>Employee Cost Allocation Management</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label>
            Select User
            <select
              required
              value={selectedUsername}
              onChange={e => setSelectedUsername(e.target.value)}
            >
              <option value="">Choose a user to login...</option>
              {loginUsers.map(u => (
                <option key={u.username} value={u.username}>
                  {u.displayName} ({u.role})
                </option>
              ))}
            </select>
          </label>

          {selectedUser && (
            <div className="login-preview">
              <div className="login-preview-row">
                <User size={14} />
                <span><strong>{selectedUser.displayName}</strong></span>
              </div>
              <div className="login-preview-row">
                <Shield size={14} />
                <span>Role: <span className={`badge ${selectedUser.role === ROLES.ADMIN ? 'badge-danger' : 'badge-info'}`}>{selectedUser.role}</span></span>
              </div>
              {selectedUser.department && (
                <div className="login-preview-row">
                  <span style={{ marginLeft: 18 }}>Dept: {selectedUser.department}</span>
                </div>
              )}
              <div className="login-role-info">
                {selectedUser.role === ROLES.ADMIN ? (
                  <span>Full access: add, edit, and delete allocations</span>
                ) : (
                  <span>Limited access: can only add new allocations</span>
                )}
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-login" disabled={!selectedUser}>
            <LogIn size={16} /> Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
