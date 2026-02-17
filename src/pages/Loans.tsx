import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Plus, DollarSign, TrendingDown, CheckCircle, XCircle, Edit, Trash2, Eye, Clock, Users, Download, Search, Filter, Banknote } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { SearchableSelect } from '@/components/SearchableSelect';
import { RequestDetailModal } from '@/components/workflow/RequestDetailModal';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { loanRequestSchema } from '@/lib/validation/schemas';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FieldError } from '@/components/ui/FieldError';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

interface Loan {
  id: string;
  employee_id: string;
  loan_type: string;
  loan_amount: number;
  remaining_amount: number;
  monthly_installment: number;
  number_of_installments: number;
  start_date: string;
  end_date?: string;
  status: string;
  notes?: string;
  manager_approved_by?: string;
  manager_approved_at?: string;
  hr_approved_by?: string;
  hr_approved_at?: string;
  finance_approved_by?: string;
  finance_approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
  };
}

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
}

interface LoanEligibility {
  employee_id: string;
  max_loan_amount: number;
  outstanding_loans: number;
  outstanding_advances: number;
  available_loan_amount: number;
  loans_this_year: number;
  is_eligible: boolean;
  eligibility_status: string;
}

export function Loans() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const { logError, logActivity } = useErrorHandler();
  const { fieldErrors, validateForm, clearErrors } = useFormValidation(loanRequestSchema);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    loan_type: 'personal',
    loan_amount: 0,
    number_of_installments: 6,
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingLoanId, setRejectingLoanId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredLoans = loans.filter(loan => {
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    const matchesSearch = !searchQuery ||
      loan.employee.first_name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.employee.last_name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.employee.employee_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.loan_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const { sortedData, sortConfig, requestSort } = useSortableData(filteredLoans);
  const pagination = usePagination(sortedData, { initialPageSize: 25 });

  useEffect(() => {
    if (currentCompany) {
      fetchLoans();
      fetchEmployees();
    }
  }, [currentCompany]);

  useEffect(() => {
    if (formData.employee_id) {
      fetchLoanEligibility(formData.employee_id);
    } else {
      setLoanEligibility(null);
    }
  }, [formData.employee_id]);

  const fetchLoans = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Loans', action: 'fetchLoans' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    if (userRole?.role === 'employee' && userRole.employee_id) {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en')
        .eq('id', userRole.employee_id)
        .single();

      if (!error && data) {
        setEmployees([data]);
        setFormData(prev => ({ ...prev, employee_id: data.id }));
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('employee_number');

      if (error) {
        logError(error, 'medium', { component: 'Loans', action: 'fetchEmployees' });
        return;
      }

      setEmployees(data || []);
    } catch (error: any) {
      logError(error, 'medium', { component: 'Loans', action: 'fetchEmployees' });
    }
  };

  const fetchLoanEligibility = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('loan_eligibility')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) {
        logError(error, 'medium', { component: 'Loans', action: 'fetchLoanEligibility' });
        return;
      }

      setLoanEligibility(data);
    } catch (error: any) {
      logError(error, 'medium', { component: 'Loans', action: 'fetchLoanEligibility' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    const { isValid } = validateForm({
      employee_id: formData.employee_id,
      loan_type: formData.loan_type,
      loan_amount: formData.loan_amount,
      number_of_installments: formData.number_of_installments,
      start_date: formData.start_date,
    });
    if (!isValid) {
      showToast({ type: 'warning', title: 'Please fix the validation errors' });
      return;
    }

    if (!formData.employee_id) {
      showToast({ type: 'warning', title: t.loans.pleaseSelectEmployee });
      return;
    }

    if (formData.number_of_installments > 6 || formData.number_of_installments < 1) {
      showToast({ type: 'warning', title: t.loans.installmentsBetween1And6 });
      return;
    }

    if (loanEligibility && formData.loan_amount > loanEligibility.available_loan_amount) {
      showToast({ type: 'warning', title: `${t.loans.loanExceedsAvailable} (${formatCurrency(loanEligibility.available_loan_amount, language)})` });
      return;
    }

    try {
      const loanData = {
        company_id: currentCompany.id,
        employee_id: formData.employee_id,
        loan_type: formData.loan_type.toLowerCase(),
        loan_amount: formData.loan_amount,
        number_of_installments: formData.number_of_installments,
        start_date: formData.start_date,
        status: 'pending',
        notes: formData.notes
      };

      if (editingLoan) {
        const { error } = await supabase
          .from('loans')
          .update(loanData)
          .eq('id', editingLoan.id);

        if (error) throw error;
        showToast({ type: 'success', title: t.loans.loanUpdatedSuccess });
        logActivity('loan_updated', { component: 'Loans', loanId: editingLoan.id });
      } else {
        const { data, error } = await supabase
          .from('loans')
          .insert([loanData])
          .select();

        if (error) {
          throw error;
        }
        showToast({ type: 'success', title: t.loans.loanCreatedSuccess });
        logActivity('loan_created', { component: 'Loans', employeeId: formData.employee_id });
      }

      resetForm();
      fetchLoans();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Loans', action: 'saveLoan' });
      showToast({ type: 'error', title: t.loans.failedToSave + ': ' + error.message });
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      employee_id: loan.employee_id,
      loan_type: loan.loan_type,
      loan_amount: loan.loan_amount,
      number_of_installments: loan.number_of_installments || 6,
      start_date: loan.start_date,
      notes: loan.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', deleteConfirm);

      if (error) throw error;
      showToast({ type: 'success', title: t.loans.loanDeletedSuccess });
      logActivity('loan_deleted', { component: 'Loans', loanId: deleteConfirm });
      fetchLoans();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Loans', action: 'deleteLoan' });
      showToast({ type: 'error', title: t.loans.failedToDelete + ': ' + error.message });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      showToast({ type: 'success', title: t.loans.loanStatusUpdated });
      logActivity('loan_status_changed', { component: 'Loans', loanId: id, newStatus: status });
      fetchLoans();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Loans', action: 'updateLoanStatus' });
      showToast({ type: 'error', title: t.loans.failedToUpdateStatus + ': ' + error.message });
    }
  };

  const handleFinanceApprove = async (id: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'active',
          finance_approved_by: userData.user?.id,
          finance_approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      showToast({ type: 'success', title: language === 'ar' ? 'تمت الموافقة المالية على القرض' : 'Loan approved by Finance' });
      logActivity('loan_finance_approved', { component: 'Loans', loanId: id });
      fetchLoans();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Loans', action: 'financeApproveLoan' });
      showToast({ type: 'error', title: error.message });
    }
  };

  const handleFinanceReject = async () => {
    if (!rejectingLoanId) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'rejected',
          rejected_by: userData.user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', rejectingLoanId);

      if (error) throw error;
      showToast({ type: 'success', title: language === 'ar' ? 'تم رفض القرض' : 'Loan rejected' });
      logActivity('loan_finance_rejected', { component: 'Loans', loanId: rejectingLoanId });
      setRejectingLoanId(null);
      setRejectionReason('');
      fetchLoans();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Loans', action: 'financeRejectLoan' });
      showToast({ type: 'error', title: error.message });
    }
  };

  const handleExport = () => {
    const exportData = loans.map(loan => ({
      [language === 'ar' ? 'رقم الموظف' : 'Employee Number']: loan.employee.employee_number,
      [language === 'ar' ? 'اسم الموظف' : 'Employee Name']: `${loan.employee.first_name_en} ${loan.employee.last_name_en}`,
      [language === 'ar' ? 'نوع القرض' : 'Loan Type']: loan.loan_type,
      [language === 'ar' ? 'مبلغ القرض' : 'Loan Amount']: loan.loan_amount,
      [language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Amount']: loan.remaining_amount,
      [language === 'ar' ? 'القسط الشهري' : 'Monthly Installment']: loan.monthly_installment,
      [language === 'ar' ? 'عدد الأقساط' : 'Installments']: loan.number_of_installments,
      [language === 'ar' ? 'تاريخ البدء' : 'Start Date']: loan.start_date,
      [language === 'ar' ? 'الحالة' : 'Status']: loan.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, `loans_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast({ type: 'success', title: language === 'ar' ? 'تم تصدير التقرير' : 'Report exported' });
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      loan_type: 'personal',
      loan_amount: 0,
      number_of_installments: 6,
      start_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingLoan(null);
    setLoanEligibility(null);
    setShowForm(false);
    clearErrors();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'manager_approved': return 'bg-blue-100 text-blue-800';
      case 'hr_approved': return 'bg-indigo-100 text-indigo-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; labelAr: string }> = {
      pending: { label: 'Pending Manager', labelAr: 'بانتظار المدير' },
      manager_approved: { label: 'Pending HR', labelAr: 'بانتظار الموارد البشرية' },
      hr_approved: { label: 'Pending Finance', labelAr: 'بانتظار المالية' },
      active: { label: 'Active', labelAr: 'نشط' },
      approved: { label: 'Approved', labelAr: 'موافق عليه' },
      completed: { label: 'Completed', labelAr: 'مكتمل' },
      cancelled: { label: 'Cancelled', labelAr: 'ملغى' },
      rejected: { label: 'Rejected', labelAr: 'مرفوض' }
    };
    return statusMap[status] || { label: status.toUpperCase(), labelAr: status };
  };

  const handleViewDetails = (loanId: string) => {
    setSelectedLoanId(loanId);
    setShowDetailModal(true);
  };

  const totalLoans = loans.reduce((sum, loan) => sum + Number(loan.loan_amount || 0), 0);
  const totalRemaining = loans.reduce((sum, loan) => sum + Number(loan.remaining_amount || 0), 0);
  const activeLoans = loans.filter(l => l.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">{t.loans.title}</h1>
          <p className="text-gray-600 mt-1">{t.loans.subtitle}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="h-4 w-4" />
            <span>{t.common.export}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="h-4 w-4" />
            <span>{t.loans.newLoan}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.loans.totalLoans}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalLoans, language)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.loans.totalRemaining}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalRemaining, language)}
              </p>
            </div>
            <TrendingDown className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.loans.activeLoans}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(activeLoans, language)}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{language === 'ar' ? 'بانتظار المالية' : 'Pending Finance'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(loans.filter(l => l.status === 'hr_approved').length, language)}
              </p>
            </div>
            <Banknote className="h-12 w-12 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث بالاسم أو الرقم...' : 'Search by name or number...'}
              className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
            />
          </div>
          <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            {['all', 'pending', 'manager_approved', 'hr_approved', 'active', 'completed', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? (language === 'ar' ? 'الكل' : 'All') :
                 isRTL ? getStatusDisplay(status).labelAr : getStatusDisplay(status).label}
                {status !== 'all' && (
                  <span className={`${isRTL ? 'mr-1' : 'ml-1'} text-xs opacity-75`}>
                    ({loans.filter(l => l.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label={t.common.employee}
                  sortKey="employee.first_name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.loans.loanType}
                  sortKey="loan_type"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.loans.loanAmount}
                  sortKey="loan_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.loans.remaining}
                  sortKey="remaining_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.loans.monthlyInstallment}
                  sortKey="monthly_installment"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>
                  {t.loans.progress}
                </th>
                <SortableTableHeader
                  label={t.common.status}
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No loans found. Click "New Loan" to create one.
                  </td>
                </tr>
              ) : (
                pagination.paginatedData.map((loan) => {
                  const progress = ((loan.loan_amount - loan.remaining_amount) / loan.loan_amount) * 100;
                  return (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {loan.employee.first_name_en} {loan.employee.last_name_en}
                        </div>
                        <div className="text-sm text-gray-500">{loan.employee.employee_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {loan.loan_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {Number(loan.loan_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        SAR {Number(loan.remaining_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          SAR {Number(loan.monthly_installment || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {loan.number_of_installments} months
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% paid</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                          {isRTL ? getStatusDisplay(loan.status).labelAr : getStatusDisplay(loan.status).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={`flex space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <button
                            onClick={() => handleViewDetails(loan.id)}
                            className="text-primary-600 hover:text-primary-800"
                            title={isRTL ? 'عرض التفاصيل' : 'View Details'}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {loan.status === 'hr_approved' && userRole?.role && ['finance', 'super_admin'].includes(userRole.role) && (
                            <>
                              <button
                                onClick={() => handleFinanceApprove(loan.id)}
                                className="text-green-600 hover:text-green-800"
                                title={isRTL ? 'موافقة مالية' : 'Finance Approve'}
                              >
                                <Banknote className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setRejectingLoanId(loan.id)}
                                className="text-red-600 hover:text-red-800"
                                title={isRTL ? 'رفض مالي' : 'Finance Reject'}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {userRole?.role && ['hr', 'finance', 'super_admin', 'admin'].includes(userRole.role) && (
                            <>
                              <button
                                onClick={() => handleEdit(loan)}
                                className="text-blue-600 hover:text-blue-800"
                                title={isRTL ? 'تعديل' : 'Edit'}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {loan.status === 'active' && (
                                <button
                                  onClick={() => handleStatusChange(loan.id, 'completed')}
                                  className="text-green-600 hover:text-green-800"
                                  title={isRTL ? 'اكتمل' : 'Mark as Completed'}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {['pending', 'manager_approved'].includes(loan.status) && (
                                <button
                                  onClick={() => handleStatusChange(loan.id, 'cancelled')}
                                  className="text-red-600 hover:text-red-800"
                                  title={isRTL ? 'إلغاء' : 'Cancel'}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                          {userRole?.role && ['hr', 'finance', 'super_admin'].includes(userRole.role) && (
                            <button
                              onClick={() => handleDelete(loan.id)}
                              className="text-red-600 hover:text-red-800"
                              title={isRTL ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-200">
              <h2 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {editingLoan ? t.loans.editLoan : t.loans.newLoan}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className={`text-sm font-semibold text-blue-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t.loans.loanPolicy}</h3>
                <ul className={`text-sm text-blue-800 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <li>• {t.loans.policyMaxLoan}</li>
                  <li>• {t.loans.policyMaxRepayment}</li>
                  <li>• {t.loans.policyEqualInstallments}</li>
                  <li>• {t.loans.policyNoAdvance}</li>
                  <li>• {t.loans.policyOnePerYear}</li>
                </ul>
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.loans.employee} *
                </label>
                {employees.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-md text-sm text-yellow-800">
                    {t.loans.loadingEmployees}
                  </div>
                ) : userRole?.role === 'employee' ? (
                  <div>
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-sm text-gray-700">
                      {employees[0] && `${employees[0].employee_number} - ${employees[0].first_name_en} ${employees[0].last_name_en}`}
                    </div>
                    <p className={`mt-1 text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t.loans.selfServiceNote}</p>
                  </div>
                ) : (
                  <SearchableSelect
                    options={[
                      { value: '', label: t.loans.pleaseSelectEmployee },
                      ...employees.map(emp => ({
                        value: emp.id,
                        label: `${emp.employee_number} - ${emp.first_name_en} ${emp.last_name_en}`,
                        searchText: `${emp.employee_number} ${emp.first_name_en} ${emp.last_name_en}`
                      }))
                    ]}
                    value={formData.employee_id}
                    onChange={(value) => setFormData({ ...formData, employee_id: value })}
                    placeholder={t.employees.selectEmployee}
                  />
                )}
              </div>

              {loanEligibility && (
                <div className={`border rounded-lg p-4 ${
                  loanEligibility.is_eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    loanEligibility.is_eligible ? 'text-green-900' : 'text-red-900'
                  } ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.loans.loanEligibility}
                  </h3>
                  <div className={`text-sm space-y-1 ${
                    loanEligibility.is_eligible ? 'text-green-800' : 'text-red-800'
                  }`}>
                    <p>{t.loans.maxLoanAmount}: {formatCurrency(loanEligibility.max_loan_amount, language)}</p>
                    <p>{t.loans.outstandingLoansLabel}: {formatCurrency(loanEligibility.outstanding_loans, language)}</p>
                    <p>{t.loans.outstandingAdvancesLabel}: {formatCurrency(loanEligibility.outstanding_advances, language)}</p>
                    <p>{t.loans.loansThisYear}: {loanEligibility.loans_this_year}</p>
                    <p className="font-semibold">{t.loans.availableAmount}: {formatCurrency(loanEligibility.available_loan_amount, language)}</p>
                    <p className="font-semibold">{t.loans.eligibilityStatus}: {loanEligibility.eligibility_status}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.loans.loanType} *
                  </label>
                  <select
                    value={formData.loan_type}
                    onChange={(e) => setFormData({ ...formData, loan_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="personal">{t.loans.personal}</option>
                    <option value="housing">{t.loans.housing}</option>
                    <option value="emergency">{t.loans.emergency}</option>
                    <option value="other">{t.loans.other}</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.loans.startDate} *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <FieldError error={fieldErrors.start_date} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.loans.loanAmountSar} *
                  </label>
                  <input
                    type="number"
                    value={formData.loan_amount}
                    onChange={(e) => setFormData({ ...formData, loan_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    min="0"
                    step="0.01"
                    max={loanEligibility?.available_loan_amount || undefined}
                  />
                  <FieldError error={fieldErrors.loan_amount} />
                  {loanEligibility && formData.loan_amount > loanEligibility.available_loan_amount && (
                    <p className="text-xs text-red-600 mt-1">
                      {t.loans.exceedsAvailableAmount}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.loans.numberOfInstallments} *
                  </label>
                  <select
                    value={formData.number_of_installments}
                    onChange={(e) => setFormData({ ...formData, number_of_installments: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value={1}>1 {t.loans.month}</option>
                    <option value={2}>2 {t.loans.months}</option>
                    <option value={3}>3 {t.loans.months}</option>
                    <option value={4}>4 {t.loans.months}</option>
                    <option value={5}>5 {t.loans.months}</option>
                    <option value={6}>6 {t.loans.months}</option>
                  </select>
                  <FieldError error={fieldErrors.number_of_installments} />
                  <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.loans.maximumSixMonths}</p>
                </div>
              </div>

              {formData.loan_amount > 0 && formData.number_of_installments > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800 font-semibold">
                    {t.loans.monthlyInstallment}: {formatCurrency(formData.loan_amount / formData.number_of_installments, language)}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {t.loans.expectedCompletion}: {new Date(new Date(formData.start_date).setMonth(
                      new Date(formData.start_date).getMonth() + formData.number_of_installments
                    )).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.loans.notes}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div className={`flex justify-end gap-3 pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {t.loans.cancel}
                </button>
                <button
                  type="submit"
                  disabled={employees.length === 0 || !formData.employee_id}
                  className={`px-4 py-2 bg-primary-600 text-white rounded-md transition-colors ${
                    employees.length === 0 || !formData.employee_id
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary-700'
                  }`}
                >
                  {editingLoan ? t.loans.updateLoan : t.loans.createLoan}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedLoanId && currentCompany && (
        <RequestDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLoanId(null);
          }}
          requestType="loan"
          requestId={selectedLoanId}
          companyId={currentCompany.id}
          onStatusChange={fetchLoans}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirm !== null}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Loan"
        message="Are you sure you want to delete this loan? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {rejectingLoanId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'ar' ? 'رفض القرض' : 'Reject Loan'}
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={language === 'ar' ? 'سبب الرفض (مطلوب)...' : 'Rejection reason (required)...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows={3}
            />
            <div className={`flex justify-end gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setRejectingLoanId(null); setRejectionReason(''); }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleFinanceReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
