import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export function exportToExcel(employees, costCodes, allocations) {
  const wb = XLSX.utils.book_new();

  // Employees sheet
  const empData = employees.map(e => ({
    ID: e.id,
    Name: e.name,
    Email: e.email,
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

        // Parse Employees
        if (wb.SheetNames.includes('Employees')) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets['Employees']);
          result.employees = rows.map(r => ({
            id: r.ID || uuidv4(),
            name: r.Name || '',
            email: r.Email || '',
            department: r.Department || '',
            role: r.Role || '',
          }));
        }

        // Parse Cost Codes
        if (wb.SheetNames.includes('Cost Codes')) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets['Cost Codes']);
          result.costCodes = rows.map(r => ({
            id: r.ID || uuidv4(),
            code: r.Code || '',
            name: r.Name || '',
            description: r.Description || '',
            category: r.Category || '',
          }));
        }

        // Parse Allocations
        if (wb.SheetNames.includes('Allocations')) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets['Allocations']);
          result.allocations = rows.map(r => ({
            id: r.ID || uuidv4(),
            employeeId: r['Employee ID'] || '',
            costCodeId: r['Cost Code ID'] || '',
            percentage: Number(r['Percentage (%)']) || 0,
            startDate: r['Start Date'] || '',
            endDate: r['End Date'] || '',
          }));
        }

        resolve(result);
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
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
      'Start Date': a.startDate,
      'End Date': a.endDate,
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
