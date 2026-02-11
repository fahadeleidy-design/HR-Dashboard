import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar, Check, X, Clock, Settings, DollarSign, AlertTriangle, TrendingUp, Eye, Users } from 'lucide-react';
import { ScrollableTable } from '@/components/ScrollableTable';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { SearchableSelect } from '@/components/SearchableSelect';
import { LeaveConfiguration } from '@/components/leave/LeaveConfiguration';
import { RequestDetailModal } from '@/components/workflow/RequestDetailModal';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { leaveRequestSchema } from '@/lib/validation/schemas';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FieldError } from '@/components/ui/FieldError';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_period: string | null;
  reason: string;
  status: 'pending' | 'manager_approved' | 'hr_approved' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  covers_blackout_date: boolean;
  created_at: string;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
  };
  leave_type: {
    name_en: string;
    name_ar: string;
    max_days_per_year: number;
    allow_half_days: boolean;
    leave_category: string;
  };
}

interface LeaveType {
  id: string;
  name_en: string;
  name_ar: string;
  max_days_per_year: number;
  paid: boolean;
  allow_half_days: boolean;
  minimum_increment: number;
  leave_category: string;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_entitlement: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  carried_forward: number;
  accrued_this_year: number;
  encashed_days: number;
  leave_type: {
    name_en: string;
    name_ar: string;
  };
  employee: {
    first_name_en: string;
    last_name_en: string;
  };
}

interface EncashmentRequest {
  id: string;
  leave_type_id: string;
  days_to_encash: number;
  encashment_amount: number;
  status: string;
  requested_at: string;
}

