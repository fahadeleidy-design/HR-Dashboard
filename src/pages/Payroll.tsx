import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DollarSign, FileText, Settings, BarChart3, Download } from 'lucide-react';
import ComprehensivePayrollDashboard from '../components/payroll/ComprehensivePayrollDashboard';
import WPSFileGenerator from '../components/payroll/WPSFileGenerator';
import { PayrollBatchCreator } from '../components/payroll/PayrollBatchCreator';
import { Tabs } from '../components/ui/Tabs';
import { useCompany } from '../contexts/CompanyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { usePagination } from '../hooks/usePagination';
import { supabase } from '../lib/supabase';
import { PayslipViewer } from '../components/PayslipViewer';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Pagination } from '../components/ui/Pagination';

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

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  is_saudi: boolean;
  iqama_number: string;
}

interface Loan {
  id: string;
  employee_id: string;
  loan_amount: number;
  remaining_amount: number;
  monthly_installment: number;
  status: string;
}

interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  remaining_amount: number;
  deduction_amount: number;
  status: string;
}

type View = 'batches' | 'items' | 'create' | 'analytics';

export function Payroll() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const { logError, logActivity } = useErrorHandler();
  const [searchParams] = useSearchParams();
  const employeeIdParam = searchParams.get('employee_id');
  const isFinanceOrAdmin = ['finance', 'hr', 'admin', 'super_admin'].includes(userRole?.role || '');
  const isEmployee = userRole?.role === 'employee';
  const hasEmployeeProfile = !!userRole?.employee_id;
  const [view, setView] = useState<View>(isEmployee ? 'items' : 'batches');
  const [viewingMyPayslip, setViewingMyPayslip] = useState(false);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [filteredPayrollItems, setFilteredPayrollItems] = useState<PayrollItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayslip, setShowPayslip] = useState(false);
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<{ itemId: string; employeeId: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pagination = usePagination(filteredPayrollItems, { initialPageSize: 10 });

  useEffect(() => {
    if (currentCompany) {
      if (isEmployee) {
        fetchBatches();
        fetchLoans();
        fetchAdvances();
      } else {
        fetchBatches();
        fetchEmployees();
        fetchLoans();
        fetchAdvances();
      }
    }
  }, [currentCompany, isEmployee]);

  useEffect(() => {
    if (selectedBatch) {
      fetchPayrollItems(selectedBatch.id);
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (employeeIdParam && batches.length > 0) {
      setView('items');
      const latestBatch = batches[0];
      setSelectedBatch(latestBatch);
    } else if (isEmployee && batches.length > 0 && userRole?.employee_id) {
      const latestBatch = batches[0];
      setSelectedBatch(latestBatch);
      setView('items');
    }
  }, [employeeIdParam, batches, isEmployee, userRole]);

  useEffect(() => {
    if (employeeIdParam && payrollItems.length > 0) {
      const filtered = payrollItems.filter(item => item.employee_id === employeeIdParam);
      setFilteredPayrollItems(filtered);
    } else if ((isEmployee || viewingMyPayslip) && userRole?.employee_id && payrollItems.length > 0) {
      const filtered = payrollItems.filter(item => item.employee_id === userRole.employee_id);
      setFilteredPayrollItems(filtered);
    } else {
      setFilteredPayrollItems(payrollItems);
    }
  }, [employeeIdParam, payrollItems, isEmployee, userRole, viewingMyPayslip]);

  const fetchBatches = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll_batches')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('month', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Payroll', action: 'fetchBatches' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollItems = async (batchId: string) => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('payroll_items')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en, is_saudi, iqama_number)
        `)
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayrollItems(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Payroll', action: 'fetchPayrollItems' });
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
      logError(error, 'medium', { component: 'Payroll', action: 'fetchEmployees' });
    }
  };

  const fetchLoans = async () => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active');

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Payroll', action: 'fetchLoans' });
    }
  };

  const fetchAdvances = async () => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .eq('company_id', currentCompany.id)
        .in('status', ['approved', 'active']);

      if (error) throw error;
      setAdvances(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Payroll', action: 'fetchAdvances' });
    }
  };


  const updateBatchStatus = async (batchId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('payroll_batches')
        .update({
          status,
          ...(status === 'approved' && { approved_at: new Date().toISOString() })
        })
        .eq('id', batchId);

      if (error) throw error;

      showToast(`Batch status updated to ${status}`, 'success');
      logActivity('payroll_batch_status_updated', { batchId, status });
      fetchBatches();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Payroll', action: 'updateBatchStatus' });
      showToast('Failed to update batch status: ' + error.message, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const batchId = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const { error: itemsError } = await supabase
        .from('payroll_items')
        .delete()
        .eq('batch_id', batchId);

      if (itemsError) throw itemsError;

      const { error: batchError } = await supabase
        .from('payroll_batches')
        .delete()
        .eq('id', batchId);

      if (batchError) throw batchError;

      showToast('Batch deleted successfully', 'success');
      logActivity('payroll_batch_deleted', { batchId });
      fetchBatches();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Payroll', action: 'deleteBatch' });
      showToast('Failed to delete batch: ' + error.message, 'error');
    }
  };

  const generatePayslips = async (batchId: string) => {
    try {
      const items = await supabase
        .from('payroll_items')
        .select('id, employee_id, company_id')
        .eq('batch_id', batchId);

      if (!items.data) return;

      const payslipsToInsert = items.data.map(item => ({
        payroll_item_id: item.id,
        employee_id: item.employee_id,
        company_id: item.company_id
      }));

      const { error } = await supabase
        .from('payslips')
        .insert(payslipsToInsert);

      if (error) throw error;

      showToast(`Generated ${payslipsToInsert.length} payslips!`, 'success');
      logActivity('payslips_generated', { batchId, count: payslipsToInsert.length });
    } catch (error: any) {
      logError(error, 'medium', { component: 'Payroll', action: 'generatePayslips' });
      showToast('Failed to generate payslips: ' + error.message, 'error');
    }
  };

  const exportBatch = (batch: PayrollBatch) => {
    const exportData = payrollItems.map((item) => ({
      'Employee Number': item.employee?.employee_number || '',
      'IQAMA Number': item.employee?.iqama_number || '',
      'Employee Name': `${item.employee?.first_name_en || ''} ${item.employee?.last_name_en || ''}`.trim(),
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
      'GOSI Employee': item.gosi_employee,
      'GOSI Employer': item.gosi_employer,
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
      'Payment Status': item.payment_status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll_${batch.month}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEmployee ? t.payroll.payslips : t.payroll.title}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEmployee
              ? t.payroll.viewPayslip
              : t.payroll.subtitle
            }
          </p>
        </div>
        {!isEmployee && (
          <div className={`flex flex-wrap ${isRTL ? 'space-x-reverse flex-row-reverse' : ''} gap-2`}>
            <button
              onClick={() => { setView('batches'); setViewingMyPayslip(false); }}
              className={`flex items-center ${isRTL ? 'space-x-reverse flex-row-reverse' : ''} space-x-2 px-4 py-2 rounded-md transition-colors ${
                view === 'batches' && !viewingMyPayslip ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>{t.payroll.payrollBatch}</span>
            </button>
            {hasEmployeeProfile && (
              <button
                onClick={() => {
                  setViewingMyPayslip(true);
                  setView('items');
                  if (batches.length > 0) {
                    setSelectedBatch(batches[0]);
                  }
                }}
                className={`flex items-center ${isRTL ? 'space-x-reverse flex-row-reverse' : ''} space-x-2 px-4 py-2 rounded-md transition-colors ${
                  viewingMyPayslip ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>{language === 'ar' ? 'كشف راتبي' : 'My Payslip'}</span>
              </button>
            )}
            <button
              onClick={() => { setView('analytics'); setViewingMyPayslip(false); }}
              className={`flex items-center ${isRTL ? 'space-x-reverse flex-row-reverse' : ''} space-x-2 px-4 py-2 rounded-md transition-colors ${
                view === 'analytics' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>{t.payroll.payrollAnalytics}</span>
            </button>
            <button
              onClick={() => { setView('create'); setViewingMyPayslip(false); }}
              className={`flex items-center ${isRTL ? 'space-x-reverse flex-row-reverse' : ''} space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors`}
            >
              <Plus className="h-4 w-4" />
              <span>{t.common.create}</span>
            </button>
          </div>
        )}
      </div>

      {!isEmployee && !viewingMyPayslip && view === 'batches' && (
        <div className="space-y-6">
          {batches.length > 0 && (
            <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-blue-900">{t.payroll.payrollBatch}: {batches[0].month}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {batches[0].total_employees} {t.common.employees} | SAR {Number(batches[0].total_net || 0).toLocaleString()} {t.common.total}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedBatch(batches[0]);
                    setView('items');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  {t.common.viewDetails}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-sm text-gray-600">{t.payroll.totalPayroll}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{batches.length}</p>
                </div>
                <FileText className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-sm text-gray-600">{t.performance.draft}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {batches.filter(b => b.status === 'draft').length}
                  </p>
                </div>
                <AlertCircle className="h-12 w-12 text-gray-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-sm text-gray-600">{t.leave.approved}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {batches.filter(b => b.status === 'approved').length}
                  </p>
                </div>
                <Check className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Paid Batches</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {batches.filter(b => b.status === 'paid').length}
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Payroll Batches</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Gross</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Net</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No payroll batches found. Click "New Batch" to create one.
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {batch.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(batch.period_start).toLocaleDateString()} - {new Date(batch.period_end).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {batch.total_employees}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          SAR {Number(batch.total_gross || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          SAR {Number(batch.total_net || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                            {getStatusLabel(batch.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedBatch(batch);
                                setView('items');
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="View Items"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {batch.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => updateBatchStatus(batch.id, 'pending_approval')}
                                  className="text-yellow-600 hover:text-yellow-800"
                                  title="Submit for Approval"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(batch.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {batch.status === 'pending_approval' && (
                              <button
                                onClick={() => updateBatchStatus(batch.id, 'approved')}
                                className="text-green-600 hover:text-green-800"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            {batch.status === 'approved' && (
                              <button
                                onClick={() => {
                                  generatePayslips(batch.id);
                                  updateBatchStatus(batch.id, 'processed');
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Process & Generate Payslips"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            )}
                            {batch.status === 'processed' && (
                              <button
                                onClick={() => updateBatchStatus(batch.id, 'paid')}
                                className="text-emerald-600 hover:text-emerald-800"
                                title="Mark as Paid"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedBatch(batch);
                                fetchPayrollItems(batch.id);
                                setTimeout(() => exportBatch(batch), 500);
                              }}
                              className="text-gray-600 hover:text-gray-800"
                              title="Export"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === 'items' && selectedBatch && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              {!isEmployee && !viewingMyPayslip && (
                <button
                  onClick={() => {
                    setView('batches');
                    setSelectedBatch(null);
                  }}
                  className="text-primary-600 hover:text-primary-800 mb-2"
                >
                  ← Back to Batches
                </button>
              )}
              <h2 className="text-2xl font-bold text-gray-900">
                {(isEmployee || viewingMyPayslip) ? `${language === 'ar' ? 'كشف راتبي' : 'My Payslip'} - ${selectedBatch.month}` : `Payroll Items - ${selectedBatch.month}`}
              </h2>
              {!isEmployee && !viewingMyPayslip && (
                <p className="text-gray-600">
                  {selectedBatch.total_employees} employees | Status: {getStatusLabel(selectedBatch.status)}
                </p>
              )}
              {employeeIdParam && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Showing payroll records for employee ID: {employeeIdParam}
                      {filteredPayrollItems.length > 0 && filteredPayrollItems[0].employee && (
                        <span className="font-medium ml-1">
                          ({filteredPayrollItems[0].employee.first_name_en} {filteredPayrollItems[0].employee.last_name_en})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isEmployee && !viewingMyPayslip && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Gross</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      SAR {Number(selectedBatch.total_gross || 0).toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Deductions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      SAR {Number(selectedBatch.total_deductions || 0).toLocaleString()}
                    </p>
                  </div>
                  <Calculator className="h-12 w-12 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Net</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      SAR {Number(selectedBatch.total_net || 0).toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 text-blue-600" />
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allowances</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus/OT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Earnings</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GOSI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loans/Adv</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Ded</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayrollItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        {employeeIdParam ? 'No payroll records found for this employee.' : 'No payroll items found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPayrollItems.slice(pagination.startIndex, pagination.endIndex).map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.employee?.first_name_en} {item.employee?.last_name_en}
                          </div>
                          <div className="text-xs text-gray-500">{item.employee?.employee_number}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Number(item.basic_salary || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(Number(item.housing_allowance || 0) + Number(item.transportation_allowance || 0) +
                            Number(item.food_allowance || 0) + Number(item.mobile_allowance || 0) +
                            Number(item.other_allowances || 0)).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(Number(item.bonus_amount || 0) + Number(item.overtime_amount || 0) +
                            Number(item.commission_amount || 0)).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {Number(item.total_earnings || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">
                          -{(Number(item.gosi_employee || 0)).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">
                          -{(Number(item.loan_deduction || 0) + Number(item.advance_deduction || 0)).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          -{Number(item.total_deductions || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {Number(item.net_salary || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.days_worked}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedPayrollItem({ itemId: item.id, employeeId: item.employee_id });
                              setShowPayslip(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="View Payslip"
                          >
                            <FileText className="h-4 w-4" />
                            Payslip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredPayrollItems.length > 0 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                pageSize={pagination.pageSize}
                pageSizeOptions={pagination.pageSizeOptions}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                onNext={pagination.nextPage}
                onPrev={pagination.prevPage}
                onFirst={pagination.goToFirst}
                onLast={pagination.goToLast}
                isRTL={isRTL}
              />
            )}
          </div>
        </div>
      )}

      {!isEmployee && view === 'create' && (
        <PayrollBatchCreator
          onBack={() => setView('batches')}
          onBatchCreated={async (batchId) => {
            await fetchBatches();
            const { data: newBatch } = await supabase
              .from('payroll_batches')
              .select('*')
              .eq('id', batchId)
              .maybeSingle();
            if (newBatch) {
              setSelectedBatch(newBatch);
              await fetchPayrollItems(batchId);
            }
            setView('items');
          }}
        />
      )}

      {!isEmployee && view === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payroll (All Time)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    SAR {batches.reduce((sum, b) => sum + (Number(b.total_net) || 0), 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Monthly Payroll</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    SAR {batches.length > 0
                      ? (batches.reduce((sum, b) => sum + (Number(b.total_net) || 0), 0) / batches.length).toLocaleString(undefined, {maximumFractionDigits: 0})
                      : '0'}
                  </p>
                </div>
                <Calculator className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Loans</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{loans.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    SAR {loans.reduce((sum, l) => sum + (Number(l.remaining_amount) || 0), 0).toLocaleString()} remaining
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Advances</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{advances.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    SAR {advances.reduce((sum, a) => sum + (Number(a.remaining_amount) || 0), 0).toLocaleString()} remaining
                  </p>
                </div>
                <Users className="h-12 w-12 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Payroll Trend</h3>
            <div className="space-y-3">
              {batches.slice(0, 6).map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{batch.month}</p>
                    <p className="text-sm text-gray-500">{batch.total_employees} employees</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">SAR {Number(batch.total_net || 0).toLocaleString()}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(batch.status)}`}>
                      {getStatusLabel(batch.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPayslip && selectedPayrollItem && currentCompany && (
        <PayslipViewer
          payrollItemId={selectedPayrollItem.itemId}
          employeeId={selectedPayrollItem.employeeId}
          companyId={currentCompany.id}
          onClose={() => {
            setShowPayslip(false);
            setSelectedPayrollItem(null);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Payroll Batch"
        message="Are you sure you want to delete this draft batch? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
