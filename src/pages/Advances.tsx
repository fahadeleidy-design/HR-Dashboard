import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Plus, DollarSign, Clock, CheckCircle, XCircle, Edit, Trash2, Eye, Users } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { SearchableSelect } from '@/components/SearchableSelect';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { RequestDetailModal } from '@/components/workflow/RequestDetailModal';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { validateSync } from '@/lib/validation/validator';
import { advanceRequestSchema } from '@/lib/validation/schemas';
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
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advanceEligibility, setAdvanceEligibility] = useState<AdvanceEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    amount: 0,
    request_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const { sortedData, sortConfig, requestSort } = useSortableData(advances);
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
          employee:employees(employee_number, first_name_en, last_name_en)
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

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('advances')
        .update({
          status: 'approved',
          approved_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;
      showToast({ type: 'success', title: t.advances.advanceApprovedSuccess });
      logActivity('advance_approved', { component: 'Advances', advanceId: id });
      fetchAdvances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Advances', action: 'approveAdvance' });
      showToast({ type: 'error', title: `${t.advances.failedToApprove}: ${error.message}` });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('advances')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      showToast({ type: 'success', title: t.advances.advanceRejectedSuccess });
      logActivity('advance_rejected', { component: 'Advances', advanceId: id });
      fetchAdvances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Advances', action: 'rejectAdvance' });
      showToast({ type: 'error', title: `${t.advances.failedToReject}: ${error.message}` });
    }
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
        <button
          onClick={() => setShowForm(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>{t.advances.newAdvance}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  const progress = ((advance.amount - advance.remaining_amount) / advance.amount) * 100;
                  return (
                    <tr key={advance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {advance.employee.first_name_en} {advance.employee.last_name_en}
                        </div>
                        <div className="text-sm text-gray-500">{advance.employee.employee_number}</div>
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
                          {['pending', 'manager_approved', 'hr_approved'].includes(advance.status) && userRole?.role && ['hr', 'finance', 'super_admin', 'admin', 'manager'].includes(userRole.role) && (
                            <>
                              <button
                                onClick={() => handleApprove(advance.id)}
                                className="text-green-600 hover:text-green-800"
                                title={isRTL ? 'موافقة' : 'Approve'}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleReject(advance.id)}
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
                          {userRole?.role === 'super_admin' && (
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
    </div>
  );
}
