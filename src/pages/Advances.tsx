import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Plus, DollarSign, Clock, CheckCircle, XCircle, Edit, Trash2, Eye, Users, Download, Search, Banknote } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { SearchableSelect } from '@/components/SearchableSelect';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { RequestDetailModal } from '@/components/workflow/RequestDetailModal';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { advanceRequestSchema } from '@/lib/validation/schemas';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FieldError } from '@/components/ui/FieldError';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  remaining_amount: number;
  deduction_amount: number;
  request_date: string;
  approved_date?: string;
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

interface AdvanceEligibility {
  employee_id: string;
  max_advance_amount: number;
  outstanding_advances: number;
  outstanding_loans: number;
  is_eligible: boolean;
  eligibility_status: string;
}

export function Advances() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const { logError, logActivity } = useErrorHandler();
  const { fieldErrors, validateForm, clearErrors } = useFormValidation(advanceRequestSchema);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advanceEligibility, setAdvanceEligibility] = useState<AdvanceEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingAdvanceId, setRejectingAdvanceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    amount: 0,
    request_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const filteredAdvances = advances.filter(adv => {
    const matchesStatus = statusFilter === 'all' || adv.status === statusFilter;
    const matchesSearch = !searchQuery ||
      adv.employee.first_name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adv.employee.last_name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adv.employee.employee_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const { sortedData, sortConfig, requestSort } = useSortableData(filteredAdvances);
  const pagination = usePagination(sortedData, { initialPageSize: 25 });

  useEffect(() => {
    if (currentCompany) {
      fetchAdvances();
      fetchEmployees();
    }
  }, [currentCompany]);

  useEffect(() => {
    if (formData.employee_id) {
      fetchAdvanceEligibility(formData.employee_id);
    } else {
      setAdvanceEligibility(null);
    }
  }, [formData.employee_id]);

  const fetchAdvances = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('advances')
        .select(`
          *,
          employee:employees!advances_employee_id_fkey(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvances(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Advances', action: 'fetchAdvances' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('employee_number');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Advances', action: 'fetchEmployees' });
    }
  };

  const fetchAdvanceEligibility = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('advance_eligibility')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) {
        logError(error, 'medium', { component: 'Advances', action: 'fetchAdvanceEligibility' });
        return;
      }

      setAdvanceEligibility(data);
    } catch (error: any) {
      logError(error, 'medium', { component: 'Advances', action: 'fetchAdvanceEligibility' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    const { isValid } = validateForm({
      employee_id: formData.employee_id,
      amount: formData.amount,
      request_date: formData.request_date,
    });
    if (!isValid) {
      showToast({ type: 'warning', title: 'Please fix the validation errors' });
      return;
    }

    if (!formData.employee_id) {
      showToast({ type: 'warning', title: t.advances.pleaseSelectEmployee });
      return;
    }

    if (advanceEligibility && formData.amount > advanceEligibility.max_advance_amount) {
      showToast({ type: 'warning', title: `${t.advances.advanceExceedsSalary}: ${formatCurrency(formData.amount, language)} > ${formatCurrency(advanceEligibility.max_advance_amount, language)}` });
      return;
    }

    if (advanceEligibility && !advanceEligibility.is_eligible) {
      showToast({ type: 'warning', title: `${t.advances.cannotCreateAdvance}: ${advanceEligibility.eligibility_status}` });
      return;
    }

    try {
      const advanceData = {
        company_id: currentCompany.id,
        employee_id: formData.employee_id,
        amount: formData.amount,
        request_date: formData.request_date,
        status: 'pending',
        notes: formData.notes
      };

      if (editingAdvance) {
        const { error } = await supabase
          .from('advances')
          .update(advanceData)
          .eq('id', editingAdvance.id);

        if (error) throw error;
        showToast({ type: 'success', title: t.advances.advanceUpdatedSuccess });
        logActivity('advance_updated', { component: 'Advances', advanceId: editingAdvance.id });
      } else {
        const { error } = await supabase
          .from('advances')
          .insert([advanceData]);

        if (error) throw error;
        showToast({ type: 'success', title: t.advances.advanceCreatedSuccess });
        logActivity('advance_created', { component: 'Advances', employeeId: formData.employee_id });
      }

      resetForm();
      fetchAdvances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Advances', action: 'saveAdvance' });
      showToast({ type: 'error', title: `${t.advances.failedToSave}: ${error.message}` });
    }
  };

  const handleEdit = (advance: Advance) => {
    setEditingAdvance(advance);
    setFormData({
      employee_id: advance.employee_id,
      amount: advance.amount,
      request_date: advance.request_date,
      notes: advance.notes || ''
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
        .from('advances')
        .delete()
        .eq('id', deleteConfirm);

      if (error) throw error;
      showToast({ type: 'success', title: t.advances.advanceDeletedSuccess });
      logActivity('advance_deleted', { component: 'Advances', advanceId: deleteConfirm });
      fetchAdvances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Advances', action: 'deleteAdvance' });
      showToast({ type: 'error', title: `${t.advances.failedToDelete}: ${error.message}` });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleStepApprove = async (id: string, advance: Advance) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      let updateData: any = {};

      if (advance.status === 'pending' && userRole?.role === 'manager') {
        updateData = { status: 'manager_approved', manager_approved_by: userId, manager_approved_at: new Date().toISOString() };
      } else if (advance.status === 'manager_approved' && ['hr', 'hr_admin', 'hr_manager'].includes(userRole?.role || '')) {
        updateData = { status: 'hr_approved', hr_approved_by: userId, hr_approved_at: new Date().toISOString() };
      } else if (advance.status === 'hr_approved' && ['finance', 'super_admin'].includes(userRole?.role || '')) {
        updateData = { status: 'approved', finance_approved_by: userId, finance_approved_at: new Date().toISOString(), approved_date: new Date().toISOString().split('T')[0] };
      } else {
        updateData = { status: 'approved', approved_date: new Date().toISOString().split('T')[0] };
      }

      const { error } = await supabase.from('advances').update(updateData).eq('id', id);
      if (error) throw error;
      showToast({ type: 'success', title: t.advances.advanceApprovedSuccess });
      logActivity('advance_approved', { component: 'Advances', advanceId: id, newStatus: updateData.status });
      fetchAdvances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Advances', action: 'approveAdvance' });
      showToast({ type: 'error', title: `${t.advances.failedToApprove}: ${error.message}` });
    }
  };

  const handleFinanceReject = async () => {
    if (!rejectingAdvanceId) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('advances')
        .update({
          status: 'rejected',
          rejected_by: userData.user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', rejectingAdvanceId);

      if (error) throw error;
      showToast({ type: 'success', title: t.advances.advanceRejectedSuccess });
      logActivity('advance_rejected', { component: 'Advances', advanceId: rejectingAdvanceId });
      setRejectingAdvanceId(null);
      setRejectionReason('');
      fetchAdvances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Advances', action: 'rejectAdvance' });
      showToast({ type: 'error', title: `${t.advances.failedToReject}: ${error.message}` });
    }
  };

  const handleExport = () => {
    const exportData = advances.map(adv => ({
      [language === 'ar' ? 'رقم الموظف' : 'Employee Number']: adv.employee?.employee_number || '',
      [language === 'ar' ? 'اسم الموظف' : 'Employee Name']: `${adv.employee?.first_name_en || ''} ${adv.employee?.last_name_en || ''}`.trim(),
      [language === 'ar' ? 'المبلغ' : 'Amount']: adv.amount,
      [language === 'ar' ? 'المتبقي' : 'Remaining']: adv.remaining_amount,
      [language === 'ar' ? 'الخصم الشهري' : 'Monthly Deduction']: adv.deduction_amount,
      [language === 'ar' ? 'تاريخ الطلب' : 'Request Date']: adv.request_date,
      [language === 'ar' ? 'الحالة' : 'Status']: adv.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Advances');
    XLSX.writeFile(wb, `advances_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast({ type: 'success', title: language === 'ar' ? 'تم تصدير التقرير' : 'Report exported' });
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      amount: 0,
      request_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingAdvance(null);
    setAdvanceEligibility(null);
    setShowForm(false);
    clearErrors();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'manager_approved': return 'bg-blue-100 text-blue-800';
      case 'hr_approved': return 'bg-indigo-100 text-indigo-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; labelAr: string }> = {
      pending: { label: 'Pending Manager', labelAr: 'بانتظار المدير' },
      manager_approved: { label: 'Pending HR', labelAr: 'بانتظار الموارد البشرية' },
      hr_approved: { label: 'Pending Finance', labelAr: 'بانتظار المالية' },
      approved: { label: 'Approved', labelAr: 'موافق عليه' },
      rejected: { label: 'Rejected', labelAr: 'مرفوض' },
      completed: { label: 'Completed', labelAr: 'مكتمل' }
    };
    return statusMap[status] || { label: status.toUpperCase(), labelAr: status };
  };

  const handleViewDetails = (advanceId: string) => {
    setSelectedAdvanceId(advanceId);
    setShowDetailModal(true);
  };

  const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount || 0), 0);
  const totalRemaining = advances.reduce((sum, adv) => sum + Number(adv.remaining_amount || 0), 0);
  const pendingAdvances = advances.filter(a => a.status === 'pending').length;

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
          <h1 className="text-3xl font-bold text-gray-900">{t.advances.title}</h1>
          <p className="text-gray-600 mt-1">{t.advances.subtitle}</p>
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
            <span>{t.advances.newAdvance}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.advances.totalAdvances}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalAdvances, language)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.advances.totalRemaining}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalRemaining, language)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.advances.pendingRequests}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(pendingAdvances, language)}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{language === 'ar' ? 'بانتظار المالية' : 'Pending Finance'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(advances.filter(a => a.status === 'hr_approved').length, language)}
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
            {['all', 'pending', 'manager_approved', 'hr_approved', 'approved', 'rejected'].map(status => (
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
                    ({advances.filter(a => a.status === status).length})
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
                  label={t.advances.amount}
                  sortKey="amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.advances.remaining}
                  sortKey="remaining_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.advances.monthlyDeduction}
                  sortKey="deduction_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>
                  {t.advances.progress}
                </th>
                <SortableTableHeader
                  label={t.advances.requestDate}
                  sortKey="request_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
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
              {pagination.paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {t.messages.noResults}
                  </td>
                </tr>
              ) : (
                pagination.paginatedData.map((advance) => {
                  const progress = advance.amount > 0 ? ((advance.amount - advance.remaining_amount) / advance.amount) * 100 : 0;
                  return (
                    <tr key={advance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {advance.employee?.first_name_en} {advance.employee?.last_name_en}
                        </div>
                        <div className="text-sm text-gray-500">{advance.employee?.employee_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {Number(advance.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        SAR {Number(advance.remaining_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          SAR {Number(advance.deduction_amount || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Full deduction
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% recovered</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(advance.request_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(advance.status)}`}>
                          {isRTL ? getStatusDisplay(advance.status).labelAr : getStatusDisplay(advance.status).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={`flex space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <button
                            onClick={() => handleViewDetails(advance.id)}
                            className="text-primary-600 hover:text-primary-800"
                            title={isRTL ? 'عرض التفاصيل' : 'View Details'}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {advance.status === 'hr_approved' && userRole?.role && ['finance', 'super_admin'].includes(userRole.role) && (
                            <>
                              <button
                                onClick={() => handleStepApprove(advance.id, advance)}
                                className="text-green-600 hover:text-green-800"
                                title={isRTL ? 'موافقة مالية' : 'Finance Approve'}
                              >
                                <Banknote className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setRejectingAdvanceId(advance.id)}
                                className="text-red-600 hover:text-red-800"
                                title={isRTL ? 'رفض مالي' : 'Finance Reject'}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {['pending', 'manager_approved'].includes(advance.status) && userRole?.role && ['hr', 'super_admin', 'admin', 'manager'].includes(userRole.role) && (
                            <>
                              <button
                                onClick={() => handleStepApprove(advance.id, advance)}
                                className="text-green-600 hover:text-green-800"
                                title={isRTL ? 'موافقة' : 'Approve'}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setRejectingAdvanceId(advance.id)}
                                className="text-red-600 hover:text-red-800"
                                title={isRTL ? 'رفض' : 'Reject'}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {userRole?.role && ['hr', 'finance', 'super_admin', 'admin'].includes(userRole.role) && (
                            <button
                              onClick={() => handleEdit(advance)}
                              className="text-blue-600 hover:text-blue-800"
                              title={isRTL ? 'تعديل' : 'Edit'}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {userRole?.role && ['hr', 'finance', 'super_admin'].includes(userRole.role) && (
                            <button
                              onClick={() => handleDelete(advance.id)}
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-200">
              <h2 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {editingAdvance ? t.advances.editAdvance : t.advances.newAdvance}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className={`text-sm font-semibold text-blue-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t.advances.advancePolicy}</h3>
                <ul className={`text-sm text-blue-800 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <li>• {t.advances.policyMaxAdvance}</li>
                  <li>• {t.advances.policyDeduction}</li>
                  <li>• {t.advances.policyOneActive}</li>
                  <li>• {t.advances.policyNoLoan}</li>
                </ul>
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.common.employee} *
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: t.employees.selectEmployee },
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
              </div>

              {advanceEligibility && (
                <div className={`border rounded-lg p-4 ${
                  advanceEligibility.is_eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    advanceEligibility.is_eligible ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {t.advances.eligibilityTitle}
                  </h3>
                  <div className={`text-sm space-y-1 ${
                    advanceEligibility.is_eligible ? 'text-green-800' : 'text-red-800'
                  }`}>
                    <p>{t.advances.monthlySalary}: {formatCurrency(advanceEligibility.max_advance_amount, language)}</p>
                    <p>{t.advances.outstandingAdvances}: {formatCurrency(advanceEligibility.outstanding_advances, language)}</p>
                    <p>{t.advances.outstandingLoans}: {formatCurrency(advanceEligibility.outstanding_loans, language)}</p>
                    <p className="font-semibold">{t.advances.eligibilityStatus}: {advanceEligibility.eligibility_status}</p>
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.advances.advanceAmountSar} *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  min="0"
                  step="0.01"
                  max={advanceEligibility?.max_advance_amount || undefined}
                />
                <FieldError error={fieldErrors.amount} />
                {advanceEligibility && formData.amount > advanceEligibility.max_advance_amount && (
                  <p className="text-xs text-red-600 mt-1">
                    {t.advances.advanceExceedsSalary}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {t.advances.maximum}: {advanceEligibility ? formatCurrency(advanceEligibility.max_advance_amount, language) : t.advances.selectEmployeeFirst}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.advances.requestDate} *
                </label>
                <input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <FieldError error={fieldErrors.request_date} />
              </div>

              {formData.amount > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800 font-semibold">
                    {t.advances.deductionAmount}: {formatCurrency(formData.amount, language)}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {t.advances.deductionNote}
                  </p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.advances.notes}
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
                  {t.advances.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {editingAdvance ? t.advances.updateAdvance : t.advances.createAdvance}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedAdvanceId && currentCompany && (
        <RequestDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAdvanceId(null);
          }}
          requestType="advance"
          requestId={selectedAdvanceId}
          companyId={currentCompany.id}
          onStatusChange={fetchAdvances}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirm !== null}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={t.advances.advanceDeleteConfirm}
        message={t.advances.advanceDeleteConfirm}
        confirmLabel="Delete"
        variant="danger"
      />

      {rejectingAdvanceId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'ar' ? 'رفض السلفة' : 'Reject Advance'}
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
                onClick={() => { setRejectingAdvanceId(null); setRejectionReason(''); }}
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
