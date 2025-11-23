import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Shield, TrendingUp, Download, DollarSign, Info, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Employee {
  id: string;
  is_saudi: boolean;
  basic_salary: number;
  has_disability: boolean;
}

interface NitaqatCalculation {
  totalEmployees: number;
  saudiCount: number;
  fullCountSaudis: number;
  halfCountSaudis: number;
  disabledSaudis: number;
  effectiveSaudiCount: number;
  saudizationPercentage: number;
  nitaqatColor: string;
  colorZone: string;
  requirements: string;
  nextZonePercentage?: number;
}

export function Compliance() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nitaqatCalc, setNitaqatCalc] = useState<NitaqatCalculation | null>(null);
  const [gosiContributions, setGosiContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showNitaqatInfo, setShowNitaqatInfo] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      fetchEmployeesAndCalculate();
      fetchGOSIContributions();
    }
  }, [currentCompany, selectedMonth]);

  const calculateNitaqatColor = (totalEmp: number, saudizationPercent: number): { color: string; zone: string } => {
    if (totalEmp < 6) {
      return { color: 'exempt', zone: 'Exempt (< 6 employees)' };
    }

    const redThreshold = 16.22;
    const lowGreenMin = 16.22;
    const lowGreenMax = 19.25;
    const midGreenMin = 19.26;
    const midGreenMax = 23.11;
    const highGreenMin = 23.12;
    const highGreenMax = 26.51;
    const platinumMin = 26.52;

    if (saudizationPercent < redThreshold) {
      return { color: 'red', zone: 'Red Zone' };
    } else if (saudizationPercent >= lowGreenMin && saudizationPercent <= lowGreenMax) {
      return { color: 'low-green', zone: 'Low Green Zone' };
    } else if (saudizationPercent >= midGreenMin && saudizationPercent <= midGreenMax) {
      return { color: 'mid-green', zone: 'Medium Green Zone' };
    } else if (saudizationPercent >= highGreenMin && saudizationPercent <= highGreenMax) {
      return { color: 'high-green', zone: 'High Green Zone' };
    } else if (saudizationPercent >= platinumMin) {
      return { color: 'platinum', zone: 'Platinum Zone' };
    }

    return { color: 'red', zone: 'Red Zone' };
  };

  const fetchEmployeesAndCalculate = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data: empData, error } = await supabase
        .from('employees')
        .select('id, is_saudi, has_disability')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active');

      if (error) throw error;

      const { data: payrollData } = await supabase
        .from('payroll')
        .select('employee_id, basic_salary')
        .eq('company_id', currentCompany.id)
        .in('employee_id', (empData || []).map(e => e.id));

      const salaryMap = new Map((payrollData || []).map(p => [p.employee_id, p.basic_salary]));

      const enrichedEmployees = (empData || []).map(emp => ({
        ...emp,
        basic_salary: salaryMap.get(emp.id) || 0
      }));

      setEmployees(enrichedEmployees);

      const totalEmployees = enrichedEmployees.length;
      const saudiEmployees = enrichedEmployees.filter(e => e.is_saudi);
      const saudiCount = saudiEmployees.length;

      let fullCountSaudis = 0;
      let halfCountSaudis = 0;
      let disabledSaudis = 0;
      let effectiveSaudiCount = 0;

      saudiEmployees.forEach(emp => {
        if (emp.has_disability && emp.basic_salary >= 4000) {
          disabledSaudis++;
          effectiveSaudiCount += 4;
        } else if (emp.basic_salary >= 4000) {
          fullCountSaudis++;
          effectiveSaudiCount += 1;
        } else if (emp.basic_salary > 0) {
          halfCountSaudis++;
          effectiveSaudiCount += 0.5;
        }
      });

      const saudizationPercentage = totalEmployees > 0 ? (effectiveSaudiCount / totalEmployees) * 100 : 0;

      const { color, zone } = calculateNitaqatColor(totalEmployees, saudizationPercentage);

      let requirements = '';
      let nextZonePercentage: number | undefined;

      if (totalEmployees < 6) {
        requirements = 'Your company has fewer than 6 employees and is exempt from Nitaqat classification. However, you must employ at least 1 Saudi national.';
      } else if (color === 'red') {
        requirements = 'Your company is in the Red Zone. You cannot hire new expatriates, renew work permits, or transfer employees. Immediate action required to increase Saudization.';
        nextZonePercentage = 16.22;
      } else if (color === 'low-green') {
        requirements = 'Your company is in the Low Green Zone. You have basic compliance but limited flexibility for visa services.';
        nextZonePercentage = 19.26;
      } else if (color === 'mid-green') {
        requirements = 'Your company is in the Medium Green Zone. You have good compliance with standard visa services available.';
        nextZonePercentage = 23.12;
      } else if (color === 'high-green') {
        requirements = 'Your company is in the High Green Zone. Excellent compliance with full access to visa services.';
        nextZonePercentage = 26.52;
      } else if (color === 'platinum') {
        requirements = 'Congratulations! Your company is in the Platinum Zone with the highest Saudization rate. You have priority access to all government services.';
      }

      setNitaqatCalc({
        totalEmployees,
        saudiCount,
        fullCountSaudis,
        halfCountSaudis,
        disabledSaudis,
        effectiveSaudiCount,
        saudizationPercentage,
        nitaqatColor: color,
        colorZone: zone,
        requirements,
        nextZonePercentage
      });
    } catch (error) {
      console.error('Error calculating Nitaqat:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGOSIContributions = async () => {
    if (!currentCompany) return;

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

  const getColorClass = (color: string) => {
    switch (color) {
      case 'platinum':
        return 'text-slate-600';
      case 'high-green':
        return 'text-emerald-600';
      case 'mid-green':
        return 'text-green-600';
      case 'low-green':
        return 'text-lime-600';
      case 'red':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (color: string) => {
    if (color === 'red') return <AlertCircle className="h-16 w-16" />;
    if (color === 'platinum' || color === 'high-green') return <CheckCircle className="h-16 w-16" />;
    return <Shield className="h-16 w-16" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance & Reporting</h1>
          <p className="text-gray-600 mt-1">Nitaqat, GOSI, and WPS compliance tracking</p>
        </div>
        <button
          onClick={() => setShowNitaqatInfo(!showNitaqatInfo)}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Info className="h-4 w-4" />
          <span>Nitaqat Info</span>
        </button>
      </div>

      {showNitaqatInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Nitaqat Program Information (2024-2025)</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-semibold">Salary Requirements:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>Saudi employees earning SAR 4,000+ count as 1.0 employee</li>
                <li>Saudi employees earning less than SAR 4,000 count as 0.5 employee</li>
                <li>Disabled Saudi employees earning SAR 4,000+ count as 4.0 employees</li>
                <li>GCC nationals are counted as Saudi nationals</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Classification Zones:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li><span className="font-medium text-red-600">Red Zone:</span> Below 16.22% - Cannot hire expatriates or renew work permits</li>
                <li><span className="font-medium text-lime-600">Low Green:</span> 16.22% - 19.25% - Basic compliance</li>
                <li><span className="font-medium text-green-600">Medium Green:</span> 19.26% - 23.11% - Good compliance</li>
                <li><span className="font-medium text-emerald-600">High Green:</span> 23.12% - 26.51% - Excellent compliance</li>
                <li><span className="font-medium text-slate-600">Platinum:</span> 26.52%+ - Highest priority access</li>
              </ul>
            </div>
            <p className="text-xs italic">Note: Companies with fewer than 6 employees are exempt but must employ at least 1 Saudi national.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Nitaqat Status</h2>
        {nitaqatCalc ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center space-x-4">
                <div className={getColorClass(nitaqatCalc.nitaqatColor)}>
                  {getStatusIcon(nitaqatCalc.nitaqatColor)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nitaqat Status</p>
                  <p className={`text-2xl font-bold capitalize ${getColorClass(nitaqatCalc.nitaqatColor)}`}>
                    {nitaqatCalc.colorZone}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Saudization Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {nitaqatCalc.saudizationPercentage.toFixed(2)}%
                </p>
                {nitaqatCalc.nextZonePercentage && (
                  <p className="text-xs text-gray-500 mt-1">
                    Next zone at {nitaqatCalc.nextZonePercentage}%
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{nitaqatCalc.totalEmployees}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Effective Saudi Count</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {nitaqatCalc.effectiveSaudiCount.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ({nitaqatCalc.saudiCount} actual)
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Calculation Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Full Count (SAR 4,000+)</p>
                  <p className="font-bold text-gray-900">{nitaqatCalc.fullCountSaudis}</p>
                </div>
                <div>
                  <p className="text-gray-600">Half Count (&lt; SAR 4,000)</p>
                  <p className="font-bold text-gray-900">{nitaqatCalc.halfCountSaudis}</p>
                </div>
                <div>
                  <p className="text-gray-600">Disabled (x4 count)</p>
                  <p className="font-bold text-gray-900">{nitaqatCalc.disabledSaudis}</p>
                </div>
                <div>
                  <p className="text-gray-600">Effective Count</p>
                  <p className="font-bold text-green-600">{nitaqatCalc.effectiveSaudiCount.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className={`border-l-4 p-4 rounded ${
              nitaqatCalc.nitaqatColor === 'red' ? 'bg-red-50 border-red-500' :
              nitaqatCalc.nitaqatColor === 'platinum' ? 'bg-slate-50 border-slate-500' :
              'bg-green-50 border-green-500'
            }`}>
              <p className="font-semibold text-gray-900 mb-2">Status Requirements:</p>
              <p className="text-sm text-gray-700">{nitaqatCalc.requirements}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No employee data available to calculate Nitaqat status</p>
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
