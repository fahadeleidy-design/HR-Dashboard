import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatInteger } from '@/lib/formatters';
import { DollarSign, Download, RefreshCw, AlertCircle, CheckCircle, FileBarChart } from 'lucide-react';
import * as XLSX from 'xlsx';

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

export function GOSI() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [gosiContributions, setGosiContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [gosiSyncing, setGosiSyncing] = useState(false);
  const [gosiConfigured, setGosiConfigured] = useState(false);
  const [gosiSyncLogs, setGosiSyncLogs] = useState<GOSISyncLog[]>([]);
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    if (currentCompany) {
      fetchGOSIContributions();
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
      fetchGOSIContributions();
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
          <h1 className="text-3xl font-bold text-gray-900">GOSI Contributions</h1>
          <p className="text-gray-600 mt-1">General Organization for Social Insurance tracking and reporting</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Monthly Contributions</h2>
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

        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-start space-x-3">
            <FileBarChart className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">GOSI Contribution Rates (2024)</p>
              <div className="mt-2 space-y-2 text-xs text-blue-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Saudi Nationals (21.5% total):</p>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Annuity (Pension): 9% employee + 9% employer</li>
                      <li>• Unemployment: 0.75% employee + 0.75% employer</li>
                      <li>• Occupational Hazards: 0% employee + 2% employer</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold">Non-Saudi Nationals (2% total):</p>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Occupational Hazards only: 0% employee + 2% employer</li>
                    </ul>
                  </div>
                </div>
                <p className="italic">Calculated on: Basic Salary + Housing Allowance (max 45,000 SAR/month)</p>
              </div>
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
                    No GOSI contributions found for {selectedMonth}.
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
