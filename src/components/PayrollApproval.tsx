import { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, Clock, User, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PayrollApprovalProps {
  batch: any;
  onApprovalComplete: () => void;
}

interface ApprovalLevel {
  level: number;
  approver: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: string;
  comments?: string;
}

export function PayrollApproval({ batch, onApprovalComplete }: PayrollApprovalProps) {
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const approvalLevels: ApprovalLevel[] = [
    {
      level: 1,
      approver: 'HR Manager',
      role: 'hr_manager',
      status: batch.status === 'draft' ? 'pending' : 'approved',
      timestamp: batch.status !== 'draft' ? new Date().toISOString() : undefined
    },
    {
      level: 2,
      approver: 'Finance Manager',
      role: 'finance_manager',
      status: batch.status === 'approved' || batch.status === 'processed' || batch.status === 'paid' ? 'approved' : 'pending',
      timestamp: batch.status === 'approved' ? batch.approved_at : undefined
    },
    {
      level: 3,
      approver: 'CEO/CFO',
      role: 'super_admin',
      status: batch.status === 'processed' || batch.status === 'paid' ? 'approved' : 'pending',
      timestamp: batch.status === 'processed' ? batch.processed_at : undefined
    }
  ];

  const handleApprove = async () => {
    setLoading(true);
    try {
      let newStatus = batch.status;

      if (batch.status === 'draft') {
        newStatus = 'pending_approval';
      } else if (batch.status === 'pending_approval') {
        newStatus = 'approved';
      } else if (batch.status === 'approved') {
        newStatus = 'processed';
      }

      const { error } = await supabase
        .from('payroll_batches')
        .update({
          status: newStatus,
          ...(newStatus === 'approved' && { approved_at: new Date().toISOString() }),
          ...(newStatus === 'processed' && { processed_at: new Date().toISOString() }),
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('payroll_processing_log').insert({
          batch_id: batch.id,
          company_id: batch.company_id,
          action: 'approval',
          description: `Batch ${batch.status} → ${newStatus}`,
          performed_by: user.id,
          metadata: { comments, previous_status: batch.status, new_status: newStatus }
        });
      }

      alert(`Batch ${newStatus === 'pending_approval' ? 'submitted for approval' : newStatus}!`);
      onApprovalComplete();
    } catch (error: any) {
      console.error('Error approving batch:', error);
      alert('Failed to approve batch: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this payroll batch?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('payroll_batches')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('payroll_processing_log').insert({
          batch_id: batch.id,
          company_id: batch.company_id,
          action: 'rejection',
          description: `Batch rejected and returned to draft`,
          performed_by: user.id,
          metadata: { comments, previous_status: batch.status }
        });
      }

      alert('Batch rejected and returned to draft status');
      onApprovalComplete();
    } catch (error: any) {
      console.error('Error rejecting batch:', error);
      alert('Failed to reject batch: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Approval Workflow</h3>
        <p className="text-sm text-gray-600 mt-1">Multi-level approval process for payroll batch</p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {approvalLevels.map((level, index) => (
            <div key={level.level}>
              <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${getStatusColor(level.status)}`}>
                <div className="flex-shrink-0">
                  {getStatusIcon(level.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Level {level.level}</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="font-medium">{level.approver}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Role: {level.role}</p>
                  {level.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(level.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(level.status)}`}>
                    {level.status}
                  </span>
                </div>
              </div>
              {index < approvalLevels.length - 1 && (
                <div className="flex justify-center py-2">
                  <div className="h-8 w-0.5 bg-gray-300"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {(batch.status === 'draft' || batch.status === 'pending_approval' || batch.status === 'approved') && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Comments (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add approval comments or feedback..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="h-5 w-5" />
                {batch.status === 'draft' ? 'Submit for Approval' : 'Approve'}
              </button>

              {batch.status !== 'draft' && (
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="h-5 w-5" />
                  Reject
                </button>
              )}
            </div>
          </div>
        )}

        {batch.status === 'processed' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              Batch has been processed and is ready for payment execution
            </p>
          </div>
        )}

        {batch.status === 'paid' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-900 font-medium">
                Batch has been fully paid and completed
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
