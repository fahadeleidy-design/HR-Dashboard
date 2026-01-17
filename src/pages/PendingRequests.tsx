import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CheckCircle, XCircle, Clock, FileText, DollarSign, Calendar, Filter } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface PendingRequest {
  id: string;
  company_id: string;
  request_type: 'advance' | 'loan' | 'leave';
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department_id: string | null;
  job_position_id: string | null;
  manager_id: string | null;
  request_amount: number;
  request_date: string;
  status: string;
  description: string;
  pending_at_level: 'manager' | 'hr' | 'finance';
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  finance_approved_by: string | null;
  finance_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function PendingRequests() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { userRole, employeeProfile } = useAuth();
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

  useEffect(() => {
    if (currentCompany) {
      fetchPendingRequests();
    }
  }, [currentCompany]);

  useEffect(() => {
    filterRequests();
  }, [requests, selectedType, selectedLevel, employeeProfile, userRole]);

  const fetchPendingRequests = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_requests_unified')
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
        if (role === 'manager' && r.pending_at_level === 'manager' && r.manager_id === employeeProfile?.id) {
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
    if (!employeeProfile?.id) {
      showToast('Employee profile not found', 'error');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_request', {
        p_request_type: request.request_type,
        p_request_id: request.id,
        p_approver_employee_id: employeeProfile.id,
        p_approval_level: request.pending_at_level,
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
    if (!rejectingRequest || !employeeProfile?.id) return;

    if (!rejectionReason.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_request', {
        p_request_type: rejectingRequest.request_type,
        p_request_id: rejectingRequest.id,
        p_rejector_employee_id: employeeProfile.id,
        p_rejection_reason: rejectionReason
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

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'advance':
        return <DollarSign className="h-5 w-5" />;
      case 'loan':
        return <FileText className="h-5 w-5" />;
      case 'leave':
        return <Calendar className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    const colors = {
      advance: 'bg-blue-100 text-blue-800',
      loan: 'bg-purple-100 text-purple-800',
      leave: 'bg-green-100 text-green-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
    if (request.pending_at_level === 'manager' && role === 'manager' && request.manager_id === employeeProfile?.id) {
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
          <h1 className="text-3xl font-bold text-gray-900">Pending Requests</h1>
          <p className="text-gray-600 mt-1">Review and approve pending requests from employees</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRequests.length}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Advances</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredRequests.filter(r => r.request_type === 'advance').length}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Loans</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredRequests.filter(r => r.request_type === 'loan').length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leave Requests</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredRequests.filter(r => r.request_type === 'leave').length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="advance">Advances</option>
                <option value="loan">Loans</option>
                <option value="leave">Leave Requests</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="my_level">My Level Only</option>
                <option value="all">All Levels</option>
                <option value="manager">Manager Level</option>
                <option value="hr">HR Level</option>
                <option value="finance">Finance Level</option>
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
                          {request.request_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.employee_name}</div>
                        <div className="text-sm text-gray-500">{request.employee_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {request.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.request_type === 'leave'
                          ? `${request.request_amount} days`
                          : formatCurrency(request.request_amount, language)
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
                      <div className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${request.manager_approved_by ? 'bg-green-500' : 'bg-gray-300'}`} title="Manager"></span>
                        <span className={`h-2 w-2 rounded-full ${request.hr_approved_by ? 'bg-green-500' : 'bg-gray-300'}`} title="HR"></span>
                        <span className={`h-2 w-2 rounded-full ${request.finance_approved_by ? 'bg-green-500' : 'bg-gray-300'}`} title="Finance"></span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canApprove(request) ? (
                        <div className="flex items-center justify-end gap-2">
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
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Not your level</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
