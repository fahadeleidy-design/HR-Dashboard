import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plus, MessageCircle, Send, Users, CheckCircle, Clock, Eye } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface FeedbackRequest {
  id: string;
  request_type: string;
  subject_employee: { first_name: string; last_name: string; job_title: string } | null;
  requester_name: string;
  status: string;
  requested_date: string;
  due_date: string;
  completed_responses: number;
  total_respondents: number;
  is_anonymous: boolean;
}

export function FeedbackCenter() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (currentCompany) {
      fetchFeedbackRequests();
    }
  }, [currentCompany, filterType]);

  const fetchFeedbackRequests = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      let query = supabase
        .from('feedback_requests')
        .select(`
          *,
          subject_employee:employees(first_name, last_name, job_title)
        `)
        .eq('company_id', currentCompany.id)
        .order('requested_date', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('request_type', filterType);
      }

      const { data, error } = await query;
      if (!error && data) {
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching feedback requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      closed: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '360_review': 'border-blue-500 bg-blue-50',
      manager_feedback: 'border-green-500 bg-green-50',
      peer_feedback: 'border-purple-500 bg-purple-50',
      upward_feedback: 'border-orange-500 bg-orange-50',
      self_assessment: 'border-gray-500 bg-gray-50'
    };
    return colors[type] || colors.self_assessment;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      '360_review': '360° Review',
      manager_feedback: 'Manager Feedback',
      peer_feedback: 'Peer Feedback',
      upward_feedback: 'Upward Feedback',
      self_assessment: 'Self Assessment'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">360° Feedback Center</h2>
          <p className="text-gray-600 mt-1">Multi-rater feedback and assessments</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="360_review">360° Review</option>
            <option value="manager_feedback">Manager Feedback</option>
            <option value="peer_feedback">Peer Feedback</option>
            <option value="upward_feedback">Upward Feedback</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
            <Plus className="h-5 w-5" />
            Request Feedback
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Feedback Requests</h3>
          <p className="text-gray-600 mb-6">Start collecting multi-rater feedback for performance reviews</p>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md mx-auto">
            <Plus className="h-5 w-5" />
            Create Feedback Request
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requests.map((request) => (
            <div
              key={request.id}
              className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${getTypeColor(request.request_type)} hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {getTypeLabel(request.request_type)}
                    </span>
                    {request.is_anonymous && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        ANONYMOUS
                      </span>
                    )}
                  </div>
                  {request.subject_employee && (
                    <>
                      <h3 className="text-lg font-bold text-gray-900">
                        {request.subject_employee.first_name} {request.subject_employee.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{request.subject_employee.job_title}</p>
                    </>
                  )}
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Requester</p>
                    <p className="font-medium text-gray-900">{request.requester_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Due Date</p>
                    <p className="font-medium text-gray-900">{formatDate(request.due_date, 'en')}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Response Progress
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {request.completed_responses} / {request.total_respondents}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{
                        width: `${request.total_respondents > 0 ? (request.completed_responses / request.total_respondents) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-green-600 font-medium">
                      {request.completed_responses} Completed
                    </span>
                    <span className="text-orange-600 font-medium">
                      {request.total_respondents - request.completed_responses} Pending
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                  <Eye className="h-4 w-4" />
                  View Responses
                </button>
                {request.status === 'pending' && (
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Reminders
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">360° Review</h3>
          </div>
          <p className="text-sm text-gray-700">
            Comprehensive feedback from managers, peers, direct reports, and self-assessment
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Manager Feedback</h3>
          </div>
          <p className="text-sm text-gray-700">
            Direct feedback from managers on performance, competencies, and development
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Peer Feedback</h3>
          </div>
          <p className="text-sm text-gray-700">
            Collaborative feedback from colleagues on teamwork and contribution
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-orange-600" />
          Feedback Best Practices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Request feedback from diverse sources for balanced perspective</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Use structured questions for consistent and actionable feedback</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Ensure anonymity when appropriate to encourage honest responses</span>
            </li>
          </ul>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Set realistic deadlines and send reminders to respondents</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Review aggregated feedback with employees for development</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Create action plans based on feedback insights</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
