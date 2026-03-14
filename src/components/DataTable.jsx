import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

export default function DataTable({ columns, data, actions, searchPlaceholder = 'Search...' }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = col.render ? col.render(row) : row[col.key];
        return String(val ?? '').toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortCol] ?? '';
      const bVal = b[sortCol] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  function handleSort(key) {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="data-table-wrapper">
      <div className="table-search">
        <Search size={16} />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => col.sortable !== false && handleSort(col.key)} className={col.sortable !== false ? 'sortable' : ''}>
                  <span>{col.label}</span>
                  {sortCol === col.key && (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </th>
              ))}
              {actions && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="empty-row">No data found</td></tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={row.id || i}>
                  {columns.map(col => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                  {actions && <td className="actions-cell">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        {sorted.length} of {data.length} records
      </div>
    </div>
  );
}
