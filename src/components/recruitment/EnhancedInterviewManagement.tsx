import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import {
  Calendar, Users, Plus, Eye, Edit, Star, Clock, CheckCircle, XCircle, X, Save
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { InterviewScheduleForm } from './InterviewScheduleForm';
import { PanelCreationForm } from './PanelCreationForm';
import { InterviewScorecardForm } from './InterviewScorecardForm';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Interview {
  id: string;
  application_id: string;
  interview_type: string;
  interview_round: number;
  scheduled_date: string;
  duration_minutes: number;
  location: string;
  status: string;
  interviewer_ids: string[];
  candidate?: {
    first_name: string;
    last_name: string;
  };
  job_posting?: {
    job_title: string;
  };
}

interface InterviewPanel {
  id: string;
  panel_name: string;
  description: string;
  panel_members: any[];
  is_active: boolean;
}

interface Scorecard {
  id: string;
  interview_id: string;
  interviewer_id: string;
  technical_skills_rating: number;
  communication_rating: number;
  problem_solving_rating: number;
  cultural_fit_rating: number;
  overall_rating: number;
  recommendation: string;
  strengths: string;
  weaknesses: string;
  detailed_feedback: string;
}

export function EnhancedInterviewManagement() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'interviews' | 'panels' | 'scorecards'>('interviews');
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [panels, setPanels] = useState<InterviewPanel[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [filter, setFilter] = useState('all');
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (currentCompany) {
      if (activeTab === 'interviews') fetchInterviews();
      else if (activeTab === 'panels') fetchPanels();
      else if (activeTab === 'scorecards') fetchScorecards();
    }
  }, [currentCompany, activeTab, filter]);

  const fetchInterviews = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      let query = supabase
        .from('interviews')
        .select(`
          *,
          application:applications(
            candidate:candidates(first_name, last_name),
            job_posting:job_postings(job_title)
          )
        `)
        .eq('company_id', currentCompany.id)
        .order('scheduled_date', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (!error && data) setInterviews(data);
    } catch (error) {
      logError(error, 'medium', { component: 'EnhancedInterviewManagement', action: 'fetchInterviews' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPanels = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interview_panels')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (!error && data) setPanels(data);
    } catch (error) {
      logError(error, 'medium', { component: 'EnhancedInterviewManagement', action: 'fetchPanels' });
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecards = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interview_scorecards')
        .select(`
          *,
          interview:interviews(
            scheduled_date,
            application:applications(
              candidate:candidates(first_name, last_name)
            )
          ),
          interviewer:employees(full_name)
        `)
        .order('submitted_at', { ascending: false })
        .limit(50);

      if (!error && data) setScorecards(data);
    } catch (error) {
      logError(error, 'medium', { component: 'EnhancedInterviewManagement', action: 'fetchScorecards' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      no_show: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle }
    };

    const badge = badges[status] || badges.scheduled;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getRecommendationBadge = (recommendation: string) => {
    const colors: Record<string, string> = {
      strong_hire: 'bg-green-600 text-white',
      hire: 'bg-green-100 text-green-700',
      maybe: 'bg-yellow-100 text-yellow-700',
      no_hire: 'bg-red-100 text-red-700',
      strong_no_hire: 'bg-red-600 text-white'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[recommendation] || 'bg-gray-100 text-gray-700'}`}>
        {recommendation.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const renderInterviews = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Schedule Interview
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type / Round</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No interviews scheduled
                  </td>
                </tr>
              ) : (
                interviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">
                        {interview.candidate?.first_name} {interview.candidate?.last_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{interview.job_posting?.job_title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{interview.interview_type}</span>
                        <span className="text-xs text-gray-500">Round {interview.interview_round}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900">{formatDate(interview.scheduled_date, 'en')}</span>
                        <span className="text-xs text-gray-500">{new Date(interview.scheduled_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{interview.duration_minutes} min</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(interview.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedInterview(interview)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInterview(interview);
                          setShowScorecardModal(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Add Scorecard"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPanels = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Create Panel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {panels.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No interview panels created yet
          </div>
        ) : (
          panels.map((panel) => (
            <div key={panel.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{panel.panel_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{panel.description}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  panel.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {panel.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{panel.panel_members.length} members</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Edit
                </button>
                <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderScorecards = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interviewer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommendation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {scorecards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No scorecards submitted yet
                  </td>
                </tr>
              ) : (
                scorecards.map((scorecard: any) => (
                  <tr key={scorecard.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">
                        {scorecard.interview?.application?.candidate?.first_name}{' '}
                        {scorecard.interview?.application?.candidate?.last_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{scorecard.interviewer?.full_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold text-gray-900">{scorecard.overall_rating.toFixed(1)}/5.0</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRecommendationBadge(scorecard.recommendation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {formatDate(scorecard.submitted_at, 'en')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-blue-600 hover:text-blue-900" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('interviews')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'interviews'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Interviews
            </div>
          </button>
          <button
            onClick={() => setActiveTab('panels')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'panels'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Panels
            </div>
          </button>
          <button
            onClick={() => setActiveTab('scorecards')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'scorecards'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Scorecards
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'interviews' && renderInterviews()}
      {activeTab === 'panels' && renderPanels()}
      {activeTab === 'scorecards' && renderScorecards()}

      {showModal && activeTab === 'interviews' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">Schedule Interview</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <InterviewScheduleForm
                companyId={currentCompany?.id || ''}
                onSuccess={() => {
                  setShowModal(false);
                  fetchInterviews();
                }}
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showModal && activeTab === 'panels' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">Create Interview Panel</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <PanelCreationForm
                companyId={currentCompany?.id || ''}
                onSuccess={() => {
                  setShowModal(false);
                  fetchPanels();
                }}
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Interview Details</h2>
              <button onClick={() => setSelectedInterview(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate</label>
                  <p className="text-gray-900 font-semibold">
                    {selectedInterview.candidate?.first_name} {selectedInterview.candidate?.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <p className="text-gray-900">{selectedInterview.job_posting?.job_title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <p className="text-gray-900">{selectedInterview.interview_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
                  <p className="text-gray-900">Round {selectedInterview.interview_round}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <p className="text-gray-900">{formatDate(selectedInterview.scheduled_date, 'en')}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedInterview.scheduled_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <p className="text-gray-900">{selectedInterview.duration_minutes} minutes</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <p className="text-gray-900">{selectedInterview.location || 'Not specified'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {getStatusBadge(selectedInterview.status)}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedInterview(null)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showScorecardModal && selectedInterview && (
        <InterviewScorecardForm
          interview={selectedInterview}
          onClose={() => {
            setShowScorecardModal(false);
            setSelectedInterview(null);
          }}
          onSuccess={() => {
            fetchInterviews();
            fetchScorecards();
          }}
        />
      )}
    </div>
  );
}
