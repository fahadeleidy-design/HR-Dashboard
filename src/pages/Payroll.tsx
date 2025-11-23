import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plus, DollarSign, Calculator, Download } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import * as XLSX from 'xlsx';

interface PayrollRecord {
  id: string;
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transportation_allowance: number;
  other_allowances: number;
  gross_salary: number;
  gosi_employee: number;
  gosi_employer: number;
  other_deductions: number;
  net_salary: number;
  effective_from: string;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
    is_saudi: boolean;
    iqama_number: string;
  };
}

export function Payroll() {
  const { currentCompany } = useCompany();
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  const [salaryForm, setSalaryForm] = useState({
    basic_salary: 0,
    housing_allowance: 0,
    transportation_allowance: 0,
    other_allowances: 0,
  });

  useEffect(() => {
    if (currentCompany) {
      fetchPayrollRecords();
      fetchEmployees();
    }
  }, [currentCompany]);

  const { sortedData, sortConfig, requestSort } = useSortableData(payrollRecords);

  const fetchPayrollRecords = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en, is_saudi, iqama_number)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayrollRecords(data || []);
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en, is_saudi, iqama_number')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('employee_number');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const calculateGOSI = (basicSalary: number, housingAllowance: number, isSaudi: boolean) => {
    const gosiBase = Math.min(basicSalary + housingAllowance, 45000);

    return {
      employee: isSaudi ? gosiBase * 0.10 : gosiBase * 0.02,
      employer: isSaudi ? gosiBase * 0.12 : gosiBase * 0.02,
    };
  };

  const handleCalculate = async () => {
    if (!selectedEmployee || !currentCompany) return;

    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: existingPayroll } = await supabase
      .from('payroll')
      .select('id')
      .eq('employee_id', selectedEmployee)
      .gte('effective_from', `${currentMonth}-01`)
      .lt('effective_from', `${currentMonth}-32`)
      .maybeSingle();

    if (existingPayroll) {
      alert(`Payroll already exists for ${employee.first_name_en} ${employee.last_name_en} (${employee.iqama_number}) for the current month.`);
      return;
    }

    const grossSalary =
      salaryForm.basic_salary +
      salaryForm.housing_allowance +
      salaryForm.transportation_allowance +
      salaryForm.other_allowances;

    const gosi = calculateGOSI(salaryForm.basic_salary, salaryForm.housing_allowance, employee.is_saudi);
    const totalDeductions = gosi.employee;
    const netSalary = grossSalary - totalDeductions;

    try {
      const { error } = await supabase.from('payroll').insert([{
        company_id: currentCompany.id,
        employee_id: selectedEmployee,
        basic_salary: salaryForm.basic_salary,
        housing_allowance: salaryForm.housing_allowance,
        transportation_allowance: salaryForm.transportation_allowance,
        other_allowances: salaryForm.other_allowances,
        gross_salary: grossSalary,
        gosi_employee: gosi.employee,
        gosi_employer: gosi.employer,
        other_deductions: 0,
        net_salary: netSalary,
        effective_from: new Date().toISOString().split('T')[0],
      }]);

      if (error) throw error;

      setShowCalculator(false);
      setSalaryForm({
        basic_salary: 0,
        housing_allowance: 0,
        transportation_allowance: 0,
        other_allowances: 0,
      });
      setSelectedEmployee('');
      fetchPayrollRecords();
    } catch (error: any) {
      console.error('Error creating payroll:', error);
      alert(error.message || 'Failed to create payroll record');
    }
  };

  const handleExport = () => {
    const exportData = payrollRecords.map((record) => ({
      'Employee Number': record.employee.employee_number,
      'IQAMA Number': record.employee.iqama_number,
      'Employee Name': `${record.employee.first_name_en} ${record.employee.last_name_en}`,
      'Basic Salary': record.basic_salary,
      'Housing Allowance': record.housing_allowance,
      'Transportation Allowance': record.transportation_allowance,
      'Other Allowances': record.other_allowances,
      'Gross Salary': record.gross_salary,
      'GOSI Employee': record.gosi_employee,
      'GOSI Employer': record.gosi_employer,
      'Other Deductions': record.other_deductions,
      'Net Salary': record.net_salary,
      'Effective From': record.effective_from,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll_${currentCompany?.name_en}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const totalGrossSalary = payrollRecords.reduce((sum, record) => sum + (Number(record.gross_salary) || 0), 0);
  const totalNetSalary = payrollRecords.reduce((sum, record) => sum + (Number(record.net_salary) || 0), 0);
  const totalGOSI = payrollRecords.reduce((sum, record) =>
    sum + (Number(record.gosi_employee) || 0) + (Number(record.gosi_employer) || 0), 0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Manage employee salaries and GOSI calculations</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowCalculator(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Payroll</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Gross Salary</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                SAR {totalGrossSalary.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Net Salary</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                SAR {totalNetSalary.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total GOSI</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                SAR {totalGOSI.toLocaleString()}
              </p>
            </div>
            <Calculator className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label="Employee"
                  sortKey="employee.first_name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Basic Salary"
                  sortKey="basic_salary"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allowances
                </th>
                <SortableTableHeader
                  label="Gross Salary"
                  sortKey="gross_salary"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GOSI
                </th>
                <SortableTableHeader
                  label="Net Salary"
                  sortKey="net_salary"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Effective Date"
                  sortKey="effective_from"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No payroll records found. Click "Add Payroll" to get started.
                  </td>
                </tr>
              ) : (
                sortedData.map((record) => {
                  const totalGosi = (Number(record.gosi_employee) || 0) + (Number(record.gosi_employer) || 0);

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.employee.first_name_en} {record.employee.last_name_en}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.employee.employee_number} | {record.employee.iqama_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {Number(record.basic_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {(Number(record.housing_allowance || 0) + Number(record.transportation_allowance || 0) + Number(record.other_allowances || 0)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        SAR {Number(record.gross_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {totalGosi.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        SAR {Number(record.net_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.effective_from ? new Date(record.effective_from).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCalculator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Calculate Salary & GOSI</h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Choose an employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_number} - {emp.first_name_en} {emp.last_name_en} ({emp.iqama_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Basic Salary (SAR) *
                  </label>
                  <input
                    type="number"
                    value={salaryForm.basic_salary}
                    onChange={(e) => setSalaryForm({...salaryForm, basic_salary: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Housing Allowance (SAR)
                  </label>
                  <input
                    type="number"
                    value={salaryForm.housing_allowance}
                    onChange={(e) => setSalaryForm({...salaryForm, housing_allowance: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transportation Allowance (SAR)
                  </label>
                  <input
                    type="number"
                    value={salaryForm.transportation_allowance}
                    onChange={(e) => setSalaryForm({...salaryForm, transportation_allowance: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Allowances (SAR)
                  </label>
                  <input
                    type="number"
                    value={salaryForm.other_allowances}
                    onChange={(e) => setSalaryForm({...salaryForm, other_allowances: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {selectedEmployee && employees.find(e => e.id === selectedEmployee) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">GOSI Calculation</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    {(() => {
                      const emp = employees.find(e => e.id === selectedEmployee);
                      const gross = salaryForm.basic_salary + salaryForm.housing_allowance + salaryForm.transportation_allowance + salaryForm.other_allowances;
                      const gosi = calculateGOSI(gross, emp?.is_saudi || false);
                      return (
                        <>
                          <p>Gross Salary: SAR {gross.toLocaleString()}</p>
                          <p>Employee GOSI (10%): SAR {gosi.employee.toLocaleString()}</p>
                          <p>Employer GOSI Retirement (12%): SAR {gosi.employerRetirement.toLocaleString()}</p>
                          <p>Employer GOSI Hazards (2%): SAR {gosi.employerHazards.toLocaleString()}</p>
                          <p className="font-bold pt-2 border-t border-blue-300 mt-2">
                            Net Salary: SAR {(gross - gosi.employee).toLocaleString()}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowCalculator(false);
                  setSalaryForm({ basic_salary: 0, housing_allowance: 0, transportation_allowance: 0, other_allowances: 0 });
                  setSelectedEmployee('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCalculate}
                disabled={!selectedEmployee || salaryForm.basic_salary <= 0}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Payroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
