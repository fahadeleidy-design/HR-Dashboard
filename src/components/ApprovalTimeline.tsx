import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/formatters';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, XCircle, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface AuditTrailEntry {
  id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  previous_status: string | null;
  new_status: string;
  approval_level: string | null;
  comments: string | null;
  rejection_reason: string | null;
  performer_name: string;
}

interface ApprovalTimelineProps {
  requestType: 'advance' | 'loan' | 'leave';
  requestId: string;
  companyId: string;
}

export function ApprovalTimeline({ requestType, requestId, companyId }: ApprovalTimelineProps) {
  const { language } = useLanguage();
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();

  useEffect(() => {
    fetchAuditTrail();
  }, [requestType, requestId]);

  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_audit_trail')
        .select(`
          *,
          performer:performed_by (
            first_name_en,
            last_name_en
          )
        `)
        .eq('request_type', requestType)
        .eq('request_id', requestId)
        .order('performed_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        performed_by: entry.performed_by,
        performed_at: entry.performed_at,
        previous_status: entry.previous_status,
        new_status: entry.new_status,
        approval_level: entry.approval_level,
        comments: entry.comments,
        rejection_reason: entry.rejection_reason,
        performer_name: entry.performer
          ? `${entry.performer.first_name_en} ${entry.performer.last_name_en}`
          : 'Unknown'
      }));

      setAuditTrail(formattedData);
    } catch (error) {
      logError(error, 'medium', { component: 'ApprovalTimeline', action: 'fetchAuditTrail' });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'submitted':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'manager_approved':
      case 'hr_approved':
      case 'finance_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'escalated':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      submitted: 'Request Submitted',
      manager_approved: 'Manager Approved',
      hr_approved: 'HR Approved',
      finance_approved: 'Finance Approved',
      rejected: 'Request Rejected',
      withdrawn: 'Request Withdrawn',
      escalated: 'Request Escalated'
    };
    return labels[action] || action;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      manager_approved: 'bg-blue-100 text-blue-800',
      hr_approved: 'bg-indigo-100 text-indigo-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading approval history...</div>
      </div>
    );
  }

  if (auditTrail.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <Clock className="h-8 w-8 mr-2" />
        <span>No approval history available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline entries */}
        <div className="space-y-6">
          {auditTrail.map((entry, index) => (
            <div key={entry.id} className="relative flex gap-4">
              {/* Icon */}
              <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-gray-200">
                {getActionIcon(entry.action)}
              </div>

              {/* Content */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {getActionLabel(entry.action)}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{entry.performer_name}</span>
                      {entry.approval_level && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          {entry.approval_level.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(entry.performed_at, language)}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(entry.performed_at).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Status transition */}
                <div className="flex items-center gap-2 text-sm mb-2">
                  {entry.previous_status && (
                    <>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(entry.previous_status)}`}>
                        {entry.previous_status}
                      </span>
                      <span className="text-gray-400">→</span>
                    </>
                  )}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(entry.new_status)}`}>
                    {entry.new_status}
                  </span>
                </div>

                {/* Comments */}
                {entry.comments && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Comment:</span> {entry.comments}
                    </p>
                  </div>
                )}

                {/* Rejection reason */}
                {entry.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-100">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-red-700">Rejection Reason:</span> {entry.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
