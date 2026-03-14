import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { getEmployeeTotalAllocation } from '../utils/validationUtils';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Lock } from 'lucide-react';

const emptyEmployee = { name: '', email: '', department: '', role: '', designation: '', team: '' };

export default function Employees() {
  const { state, dispatch } = useAppContext();
  const { isAdmin } = useAuth();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyEmployee);
  const [editId, setEditId] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'designation', label: 'Designation' },
    { key: 'team', label: 'Team' },
    { key: 'department', label: 'Department' },
    { key: 'role', label: 'Role' },
    {
      key: 'allocation',
      label: 'Current Allocation',
      render: (row) => {
        const total = getEmployeeTotalAllocation(state.allocations, row.id, today);
        return <StatusBadge percentage={total} />;
      },
    },
  ];

  function openAdd() {
    setForm(emptyEmployee);
    setModal('add');
  }

  function openEdit(emp) {
    setForm({
      name: emp.name, email: emp.email, department: emp.department,
      role: emp.role, designation: emp.designation || '', team: emp.team || '',
    });
    setEditId(emp.id);
    setModal('edit');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (modal === 'add') {
      dispatch({ type: 'ADD_EMPLOYEE', payload: form });
    } else {
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: editId, ...form } });
    }
    setModal(null);
  }

  function handleDelete(id) {
    if (confirm('Delete this employee and all their allocations?')) {
      dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          {!isAdmin && <div className="role-notice"><Lock size={13} /> Read-only. Only admins can manage employees.</div>}
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add Employee
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={state.employees}
        searchPlaceholder="Search employees..."
        actions={isAdmin ? (row) => (
          <>
            <button className="btn-icon" title="Edit" onClick={() => openEdit(row)}><Edit2 size={14} /></button>
            <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(row.id)}><Trash2 size={14} /></button>
          </>
        ) : undefined}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Employee' : 'Edit Employee'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="form">
            <label>
              Name *
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
            <div className="form-row">
              <label>
                Designation
                <input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Engineer" />
              </label>
              <label>
                Team
                <input value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} placeholder="e.g. Platform" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Department
                <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </label>
              <label>
                Role
                <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal === 'add' ? 'Add' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
