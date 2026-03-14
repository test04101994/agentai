import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { validateAllocationPercentage, getEmployeeTotalAllocation } from '../utils/validationUtils';
import { Plus, Edit2, Trash2, AlertTriangle, Lock } from 'lucide-react';

const emptyAlloc = { employeeId: '', costCodeId: '', percentage: '', startDate: '', endDate: '', allocationType: 'Forecasted' };

function formatTimestamp(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function Allocations() {
  const { state, dispatch } = useAppContext();
  const { user, isAdmin } = useAuth();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyAlloc);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterCostCode, setFilterCostCode] = useState('');
  const [filterType, setFilterType] = useState('');

  const empMap = useMemo(() => Object.fromEntries(state.employees.map(e => [e.id, e])), [state.employees]);
  const ccMap = useMemo(() => Object.fromEntries(state.costCodes.map(c => [c.id, c])), [state.costCodes]);

  const filteredAllocations = useMemo(() => {
    let result = state.allocations;
    if (filterStartDate && filterEndDate) {
      result = result.filter(a => a.startDate <= filterEndDate && a.endDate >= filterStartDate);
    } else if (filterStartDate) {
      result = result.filter(a => a.endDate >= filterStartDate);
    } else if (filterEndDate) {
      result = result.filter(a => a.startDate <= filterEndDate);
    }
    if (filterEmployee) {
      result = result.filter(a => a.employeeId === filterEmployee);
    }
    if (filterCostCode) {
      result = result.filter(a => a.costCodeId === filterCostCode);
    }
    if (filterType) {
      result = result.filter(a => (a.allocationType || 'Forecasted') === filterType);
    }
    return result;
  }, [state.allocations, filterStartDate, filterEndDate, filterEmployee, filterCostCode, filterType]);

  const columns = [
    {
      key: 'employeeName',
      label: 'Employee',
      render: (row) => empMap[row.employeeId]?.name || 'Unknown',
    },
    {
      key: 'costCode',
      label: 'Cost Code',
      render: (row) => {
        const cc = ccMap[row.costCodeId];
        return cc ? `${cc.code} - ${cc.name}` : 'Unknown';
      },
    },
    {
      key: 'percentage',
      label: 'Allocation %',
      render: (row) => <StatusBadge percentage={row.percentage} />,
    },
    {
      key: 'totalForEmployee',
      label: 'Employee Total',
      render: (row) => {
        const date = filterStartDate || row.startDate;
        const total = getEmployeeTotalAllocation(state.allocations, row.employeeId, date);
        return (
          <span className={total > 100 ? 'text-danger' : total === 100 ? 'text-success' : ''}>
            {total}%
            {total > 100 && <AlertTriangle size={14} style={{ marginLeft: 4 }} />}
          </span>
        );
      },
    },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    {
      key: 'allocationType',
      label: 'Type',
      render: (row) => {
        const type = row.allocationType || 'Forecasted';
        return <span className={`badge ${type === 'Approved' ? 'badge-success' : 'badge-warning'}`}>{type}</span>;
      },
    },
    {
      key: 'lastModifiedBy',
      label: 'Last Modified By',
      render: (row) => (
        <div className="modified-info">
          <span className="modified-by">{row.lastModifiedBy || '-'}</span>
          <span className="modified-at">{formatTimestamp(row.lastModifiedAt)}</span>
        </div>
      ),
    },
  ];

  function openAdd() {
    setForm(emptyAlloc);
    setError('');
    setModal('add');
  }

  function openEdit(alloc) {
    if (!isAdmin) return;
    setForm({
      employeeId: alloc.employeeId,
      costCodeId: alloc.costCodeId,
      percentage: alloc.percentage,
      startDate: alloc.startDate,
      endDate: alloc.endDate,
      allocationType: alloc.allocationType || 'Forecasted',
    });
    setEditId(alloc.id);
    setError('');
    setModal('edit');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const pct = Number(form.percentage);
    if (pct <= 0 || pct > 100) {
      setError('Percentage must be between 1 and 100.');
      return;
    }
    if (form.startDate > form.endDate) {
      setError('Start date must be before end date.');
      return;
    }

    const validation = validateAllocationPercentage(
      state.allocations,
      form.employeeId,
      pct,
      form.startDate,
      form.endDate,
      modal === 'edit' ? editId : null
    );

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    const modifiedBy = user?.displayName || 'Unknown';

    if (modal === 'add') {
      dispatch({ type: 'ADD_ALLOCATION', payload: { ...form, percentage: pct, lastModifiedBy: modifiedBy } });
    } else {
      dispatch({ type: 'UPDATE_ALLOCATION', payload: { id: editId, ...form, percentage: pct, lastModifiedBy: modifiedBy } });
    }
    setModal(null);
  }

  function handleDelete(id) {
    if (!isAdmin) return;
    if (confirm('Delete this allocation?')) {
      dispatch({ type: 'DELETE_ALLOCATION', payload: id });
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Allocations</h1>
          {!isAdmin && (
            <div className="role-notice">
              <Lock size={13} /> You can add allocations. Only admins can edit or delete.
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Allocation
        </button>
      </div>

      <div className="filters-bar">
        <label className="filter-item">
          <span>Start Date</span>
          <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
        </label>
        <label className="filter-item">
          <span>End Date</span>
          <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
        </label>
        <label className="filter-item">
          <span>Employee</span>
          <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
            <option value="">All Employees</option>
            {state.employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </label>
        <label className="filter-item">
          <span>Cost Code</span>
          <select value={filterCostCode} onChange={e => setFilterCostCode(e.target.value)}>
            <option value="">All Cost Codes</option>
            {state.costCodes.map(cc => (
              <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
            ))}
          </select>
        </label>
        <label className="filter-item">
          <span>Type</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Approved">Approved</option>
            <option value="Forecasted">Forecasted</option>
          </select>
        </label>
        {(filterStartDate || filterEndDate || filterEmployee || filterCostCode || filterType) && (
          <button className="btn btn-sm" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterEmployee(''); setFilterCostCode(''); setFilterType(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredAllocations}
        searchPlaceholder="Search allocations..."
        actions={(row) => (
          <>
            {isAdmin ? (
              <>
                <button className="btn-icon" title="Edit" onClick={() => openEdit(row)}><Edit2 size={15} /></button>
                <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(row.id)}><Trash2 size={15} /></button>
              </>
            ) : (
              <span className="text-muted" title="Admin only"><Lock size={14} /></span>
            )}
          </>
        )}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Allocation' : 'Edit Allocation'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="form">
            {error && <div className="form-error"><AlertTriangle size={16} /> {error}</div>}
            <label>
              Employee *
              <select required value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">Select employee...</option>
                {state.employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </label>
            <label>
              Cost Code *
              <select required value={form.costCodeId} onChange={e => setForm({ ...form, costCodeId: e.target.value })}>
                <option value="">Select cost code...</option>
                {state.costCodes.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                ))}
              </select>
            </label>
            <label>
              Percentage (%) *
              <input
                type="number"
                required
                min="1"
                max="100"
                value={form.percentage}
                onChange={e => { setForm({ ...form, percentage: e.target.value }); setError(''); }}
              />
              {form.employeeId && form.startDate && (
                <span className="helper-text">
                  Currently allocated: {getEmployeeTotalAllocation(state.allocations, form.employeeId, form.startDate, modal === 'edit' ? editId : null)}%
                </span>
              )}
            </label>
            <div className="form-row">
              <label>
                Start Date *
                <input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </label>
              <label>
                End Date *
                <input type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </label>
            </div>
            <label>
              Allocation Type *
              <select required value={form.allocationType} onChange={e => setForm({ ...form, allocationType: e.target.value })}>
                <option value="Forecasted">Forecasted</option>
                <option value="Approved">Approved</option>
              </select>
            </label>
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
