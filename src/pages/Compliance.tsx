import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Shield, TrendingUp, Download, DollarSign, Info, AlertCircle, CheckCircle, Users, Calculator, BookOpen, FileBarChart, RefreshCw } from 'lucide-react';
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
  employeesNeededForNextZone?: number;
}

interface NitaqatHistoryRecord {
  id: string;
  calculation_date: string;
  total_employees: number;
  saudi_employees: number;
  effective_saudi_count: number;
  saudization_percentage: number;
  nitaqat_color: string;
}

interface GOSISyncLog {
  id: string;
  sync_type: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export function Compliance() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nitaqatCalc, setNitaqatCalc] = useState<NitaqatCalculation | null>(null);
  const [gosiContributions, setGosiContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showNitaqatInfo, setShowNitaqatInfo] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<NitaqatHistoryRecord[]>([]);
  const [calculatorEmployees, setCalculatorEmployees] = useState(0);
  const [calculatorSaudis, setCalculatorSaudis] = useState(0);
  const [gosiSyncing, setGosiSyncing] = useState(false);
  const [gosiConfigured, setGosiConfigured] = useState(false);
  const [gosiSyncLogs, setGosiSyncLogs] = useState<GOSISyncLog[]>([]);
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    if (currentCompany) {
      fetchEmployeesAndCalculate();
      fetchGOSIContributions();
      fetchNitaqatHistory();
      checkGOSIConfiguration();
      fetchGOSISyncLogs();
    }
  }, [currentCompany, selectedMonth]);

  const checkGOSIConfiguration = async () => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('gosi_api_config')
        .select('id, client_id, client_secret, establishment_number')
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      setGosiConfigured(!!data && !!data.client_id && !!data.client_secret && !!data.establishment_number);
    } catch (error) {
      console.error('Error checking GOSI config:', error);
    }
  };

  const fetchGOSISyncLogs = async () => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('gosi_sync_logs')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGosiSyncLogs(data || []);
    } catch (error) {
      console.error('Error fetching GOSI sync logs:', error);
    }
  };

  const handleGOSISync = async (action: 'test_connection' | 'fetch_all_contributors') => {
    if (!currentCompany) return;

    setGosiSyncing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gosi-api`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Please log in to sync with GOSI');
        return;
      }

      const requestData: any = {
        action,
        company_id: currentCompany.id,
      };

      if (action === 'fetch_all_contributors') {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, iqama_number')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active');

        requestData.data = { employees: employeesData };
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'GOSI sync failed');
      }

      setSyncResult(result);
      alert(result.message || 'GOSI sync completed successfully!');

      await supabase.from('gosi_sync_logs').insert([{
        company_id: currentCompany.id,
        sync_type: action === 'fetch_all_contributors' ? 'contribution_fetch' : 'test',
        status: 'success',
        records_processed: result.results?.length || 0,
        completed_at: new Date().toISOString(),
      }]);

      fetchGOSISyncLogs();
    } catch (error: any) {
      console.error('GOSI sync error:', error);
      alert(error.message || 'Failed to sync with GOSI');

      await supabase.from('gosi_sync_logs').insert([{
        company_id: currentCompany.id,
        sync_type: action,
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      }]);

      fetchGOSISyncLogs();
    } finally {
      setGosiSyncing(false);
    }
  };

  const fetchNitaqatHistory = async () => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('nitaqat_tracking')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('calculation_date', { ascending: false })
        .limit(12);
      if (error) throw error;
      setHistoryRecords(data || []);
    } catch (error) {
      console.error('Error fetching Nitaqat history:', error);
    }
  };

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
      let employeesNeededForNextZone: number | undefined;

      if (totalEmployees < 6) {
        requirements = 'Your company has fewer than 6 employees and is exempt from Nitaqat classification. However, you must employ at least 1 Saudi national.';
      } else if (color === 'red') {
        requirements = 'Your company is in the Red Zone. You cannot hire new expatriates, renew work permits, or transfer employees. Immediate action required to increase Saudization.';
        nextZonePercentage = 16.22;
        const targetCount = Math.ceil((totalEmployees * nextZonePercentage) / 100);
        employeesNeededForNextZone = Math.max(0, targetCount - effectiveSaudiCount);
      } else if (color === 'low-green') {
        requirements = 'Your company is in the Low Green Zone. You have basic compliance but limited flexibility for visa services.';
        nextZonePercentage = 19.26;
        const targetCount = Math.ceil((totalEmployees * nextZonePercentage) / 100);
        employeesNeededForNextZone = Math.max(0, targetCount - effectiveSaudiCount);
      } else if (color === 'mid-green') {
        requirements = 'Your company is in the Medium Green Zone. You have good compliance with standard visa services available.';
        nextZonePercentage = 23.12;
        const targetCount = Math.ceil((totalEmployees * nextZonePercentage) / 100);
        employeesNeededForNextZone = Math.max(0, targetCount - effectiveSaudiCount);
      } else if (color === 'high-green') {
        requirements = 'Your company is in the High Green Zone. Excellent compliance with full access to visa services.';
        nextZonePercentage = 26.52;
        const targetCount = Math.ceil((totalEmployees * nextZonePercentage) / 100);
        employeesNeededForNextZone = Math.max(0, targetCount - effectiveSaudiCount);
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
        nextZonePercentage,
        employeesNeededForNextZone
      });

      // Save to tracking table
      try {
        await supabase.from('nitaqat_tracking').insert([{
          company_id: currentCompany.id,
          calculation_date: new Date().toISOString().split('T')[0],
          total_employees: totalEmployees,
          saudi_employees: saudiCount,
          effective_saudi_count: effectiveSaudiCount,
          saudization_percentage: saudizationPercentage,
          nitaqat_color: color
        }]);
      } catch (error) {
        console.error('Error saving Nitaqat tracking:', error);
      }
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

  const handleExportNitaqat = () => {
    if (!nitaqatCalc) return;

    const exportData = [{
      'Calculation Date': new Date().toLocaleDateString(),
      'Total Employees': nitaqatCalc.totalEmployees,
      'Saudi Employees': nitaqatCalc.saudiCount,
      'Full Count Saudis (SAR 4000+)': nitaqatCalc.fullCountSaudis,
      'Half Count Saudis (< SAR 4000)': nitaqatCalc.halfCountSaudis,
      'Disabled Employees (x4)': nitaqatCalc.disabledSaudis,
      'Effective Saudi Count': nitaqatCalc.effectiveSaudiCount,
      'Saudization Percentage': `${nitaqatCalc.saudizationPercentage.toFixed(2)}%`,
      'Nitaqat Zone': nitaqatCalc.colorZone,
      'Status': nitaqatCalc.requirements
    }];

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nitaqat Report');
    XLSX.writeFile(wb, `nitaqat_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const calculateScenario = () => {
    if (calculatorEmployees <= 0) return null;
    const percentage = (calculatorSaudis / calculatorEmployees) * 100;
    const { color, zone } = calculateNitaqatColor(calculatorEmployees, percentage);
    return { percentage, color, zone };
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
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Calculator className="h-4 w-4" />
            <span>Calculator</span>
          </button>
          <button
            onClick={() => setShowNitaqatInfo(!showNitaqatInfo)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Info className="h-4 w-4" />
            <span>Info</span>
          </button>
        </div>
      </div>

      {showCalculator && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Nitaqat Calculator</h3>
            <button onClick={() => setShowCalculator(false)} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">Calculate what zone your company would be in with different employee counts</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Employees</label>
              <input
                type="number"
                min="0"
                value={calculatorEmployees}
                onChange={(e) => setCalculatorEmployees(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Saudi Count</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={calculatorSaudis}
                onChange={(e) => setCalculatorSaudis(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          {calculatorEmployees > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">Result:</p>
              {(() => {
                const result = calculateScenario();
                if (!result) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-gray-900">
                      Saudization: {result.percentage.toFixed(2)}%
                    </p>
                    <p className={`text-lg font-bold ${getColorClass(result.color)}`}>
                      Zone: {result.zone}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
                  <div className="mt-1">
                    <p className="text-xs text-gray-500">
                      Next zone at {nitaqatCalc.nextZonePercentage}%
                    </p>
                    {nitaqatCalc.employeesNeededForNextZone !== undefined && nitaqatCalc.employeesNeededForNextZone > 0 && (
                      <p className="text-xs text-blue-600 font-semibold">
                        Need {nitaqatCalc.employeesNeededForNextZone.toFixed(1)} more Saudi employees
                      </p>
                    )}
                  </div>
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

            <div className="flex justify-end space-x-3 mb-4">
              <button
                onClick={handleExportNitaqat}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </button>
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

      {historyRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Historical Trend (Last 12 Months)</h2>
            <TrendingUp className="h-6 w-6 text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Employees</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saudi Employees</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saudization %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historyRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(record.calculation_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.total_employees}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.saudi_employees}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.effective_saudi_count ? record.effective_saudi_count.toFixed(1) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {record.saudization_percentage ? record.saudization_percentage.toFixed(2) : '0.00'}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        record.nitaqat_color === 'red' ? 'bg-red-100 text-red-800' :
                        record.nitaqat_color === 'platinum' ? 'bg-slate-100 text-slate-800' :
                        record.nitaqat_color === 'high-green' ? 'bg-emerald-100 text-emerald-800' :
                        record.nitaqat_color === 'mid-green' ? 'bg-green-100 text-green-800' :
                        record.nitaqat_color === 'low-green' ? 'bg-lime-100 text-lime-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.nitaqat_color.replace('-', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              {gosiConfigured ? (
                <>
                  <button
                    onClick={() => handleGOSISync('test_connection')}
                    disabled={gosiSyncing}
                    className="flex items-center space-x-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors disabled:bg-gray-200"
                    title="Test GOSI connection"
                  >
                    <RefreshCw className={`h-4 w-4 ${gosiSyncing ? 'animate-spin' : ''}`} />
                    <span>{gosiSyncing ? 'Testing...' : 'Test'}</span>
                  </button>
                  <button
                    onClick={() => handleGOSISync('fetch_all_contributors')}
                    disabled={gosiSyncing}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    title="Fetch contributor data from GOSI"
                  >
                    <RefreshCw className={`h-4 w-4 ${gosiSyncing ? 'animate-spin' : ''}`} />
                    <span>{gosiSyncing ? 'Syncing...' : 'Sync GOSI'}</span>
                  </button>
                </>
              ) : null}
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

        {!gosiConfigured && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">GOSI API Not Configured</p>
                <p className="text-sm text-yellow-700">
                  Configure your GOSI API credentials in Settings to enable automatic synchronization with GOSI.
                </p>
              </div>
            </div>
          </div>
        )}

        {gosiConfigured && gosiSyncLogs.length > 0 && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Recent GOSI Sync Activity</h3>
              <button
                onClick={() => setShowSyncLogs(!showSyncLogs)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showSyncLogs ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            <div className="flex items-center space-x-4 mb-2">
              <div className="flex items-center space-x-2">
                {gosiSyncLogs[0].status === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  Last Sync: {gosiSyncLogs[0].status === 'success' ? 'Successful' : 'Failed'}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {new Date(gosiSyncLogs[0].started_at).toLocaleString()}
              </span>
              {gosiSyncLogs[0].records_processed > 0 && (
                <span className="text-sm text-gray-600">
                  {gosiSyncLogs[0].records_processed} records processed
                </span>
              )}
            </div>

            {showSyncLogs && (
              <div className="mt-3 space-y-2">
                {gosiSyncLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-white rounded border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {log.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {log.sync_type.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(log.started_at).toLocaleString()}
                        </p>
                        {log.records_processed > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            Processed: {log.records_processed} | Failed: {log.records_failed || 0}
                          </p>
                        )}
                        {log.error_message && (
                          <p className="text-xs text-red-600 mt-1">
                            Error: {log.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
