import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { getEmployeeTotalAllocation } from '../utils/validationUtils';
import StatusBadge from '../components/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Hash, GitBranch, AlertTriangle, Calendar } from 'lucide-react';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  const { state } = useAppContext();
  const [viewDate, setViewDate] = useState(new Date().toISOString().slice(0, 10));

  const empMap = useMemo(() => Object.fromEntries(state.employees.map(e => [e.id, e])), [state.employees]);
  const ccMap = useMemo(() => Object.fromEntries(state.costCodes.map(c => [c.id, c])), [state.costCodes]);

  // Active allocations for the selected date
  const activeAllocations = useMemo(() =>
    state.allocations.filter(a => a.startDate <= viewDate && a.endDate >= viewDate),
    [state.allocations, viewDate]
  );

  // Employee allocation summaries
  const employeeSummaries = useMemo(() => {
    return state.employees.map(emp => {
      const empAllocs = activeAllocations.filter(a => a.employeeId === emp.id);
      const total = empAllocs.reduce((s, a) => s + a.percentage, 0);
      return {
        ...emp,
        allocations: empAllocs.map(a => ({
          ...a,
          costCode: ccMap[a.costCodeId],
        })),
        totalPercentage: total,
        unallocated: Math.max(0, 100 - total),
      };
    }).sort((a, b) => b.totalPercentage - a.totalPercentage);
  }, [state.employees, activeAllocations, ccMap]);

  // Cost code breakdown
  const costCodeBreakdown = useMemo(() => {
    return state.costCodes.map(cc => {
      const ccAllocs = activeAllocations.filter(a => a.costCodeId === cc.id);
      return {
        code: cc.code,
        name: cc.name,
        category: cc.category,
        employeeCount: new Set(ccAllocs.map(a => a.employeeId)).size,
        totalPercentage: ccAllocs.reduce((s, a) => s + a.percentage, 0),
        employees: ccAllocs.map(a => ({
          name: empMap[a.employeeId]?.name || 'Unknown',
          percentage: a.percentage,
        })),
      };
    }).filter(cc => cc.employeeCount > 0);
  }, [state.costCodes, activeAllocations, empMap]);

  // Chart data: employees by allocation
  const employeeChartData = useMemo(() =>
    employeeSummaries
      .filter(e => e.totalPercentage > 0)
      .map(e => ({ name: e.name.split(' ')[0], total: e.totalPercentage, unallocated: e.unallocated })),
    [employeeSummaries]
  );

  // Pie chart data: allocation by category
  const categoryPieData = useMemo(() => {
    const catMap = {};
    activeAllocations.forEach(a => {
      const cc = ccMap[a.costCodeId];
      const cat = cc?.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + a.percentage;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [activeAllocations, ccMap]);

  // Stats
  const stats = useMemo(() => {
    const activeEmps = employeeSummaries.filter(e => e.totalPercentage > 0).length;
    const fullyAllocated = employeeSummaries.filter(e => e.totalPercentage === 100).length;
    const overAllocated = employeeSummaries.filter(e => e.totalPercentage > 100).length;
    return {
      totalEmployees: state.employees.length,
      activeEmployees: activeEmps,
      totalCostCodes: state.costCodes.length,
      activeCostCodes: costCodeBreakdown.length,
      totalAllocations: activeAllocations.length,
      fullyAllocated,
      overAllocated,
    };
  }, [state.employees, state.costCodes, employeeSummaries, costCodeBreakdown, activeAllocations]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="date-picker-wrapper">
          <Calendar size={16} />
          <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <Users size={22} />
          <div>
            <div className="kpi-value">{stats.activeEmployees}<small>/{stats.totalEmployees}</small></div>
            <div className="kpi-label">Active Employees</div>
          </div>
        </div>
        <div className="kpi-card">
          <Hash size={22} />
          <div>
            <div className="kpi-value">{stats.activeCostCodes}<small>/{stats.totalCostCodes}</small></div>
            <div className="kpi-label">Active Cost Codes</div>
          </div>
        </div>
        <div className="kpi-card">
          <GitBranch size={22} />
          <div>
            <div className="kpi-value">{stats.totalAllocations}</div>
            <div className="kpi-label">Active Allocations</div>
          </div>
        </div>
        <div className="kpi-card success">
          <div>
            <div className="kpi-value">{stats.fullyAllocated}</div>
            <div className="kpi-label">Fully Allocated (100%)</div>
          </div>
        </div>
        {stats.overAllocated > 0 && (
          <div className="kpi-card danger">
            <AlertTriangle size={22} />
            <div>
              <div className="kpi-value">{stats.overAllocated}</div>
              <div className="kpi-label">Over-Allocated (&gt;100%)</div>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Employee Allocation Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employeeChartData} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" width={55} />
              <Tooltip formatter={v => `${v}%`} />
              <Legend />
              <Bar dataKey="total" name="Allocated" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              <Bar dataKey="unallocated" name="Unallocated" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Allocation by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}%`}>
                {categoryPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Employee Table */}
      <div className="detail-section">
        <h3>Employee Allocation Details — {viewDate}</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Cost Code Allocations</th>
                <th>Total %</th>
                <th>Status</th>
                <th>Last Modified By</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummaries.map(emp => {
                const latestAlloc = emp.allocations.length > 0
                  ? emp.allocations.reduce((latest, a) => (!latest.lastModifiedAt || (a.lastModifiedAt && a.lastModifiedAt > latest.lastModifiedAt)) ? a : latest, emp.allocations[0])
                  : null;
                return (
                  <tr key={emp.id} className={emp.totalPercentage > 100 ? 'row-danger' : ''}>
                    <td><strong>{emp.name}</strong></td>
                    <td>{emp.department}</td>
                    <td>
                      <div className="alloc-chips">
                        {emp.allocations.length === 0 ? (
                          <span className="text-muted">No allocations</span>
                        ) : (
                          emp.allocations.map((a, i) => (
                            <span key={i} className="alloc-chip">
                              {a.costCode?.code || '?'}: {a.percentage}%
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td><StatusBadge percentage={emp.totalPercentage} /></td>
                    <td>
                      {emp.totalPercentage === 0 && <span className="text-muted">Unassigned</span>}
                      {emp.totalPercentage > 0 && emp.totalPercentage < 100 && <span className="text-warning">Partial</span>}
                      {emp.totalPercentage === 100 && <span className="text-success">Full</span>}
                      {emp.totalPercentage > 100 && <span className="text-danger">Over-allocated</span>}
                    </td>
                    <td>
                      {latestAlloc ? (
                        <div className="modified-info">
                          <span className="modified-by">{latestAlloc.lastModifiedBy || '-'}</span>
                          <span className="modified-at">{latestAlloc.lastModifiedAt ? new Date(latestAlloc.lastModifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(latestAlloc.lastModifiedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      ) : <span className="text-muted">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Code Breakdown */}
      <div className="detail-section">
        <h3>Cost Code Breakdown — {viewDate}</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Employees</th>
                <th>Total Allocation %</th>
              </tr>
            </thead>
            <tbody>
              {costCodeBreakdown.map((cc, i) => (
                <tr key={i}>
                  <td><strong>{cc.code}</strong></td>
                  <td>{cc.name}</td>
                  <td><span className="badge badge-neutral">{cc.category}</span></td>
                  <td>
                    <div className="alloc-chips">
                      {cc.employees.map((e, j) => (
                        <span key={j} className="alloc-chip">{e.name}: {e.percentage}%</span>
                      ))}
                    </div>
                  </td>
                  <td>{cc.totalPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
