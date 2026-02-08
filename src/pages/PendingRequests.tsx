import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CheckCircle, XCircle, Clock, FileText, DollarSign, Calendar, Filter, Eye, X, AlertTriangle, Plane, UserCheck, Receipt } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { ApprovalTimeline } from '@/components/ApprovalTimeline';
import { SLAIndicator } from '@/components/SLAIndicator';

type RequestType = 'advance' | 'loan' | 'leave' | 'expense_claim' | 'penalty' | 'travel' | 'attendance_request';

interface PendingRequest {
  id: string;
  company_id: string;
  request_type: RequestType;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string | null;
  manager_id: string | null;
  amount_or_days: number | null;
  unit: string | null;
  request_date: string;
  request_subtype: string | null;
  status: string;
  description: string | null;
  pending_at_level: 'manager' | 'hr' | 'finance';
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  finance_approved_by: string | null;
  finance_approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  sla_deadline: string | null;
  created_at: string;
}

interface SLAStatus {
  request_id: string;
  sla_status: 'on_time' | 'at_risk' | 'overdue';
  sla_deadline: string;
}

export function PendingRequests() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('my_level');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<PendingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [slaStatuses, setSlaStatuses] = useState<Map<string, SLAStatus>>(new Map());

  useEffect(() => {
    if (currentCompany) {
      fetchPendingRequests();
    }
  }, [currentCompany]);

  useEffect(() => {
    if (requests.length > 0) {
      fetchSLAStatuses();
      const interval = setInterval(fetchSLAStatuses, 60000);
      return () => clearInterval(interval);
    }
  }, [requests]);

  useEffect(() => {
    filterRequests();
  }, [requests, selectedType, selectedLevel, userRole]);

  const fetchPendingRequests = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('all_pending_requests_unified')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      showToast('Error loading pending requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSLAStatuses = async () => {
    if (requests.length === 0) return;

    try {
      const requestIds = requests.map(r => r.id);
      const { data, error } = await supabase
        .from('request_sla_tracking')
        .select('request_id, sla_status, sla_deadline')
        .in('request_id', requestIds)
        .is('level_completed_at', null);

      if (error) throw error;

      const statusMap = new Map<string, SLAStatus>();
      (data || []).forEach((item: any) => {
        statusMap.set(item.request_id, {
          request_id: item.request_id,
          sla_status: item.sla_status,
          sla_deadline: item.sla_deadline
        });
      });

      setSlaStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching SLA statuses:', error);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Filter by request type
    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.request_type === selectedType);
    }

    // Filter by approval level based on user role
    if (selectedLevel === 'my_level') {
      filtered = filtered.filter(r => {
        const role = userRole?.role;
        if (role === 'manager' && r.pending_at_level === 'manager' && r.manager_id === userRole?.employee_id) {
          return true;
        }
        if ((role === 'hr' || role === 'admin' || role === 'super_admin') && r.pending_at_level === 'hr') {
          return true;
        }
        if ((role === 'finance' || role === 'admin' || role === 'super_admin') && r.pending_at_level === 'finance') {
          return true;
        }
        return false;
      });
    } else if (selectedLevel !== 'all') {
      filtered = filtered.filter(r => r.pending_at_level === selectedLevel);
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (request: PendingRequest) => {
    if (!userRole?.employee_id) {
      showToast('Employee profile not found', 'error');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_request_v2', {
        p_request_id: request.id,
        p_request_type: request.request_type,
        p_approval_level: request.pending_at_level,
        p_approver_id: userRole!.employee_id!,
        p_comments: null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        showToast(result.message || 'Request approved successfully', 'success');
        fetchPendingRequests();
      } else {
        showToast(result.error || 'Failed to approve request', 'error');
      }
    } catch (error: any) {
      console.error('Error approving request:', error);
      showToast(error.message || 'Error approving request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest || !userRole?.employee_id) return;

    if (!rejectionReason.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_request_v2', {
        p_request_id: rejectingRequest.id,
        p_request_type: rejectingRequest.request_type,
        p_approval_level: rejectingRequest.pending_at_level,
        p_rejector_id: userRole!.employee_id!,
        p_reason: rejectionReason
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        showToast(result.message || 'Request rejected successfully', 'success');
        setShowRejectModal(false);
        setRejectingRequest(null);
        setRejectionReason('');
        fetchPendingRequests();
      } else {
        showToast(result.error || 'Failed to reject request', 'error');
      }
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      showToast(error.message || 'Error rejecting request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (request: PendingRequest) => {
    setRejectingRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const openDetailsModal = (request: PendingRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const getSLABadge = (requestId: string) => {
    const sla = slaStatuses.get(requestId);
    if (!sla) return null;

    const colors = {
      on_time: 'bg-green-100 text-green-800',
      at_risk: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800'
    };

    const icons = {
      on_time: '✓',
      at_risk: '⚠',
      overdue: '!'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${colors[sla.sla_status]}`}>
        <span>{icons[sla.sla_status]}</span>
        <span className="capitalize">{sla.sla_status.replace('_', ' ')}</span>
      </span>
    );
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'advance':
        return <DollarSign className="h-5 w-5" />;
      case 'loan':
        return <FileText className="h-5 w-5" />;
      case 'leave':
        return <Calendar className="h-5 w-5" />;
      case 'expense_claim':
        return <Receipt className="h-5 w-5" />;
      case 'penalty':
        return <AlertTriangle className="h-5 w-5" />;
      case 'travel':
        return <Plane className="h-5 w-5" />;
      case 'attendance_request':
        return <UserCheck className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      advance: 'bg-blue-100 text-blue-800',
      loan: 'bg-cyan-100 text-cyan-800',
      leave: 'bg-green-100 text-green-800',
      expense_claim: 'bg-amber-100 text-amber-800',
      penalty: 'bg-red-100 text-red-800',
      travel: 'bg-sky-100 text-sky-800',
      attendance_request: 'bg-teal-100 text-teal-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      advance: language === 'ar' ? 'سلفة' : 'Advance',
      loan: language === 'ar' ? 'قرض' : 'Loan',
      leave: language === 'ar' ? 'إجازة' : 'Leave',
      expense_claim: language === 'ar' ? 'مصاريف' : 'Expense',
      penalty: language === 'ar' ? 'جزاء' : 'Penalty',
      travel: language === 'ar' ? 'سفر' : 'Travel',
      attendance_request: language === 'ar' ? 'حضور' : 'Attendance'
    };
    return labels[type] || type;
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      manager: 'bg-yellow-100 text-yellow-800',
      hr: 'bg-orange-100 text-orange-800',
      finance: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const canApprove = (request: PendingRequest) => {
    const role = userRole?.role;
    if (request.pending_at_level === 'manager' && role === 'manager' && request.manager_id === userRole?.employee_id) {
      return true;
    }
    if (request.pending_at_level === 'hr' && (role === 'hr' || role === 'admin' || role === 'super_admin')) {
      return true;
    }
    if (request.pending_at_level === 'finance' && (role === 'finance' || role === 'admin' || role === 'super_admin')) {
      return true;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pending requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'ar' ? 'الطلبات المعلقة' : 'Pending Requests'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 'مراجعة واعتماد الطلبات المعلقة من الموظفين' : 'Review and approve pending requests from employees'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
              <p className="text-xl font-bold text-gray-900">{filteredRequests.length}</p>
            </div>
            <Clock className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'إجازات' : 'Leave'}</p>
              <p className="text-xl font-bold text-green-600">
                {filteredRequests.filter(r => r.request_type === 'leave').length}
              </p>
            </div>
            <Calendar className="h-6 w-6 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'سلف' : 'Advances'}</p>
              <p className="text-xl font-bold text-blue-600">
                {filteredRequests.filter(r => r.request_type === 'advance').length}
              </p>
            </div>
            <DollarSign className="h-6 w-6 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'قروض' : 'Loans'}</p>
              <p className="text-xl font-bold text-cyan-600">
                {filteredRequests.filter(r => r.request_type === 'loan').length}
              </p>
            </div>
            <FileText className="h-6 w-6 text-cyan-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'مصاريف' : 'Expenses'}</p>
              <p className="text-xl font-bold text-amber-600">
                {filteredRequests.filter(r => r.request_type === 'expense_claim').length}
              </p>
            </div>
            <Receipt className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'جزاءات' : 'Penalties'}</p>
              <p className="text-xl font-bold text-red-600">
                {filteredRequests.filter(r => r.request_type === 'penalty').length}
              </p>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'سفر' : 'Travel'}</p>
              <p className="text-xl font-bold text-sky-600">
                {filteredRequests.filter(r => r.request_type === 'travel').length}
              </p>
            </div>
            <Plane className="h-6 w-6 text-sky-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'حضور' : 'Attendance'}</p>
              <p className="text-xl font-bold text-teal-600">
                {filteredRequests.filter(r => r.request_type === 'attendance_request').length}
              </p>
            </div>
            <UserCheck className="h-6 w-6 text-teal-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'نوع الطلب' : 'Request Type'}
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
                <option value="leave">{language === 'ar' ? 'طلبات الإجازة' : 'Leave Requests'}</option>
                <option value="advance">{language === 'ar' ? 'السلف' : 'Advances'}</option>
                <option value="loan">{language === 'ar' ? 'القروض' : 'Loans'}</option>
                <option value="expense_claim">{language === 'ar' ? 'المصاريف' : 'Expenses'}</option>
                <option value="penalty">{language === 'ar' ? 'الجزاءات' : 'Penalties'}</option>
                <option value="travel">{language === 'ar' ? 'طلبات السفر' : 'Travel Requests'}</option>
                <option value="attendance_request">{language === 'ar' ? 'طلبات الحضور' : 'Attendance Requests'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'مستوى الموافقة' : 'Approval Level'}
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="my_level">{language === 'ar' ? 'مستواي فقط' : 'My Level Only'}</option>
                <option value="all">{language === 'ar' ? 'جميع المستويات' : 'All Levels'}</option>
                <option value="manager">{language === 'ar' ? 'مستوى المدير' : 'Manager Level'}</option>
                <option value="hr">{language === 'ar' ? 'مستوى الموارد البشرية' : 'HR Level'}</option>
                <option value="finance">{language === 'ar' ? 'مستوى المالية' : 'Finance Level'}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No pending requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SLA Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${getRequestTypeBadge(request.request_type)}`}>
                          {getRequestTypeIcon(request.request_type)}
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRequestTypeBadge(request.request_type)}`}>
                          {getRequestTypeLabel(request.request_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.employee_name}</div>
                        <div className="text-sm text-gray-500">{request.employee_number}</div>
                        {request.department && (
                          <div className="text-xs text-gray-400">{request.department}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {request.request_subtype && (
                          <span className="text-xs text-gray-500 mr-1">[{request.request_subtype}]</span>
                        )}
                        {request.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.amount_or_days != null
                          ? request.unit === 'days'
                            ? `${request.amount_or_days} ${language === 'ar' ? 'أيام' : 'days'}`
                            : formatCurrency(request.amount_or_days, language)
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.request_date, language)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadge(request.pending_at_level)}`}>
                        {request.pending_at_level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSLABadge(request.id) || (
                        <span className="text-xs text-gray-400">No SLA</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${request.manager_approved_by ? 'bg-green-500' : 'bg-gray-300'}`} title="Manager"></span>
                        <span className={`h-2 w-2 rounded-full ${request.hr_approved_by ? 'bg-green-500' : 'bg-gray-300'}`} title="HR"></span>
                        <span className={`h-2 w-2 rounded-full ${request.finance_approved_by ? 'bg-green-500' : 'bg-gray-300'}`} title="Finance"></span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailsModal(request)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </button>
                        {canApprove(request) ? (
                          <>
                            <button
                              onClick={() => handleApprove(request)}
                              disabled={processing}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              disabled={processing}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Request Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedRequest.request_type} - {selectedRequest.employee_name}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Request Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {language === 'ar' ? 'الموظف' : 'Employee'}
                  </p>
                  <p className="text-base text-gray-900 mt-1">
                    {selectedRequest.employee_name} ({selectedRequest.employee_number})
                  </p>
                  {selectedRequest.department && (
                    <p className="text-sm text-gray-500">{selectedRequest.department}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {language === 'ar' ? 'نوع الطلب' : 'Request Type'}
                  </p>
                  <p className="text-base text-gray-900 mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRequestTypeBadge(selectedRequest.request_type)}`}>
                      {getRequestTypeLabel(selectedRequest.request_type)}
                    </span>
                    {selectedRequest.request_subtype && (
                      <span className="ml-2 text-sm text-gray-500">({selectedRequest.request_subtype})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {language === 'ar' ? 'القيمة' : 'Amount/Duration'}
                  </p>
                  <p className="text-base text-gray-900 mt-1">
                    {selectedRequest.amount_or_days != null
                      ? selectedRequest.unit === 'days'
                        ? `${selectedRequest.amount_or_days} ${language === 'ar' ? 'أيام' : 'days'}`
                        : formatCurrency(selectedRequest.amount_or_days, language)
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {language === 'ar' ? 'تاريخ الطلب' : 'Request Date'}
                  </p>
                  <p className="text-base text-gray-900 mt-1">
                    {formatDate(selectedRequest.request_date, language)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </p>
                  <p className="text-base text-gray-900 mt-1">{selectedRequest.description || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {language === 'ar' ? 'الحالة الحالية' : 'Current Status'}
                  </p>
                  <p className="text-base text-gray-900 mt-1 capitalize">{selectedRequest.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {language === 'ar' ? 'بانتظار' : 'Pending At'}
                  </p>
                  <p className="text-base text-gray-900 mt-1 capitalize">{selectedRequest.pending_at_level} Level</p>
                </div>
                {selectedRequest.sla_deadline && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">
                      {language === 'ar' ? 'الموعد النهائي' : 'SLA Deadline'}
                    </p>
                    <p className="text-base text-gray-900 mt-1">
                      {formatDate(selectedRequest.sla_deadline, language)}
                    </p>
                  </div>
                )}
              </div>

              {/* SLA Tracking */}
              <div className="border-t border-gray-200 pt-6">
                <SLAIndicator
                  requestType={selectedRequest.request_type}
                  requestId={selectedRequest.id}
                />
              </div>

              {/* Approval Timeline */}
              <div className="border-t border-gray-200 pt-6">
                <ApprovalTimeline
                  requestType={selectedRequest.request_type}
                  requestId={selectedRequest.id}
                  companyId={selectedRequest.company_id}
                />
              </div>

              {/* Action buttons */}
              {canApprove(selectedRequest) && (
                <div className="border-t border-gray-200 pt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openRejectModal(selectedRequest);
                    }}
                    disabled={processing}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject Request
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleApprove(selectedRequest);
                    }}
                    disabled={processing}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Approve Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Request</h3>
              <p className="text-sm text-gray-600 mb-4">
                You are about to reject the {rejectingRequest.request_type} request from {rejectingRequest.employee_name}.
                Please provide a reason for rejection.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  placeholder="Enter reason for rejection..."
                  required
                />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequest(null);
                  setRejectionReason('');
                }}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
