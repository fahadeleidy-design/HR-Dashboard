import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Shield, TrendingUp, Download, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';

interface NitaqatMetric {
  id: string;
  calculation_date: string;
  total_employees: number;
  saudi_employees: number;
  saudization_percentage: number;
  nitaqat_color: string;
}

interface GOSIContribution {
  id: string;
  month: string;
  employee_id: string;
  employee_contribution: number;
  employer_contribution: number;
  total_contribution: number;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
    is_saudi: boolean;
  };
}

export function Compliance() {
  const { currentCompany } = useCompany();
  const [nitaqatMetrics, setNitaqatMetrics] = useState<NitaqatMetric[]>([]);
  const [gosiContributions, setGosiContributions] = useState<GOSIContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (currentCompany) {
      fetchNitaqatMetrics();
      fetchGOSIContributions();
    }
  }, [currentCompany, selectedMonth]);

  const fetchNitaqatMetrics = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('nitaqat_tracking')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('calculation_date', { ascending: false })
        .limit(12);

      if (error) throw error;
      setNitaqatMetrics(data || []);
    } catch (error) {
      console.error('Error fetching Nitaqat metrics:', error);
    }
  };

  const fetchGOSIContributions = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const startDate = `${selectedMonth}-01`;
      const [year, month] = selectedMonth.split('-');
      const nextMonth = month === '12' ? '01' : String(Number(month) + 1).padStart(2, '0');
      const nextYear = month === '12' ? String(Number(year) + 1) : year;
      const endDate = `${nextYear}-${nextMonth}-01`;

      const { data, error } = await supabase
        .from('payroll')
        .select(`
          id,
          employee_id,
          gosi_employee,
          gosi_employer,
          gross_salary,
          effective_from,
          employee:employees(employee_number, first_name_en, last_name_en, is_saudi)
        `)
        .eq('company_id', currentCompany.id)
        .gte('effective_from', startDate)
        .lt('effective_from', endDate)
        .order('effective_from', { ascending: false });

      if (error) throw error;

      const transformed = (data || []).map(record => ({
        id: record.id,
        month: selectedMonth,
        employee_id: record.employee_id,
        employee_contribution: record.gosi_employee || 0,
        employer_contribution: record.gosi_employer || 0,
        total_contribution: (record.gosi_employee || 0) + (record.gosi_employer || 0),
        employee: record.employee,
      }));

      setGosiContributions(transformed);
    } catch (error) {
      console.error('Error fetching GOSI contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportGOSI = () => {
    const exportData = gosiContributions.map((contrib) => ({
      'Employee Number': contrib.employee.employee_number,
      'Employee Name': `${contrib.employee.first_name_en} ${contrib.employee.last_name_en}`,
      'Nationality': contrib.employee.is_saudi ? 'Saudi' : 'Non-Saudi',
      Month: contrib.month,
      'Employee Contribution': contrib.employee_contribution,
      'Employer Contribution': contrib.employer_contribution,
      'Total Contribution': contrib.total_contribution,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GOSI');
    XLSX.writeFile(wb, `gosi_contributions_${selectedMonth}.xlsx`);
  };

  const currentMetric = nitaqatMetrics[0];
  const totalGOSI = gosiContributions.reduce((sum, c) => sum + (c.total_contribution || 0), 0);
  const employeeGOSI = gosiContributions.reduce((sum, c) => sum + (c.employee_contribution || 0), 0);
  const employerGOSI = gosiContributions.reduce((sum, c) => sum + (c.employer_contribution || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance & Reporting</h1>
          <p className="text-gray-600 mt-1">Nitaqat, GOSI, and WPS compliance tracking</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Nitaqat Status</h2>
        {currentMetric ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center space-x-4">
              <Shield className={`h-16 w-16 ${
                currentMetric.nitaqat_color === 'platinum' ? 'text-gray-400' :
                currentMetric.nitaqat_color === 'green' ? 'text-green-600' :
                currentMetric.nitaqat_color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <div>
                <p className="text-sm text-gray-600">Nitaqat Status</p>
                <p className="text-2xl font-bold capitalize">{currentMetric.nitaqat_color}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Saudization Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {currentMetric.saudization_percentage.toFixed(1)}%
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{currentMetric.total_employees}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Saudi Employees</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{currentMetric.saudi_employees}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No Nitaqat metrics available</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">GOSI Contributions</h2>
            <div className="flex items-center space-x-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleExportGOSI}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <DollarSign className="h-12 w-12 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total GOSI</p>
              <p className="text-xl font-bold text-gray-900">SAR {totalGOSI.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <DollarSign className="h-12 w-12 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Employee Contribution</p>
              <p className="text-xl font-bold text-gray-900">SAR {employeeGOSI.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <DollarSign className="h-12 w-12 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Employer Contribution</p>
              <p className="text-xl font-bold text-gray-900">SAR {employerGOSI.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nationality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Contribution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employer Contribution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gosiContributions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No GOSI contributions found for this month.
                  </td>
                </tr>
              ) : (
                gosiContributions.map((contrib) => (
                  <tr key={contrib.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {contrib.employee.first_name_en} {contrib.employee.last_name_en}
                      </div>
                      <div className="text-sm text-gray-500">{contrib.employee.employee_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        contrib.employee.is_saudi
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {contrib.employee.is_saudi ? 'Saudi' : 'Non-Saudi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      SAR {(contrib.employee_contribution || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      SAR {(contrib.employer_contribution || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      SAR {(contrib.total_contribution || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
