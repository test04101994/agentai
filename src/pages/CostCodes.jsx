import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const emptyCostCode = { code: '', name: '', description: '', category: '' };

const categories = ['Development', 'R&D', 'Operations', 'Marketing', 'Support', 'Admin', 'Other'];

export default function CostCodes() {
  const { state, dispatch } = useAppContext();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyCostCode);
  const [editId, setEditId] = useState(null);

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category', render: (row) => <span className="badge badge-neutral">{row.category}</span> },
    {
      key: 'employees',
      label: 'Employees Assigned',
      render: (row) => {
        const count = new Set(state.allocations.filter(a => a.costCodeId === row.id).map(a => a.employeeId)).size;
        return count;
      },
    },
  ];

  function openAdd() { setForm(emptyCostCode); setModal('add'); }
  function openEdit(cc) {
    setForm({ code: cc.code, name: cc.name, description: cc.description, category: cc.category });
    setEditId(cc.id);
    setModal('edit');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (modal === 'add') {
      dispatch({ type: 'ADD_COST_CODE', payload: form });
    } else {
      dispatch({ type: 'UPDATE_COST_CODE', payload: { id: editId, ...form } });
    }
    setModal(null);
  }

  function handleDelete(id) {
    if (confirm('Delete this cost code and all related allocations?')) {
      dispatch({ type: 'DELETE_COST_CODE', payload: id });
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cost Codes</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Cost Code
        </button>
      </div>

      <DataTable
        columns={columns}
        data={state.costCodes}
        searchPlaceholder="Search cost codes..."
        actions={(row) => (
          <>
            <button className="btn-icon" title="Edit" onClick={() => openEdit(row)}><Edit2 size={15} /></button>
            <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(row.id)}><Trash2 size={15} /></button>
          </>
        )}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Cost Code' : 'Edit Cost Code'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="form">
            <label>
              Code *
              <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. PRJ-003" />
            </label>
            <label>
              Name *
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </label>
            <label>
              Category
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Select...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
