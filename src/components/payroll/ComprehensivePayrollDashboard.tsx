import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, AlertCircle, CheckCircle, Clock, FileText, Download, TrendingUp, Eye, Send, Trash2, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { PayrollBatchCreator } from './PayrollBatchCreator';
import { PayrollAnalytics } from '../PayrollAnalytics';
import { PayslipViewer } from '../PayslipViewer';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import * as XLSX from 'xlsx';

interface PayrollBatch {
  id: string;
  month: string;
  period_start: string;
  period_end: string;
  total_employees: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'processed' | 'paid';
  created_at: string;
  notes?: string;
}

interface PayrollItem {
  id: string;
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transportation_allowance: number;
  food_allowance: number;
  mobile_allowance: number;
  other_allowances: number;
  overtime_amount: number;
  bonus_amount: number;
  commission_amount: number;
  total_earnings: number;
  gosi_employee: number;
  gosi_employer: number;
  loan_deduction: number;
  advance_deduction: number;
  absence_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  days_worked: number;
  overtime_hours: number;
  absence_days: number;
  payment_method: string;
  payment_status: string;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
    is_saudi: boolean;
    iqama_number: string;
  };
}

type ActiveView = 'batches' | 'items' | 'create' | 'analytics';

export default function ComprehensivePayrollDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('batches');
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPayslip, setShowPayslip] = useState(false);
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<{ itemId: string; employeeId: string } | null>(null);

  const { showToast } = useToast();
  const { currentCompany } = useCompany();
  const { userRole } = useAuth();

  const canManage = ['super_admin', 'admin', 'hr', 'finance'].includes(userRole?.role || '');

  useEffect(() => {
    if (currentCompany?.id) {
      fetchBatches();
    }
  }, [currentCompany]);

  useEffect(() => {
    if (selectedBatch) {
      fetchPayrollItems(selectedBatch.id);
    }
  }, [selectedBatch]);

  async function fetchBatches() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll_batches')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('month', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPayrollItems(batchId: string) {
    try {
      const { data, error } = await supabase
        .from('payroll_items')
        .select('*, employee:employees(employee_number, first_name_en, last_name_en, is_saudi, iqama_number)')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayrollItems(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function updateBatchStatus(batchId: string, status: string) {
    try {
      const { error } = await supabase
        .from('payroll_batches')
        .update({ status, ...(status === 'approved' && { approved_at: new Date().toISOString() }) })
        .eq('id', batchId);

      if (error) throw error;
      showToast(`Batch status updated to ${status}`, 'success');
      fetchBatches();
    } catch (error: any) {
      showToast('Failed to update: ' + error.message, 'error');
    }
  }

  async function handleDeleteBatch() {
    if (!deleteConfirm) return;
    const batchId = deleteConfirm;
    setDeleteConfirm(null);

    try {
      await supabase.from('payroll_items').delete().eq('batch_id', batchId);
      const { error } = await supabase.from('payroll_batches').delete().eq('id', batchId);
      if (error) throw error;
      showToast('Batch deleted', 'success');
      fetchBatches();
    } catch (error: any) {
      showToast('Delete failed: ' + error.message, 'error');
    }
  }

  async function generatePayslips(batchId: string) {
    try {
      const { data: items } = await supabase
        .from('payroll_items')
        .select('id, employee_id, company_id')
        .eq('batch_id', batchId);

      if (!items?.length) return;

      const toInsert = items.map(item => ({
        payroll_item_id: item.id,
        employee_id: item.employee_id,
        company_id: item.company_id,
      }));

      const { error } = await supabase.from('payslips').insert(toInsert);
      if (error) throw error;
      showToast(`Generated ${toInsert.length} payslips`, 'success');
    } catch (error: any) {
      showToast('Failed to generate payslips: ' + error.message, 'error');
    }
  }

  function exportBatch(batch: PayrollBatch) {
    if (!payrollItems.length) {
      showToast('No items loaded. Click view first then export.', 'warning');
      return;
    }

    const exportData = payrollItems.map(item => ({
      'Employee Number': item.employee?.employee_number || '',
      'Employee Name': `${item.employee?.first_name_en || ''} ${item.employee?.last_name_en || ''}`.trim(),
      'IQAMA/National ID': item.employee?.iqama_number || '',
      'Nationality': item.employee?.is_saudi ? 'Saudi' : 'Non-Saudi',
      'Basic Salary': item.basic_salary,
      'Housing Allowance': item.housing_allowance,
      'Transportation Allowance': item.transportation_allowance,
      'Food Allowance': item.food_allowance,
      'Mobile Allowance': item.mobile_allowance,
      'Other Allowances': item.other_allowances,
      'Overtime': item.overtime_amount,
      'Bonus': item.bonus_amount,
      'Commission': item.commission_amount,
      'Total Earnings': item.total_earnings,
      'GOSI (Employee)': item.gosi_employee,
      'GOSI (Employer)': item.gosi_employer,
      'Loan Deduction': item.loan_deduction,
      'Advance Deduction': item.advance_deduction,
      'Absence Deduction': item.absence_deduction,
      'Other Deductions': item.other_deductions,
      'Total Deductions': item.total_deductions,
      'Net Salary': item.net_salary,
      'Days Worked': item.days_worked,
      'Overtime Hours': item.overtime_hours,
      'Absence Days': item.absence_days,
      'Payment Method': item.payment_method,
      'Payment Status': item.payment_status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll_${batch.month}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      processed: 'bg-blue-100 text-blue-800',
      paid: 'bg-emerald-100 text-emerald-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const totalPayroll = batches.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.total_net || 0), 0);
  const pendingBatches = batches.filter(b => b.status === 'pending_approval').length;
  const draftBatches = batches.filter(b => b.status === 'draft').length;
  const paidBatches = batches.filter(b => b.status === 'paid').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payroll Management</h2>
          <p className="text-sm text-gray-600 mt-1">Comprehensive payroll processing with Saudi compliance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['batches', 'analytics'] as ActiveView[]).map(v => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {v === 'batches' ? 'Batches' : 'Analytics'}
            </button>
          ))}
          {canManage && (
            <button
              onClick={() => setActiveView('create')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Batch
            </button>
          )}
        </div>
      </div>

      {activeView === 'create' && (
        <div>
          <button
            onClick={() => { setActiveView('batches'); fetchBatches(); }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back to Batches
          </button>
          <PayrollBatchCreator onBatchCreated={() => { setActiveView('batches'); fetchBatches(); }} />
        </div>
      )}

      {activeView === 'analytics' && (
        <PayrollAnalytics companyId={currentCompany?.id || ''} batches={batches} />
      )}

      {activeView === 'items' && selectedBatch && (
        <div>
          <button
            onClick={() => setActiveView('batches')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back to Batches
          </button>

          <div className="bg-white rounded-lg border border-gray-200 mb-4 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedBatch.month}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(selectedBatch.period_start).toLocaleDateString()} – {new Date(selectedBatch.period_end).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBatch.status)}`}>
                  {selectedBatch.status.replace('_', ' ').toUpperCase()}
                </span>
                <button
                  onClick={() => exportBatch(selectedBatch)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Total Gross</p>
                <p className="text-lg font-bold text-gray-900">SAR {Number(selectedBatch.total_gross || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Deductions</p>
                <p className="text-lg font-bold text-red-600">-SAR {Number(selectedBatch.total_deductions || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Payroll</p>
                <p className="text-lg font-bold text-green-600">SAR {Number(selectedBatch.total_net || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Basic</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allowances</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payrollItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No payroll items found</td>
                    </tr>
                  ) : payrollItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {item.employee?.first_name_en} {item.employee?.last_name_en}
                        </p>
                        <p className="text-xs text-gray-500">{item.employee?.employee_number}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {Number(item.basic_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {Number((item.housing_allowance || 0) + (item.transportation_allowance || 0) + (item.food_allowance || 0) + (item.mobile_allowance || 0) + (item.other_allowances || 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {Number(item.total_earnings || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">
                        -{Number(item.total_deductions || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                        {Number(item.net_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedPayrollItem({ itemId: item.id, employeeId: item.employee_id });
                            setShowPayslip(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Payslip"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'batches' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Batches', value: batches.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Pending Approval', value: pendingBatches, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Paid Batches', value: paidBatches, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Total Paid YTD', value: `SAR ${totalPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{kpi.label}</p>
                      <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payroll Batches</h3>
              <span className="text-sm text-gray-500">{batches.length} total</span>
            </div>

            {batches.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No payroll batches yet</p>
                {canManage && (
                  <button
                    onClick={() => setActiveView('create')}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Create your first batch
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Employees</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batches.map(batch => (
                      <tr key={batch.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{batch.month}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(batch.period_start).toLocaleDateString()} – {new Date(batch.period_end).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">{batch.total_employees}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          SAR {Number(batch.total_gross || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                          SAR {Number(batch.total_net || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(batch.status)}`}>
                            {batch.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setSelectedBatch(batch); setActiveView('items'); }}
                              className="text-blue-600 hover:text-blue-800"
                              title="View Items"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canManage && batch.status === 'draft' && (
                              <button
                                onClick={() => updateBatchStatus(batch.id, 'pending_approval')}
                                className="text-yellow-600 hover:text-yellow-800"
                                title="Submit for Approval"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            {canManage && batch.status === 'pending_approval' && (
                              <button
                                onClick={() => updateBatchStatus(batch.id, 'approved')}
                                className="text-green-600 hover:text-green-800"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {canManage && batch.status === 'approved' && (
                              <button
                                onClick={async () => { await generatePayslips(batch.id); updateBatchStatus(batch.id, 'processed'); }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Process & Generate Payslips"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            {canManage && batch.status === 'processed' && (
                              <button
                                onClick={() => updateBatchStatus(batch.id, 'paid')}
                                className="text-emerald-600 hover:text-emerald-800"
                                title="Mark as Paid"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            {canManage && batch.status === 'draft' && (
                              <button
                                onClick={() => setDeleteConfirm(batch.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedBatch(batch);
                                fetchPayrollItems(batch.id).then(() => exportBatch(batch));
                              }}
                              className="text-gray-600 hover:text-gray-800"
                              title="Export Excel"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteBatch}
        title="Delete Payroll Batch"
        message="Are you sure you want to delete this draft payroll batch? This action cannot be undone."
        confirmLabel="Delete"
        type="danger"
      />

      {showPayslip && selectedPayrollItem && (
        <PayslipViewer
          payrollItemId={selectedPayrollItem.itemId}
          employeeId={selectedPayrollItem.employeeId}
          onClose={() => setShowPayslip(false)}
        />
      )}
    </div>
  );
}
