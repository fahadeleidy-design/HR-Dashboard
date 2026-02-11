import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { RequestApprovalPanel } from './RequestApprovalPanel';
import { ApprovalTimeline } from '@/components/ApprovalTimeline';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import {
  X, User, Calendar, DollarSign, FileText, Clock,
  Building2, Hash, Briefcase, AlertTriangle, MessageSquare
} from 'lucide-react';

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestType: 'advance' | 'loan' | 'leave_request';
  requestId: string;
  companyId: string;
  onStatusChange?: () => void;
}

interface RequestData {
  id: string;
  status: string;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    nameAr: string;
    number: string;
    department: string;
    position: string;
  };
  amount?: number;
  loanType?: string;
  numberOfInstallments?: number;
  monthlyInstallment?: number;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  leaveType?: string;
  leaveTypeAr?: string;
  reason?: string;
  notes?: string;
  managerApprovedBy?: string;
  managerApprovedAt?: string;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  financeApprovedBy?: string;
  financeApprovedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  slaDeadline?: string;
}

export function RequestDetailModal({
  isOpen,
  onClose,
  requestType,
  requestId,
  companyId,
  onStatusChange
}: RequestDetailModalProps) {
  const { isRTL, language } = useLanguage();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  useEffect(() => {
    if (isOpen && requestId) {
      fetchRequestDetails();
    }
  }, [isOpen, requestId, requestType]);

  const fetchRequestDetails = async () => {
    setLoading(true);
    try {
      let data: any = null;

      if (requestType === 'leave_request') {
        const { data: leaveData, error } = await supabase
          .from('leave_requests')
          .select(`
            *,
            employee:employees(id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, position, department:departments(name_en, name_ar)),
            leave_type:leave_types(name_en, name_ar)
          `)
          .eq('id', requestId)
          .single();

        if (error) throw error;

        data = {
          id: leaveData.id,
          status: leaveData.status,
          createdAt: leaveData.created_at,
          employee: {
            id: leaveData.employee.id,
            name: `${leaveData.employee.first_name_en} ${leaveData.employee.last_name_en}`,
            nameAr: `${leaveData.employee.first_name_ar || leaveData.employee.first_name_en} ${leaveData.employee.last_name_ar || leaveData.employee.last_name_en}`,
            number: leaveData.employee.employee_number,
            department: leaveData.employee.department?.name_en || '',
            position: leaveData.employee.position || ''
          },
          startDate: leaveData.start_date,
          endDate: leaveData.end_date,
          totalDays: leaveData.total_days,
          leaveType: leaveData.leave_type?.name_en,
          leaveTypeAr: leaveData.leave_type?.name_ar,
          reason: leaveData.reason,
          managerApprovedBy: leaveData.manager_approved_by,
          managerApprovedAt: leaveData.manager_approved_at,
          hrApprovedBy: leaveData.hr_approved_by,
          hrApprovedAt: leaveData.hr_approved_at,
          rejectedBy: leaveData.rejected_by,
          rejectedAt: leaveData.rejected_at,
          rejectionReason: leaveData.rejection_reason,
          slaDeadline: leaveData.sla_deadline
        };
      } else if (requestType === 'loan') {
        const { data: loanData, error } = await supabase
          .from('loans')
          .select(`
            *,
            employee:employees(id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, position, department:departments(name_en, name_ar))
          `)
          .eq('id', requestId)
          .single();

        if (error) throw error;

        data = {
          id: loanData.id,
          status: loanData.status,
          createdAt: loanData.created_at,
          employee: {
            id: loanData.employee.id,
            name: `${loanData.employee.first_name_en} ${loanData.employee.last_name_en}`,
            nameAr: `${loanData.employee.first_name_ar || loanData.employee.first_name_en} ${loanData.employee.last_name_ar || loanData.employee.last_name_en}`,
            number: loanData.employee.employee_number,
            department: loanData.employee.department?.name_en || '',
            position: loanData.employee.position || ''
          },
          amount: loanData.loan_amount,
          loanType: loanData.loan_type,
          numberOfInstallments: loanData.number_of_installments,
          monthlyInstallment: loanData.monthly_installment,
          startDate: loanData.start_date,
          notes: loanData.notes,
          managerApprovedBy: loanData.manager_approved_by,
          managerApprovedAt: loanData.manager_approved_at,
          hrApprovedBy: loanData.hr_approved_by,
          hrApprovedAt: loanData.hr_approved_at,
          financeApprovedBy: loanData.finance_approved_by,
          financeApprovedAt: loanData.finance_approved_at,
          rejectedBy: loanData.rejected_by,
          rejectedAt: loanData.rejected_at,
          rejectionReason: loanData.rejection_reason,
          slaDeadline: loanData.sla_deadline
        };
      } else if (requestType === 'advance') {
        const { data: advanceData, error } = await supabase
          .from('advances')
          .select(`
            *,
            employee:employees(id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, position, department:departments(name_en, name_ar))
          `)
          .eq('id', requestId)
          .single();

        if (error) throw error;

        data = {
          id: advanceData.id,
          status: advanceData.status,
          createdAt: advanceData.created_at,
          employee: {
            id: advanceData.employee.id,
            name: `${advanceData.employee.first_name_en} ${advanceData.employee.last_name_en}`,
            nameAr: `${advanceData.employee.first_name_ar || advanceData.employee.first_name_en} ${advanceData.employee.last_name_ar || advanceData.employee.last_name_en}`,
            number: advanceData.employee.employee_number,
            department: advanceData.employee.department?.name_en || '',
            position: advanceData.employee.position || ''
          },
          amount: advanceData.amount,
          startDate: advanceData.request_date,
          notes: advanceData.notes,
          managerApprovedBy: advanceData.manager_approved_by,
          managerApprovedAt: advanceData.manager_approved_at,
          hrApprovedBy: advanceData.hr_approved_by,
          hrApprovedAt: advanceData.hr_approved_at,
          financeApprovedBy: advanceData.finance_approved_by,
          financeApprovedAt: advanceData.finance_approved_at,
          rejectedBy: advanceData.rejected_by,
          rejectedAt: advanceData.rejected_at,
          rejectionReason: advanceData.rejection_reason,
          slaDeadline: advanceData.sla_deadline
        };
      }

      setRequest(data);
    } catch (error) {
      logError(error, 'medium', { component: 'RequestDetailModal', action: 'fetchRequestDetails' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = () => {
    fetchRequestDetails();
    onStatusChange?.();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Manager', labelAr: 'بانتظار المدير' },
      manager_approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending HR', labelAr: 'بانتظار الموارد البشرية' },
      hr_approved: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Pending Finance', labelAr: 'بانتظار المالية' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved', labelAr: 'موافق عليه' },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active', labelAr: 'نشط' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', labelAr: 'مرفوض' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed', labelAr: 'مكتمل' }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status, labelAr: status };
  };

  const getRequestTypeLabel = () => {
    const labels: Record<string, { en: string; ar: string }> = {
      leave_request: { en: 'Leave Request', ar: 'طلب إجازة' },
      loan: { en: 'Loan Request', ar: 'طلب قرض' },
      advance: { en: 'Advance Request', ar: 'طلب سلفة' }
    };
    return labels[requestType] || { en: requestType, ar: requestType };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isRTL ? getRequestTypeLabel().ar : getRequestTypeLabel().en}
            </h2>
            {request && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(request.status).bg} ${getStatusBadge(request.status).text}`}>
                {isRTL ? getStatusBadge(request.status).labelAr : getStatusBadge(request.status).label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : request ? (
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="border-b border-gray-200">
              <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'details'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {isRTL ? 'التفاصيل' : 'Details'}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {isRTL ? 'السجل' : 'History'}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {activeTab === 'details' ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="h-7 w-7 text-primary-600" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {isRTL ? request.employee.nameAr : request.employee.name}
                        </h3>
                        <div className={`flex items-center gap-3 text-sm text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Hash className="h-4 w-4" />
                            {request.employee.number}
                          </span>
                          {request.employee.department && (
                            <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Building2 className="h-4 w-4" />
                              {request.employee.department}
                            </span>
                          )}
                          {request.employee.position && (
                            <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Briefcase className="h-4 w-4" />
                              {request.employee.position}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {requestType === 'leave_request' && (
                      <>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className={`flex items-center gap-2 text-blue-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Calendar className="h-5 w-5" />
                            <span className="font-medium">{isRTL ? 'نوع الإجازة' : 'Leave Type'}</span>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-blue-900">
                            {isRTL ? request.leaveTypeAr : request.leaveType}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className={`flex items-center gap-2 text-green-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Clock className="h-5 w-5" />
                            <span className="font-medium">{isRTL ? 'المدة' : 'Duration'}</span>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-green-900">
                            {request.totalDays} {isRTL ? 'يوم' : 'days'}
                          </p>
                          <p className="text-sm text-green-700">
                            {formatDate(request.startDate!, language)} - {formatDate(request.endDate!, language)}
                          </p>
                        </div>
                      </>
                    )}

                    {(requestType === 'loan' || requestType === 'advance') && (
                      <>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className={`flex items-center gap-2 text-green-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <DollarSign className="h-5 w-5" />
                            <span className="font-medium">{isRTL ? 'المبلغ' : 'Amount'}</span>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-green-900">
                            {formatCurrency(request.amount!, language)}
                          </p>
                        </div>
                        {request.loanType && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className={`flex items-center gap-2 text-blue-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <FileText className="h-5 w-5" />
                              <span className="font-medium">{isRTL ? 'نوع القرض' : 'Loan Type'}</span>
                            </div>
                            <p className="mt-2 text-lg font-semibold text-blue-900 capitalize">
                              {request.loanType}
                            </p>
                          </div>
                        )}
                        {request.numberOfInstallments && (
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className={`flex items-center gap-2 text-purple-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Calendar className="h-5 w-5" />
                              <span className="font-medium">{isRTL ? 'عدد الأقساط' : 'Installments'}</span>
                            </div>
                            <p className="mt-2 text-lg font-semibold text-purple-900">
                              {request.numberOfInstallments} {isRTL ? 'شهر' : 'months'}
                            </p>
                            {request.monthlyInstallment && (
                              <p className="text-sm text-purple-700">
                                {formatCurrency(request.monthlyInstallment, language)} / {isRTL ? 'شهر' : 'month'}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className={`flex items-center gap-2 text-gray-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">{isRTL ? 'تاريخ الطلب' : 'Request Date'}</span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-gray-900">
                        {formatDate(request.createdAt, language)}
                      </p>
                    </div>
                  </div>

                  {(request.reason || request.notes) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className={`flex items-center gap-2 text-gray-800 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <MessageSquare className="h-5 w-5" />
                        <span className="font-medium">{isRTL ? 'السبب / الملاحظات' : 'Reason / Notes'}</span>
                      </div>
                      <p className={`text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {request.reason || request.notes}
                      </p>
                    </div>
                  )}

                  <RequestApprovalPanel
                    requestType={requestType}
                    requestId={requestId}
                    companyId={companyId}
                    currentStatus={request.status}
                    managerApprovedBy={request.managerApprovedBy}
                    managerApprovedAt={request.managerApprovedAt}
                    hrApprovedBy={request.hrApprovedBy}
                    hrApprovedAt={request.hrApprovedAt}
                    financeApprovedBy={request.financeApprovedBy}
                    financeApprovedAt={request.financeApprovedAt}
                    rejectedBy={request.rejectedBy}
                    rejectedAt={request.rejectedAt}
                    rejectionReason={request.rejectionReason}
                    slaDeadline={request.slaDeadline}
                    onStatusChange={handleStatusChange}
                    requiredApprovals={requestType === 'leave_request' ? ['manager', 'hr'] : ['manager', 'hr', 'finance']}
                  />
                </>
              ) : (
                <ApprovalTimeline
                  requestType={requestType === 'leave_request' ? 'leave' : requestType}
                  requestId={requestId}
                  companyId={companyId}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {isRTL ? 'لم يتم العثور على الطلب' : 'Request not found'}
          </div>
        )}
      </div>
    </div>
  );
}