export function Leave() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();
  const { logError, logActivity } = useErrorHandler();
  const { fieldErrors, validateForm, clearErrors } = useFormValidation(leaveRequestSchema);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [encashmentRequests, setEncashmentRequests] = useState<EncashmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [showEncashmentForm, setShowEncashmentForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [blackoutWarning, setBlackoutWarning] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [requestForm, setRequestForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    is_half_day: false,
    half_day_period: '' as 'first_half' | 'second_half' | '',
  });

  const [encashmentForm, setEncashmentForm] = useState({
    employee_id: '',
    leave_type_id: '',
    days_to_encash: 0,
  });

  useEffect(() => {
    if (currentCompany) {
      fetchLeaveRequests();
      fetchLeaveTypes();
      fetchEmployees();
      fetchLeaveBalances();
      fetchEncashmentRequests();
      subscribeToChanges();
    }
  }, [currentCompany]);

  useEffect(() => {
    if (requestForm.start_date && requestForm.end_date && requestForm.employee_id) {
      checkBlackoutDates();
    }
  }, [requestForm.start_date, requestForm.end_date, requestForm.employee_id]);

  const fetchLeaveRequests = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employees!leave_requests_employee_id_fkey(employee_number, first_name_en, last_name_en),
          leave_type:leave_types!leave_requests_leave_type_id_fkey(name_en, name_ar, max_days_per_year, allow_half_days, leave_category)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Leave', action: 'fetchLeaveRequests' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    if (!currentCompany) return;
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name_en');

      if (error) throw error;
      setLeaveTypes(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Leave', action: 'fetchLeaveTypes' });
    }
  };

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en, department_id')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('employee_number');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Leave', action: 'fetchEmployees' });
    }
  };

  const fetchLeaveBalances = async () => {
    if (!currentCompany) return;

    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          *,
          leave_type:leave_types!leave_balances_leave_type_id_fkey(name_en, name_ar),
          employee:employees!leave_balances_employee_id_fkey(first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .eq('year', currentYear)
        .order('employee.first_name_en');

      if (error) throw error;
      setLeaveBalances(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Leave', action: 'fetchLeaveBalances' });
    }
  };

  const fetchEncashmentRequests = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('leave_encashment_requests')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setEncashmentRequests(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Leave', action: 'fetchEncashmentRequests' });
    }
  };

  const checkBlackoutDates = async () => {
    if (!currentCompany || !requestForm.employee_id || !requestForm.start_date || !requestForm.end_date) return;

    try {
      const employee = employees.find(e => e.id === requestForm.employee_id);
      if (!employee) return;

      const { data, error } = await supabase.rpc('check_blackout_dates', {
        p_company_id: currentCompany.id,
        p_department_id: employee.department_id,
        p_leave_type_id: requestForm.leave_type_id,
        p_start_date: requestForm.start_date,
        p_end_date: requestForm.end_date,
      });

      if (error) throw error;

      if (data) {
        setBlackoutWarning('Warning: This leave request covers a blackout period. Special approval may be required.');
      } else {
        setBlackoutWarning(null);
      }
    } catch (error) {
      logError(error, 'medium', { component: 'Leave', action: 'checkBlackoutDates' });
    }
  };

  const subscribeToChanges = () => {
    if (!currentCompany) return;

    const channel = supabase
      .channel('leave_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => {
          fetchLeaveRequests();
          fetchLeaveBalances();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateDays = (start: string, end: string, isHalfDay: boolean) => {
    if (isHalfDay) return 0.5;
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 5 && day !== 6) { count++; }
      current.setDate(current.getDate() + 1);
    }
    return count || 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    const { isValid } = validateForm({
      employee_id: requestForm.employee_id,
      leave_type_id: requestForm.leave_type_id,
      start_date: requestForm.start_date,
      end_date: requestForm.end_date,
      reason: requestForm.reason,
    });
    if (!isValid) {
      showToast({ type: 'warning', title: 'Please fix the validation errors' });
      return;
    }

    try {
      const days = calculateDays(requestForm.start_date, requestForm.end_date, requestForm.is_half_day);

      const balance = leaveBalances.find(
        b => b.employee_id === requestForm.employee_id && b.leave_type_id === requestForm.leave_type_id
      );
      if (balance && balance.remaining_days < days) {
        showToast(`Insufficient leave balance. ${balance.remaining_days} days remaining but ${days} requested.`, 'warning');
        return;
      }

      const effectiveEnd = requestForm.is_half_day ? requestForm.start_date : requestForm.end_date;
      const { data: overlapping, error: overlapError } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('employee_id', requestForm.employee_id)
        .neq('status', 'rejected')
        .lte('start_date', effectiveEnd)
        .gte('end_date', requestForm.start_date);

      if (overlapError) throw overlapError;

      if (overlapping && overlapping.length > 0) {
        showToast('This leave request overlaps with an existing request.', 'warning');
        return;
      }

      const { error } = await supabase.from('leave_requests').insert([{
        company_id: currentCompany.id,
        employee_id: requestForm.employee_id,
        leave_type_id: requestForm.leave_type_id,
        start_date: requestForm.start_date,
        end_date: requestForm.is_half_day ? requestForm.start_date : requestForm.end_date,
        total_days: days,
        is_half_day: requestForm.is_half_day,
        half_day_period: requestForm.is_half_day ? requestForm.half_day_period : null,
        reason: requestForm.reason,
        status: 'pending',
        covers_blackout_date: !!blackoutWarning,
      }]);

      if (error) throw error;

      setShowForm(false);
      setRequestForm({
        employee_id: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
        is_half_day: false,
        half_day_period: '',
      });
      setBlackoutWarning(null);
      clearErrors();

      logActivity('leave_request_created', { employeeId: requestForm.employee_id, leaveTypeId: requestForm.leave_type_id });
      showToast('Leave request submitted successfully', 'success');
      await fetchLeaveRequests();
      await fetchLeaveBalances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Leave', action: 'createLeaveRequest' });
      showToast(error.message || 'Failed to create leave request', 'error');
    }
  };

  const handleEncashmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const { data: amountData, error: amountError } = await supabase.rpc('calculate_encashment_amount', {
        p_employee_id: encashmentForm.employee_id,
        p_leave_type_id: encashmentForm.leave_type_id,
        p_days_to_encash: encashmentForm.days_to_encash,
      });

      if (amountError) throw amountError;

      const { error } = await supabase.from('leave_encashment_requests').insert([{
        company_id: currentCompany.id,
        employee_id: encashmentForm.employee_id,
        leave_type_id: encashmentForm.leave_type_id,
        year: new Date().getFullYear(),
        days_to_encash: encashmentForm.days_to_encash,
        encashment_amount: amountData,
        status: 'pending',
      }]);

      if (error) throw error;

      setShowEncashmentForm(false);
      setEncashmentForm({ employee_id: '', leave_type_id: '', days_to_encash: 0 });
      logActivity('encashment_request_created', { employeeId: encashmentForm.employee_id, days: encashmentForm.days_to_encash });
      showToast('Encashment request submitted successfully', 'success');
      await fetchEncashmentRequests();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Leave', action: 'createEncashmentRequest' });
      showToast(error.message || 'Failed to create encashment request', 'error');
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      logActivity('leave_request_approved', { requestId });
      showToast('Leave request approved', 'success');
      await fetchLeaveRequests();
      await fetchLeaveBalances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Leave', action: 'approveLeaveRequest' });
      showToast(error.message || 'Failed to approve leave request', 'error');
    }
  };

  const handleReject = (requestId: string) => {
    setRejectTarget(requestId);
    setRejectionReason('');
  };

  const confirmReject = async () => {
    if (!rejectTarget || !rejectionReason.trim()) return;

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', rejectTarget);

      if (error) throw error;

      logActivity('leave_request_rejected', { requestId: rejectTarget });
      showToast('Leave request rejected', 'success');
      setRejectTarget(null);
      setRejectionReason('');
      await fetchLeaveRequests();
      await fetchLeaveBalances();
    } catch (error: any) {
      logError(error, 'medium', { component: 'Leave', action: 'rejectLeaveRequest' });
      showToast(error.message || 'Failed to reject leave request', 'error');
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'manager_approved', 'hr_approved'].includes(request.status);
    return request.status === filter;
  });

  const pendingCount = leaveRequests.filter(r => ['pending', 'manager_approved', 'hr_approved'].includes(r.status)).length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; labelAr: string; color: string }> = {
      pending: { label: 'Pending Manager', labelAr: 'بانتظار المدير', color: 'bg-yellow-100 text-yellow-800' },
      manager_approved: { label: 'Pending HR', labelAr: 'بانتظار الموارد البشرية', color: 'bg-blue-100 text-blue-800' },
      hr_approved: { label: 'Pending Final', labelAr: 'بانتظار الموافقة النهائية', color: 'bg-indigo-100 text-indigo-800' },
      approved: { label: 'Approved', labelAr: 'موافق عليه', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejected', labelAr: 'مرفوض', color: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || { label: status, labelAr: status, color: 'bg-gray-100 text-gray-800' };
  };

  const handleViewDetails = (requestId: string) => {
    setSelectedRequestId(requestId);
    setShowDetailModal(true);
  };

  const { sortedData, sortConfig, requestSort } = useSortableData(filteredRequests);
  const { paginatedData, currentPage, totalPages, setCurrentPage } = usePagination(sortedData, 10);

  const selectedLeaveType = leaveTypes.find(lt => lt.id === requestForm.leave_type_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (showConfiguration) {
    return (
      <div>
        <button
          onClick={() => setShowConfiguration(false)}
          className="mb-4 text-primary-600 hover:text-primary-700 flex items-center space-x-2"
        >
          <X className="h-5 w-5" />
          <span>Back to Leave Management</span>
        </button>
        <LeaveConfiguration />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage leave requests, balances, and encashment</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConfiguration(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Configure</span>
          </button>
          <button
            onClick={() => setShowEncashmentForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <DollarSign className="h-4 w-4" />
            <span>Request Encashment</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t.leave.requestLeave}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Leave Balances ({new Date().getFullYear()})</h2>
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showBalances ? 'Hide' : 'Show'}
          </button>
        </div>

        {showBalances && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Carried</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Accrued</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Encashed</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveBalances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No leave balances found
                      </td>
                    </tr>
                  ) : (
                    leaveBalances.map((balance) => (
                      <tr key={balance.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {balance.employee.first_name_en} {balance.employee.last_name_en}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {balance.leave_type.name_en}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 font-medium">
                          {balance.total_entitlement}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {balance.carried_forward > 0 ? (
                            <span className="text-blue-600 font-medium flex items-center justify-center">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {balance.carried_forward}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {balance.accrued_this_year > 0 ? (
                            <span className="text-green-600 font-medium">{balance.accrued_this_year}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-red-600 font-medium">{balance.used_days}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-yellow-600 font-medium">{balance.pending_days}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {balance.encashed_days > 0 ? (
                            <span className="text-purple-600 font-medium">{balance.encashed_days}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`font-medium ${balance.remaining_days > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {balance.remaining_days}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{leaveRequests.length}</p>
            </div>
            <Calendar className="h-12 w-12 text-gray-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{approvedCount}</p>
            </div>
            <Check className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{rejectedCount}</p>
            </div>
            <X className="h-12 w-12 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <ScrollableTable maxHeight="calc(100vh - 350px)">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label="Employee"
                  sortKey="employee.first_name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Leave Type"
                  sortKey="leave_type.name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <SortableTableHeader
                  label="Start Date"
                  sortKey="start_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="End Date"
                  sortKey="end_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Days"
                  sortKey="total_days"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Status"
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.employee.first_name_en} {request.employee.last_name_en}
                      </div>
                      <div className="text-sm text-gray-500">{request.employee.employee_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.leave_type.name_en}</div>
                      {request.is_half_day && (
                        <div className="text-xs text-blue-600">
                          Half Day ({request.half_day_period?.replace('_', ' ')})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        request.leave_type.leave_category === 'statutory' ? 'bg-blue-100 text-blue-800' :
                        request.leave_type.leave_category === 'discretionary' ? 'bg-green-100 text-green-800' :
                        request.leave_type.leave_category === 'emergency' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.leave_type.leave_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                      </div>
                      {request.covers_blackout_date && (
                        <div className="flex items-center text-xs text-orange-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Blackout
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const statusInfo = getStatusDisplay(request.status);
                        return (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {isRTL ? statusInfo.labelAr : statusInfo.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {request.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(request.id)}
                          className="text-primary-600 hover:text-primary-900"
                          title={isRTL ? 'عرض التفاصيل' : 'View Details'}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {['pending', 'manager_approved', 'hr_approved'].includes(request.status) && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600 hover:text-green-900"
                              title={isRTL ? 'موافقة' : 'Approve'}
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="text-red-600 hover:text-red-900"
                              title={isRTL ? 'رفض' : 'Reject'}
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollableTable>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Request Leave</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Select Employee' },
                    ...employees.map(emp => ({
                      value: emp.id,
                      label: `${emp.employee_number} - ${emp.first_name_en} ${emp.last_name_en}`,
                      searchText: `${emp.employee_number} ${emp.first_name_en} ${emp.last_name_en}`
                    }))
                  ]}
                  value={requestForm.employee_id}
                  onChange={(value) => setRequestForm({...requestForm, employee_id: value})}
                  placeholder={t.employees.selectEmployee}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type *
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Select Leave Type' },
                    ...leaveTypes.map(type => ({
                      value: type.id,
                      label: `${type.name_en} (${type.leave_category})`,
                      searchText: `${type.name_en} ${type.name_ar} ${type.leave_category}`
                    }))
                  ]}
                  value={requestForm.leave_type_id}
                  onChange={(value) => setRequestForm({...requestForm, leave_type_id: value, is_half_day: false})}
                  placeholder={t.leave.selectLeaveType}
                />
              </div>

              {selectedLeaveType?.allow_half_days && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={requestForm.is_half_day}
                      onChange={(e) => setRequestForm({
                        ...requestForm,
                        is_half_day: e.target.checked,
                        end_date: e.target.checked ? requestForm.start_date : requestForm.end_date
                      })}
                      className="h-4 w-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-blue-900">Request Half Day</span>
                  </label>

                  {requestForm.is_half_day && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-blue-900 mb-2">Period *</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="half_day_period"
                            value="first_half"
                            checked={requestForm.half_day_period === 'first_half'}
                            onChange={(e) => setRequestForm({...requestForm, half_day_period: e.target.value as any})}
                            className="h-4 w-4 text-primary-600"
                            required={requestForm.is_half_day}
                          />
                          <span className="text-sm text-blue-900">First Half (Morning)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="half_day_period"
                            value="second_half"
                            checked={requestForm.half_day_period === 'second_half'}
                            onChange={(e) => setRequestForm({...requestForm, half_day_period: e.target.value as any})}
                            className="h-4 w-4 text-primary-600"
                            required={requestForm.is_half_day}
                          />
                          <span className="text-sm text-blue-900">Second Half (Afternoon)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={requestForm.start_date}
                    onChange={(e) => setRequestForm({...requestForm, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={requestForm.is_half_day ? requestForm.start_date : requestForm.end_date}
                    onChange={(e) => setRequestForm({...requestForm, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={requestForm.is_half_day}
                  />
                  <FieldError error={fieldErrors.end_date} />
                </div>
              </div>

              {blackoutWarning && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Blackout Period Warning</p>
                    <p className="text-sm text-orange-700 mt-1">{blackoutWarning}</p>
                  </div>
                </div>
              )}

              {requestForm.start_date && requestForm.end_date && !requestForm.is_half_day && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    Total Days: {calculateDays(requestForm.start_date, requestForm.end_date, false)} days
                  </p>
                </div>
              )}

              {requestForm.is_half_day && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    Total Days: 0.5 days
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <FieldError error={fieldErrors.reason} />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setRequestForm({
                      employee_id: '',
                      leave_type_id: '',
                      start_date: '',
                      end_date: '',
                      reason: '',
                      is_half_day: false,
                      half_day_period: ''
                    });
                    setBlackoutWarning(null);
                    clearErrors();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEncashmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Request Leave Encashment</h2>
              <p className="text-sm text-gray-600 mt-1">Convert unused leave days to cash payment</p>
            </div>

            <form onSubmit={handleEncashmentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Select Employee' },
                    ...employees.map(emp => ({
                      value: emp.id,
                      label: `${emp.employee_number} - ${emp.first_name_en} ${emp.last_name_en}`,
                      searchText: `${emp.employee_number} ${emp.first_name_en} ${emp.last_name_en}`
                    }))
                  ]}
                  value={encashmentForm.employee_id}
                  onChange={(value) => setEncashmentForm({...encashmentForm, employee_id: value})}
                  placeholder="Select Employee"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type *
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Select Leave Type' },
                    ...leaveTypes.map(type => ({
                      value: type.id,
                      label: type.name_en,
                      searchText: `${type.name_en} ${type.name_ar}`
                    }))
                  ]}
                  value={encashmentForm.leave_type_id}
                  onChange={(value) => setEncashmentForm({...encashmentForm, leave_type_id: value})}
                  placeholder="Select Leave Type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days to Encash *
                </label>
                <input
                  type="number"
                  required
                  step="0.5"
                  min="0.5"
                  value={encashmentForm.days_to_encash || ''}
                  onChange={(e) => setEncashmentForm({...encashmentForm, days_to_encash: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 5"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  The encashment amount will be calculated based on your salary and company policy.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEncashmentForm(false);
                    setEncashmentForm({ employee_id: '', leave_type_id: '', days_to_encash: 0 });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedRequestId && currentCompany && (
        <RequestDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRequestId(null);
          }}
          requestType="leave_request"
          requestId={selectedRequestId}
          companyId={currentCompany.id}
          onStatusChange={() => {
            fetchLeaveRequests();
            fetchLeaveBalances();
          }}
        />
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Reject Leave Request</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Please provide a reason for rejection"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setRejectTarget(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
