import { useState, useEffect } from 'react';
import { FileText, Download, Upload, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../contexts/CompanyContext';
import { format } from 'date-fns';

interface WPSFile {
  id: string;
  file_number: string;
  file_name: string;
  bank_name: string;
  total_employees: number;
  total_amount: number;
  salary_month: number;
  salary_year: number;
  status: string;
  generated_at: string;
  mol_reference_number: string | null;
}

export default function WPSFileGenerator() {
  const [wpsFiles, setWpsFiles] = useState<WPSFile[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    cycle_id: '',
    bank_name: 'Al Rajhi Bank',
    bank_code: '80',
    establishment_id: '',
  });

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  const saudiBanks = [
    { name: 'Al Rajhi Bank', code: '80' },
    { name: 'Saudi National Bank', code: '10' },
    { name: 'Riyad Bank', code: '20' },
    { name: 'Alinma Bank', code: '95' },
    { name: 'Bank AlJazira', code: '60' },
    { name: 'Bank Albilad', code: '91' },
    { name: 'Saudi Investment Bank', code: '65' },
    { name: 'Arab National Bank', code: '05' },
  ];

  useEffect(() => {
    if (currentCompany?.id) {
      loadWPSData();
    }
  }, [currentCompany]);

  async function loadWPSData() {
    try {
      setLoading(true);

      // Load WPS files
      const { data: filesData, error: filesError } = await supabase
        .from('payroll_wps_files_v2')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (filesError) throw filesError;
      setWpsFiles(filesData || []);

      // Load approved payroll cycles
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('payroll_cycles_v2')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .in('status', ['approved', 'paid'])
        .order('payment_date', { ascending: false })
        .limit(10);

      if (cyclesError) throw cyclesError;
      setCycles(cyclesData || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateWPS() {
    try {
      const selectedCycle = cycles.find(c => c.id === generateForm.cycle_id);
      if (!selectedCycle) {
        showToast('Please select a payroll cycle', 'error');
        return;
      }

      const periodDate = new Date(selectedCycle.period_end);
      const salaryMonth = periodDate.getMonth() + 1;
      const salaryYear = periodDate.getFullYear();

      // Get cycle employees
      const { data: employees, error: empError } = await supabase
        .from('payroll_cycle_employees_v2')
        .select('*')
        .eq('cycle_id', generateForm.cycle_id)
        .not('iban', 'is', null);

      if (empError) throw empError;

      if (!employees || employees.length === 0) {
        showToast('No employees with bank details found', 'error');
        return;
      }

      // Calculate totals
      const totalAmount = employees.reduce((sum, emp) => sum + (emp.net_salary || 0), 0);

      // Create WPS file record
      const fileNumber = `WPS-${salaryYear}${String(salaryMonth).padStart(2, '0')}-${Date.now()}`;
      const fileName = `${generateForm.establishment_id}_${salaryYear}${String(salaryMonth).padStart(2, '0')}.sif`;

      const { data: wpsFile, error: wpsError } = await supabase
        .from('payroll_wps_files_v2')
        .insert({
          company_id: currentCompany!.id,
          cycle_id: generateForm.cycle_id,
          file_number: fileNumber,
          file_name: fileName,
          bank_name: generateForm.bank_name,
          bank_code: generateForm.bank_code,
          establishment_id: generateForm.establishment_id,
          total_employees: employees.length,
          total_amount: totalAmount,
          salary_month: salaryMonth,
          salary_year: salaryYear,
          status: 'generated',
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (wpsError) throw wpsError;

      showToast('WPS file generated successfully', 'success');
      setShowGenerateModal(false);
      await loadWPSData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-amber-100 text-amber-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading WPS data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">WPS File Generation</h2>
          <p className="text-sm text-gray-600 mt-1">
            Wage Protection System compliance for MOL submission
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FileText className="w-4 h-4" />
          Generate WPS File
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">WPS Compliance Requirements</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Salaries must be transferred through approved banks</li>
              <li>File must be submitted to MOL within 15 days of payment date</li>
              <li>SIF format is required for MOL submission</li>
              <li>All employees must have valid IBAN numbers</li>
            </ul>
          </div>
        </div>
      </div>

      {/* WPS Files List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Generated WPS Files</h3>
        </div>

        {wpsFiles.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No WPS files generated yet</p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Generate your first WPS file
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    File Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    MOL Ref
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wpsFiles.map(file => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{file.file_number}</div>
                      <div className="text-xs text-gray-500">{file.file_name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(
                        new Date(file.salary_year, file.salary_month - 1),
                        'MMMM yyyy'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{file.bank_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {file.total_employees}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {file.total_amount.toLocaleString()} SAR
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          file.status
                        )}`}
                      >
                        {file.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {file.mol_reference_number || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-700"
                          title="Download SIF File"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {file.status === 'generated' && (
                          <button
                            className="text-green-600 hover:text-green-700"
                            title="Submit to MOL"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Generate WPS File</h3>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payroll Cycle *
                </label>
                <select
                  value={generateForm.cycle_id}
                  onChange={e =>
                    setGenerateForm({ ...generateForm, cycle_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a payroll cycle...</option>
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.cycle_name} - {format(new Date(cycle.payment_date), 'MMM dd, yyyy')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank *
                </label>
                <select
                  value={generateForm.bank_name}
                  onChange={e => {
                    const bank = saudiBanks.find(b => b.name === e.target.value);
                    setGenerateForm({
                      ...generateForm,
                      bank_name: e.target.value,
                      bank_code: bank?.code || '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {saudiBanks.map(bank => (
                    <option key={bank.code} value={bank.name}>
                      {bank.name} ({bank.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MOL Establishment ID *
                </label>
                <input
                  type="text"
                  value={generateForm.establishment_id}
                  onChange={e =>
                    setGenerateForm({ ...generateForm, establishment_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter MOL establishment ID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Ministry of Labor establishment registration number
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateWPS}
                disabled={
                  !generateForm.cycle_id ||
                  !generateForm.bank_name ||
                  !generateForm.establishment_id
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Generate WPS File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
