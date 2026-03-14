import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { exportDashboardReport } from '../utils/excelUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
} from 'recharts';
import { Users, Hash, GitBranch, AlertTriangle, Calendar, Download, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#f97316'];

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Generate monthly date points between two dates
function getMonthlyPoints(startDate, endDate) {
  const points = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    points.push(d.toISOString().slice(0, 10));
    d.setMonth(d.getMonth() + 1);
  }
  return points;
}

export default function Dashboard() {
  const { state } = useAppContext();
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');

  const empMap = useMemo(() => Object.fromEntries(state.employees.map(e => [e.id, e])), [state.employees]);
  const ccMap = useMemo(() => Object.fromEntries(state.costCodes.map(c => [c.id, c])), [state.costCodes]);

  // Allocations that overlap with the selected date range
  const activeAllocations = useMemo(() =>
    state.allocations.filter(a => a.startDate <= endDate && a.endDate >= startDate),
    [state.allocations, startDate, endDate]
  );

  // Use the midpoint of the range for "snapshot" calculations
  const midDate = useMemo(() => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    return new Date((s + e) / 2).toISOString().slice(0, 10);
  }, [startDate, endDate]);

  // Employee allocation summaries
  const employeeSummaries = useMemo(() => {
    return state.employees.map(emp => {
      const empAllocs = activeAllocations.filter(a => a.employeeId === emp.id);
      // For total, use allocations active at midpoint
      const midAllocs = empAllocs.filter(a => a.startDate <= midDate && a.endDate >= midDate);
      const total = midAllocs.reduce((s, a) => s + a.percentage, 0);
      return {
        ...emp,
        allocations: empAllocs.map(a => ({ ...a, costCode: ccMap[a.costCodeId] })),
        midAllocations: midAllocs.map(a => ({ ...a, costCode: ccMap[a.costCodeId] })),
        totalPercentage: total,
        unallocated: Math.max(0, 100 - total),
        approvedPct: midAllocs.filter(a => a.allocationType === 'Approved').reduce((s, a) => s + a.percentage, 0),
        forecastedPct: midAllocs.filter(a => a.allocationType === 'Forecasted').reduce((s, a) => s + a.percentage, 0),
      };
    }).sort((a, b) => b.totalPercentage - a.totalPercentage);
  }, [state.employees, activeAllocations, ccMap, midDate]);

  // Cost code breakdown
  const costCodeBreakdown = useMemo(() => {
    return state.costCodes.map(cc => {
      const ccAllocs = activeAllocations.filter(a => a.costCodeId === cc.id);
      const midAllocs = ccAllocs.filter(a => a.startDate <= midDate && a.endDate >= midDate);
      return {
        id: cc.id,
        code: cc.code,
        name: cc.name,
        category: cc.category,
        approver: cc.approver,
        employeeCount: new Set(ccAllocs.map(a => a.employeeId)).size,
        totalPercentage: midAllocs.reduce((s, a) => s + a.percentage, 0),
        employees: midAllocs.map(a => ({
          name: empMap[a.employeeId]?.name || 'Unknown',
          percentage: a.percentage,
          type: a.allocationType,
        })),
      };
    }).filter(cc => cc.employeeCount > 0);
  }, [state.costCodes, activeAllocations, empMap, midDate]);

  // ──────── CHART DATA ────────

  // 1. Employee allocation bar chart (stacked: approved vs forecasted)
  const employeeStackedData = useMemo(() =>
    employeeSummaries
      .filter(e => e.totalPercentage > 0)
      .map(e => ({
        name: e.name.split(' ')[0],
        approved: e.approvedPct,
        forecasted: e.forecastedPct,
        unallocated: e.unallocated,
      })),
    [employeeSummaries]
  );

  // 2. Pie chart: allocation by category
  const categoryPieData = useMemo(() => {
    const catMap = {};
    const midAllocs = activeAllocations.filter(a => a.startDate <= midDate && a.endDate >= midDate);
    midAllocs.forEach(a => {
      const cc = ccMap[a.costCodeId];
      const cat = cc?.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + a.percentage;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [activeAllocations, ccMap, midDate]);

  // 3. Monthly trend line chart - employee count and total allocation over time
  const trendData = useMemo(() => {
    const months = getMonthlyPoints(startDate, endDate);
    return months.map(month => {
      const monthAllocs = state.allocations.filter(a => a.startDate <= month && a.endDate >= month);
      const activeEmps = new Set(monthAllocs.map(a => a.employeeId)).size;
      const activeCodes = new Set(monthAllocs.map(a => a.costCodeId)).size;
      const totalPct = monthAllocs.reduce((s, a) => s + a.percentage, 0);
      const avgUtil = activeEmps > 0 ? Math.round(totalPct / activeEmps) : 0;
      return {
        month: new Date(month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        employees: activeEmps,
        costCodes: activeCodes,
        avgUtilization: avgUtil,
      };
    });
  }, [state.allocations, startDate, endDate]);

  // 4. Department radar chart
  const departmentRadarData = useMemo(() => {
    const deptMap = {};
    employeeSummaries.forEach(emp => {
      const dept = emp.department || 'Other';
      if (!deptMap[dept]) deptMap[dept] = { department: dept, allocated: 0, count: 0 };
      deptMap[dept].allocated += emp.totalPercentage;
      deptMap[dept].count += 1;
    });
    return Object.values(deptMap).map(d => ({
      department: d.department,
      avgAllocation: d.count > 0 ? Math.round(d.allocated / d.count) : 0,
      headcount: d.count,
    }));
  }, [employeeSummaries]);

  // 7. Team allocation bar chart
  const teamBarData = useMemo(() => {
    const teamMap = {};
    employeeSummaries.forEach(emp => {
      const team = emp.team || 'Unassigned';
      if (!teamMap[team]) teamMap[team] = { team, approved: 0, forecasted: 0, headcount: 0 };
      teamMap[team].approved += emp.approvedPct;
      teamMap[team].forecasted += emp.forecastedPct;
      teamMap[team].headcount += 1;
    });
    return Object.values(teamMap)
      .map(t => ({ ...t, avgAllocation: t.headcount > 0 ? Math.round((t.approved + t.forecasted) / t.headcount) : 0 }))
      .sort((a, b) => b.avgAllocation - a.avgAllocation);
  }, [employeeSummaries]);

  // 8. Designation distribution pie
  const designationPieData = useMemo(() => {
    const desMap = {};
    employeeSummaries.filter(e => e.totalPercentage > 0).forEach(emp => {
      const des = emp.designation || 'Not Specified';
      desMap[des] = (desMap[des] || 0) + 1;
    });
    return Object.entries(desMap).map(([name, value]) => ({ name, value }));
  }, [employeeSummaries]);

  // 5. Approved vs Forecasted donut
  const typeDonutData = useMemo(() => {
    const midAllocs = activeAllocations.filter(a => a.startDate <= midDate && a.endDate >= midDate);
    const approved = midAllocs.filter(a => a.allocationType === 'Approved').reduce((s, a) => s + a.percentage, 0);
    const forecasted = midAllocs.filter(a => a.allocationType === 'Forecasted').reduce((s, a) => s + a.percentage, 0);
    return [
      { name: 'Approved', value: approved },
      { name: 'Forecasted', value: forecasted },
    ].filter(d => d.value > 0);
  }, [activeAllocations, midDate]);

  // 6. Treemap: cost code allocation share
  const treemapData = useMemo(() => {
    return costCodeBreakdown.map((cc, i) => ({
      name: `${cc.code}\n${cc.totalPercentage}%`,
      size: cc.totalPercentage || 1,
      fill: COLORS[i % COLORS.length],
    }));
  }, [costCodeBreakdown]);

  // KPI Stats
  const stats = useMemo(() => {
    const activeEmps = employeeSummaries.filter(e => e.totalPercentage > 0).length;
    const fullyAllocated = employeeSummaries.filter(e => e.totalPercentage === 100).length;
    const overAllocated = employeeSummaries.filter(e => e.totalPercentage > 100).length;
    const approvedCount = activeAllocations.filter(a => a.allocationType === 'Approved').length;
    const forecastedCount = activeAllocations.filter(a => a.allocationType === 'Forecasted').length;
    return {
      totalEmployees: state.employees.length,
      activeEmployees: activeEmps,
      totalCostCodes: state.costCodes.length,
      activeCostCodes: costCodeBreakdown.length,
      totalAllocations: activeAllocations.length,
      fullyAllocated,
      overAllocated,
      approvedCount,
      forecastedCount,
    };
  }, [state.employees, state.costCodes, employeeSummaries, costCodeBreakdown, activeAllocations]);

  function handleExport() {
    exportDashboardReport(state.employees, state.costCodes, activeAllocations, startDate, endDate);
  }

  // Custom treemap content
  const TreemapContent = ({ x, y, width, height, name, fill }) => {
    if (width < 40 || height < 30) return null;
    const lines = (name || '').split('\n');
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} rx={4} />
        {lines.map((line, i) => (
          <text key={i} x={x + width / 2} y={y + height / 2 + (i - (lines.length - 1) / 2) * 14} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={i === 0 ? 600 : 400} fill="#fff">
            {line}
          </text>
        ))}
      </g>
    );
  };

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          <div className="date-range-picker">
            <Calendar size={16} />
            <label>
              From
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </label>
            <span className="range-sep">-</span>
            <label>
              To
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </label>
          </div>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      <div className="date-range-label">
        Showing allocations from <strong>{formatDate(startDate)}</strong> to <strong>{formatDate(endDate)}</strong>
        &nbsp;({activeAllocations.length} allocations)
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
            <div className="kpi-label">Allocations in Range</div>
          </div>
        </div>
        <div className="kpi-card success">
          <CheckCircle size={22} />
          <div>
            <div className="kpi-value">{stats.approvedCount}</div>
            <div className="kpi-label">Approved</div>
          </div>
        </div>
        <div className="kpi-card" style={{ color: 'var(--warning)' }}>
          <Clock size={22} />
          <div>
            <div className="kpi-value">{stats.forecastedCount}</div>
            <div className="kpi-label">Forecasted</div>
          </div>
        </div>
        <div className="kpi-card success">
          <TrendingUp size={22} />
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

      {/* Row 1: Employee Stacked Bar + Category Pie */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Employee Allocation (Approved vs Forecasted)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employeeStackedData} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" width={55} />
              <Tooltip formatter={v => `${v}%`} />
              <Legend />
              <Bar dataKey="approved" name="Approved" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="forecasted" name="Forecasted" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="unallocated" name="Unallocated" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
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

      {/* Row 2: Monthly Trend + Approved vs Forecasted Donut */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Monthly Trend (Employees, Cost Codes & Avg Utilization)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="employees" name="Employees" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="left" type="monotone" dataKey="costCodes" name="Cost Codes" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="avgUtilization" name="Avg Utilization %" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Approved vs Forecasted Split</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={typeDonutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({ name, value }) => `${name}: ${value}%`}>
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip formatter={v => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Department Radar + Cost Code Treemap */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Department Avg Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={departmentRadarData} cx="50%" cy="50%" outerRadius={100}>
              <PolarGrid />
              <PolarAngleAxis dataKey="department" fontSize={12} />
              <PolarRadiusAxis domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={10} />
              <Radar name="Avg Allocation" dataKey="avgAllocation" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
              <Tooltip formatter={v => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Cost Code Allocation Share</h3>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap data={treemapData} dataKey="size" nameKey="name" content={<TreemapContent />} />
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Team Allocation + Designation Distribution */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Allocation by Team (Avg per Employee)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamBarData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="team" fontSize={11} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip formatter={(v, name) => name === 'headcount' ? v : `${v}%`} />
              <Legend />
              <Bar dataKey="avgAllocation" name="Avg Allocation %" fill="#1a56db" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Active Employees by Designation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={designationPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                {designationPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Employee Table */}
      <div className="detail-section">
        <h3>Employee Allocation Details — {formatDate(startDate)} to {formatDate(endDate)}</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Designation</th>
                <th>Team</th>
                <th>Department</th>
                <th>Cost Code Allocations</th>
                <th>Approved %</th>
                <th>Forecasted %</th>
                <th>Total %</th>
                <th>Status</th>
                <th>Last Modified By</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummaries.map(emp => {
                const latestAlloc = emp.midAllocations.length > 0
                  ? emp.midAllocations.reduce((latest, a) => (!latest.lastModifiedAt || (a.lastModifiedAt && a.lastModifiedAt > latest.lastModifiedAt)) ? a : latest, emp.midAllocations[0])
                  : null;
                return (
                  <tr key={emp.id} className={emp.totalPercentage > 100 ? 'row-danger' : ''}>
                    <td><strong>{emp.name}</strong></td>
                    <td>{emp.designation || <span className="text-muted">-</span>}</td>
                    <td>{emp.team || <span className="text-muted">-</span>}</td>
                    <td>{emp.department}</td>
                    <td>
                      <div className="alloc-chips">
                        {emp.midAllocations.length === 0 ? (
                          <span className="text-muted">No allocations</span>
                        ) : (
                          emp.midAllocations.map((a, i) => (
                            <span key={i} className={`alloc-chip ${a.allocationType === 'Approved' ? 'chip-approved' : 'chip-forecasted'}`}>
                              {a.costCode?.code || '?'}: {a.percentage}%
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td><span className="text-success">{emp.approvedPct}%</span></td>
                    <td><span className="text-warning">{emp.forecastedPct}%</span></td>
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
                          <span className="modified-at">{formatTimestamp(latestAlloc.lastModifiedAt)}</span>
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
        <h3>Cost Code Breakdown — {formatDate(startDate)} to {formatDate(endDate)}</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Approver</th>
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
                  <td>{cc.approver || <span className="text-muted">-</span>}</td>
                  <td>
                    <div className="alloc-chips">
                      {cc.employees.map((e, j) => (
                        <span key={j} className={`alloc-chip ${e.type === 'Approved' ? 'chip-approved' : 'chip-forecasted'}`}>
                          {e.name}: {e.percentage}%
                        </span>
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
