import { useState, useEffect } from 'react';
import { FileText, Download, Upload, CheckCircle, AlertCircle, X, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../contexts/CompanyContext';
import { format } from 'date-fns';

interface WPSRecord {
  id: string;
  batch_id: string;
  file_name: string;
  bank_name: string;
  bank_code: string;
  establishment_id: string;
  total_employees: number;
  total_amount: number;
  salary_month: number;
  salary_year: number;
  status: string;
  generated_at: string;
  mol_reference_number: string | null;
  batch?: {
    month: string;
    period_start: string;
    period_end: string;
  };
}

interface PayrollBatch {
  id: string;
  month: string;
  period_start: string;
  period_end: string;
  total_employees: number;
  total_net: number;
  status: string;
}

interface PayrollItemForWPS {
  employee_id: string;
  net_salary: number;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_ar: string;
    iqama_number: string;
    is_saudi: boolean;
  };
  payroll_info?: {
    iban: string;
    bank_name: string;
  };
}

const SAUDI_BANKS = [
  { name: 'Al Rajhi Bank', code: '80' },
  { name: 'Saudi National Bank', code: '10' },
  { name: 'Riyad Bank', code: '20' },
  { name: 'Alinma Bank', code: '95' },
  { name: 'Bank AlJazira', code: '60' },
  { name: 'Bank Albilad', code: '91' },
  { name: 'Saudi Investment Bank', code: '65' },
  { name: 'Arab National Bank', code: '05' },
  { name: 'Banque Saudi Fransi', code: '55' },
  { name: 'HSBC Saudi Arabia', code: '40' },
];

