import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export function exportToExcel(employees, costCodes, allocations) {
  const wb = XLSX.utils.book_new();

  // Employees sheet
  const empData = employees.map(e => ({
    ID: e.id,
    Name: e.name,
    Email: e.email,
    Designation: e.designation || '',
    Team: e.team || '',
    Department: e.department,
    Role: e.role,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empData), 'Employees');

  // Cost Codes sheet
  const ccData = costCodes.map(c => ({
    ID: c.id,
    Code: c.code,
    Name: c.name,
    Description: c.description,
    Category: c.category,
    Approver: c.approver || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ccData), 'Cost Codes');

  // Allocations sheet (with resolved names)
  const empMap = Object.fromEntries(employees.map(e => [e.id, e.name]));
  const ccMap = Object.fromEntries(costCodes.map(c => [c.id, `${c.code} - ${c.name}`]));
  const allocData = allocations.map(a => ({
    ID: a.id,
    Employee: empMap[a.employeeId] || a.employeeId,
    'Employee ID': a.employeeId,
    'Cost Code': ccMap[a.costCodeId] || a.costCodeId,
    'Cost Code ID': a.costCodeId,
    'Percentage (%)': a.percentage,
    'Start Date': a.startDate,
    'End Date': a.endDate,
    'Allocation Type': a.allocationType || 'Forecasted',
    'Last Modified By': a.lastModifiedBy || '',
    'Last Modified At': a.lastModifiedAt || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocData), 'Allocations');

  XLSX.writeFile(wb, 'cost_allocation_data.xlsx');
}

export function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const result = {};
        const warnings = [];

        // Parse Employees
        if (wb.SheetNames.includes('Employees')) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets['Employees']);
          result.employees = [];
          rows.forEach((r, i) => {
            const rowNum = i + 2; // Excel row (1-indexed + header)
            if (!r.Name || String(r.Name).trim() === '') {
              warnings.push(`Employees row ${rowNum}: Missing required field "Name" — skipped.`);
              return;
            }
            result.employees.push({
              id: r.ID || uuidv4(),
              name: String(r.Name).trim(),
              email: r.Email ? String(r.Email).trim() : '',
              designation: r.Designation ? String(r.Designation).trim() : '',
              team: r.Team ? String(r.Team).trim() : '',
              department: r.Department ? String(r.Department).trim() : '',
              role: r.Role ? String(r.Role).trim() : '',
            });
          });
        }

        // Parse Cost Codes
        if (wb.SheetNames.includes('Cost Codes')) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets['Cost Codes']);
          result.costCodes = [];
          rows.forEach((r, i) => {
            const rowNum = i + 2;
            if (!r.Code || String(r.Code).trim() === '') {
              warnings.push(`Cost Codes row ${rowNum}: Missing required field "Code" — skipped.`);
              return;
            }
            if (!r.Name || String(r.Name).trim() === '') {
              warnings.push(`Cost Codes row ${rowNum}: Missing required field "Name" — skipped.`);
              return;
            }
            result.costCodes.push({
              id: r.ID || uuidv4(),
              code: String(r.Code).trim(),
              name: String(r.Name).trim(),
              description: r.Description ? String(r.Description).trim() : '',
              category: r.Category ? String(r.Category).trim() : '',
              approver: r.Approver ? String(r.Approver).trim() : '',
            });
          });
        }

        // Parse Allocations with validation
        if (wb.SheetNames.includes('Allocations')) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets['Allocations']);
          const validAllocations = [];
          const skippedRows = [];

          rows.forEach((r, i) => {
            const rowNum = i + 2;
            const rawPct = r['Percentage (%)'];
            const pct = Number(rawPct);
            const employeeId = r['Employee ID'] || '';
            const costCodeId = r['Cost Code ID'] || '';
            const startDate = r['Start Date'] ? String(r['Start Date']).trim() : '';
            const endDate = r['End Date'] ? String(r['End Date']).trim() : '';

            // Required field validation
            if (!employeeId) {
              warnings.push(`Allocations row ${rowNum}: Missing "Employee ID" — skipped.`);
              skippedRows.push(rowNum);
              return;
            }
            if (!costCodeId) {
              warnings.push(`Allocations row ${rowNum}: Missing "Cost Code ID" — skipped.`);
              skippedRows.push(rowNum);
              return;
            }

            // Percentage validation
            if (rawPct === undefined || rawPct === null || rawPct === '') {
              warnings.push(`Allocations row ${rowNum}: Missing percentage — skipped.`);
              skippedRows.push(rowNum);
              return;
            }
            if (isNaN(pct)) {
              warnings.push(`Allocations row ${rowNum}: Non-numeric percentage "${rawPct}" — skipped.`);
              skippedRows.push(rowNum);
              return;
            }
            if (pct <= 0 || pct > 100) {
              warnings.push(`Allocations row ${rowNum}: Percentage ${pct}% out of range (must be 1–100) — skipped.`);
              skippedRows.push(rowNum);
              return;
            }

            // Date validation
            if (!startDate || !endDate) {
              warnings.push(`Allocations row ${rowNum}: Missing start or end date — skipped.`);
              skippedRows.push(rowNum);
              return;
            }
            if (startDate > endDate) {
              warnings.push(`Allocations row ${rowNum}: Start date (${startDate}) is after end date (${endDate}) — skipped.`);
              skippedRows.push(rowNum);
              return;
            }

            validAllocations.push({
              id: r.ID || uuidv4(),
              employeeId,
              costCodeId,
              percentage: pct,
              startDate,
              endDate,
              lastModifiedBy: r['Last Modified By'] ? String(r['Last Modified By']).trim() : '',
              lastModifiedAt: r['Last Modified At'] ? String(r['Last Modified At']).trim() : '',
              allocationType: r['Allocation Type'] ? String(r['Allocation Type']).trim() : 'Forecasted',
            });
          });

          // Check 100% cap across overlapping allocations within the imported set
          const overAllocWarnings = [];
          const empGroups = {};
          validAllocations.forEach(a => {
            if (!empGroups[a.employeeId]) empGroups[a.employeeId] = [];
            empGroups[a.employeeId].push(a);
          });

          for (const [empId, allocs] of Object.entries(empGroups)) {
            // Collect all critical dates
            const dates = new Set();
            allocs.forEach(a => { dates.add(a.startDate); dates.add(a.endDate); });
            for (const date of dates) {
              const total = allocs
                .filter(a => a.startDate <= date && a.endDate >= date)
                .reduce((sum, a) => sum + a.percentage, 0);
              if (total > 100) {
                overAllocWarnings.push(`Employee "${empId}" exceeds 100% allocation (${total}%) on ${date}.`);
                break; // One warning per employee is enough
              }
            }
          }

          if (overAllocWarnings.length > 0) {
            overAllocWarnings.forEach(w => warnings.push(w));
          }

          result.allocations = validAllocations;
        }

        result.warnings = warnings;
        resolve(result);
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportDashboardReport(employees, costCodes, allocations, startDate, endDate) {
  const wb = XLSX.utils.book_new();
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const ccMap = Object.fromEntries(costCodes.map(c => [c.id, c]));

  // Sheet 1: All allocations in range
  const allocData = allocations.map(a => {
    const emp = empMap[a.employeeId];
    const cc = ccMap[a.costCodeId];
    return {
      'Employee Name': emp?.name || 'Unknown',
      Department: emp?.department || '',
      'Cost Code': cc?.code || 'Unknown',
      'Cost Code Name': cc?.name || '',
      Category: cc?.category || '',
      Approver: cc?.approver || '',
      'Allocation %': a.percentage,
      'Allocation Type': a.allocationType || 'Forecasted',
      'Start Date': a.startDate,
      'End Date': a.endDate,
      'Last Modified By': a.lastModifiedBy || '',
      'Last Modified At': a.lastModifiedAt || '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocData), 'Allocations');

  // Sheet 2: Employee summary
  const empSummary = {};
  allocations.forEach(a => {
    const emp = empMap[a.employeeId];
    const key = a.employeeId;
    if (!empSummary[key]) {
      empSummary[key] = { 'Employee': emp?.name || 'Unknown', 'Designation': emp?.designation || '', 'Team': emp?.team || '', 'Department': emp?.department || '', 'Approved %': 0, 'Forecasted %': 0, 'Total %': 0, 'Cost Codes': new Set() };
    }
    const pct = a.percentage;
    if (a.allocationType === 'Approved') empSummary[key]['Approved %'] += pct;
    else empSummary[key]['Forecasted %'] += pct;
    empSummary[key]['Total %'] += pct;
    const cc = ccMap[a.costCodeId];
    empSummary[key]['Cost Codes'].add(cc?.code || '');
  });
  const empRows = Object.values(empSummary).map(e => ({ ...e, 'Cost Codes': [...e['Cost Codes']].join(', ') }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), 'Employee Summary');

  // Sheet 3: Cost code summary
  const ccSummary = {};
  allocations.forEach(a => {
    const cc = ccMap[a.costCodeId];
    const key = a.costCodeId;
    if (!ccSummary[key]) {
      ccSummary[key] = { 'Cost Code': cc?.code || '', 'Name': cc?.name || '', 'Category': cc?.category || '', 'Approver': cc?.approver || '', 'Employee Count': new Set(), 'Total %': 0 };
    }
    ccSummary[key]['Employee Count'].add(a.employeeId);
    ccSummary[key]['Total %'] += a.percentage;
  });
  const ccRows = Object.values(ccSummary).map(c => ({ ...c, 'Employee Count': c['Employee Count'].size }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ccRows), 'Cost Code Summary');

  const filename = `dashboard_report_${startDate}_to_${endDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportAllocationsReport(employees, costCodes, allocations, filterDate) {
  const wb = XLSX.utils.book_new();
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const ccMap = Object.fromEntries(costCodes.map(c => [c.id, c]));

  const filtered = filterDate
    ? allocations.filter(a => a.startDate <= filterDate && a.endDate >= filterDate)
    : allocations;

  const reportData = filtered.map(a => {
    const emp = empMap[a.employeeId];
    const cc = ccMap[a.costCodeId];
    return {
      'Employee Name': emp?.name || 'Unknown',
      Department: emp?.department || '',
      'Cost Code': cc?.code || 'Unknown',
      'Cost Code Name': cc?.name || '',
      Category: cc?.category || '',
      'Allocation %': a.percentage,
      'Allocation Type': a.allocationType || 'Forecasted',
      'Start Date': a.startDate,
      'End Date': a.endDate,
      'Last Modified By': a.lastModifiedBy || '',
      'Last Modified At': a.lastModifiedAt || '',
    };
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData), 'Allocation Report');

  // Summary by cost code
  const summary = {};
  filtered.forEach(a => {
    const cc = ccMap[a.costCodeId];
    const key = cc?.code || a.costCodeId;
    if (!summary[key]) {
      summary[key] = { 'Cost Code': key, 'Cost Code Name': cc?.name || '', 'Total Allocation %': 0, 'Employee Count': 0 };
    }
    summary[key]['Total Allocation %'] += a.percentage;
    summary[key]['Employee Count'] += 1;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.values(summary)), 'Summary by Cost Code');

  const filename = filterDate ? `allocation_report_${filterDate}.xlsx` : 'allocation_report_all.xlsx';
  XLSX.writeFile(wb, filename);
}
