import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/formatters';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, User,
  MessageSquare, ChevronDown, ChevronUp, Timer, ArrowRight
} from 'lucide-react';

interface ApprovalLevel {
  level: 'manager' | 'hr' | 'finance';
  label: string;
  labelAr: string;
  approvedBy: string | null;
  approvedAt: string | null;
  status: 'pending' | 'approved' | 'skipped' | 'waiting';
}

interface RequestApprovalPanelProps {
  requestType: 'advance' | 'loan' | 'leave_request';
  requestId: string;
  companyId: string;
  currentStatus: string;
  managerApprovedBy?: string | null;
  managerApprovedAt?: string | null;
  hrApprovedBy?: string | null;
  hrApprovedAt?: string | null;
  financeApprovedBy?: string | null;
  financeApprovedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  slaDeadline?: string | null;
  onStatusChange?: () => void;
  requiredApprovals?: ('manager' | 'hr' | 'finance')[];
}

export function RequestApprovalPanel({
  requestType,
  requestId,
  companyId,
  currentStatus,
  managerApprovedBy,
  managerApprovedAt,
  hrApprovedBy,
  hrApprovedAt,
  financeApprovedBy,
  financeApprovedAt,
  rejectedBy,
  rejectedAt,
  rejectionReason,
  slaDeadline,
  onStatusChange,
  requiredApprovals = ['manager', 'hr']
}: RequestApprovalPanelProps) {
  const { user, userRole } = useAuth();
  const { isRTL, language } = useLanguage();
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const getApprovalLevels = (): ApprovalLevel[] => {
    const levels: ApprovalLevel[] = [];

    if (requiredApprovals.includes('manager')) {
      levels.push({
        level: 'manager',
        label: 'Manager Approval',
        labelAr: 'موافقة المدير',
        approvedBy: managerApprovedBy || null,
        approvedAt: managerApprovedAt || null,
        status: managerApprovedBy
          ? 'approved'
          : currentStatus === 'pending'
          ? 'pending'
          : 'waiting'
      });
    }

    if (requiredApprovals.includes('hr')) {
      const managerDone = !requiredApprovals.includes('manager') || managerApprovedBy;
      levels.push({
        level: 'hr',
        label: 'HR Approval',
        labelAr: 'موافقة الموارد البشرية',
        approvedBy: hrApprovedBy || null,
        approvedAt: hrApprovedAt || null,
        status: hrApprovedBy
          ? 'approved'
          : managerDone && (currentStatus === 'pending' || currentStatus === 'manager_approved')
          ? 'pending'
          : 'waiting'
      });
    }

    if (requiredApprovals.includes('finance')) {
      const hrDone = !requiredApprovals.includes('hr') || hrApprovedBy;
      levels.push({
        level: 'finance',
        label: 'Finance Approval',
        labelAr: 'موافقة المالية',
        approvedBy: financeApprovedBy || null,
        approvedAt: financeApprovedAt || null,
        status: financeApprovedBy
          ? 'approved'
          : hrDone && (currentStatus === 'hr_approved')
          ? 'pending'
          : 'waiting'
      });
    }

    return levels;
  };

  const getCurrentApprovalLevel = (): 'manager' | 'hr' | 'finance' | null => {
    if (currentStatus === 'rejected' || currentStatus === 'approved' || currentStatus === 'active' || currentStatus === 'completed') {
      return null;
    }

    if (requiredApprovals.includes('manager') && !managerApprovedBy) {
      return 'manager';
    }
    if (requiredApprovals.includes('hr') && !hrApprovedBy) {
      return 'hr';
    }
    if (requiredApprovals.includes('finance') && !financeApprovedBy) {
      return 'finance';
    }
    return null;
  };

  const canUserApprove = (): boolean => {
    if (!userRole) return false;

    const currentLevel = getCurrentApprovalLevel();
    if (!currentLevel) return false;

    const roleApprovalMap: Record<string, string[]> = {
      manager: ['manager', 'hr', 'admin', 'super_admin'],
      hr: ['hr', 'admin', 'super_admin'],
      finance: ['finance', 'admin', 'super_admin']
    };

    return roleApprovalMap[currentLevel]?.includes(userRole.role) || false;
  };

  const getSLAStatus = () => {
    if (!slaDeadline) return null;

    const deadline = new Date(slaDeadline);
    const now = new Date();
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      return { status: 'overdue', label: isRTL ? 'متأخر' : 'Overdue', color: 'text-red-600 bg-red-50' };
    } else if (hoursRemaining < 4) {
      return { status: 'critical', label: isRTL ? 'حرج' : 'Critical', color: 'text-red-600 bg-red-50' };
    } else if (hoursRemaining < 12) {
      return { status: 'at_risk', label: isRTL ? 'في خطر' : 'At Risk', color: 'text-yellow-600 bg-yellow-50' };
    }
    return { status: 'on_time', label: isRTL ? 'في الوقت' : 'On Time', color: 'text-green-600 bg-green-50' };
  };

  const handleApproval = async () => {
    if (!user || !userRole) return;

    setProcessing(true);
    try {
      const currentLevel = getCurrentApprovalLevel();
      if (!currentLevel) return;

      const tableName = requestType === 'leave_request' ? 'leave_requests' : requestType + 's';

      if (approvalAction === 'approve') {
        const updateData: Record<string, any> = {};
        let newStatus = '';

        if (currentLevel === 'manager') {
          updateData.manager_approved_by = user.id;
          updateData.manager_approved_at = new Date().toISOString();
          newStatus = requiredApprovals.includes('hr') ? 'manager_approved' :
                     requiredApprovals.includes('finance') ? 'manager_approved' : 'approved';
        } else if (currentLevel === 'hr') {
          updateData.hr_approved_by = user.id;
          updateData.hr_approved_at = new Date().toISOString();
          newStatus = requiredApprovals.includes('finance') ? 'hr_approved' : 'approved';
        } else if (currentLevel === 'finance') {
          updateData.finance_approved_by = user.id;
          updateData.finance_approved_at = new Date().toISOString();
          newStatus = 'approved';
        }

        if (requestType === 'loan' && newStatus === 'approved') {
          newStatus = 'active';
        }

        updateData.status = newStatus;

        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', requestId);

        if (error) throw error;

        await supabase.from('approval_audit_trail').insert({
          company_id: companyId,
          request_type: requestType,
          request_id: requestId,
          action: `${currentLevel}_approved`,
          performed_by: user.id,
          previous_status: currentStatus,
          new_status: newStatus,
          approval_level: currentLevel,
          comments: comments || null
        });
      } else {
        const { error } = await supabase
          .from(tableName)
          .update({
            status: 'rejected',
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            rejection_reason: rejectionReasonInput
          })
          .eq('id', requestId);

        if (error) throw error;

        await supabase.from('approval_audit_trail').insert({
          company_id: companyId,
          request_type: requestType,
          request_id: requestId,
          action: 'rejected',
          performed_by: user.id,
          previous_status: currentStatus,
          new_status: 'rejected',
          approval_level: getCurrentApprovalLevel(),
          rejection_reason: rejectionReasonInput
        });
      }

      setShowApprovalForm(false);
      setComments('');
      setRejectionReasonInput('');
      onStatusChange?.();
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('Failed to process approval');
    } finally {
      setProcessing(false);
    }
  };

  const approvalLevels = getApprovalLevels();
  const slaStatus = getSLAStatus();
  const canApprove = canUserApprove();
  const isRejected = currentStatus === 'rejected';
  const isFinalApproved = currentStatus === 'approved' || currentStatus === 'active' || currentStatus === 'completed';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div
        className={`px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <CheckCircle className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">
            {isRTL ? 'سير الموافقات' : 'Approval Workflow'}
          </h3>
          {slaStatus && currentStatus !== 'approved' && currentStatus !== 'rejected' && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${slaStatus.color}`}>
              {slaStatus.label}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {isRejected && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">
                  {isRTL ? 'تم رفض الطلب' : 'Request Rejected'}
                </span>
              </div>
              {rejectionReason && (
                <p className={`mt-2 text-sm text-red-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <span className="font-medium">{isRTL ? 'السبب:' : 'Reason:'}</span> {rejectionReason}
                </p>
              )}
              {rejectedAt && (
                <p className={`mt-1 text-xs text-red-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {formatDate(rejectedAt, language)}
                </p>
              )}
            </div>
          )}

          {isFinalApproved && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  {isRTL ? 'تمت الموافقة على الطلب' : 'Request Approved'}
                </span>
              </div>
            </div>
          )}

          <div className="relative">
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              {approvalLevels.map((level, index) => (
                <div key={level.level} className="flex-1 flex items-center">
                  <div className="flex-1">
                    <div className={`flex flex-col items-center ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        level.status === 'approved'
                          ? 'bg-green-100 border-green-500 text-green-600'
                          : level.status === 'pending'
                          ? 'bg-yellow-100 border-yellow-500 text-yellow-600 animate-pulse'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}>
                        {level.status === 'approved' ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : level.status === 'pending' ? (
                          <Clock className="h-6 w-6" />
                        ) : (
                          <User className="h-6 w-6" />
                        )}
                      </div>
                      <span className={`mt-2 text-sm font-medium ${
                        level.status === 'approved'
                          ? 'text-green-700'
                          : level.status === 'pending'
                          ? 'text-yellow-700'
                          : 'text-gray-500'
                      }`}>
                        {isRTL ? level.labelAr : level.label}
                      </span>
                      {level.approvedAt && (
                        <span className="text-xs text-gray-500 mt-1">
                          {formatDate(level.approvedAt, language)}
                        </span>
                      )}
                    </div>
                  </div>
                  {index < approvalLevels.length - 1 && (
                    <div className={`flex-shrink-0 w-16 h-0.5 ${
                      level.status === 'approved' ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {slaStatus && slaDeadline && !isFinalApproved && !isRejected && (
            <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Timer className={`h-4 w-4 ${
                slaStatus.status === 'overdue' || slaStatus.status === 'critical'
                  ? 'text-red-500'
                  : slaStatus.status === 'at_risk'
                  ? 'text-yellow-500'
                  : 'text-green-500'
              }`} />
              <span className="text-gray-600">
                {isRTL ? 'الموعد النهائي للموافقة:' : 'Approval Deadline:'}{' '}
                <span className="font-medium">
                  {new Date(slaDeadline).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                </span>
              </span>
            </div>
          )}

          {canApprove && !isRejected && !isFinalApproved && (
            <div className="pt-4 border-t border-gray-200">
              {!showApprovalForm ? (
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => { setApprovalAction('approve'); setShowApprovalForm(true); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="h-5 w-5" />
                    {isRTL ? 'موافقة' : 'Approve'}
                  </button>
                  <button
                    onClick={() => { setApprovalAction('reject'); setShowApprovalForm(true); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                    {isRTL ? 'رفض' : 'Reject'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-3 rounded-lg ${
                    approvalAction === 'approve' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-medium ${approvalAction === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
                      {approvalAction === 'approve'
                        ? (isRTL ? 'تأكيد الموافقة' : 'Confirm Approval')
                        : (isRTL ? 'تأكيد الرفض' : 'Confirm Rejection')
                      }
                    </p>
                  </div>

                  {approvalAction === 'approve' ? (
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <MessageSquare className="h-4 w-4 inline mr-1" />
                        {isRTL ? 'ملاحظات (اختياري)' : 'Comments (optional)'}
                      </label>
                      <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={2}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                        placeholder={isRTL ? 'أضف ملاحظاتك هنا...' : 'Add your comments here...'}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        {isRTL ? 'سبب الرفض *' : 'Rejection Reason *'}
                      </label>
                      <textarea
                        value={rejectionReasonInput}
                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                        rows={3}
                        required
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                        placeholder={isRTL ? 'يرجى توضيح سبب الرفض...' : 'Please explain the reason for rejection...'}
                      />
                    </div>
                  )}

                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                      onClick={() => { setShowApprovalForm(false); setComments(''); setRejectionReasonInput(''); }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={processing}
                    >
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleApproval}
                      disabled={processing || (approvalAction === 'reject' && !rejectionReasonInput.trim())}
                      className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        approvalAction === 'approve'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {processing
                        ? (isRTL ? 'جاري المعالجة...' : 'Processing...')
                        : approvalAction === 'approve'
                        ? (isRTL ? 'تأكيد الموافقة' : 'Confirm Approve')
                        : (isRTL ? 'تأكيد الرفض' : 'Confirm Reject')
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