export default function WPSFileGenerator() {
  const [wpsRecords, setWpsRecords] = useState<WPSRecord[]>([]);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    batch_id: '',
    bank_name: 'Al Rajhi Bank',
    bank_code: '80',
    establishment_id: '',
  });

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany?.id) {
      loadData();
    }
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const [wpsRes, batchesRes] = await Promise.all([
        supabase
          .from('payroll_wps_files_v2')
          .select('*')
          .eq('company_id', currentCompany!.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('payroll_batches')
          .select('id, month, period_start, period_end, total_employees, total_net, status')
          .eq('company_id', currentCompany!.id)
          .in('status', ['approved', 'processed', 'paid'])
          .order('month', { ascending: false }),
      ]);

      if (wpsRes.error) throw wpsRes.error;
      if (batchesRes.error) throw batchesRes.error;

      setWpsRecords(wpsRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function generateSIFContent(
    employees: PayrollItemForWPS[],
    establishmentId: string,
    bankCode: string,
    salaryMonth: number,
    salaryYear: number
  ): string {
    const lines: string[] = [];
    const totalAmount = employees.reduce((s, e) => s + Number(e.net_salary || 0), 0);
    const recordCount = employees.length;
    const hijriDate = getHijriApprox(new Date(salaryYear, salaryMonth - 1));

    lines.push([
      'EH',
      bankCode.padStart(4, '0'),
      establishmentId.padEnd(15, ' '),
      String(salaryYear) + String(salaryMonth).padStart(2, '0'),
      String(recordCount).padStart(6, '0'),
      String(Math.round(totalAmount * 100)).padStart(15, '0'),
      hijriDate,
    ].join(''));

    employees.forEach(emp => {
      const iban = emp.payroll_info?.iban || ('SA00000000000000000000').substring(0, 24);
      const nationalId = (emp.employee?.iqama_number || '0000000000').padStart(10, '0').substring(0, 10);
      const amount = String(Math.round(Number(emp.net_salary || 0) * 100)).padStart(15, '0');
      const empName = (emp.employee?.first_name_en || 'Employee').padEnd(50, ' ').substring(0, 50);
      lines.push(['ED', nationalId, iban.padEnd(24, '0').substring(0, 24), amount, empName].join(''));
    });

    lines.push([
      'ET',
      String(recordCount).padStart(6, '0'),
      String(Math.round(totalAmount * 100)).padStart(15, '0'),
    ].join(''));

    return lines.join('\r\n');
  }

  function getHijriApprox(date: Date): string {
    const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const ll = l - 10631 * n + 354;
    const j = Math.floor((10985 - ll) / 5316) * Math.floor(50 * ll / 17719) + Math.floor(ll / 5670) * Math.floor(43 * ll / 15238);
    const ll2 = ll - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50) - Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
    const m = Math.floor(24 * ll2 / 709);
    const d = ll2 - Math.floor(709 * m / 24);
    const y = 30 * n + j - 30;
    return String(y) + String(m).padStart(2, '0') + String(d).padStart(2, '0');
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleGenerateWPS() {
    if (!generateForm.batch_id || !generateForm.establishment_id) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setGenerating(true);
    try {
      const selectedBatch = batches.find(b => b.id === generateForm.batch_id);
      if (!selectedBatch) throw new Error('Batch not found');

      const periodDate = new Date(selectedBatch.period_end);
      const salaryMonth = periodDate.getMonth() + 1;
      const salaryYear = periodDate.getFullYear();

      const { data: items, error: itemsError } = await supabase
        .from('payroll_items')
        .select(`
          employee_id, net_salary,
          employee:employees(employee_number, first_name_en, last_name_ar, iqama_number, is_saudi)
        `)
        .eq('batch_id', generateForm.batch_id)
        .gt('net_salary', 0);

      if (itemsError) throw itemsError;
      if (!items?.length) throw new Error('No payroll items found for this batch');

      const empIds = items.map(i => i.employee_id);
      const { data: payrollInfos } = await supabase
        .from('payroll')
        .select('employee_id, iban, bank_name')
        .in('employee_id', empIds);

      const payrollMap = (payrollInfos || []).reduce((m: Record<string, any>, p) => {
        m[p.employee_id] = p;
        return m;
      }, {});

      const enrichedItems: PayrollItemForWPS[] = (items as any[]).map(item => ({
        ...item,
        payroll_info: payrollMap[item.employee_id],
      }));

      const totalAmount = enrichedItems.reduce((s, e) => s + Number(e.net_salary || 0), 0);
      const fileName = `${generateForm.establishment_id}_${salaryYear}${String(salaryMonth).padStart(2, '0')}.sif`;
      const fileNumber = `WPS-${salaryYear}${String(salaryMonth).padStart(2, '0')}-${Date.now()}`;

      const { error: insertError } = await supabase
        .from('payroll_wps_files_v2')
        .insert({
          company_id: currentCompany!.id,
          cycle_id: generateForm.batch_id,
          file_number: fileNumber,
          file_name: fileName,
          bank_name: generateForm.bank_name,
          bank_code: generateForm.bank_code,
          establishment_id: generateForm.establishment_id,
          total_employees: enrichedItems.length,
          total_amount: totalAmount,
          salary_month: salaryMonth,
          salary_year: salaryYear,
          status: 'generated',
          generated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      const sifContent = generateSIFContent(
        enrichedItems,
        generateForm.establishment_id,
        generateForm.bank_code,
        salaryMonth,
        salaryYear
      );

      downloadFile(sifContent, fileName);

      showToast('WPS SIF file generated and downloaded', 'success');
      setShowGenerateModal(false);
      setGenerateForm({ batch_id: '', bank_name: 'Al Rajhi Bank', bank_code: '80', establishment_id: '' });
      await loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadExisting(record: WPSRecord) {
    try {
      const { data: items, error } = await supabase
        .from('payroll_items')
        .select(`
          employee_id, net_salary,
          employee:employees(employee_number, first_name_en, last_name_ar, iqama_number, is_saudi)
        `)
        .eq('batch_id', record.batch_id)
        .gt('net_salary', 0);

      if (error) throw error;

      const empIds = (items || []).map((i: any) => i.employee_id);
      const { data: payrollInfos } = await supabase
        .from('payroll')
        .select('employee_id, iban, bank_name')
        .in('employee_id', empIds);

      const payrollMap = (payrollInfos || []).reduce((m: Record<string, any>, p) => {
        m[p.employee_id] = p;
        return m;
      }, {});

      const enrichedItems = (items as any[]).map(item => ({
        ...item,
        payroll_info: payrollMap[item.employee_id],
      }));

      const sifContent = generateSIFContent(
        enrichedItems,
        record.establishment_id || currentCompany?.id?.substring(0, 10) || 'ESTID00001',
        record.bank_code || '80',
        record.salary_month,
        record.salary_year
      );

      downloadFile(sifContent, record.file_name);
      showToast('SIF file downloaded', 'success');
    } catch (error: any) {
      showToast('Download failed: ' + error.message, 'error');
    }
  }

  async function handleMarkSubmitted(recordId: string, molRef: string) {
    const { error } = await supabase
      .from('payroll_wps_files_v2')
      .update({ status: 'submitted', mol_reference_number: molRef })
      .eq('id', recordId);

    if (error) {
      showToast('Failed to update status', 'error');
    } else {
      showToast('Marked as submitted to MOL', 'success');
      loadData();
    }
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      generated: 'bg-blue-100 text-blue-800',
      submitted: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">WPS File Generator</h2>
          <p className="text-sm text-gray-600 mt-1">Wage Protection System — MOL compliance for Saudi Arabia</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          disabled={batches.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Generate WPS File
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">WPS Compliance Requirements</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-800">
              <li>Salaries must be transferred through MOL-approved banks in Saudi Arabia</li>
              <li>SIF file must be submitted to MOL within 10 days of the payment date</li>
              <li>Employees need valid IBAN numbers stored in their payroll records</li>
              <li>Establishment ID must match your MOL registration number</li>
            </ul>
          </div>
        </div>
      </div>

      {batches.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            No approved or paid payroll batches found. Process a payroll batch first to generate WPS files.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Generated WPS Files</h3>
          <span className="text-sm text-gray-500">{wpsRecords.length} files</span>
        </div>

        {wpsRecords.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No WPS files generated yet</p>
            <p className="text-sm text-gray-500">Generate a WPS SIF file from an approved payroll batch</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Employees</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MOL Ref</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wpsRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{record.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {record.generated_at ? format(new Date(record.generated_at), 'MMM dd, yyyy HH:mm') : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(record.salary_year, record.salary_month - 1), 'MMMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.bank_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{record.total_employees}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      SAR {Number(record.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.mol_reference_number || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadExisting(record)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Download SIF File"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {record.status === 'generated' && (
                          <button
                            onClick={() => {
                              const ref = prompt('Enter MOL reference number:');
                              if (ref) handleMarkSubmitted(record.id, ref);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Mark as Submitted to MOL"
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

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Generate WPS File</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Batch *</label>
                <select
                  value={generateForm.batch_id}
                  onChange={e => setGenerateForm({ ...generateForm, batch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select payroll batch...</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>
                      {batch.month} — {batch.total_employees} employees — SAR {Number(batch.total_net || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank *</label>
                <select
                  value={generateForm.bank_name}
                  onChange={e => {
                    const bank = SAUDI_BANKS.find(b => b.name === e.target.value);
                    setGenerateForm({ ...generateForm, bank_name: e.target.value, bank_code: bank?.code || '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {SAUDI_BANKS.map(bank => (
                    <option key={bank.code} value={bank.name}>{bank.name} (Code: {bank.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">MOL Establishment ID *</label>
                <input
                  type="text"
                  value={generateForm.establishment_id}
                  onChange={e => setGenerateForm({ ...generateForm, establishment_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. 1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">Your Ministry of Labor establishment registration number</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateWPS}
                disabled={generating || !generateForm.batch_id || !generateForm.establishment_id}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {generating ? 'Generating...' : 'Generate & Download SIF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
