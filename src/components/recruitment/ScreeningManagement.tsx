import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import {
  ClipboardCheck, Search, Eye, X, Star, CheckCircle,
  XCircle, Clock, AlertCircle, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface Screening {
  id: string;
  candidate: {
    full_name: string;
    email: string;
    phone: string;
    current_position: string;
    years_of_experience: number;
  };
  job_posting: {
    job_title: string;
  } | null;
  screening_status: string;
  overall_score: number | null;
  recommendation: string | null;
  screened_at: string | null;
  created_at: string;
}

interface ScreeningCriteria {
  id: string;
  criteria_name: string;
  description: string;
  criteria_type: string;
  weight: number;
  is_required: boolean;
}

interface ScreeningEvaluation {
  criteria_id: string;
  score: number;
  rating: string;
  meets_requirement: boolean;
  evaluator_notes: string;
}

export function ScreeningManagement() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [criteria, setCriteria] = useState<ScreeningCriteria[]>([]);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingScreening, setViewingScreening] = useState<Screening | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, ScreeningEvaluation>>({});

  useEffect(() => {
    if (currentCompany) {
      fetchScreenings();
      fetchCriteria();
    }
  }, [currentCompany, filter]);

  const fetchScreenings = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      let query = supabase
        .from('candidate_screenings')
        .select(`
          *,
          candidate:candidates(full_name, email, phone, current_position, years_of_experience),
          job_posting:job_postings(job_title)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('screening_status', filter);
      }

      const { data, error } = await query;
      if (!error && data) {
        setScreenings(data);
      }
    } catch (error) {
      console.error('Error fetching screenings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCriteria = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('screening_criteria')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('display_order');

      if (!error && data) {
        setCriteria(data);
        const initialEvals: Record<string, ScreeningEvaluation> = {};
        data.forEach(c => {
          initialEvals[c.id] = {
            criteria_id: c.id,
            score: 5,
            rating: 'fair',
            meets_requirement: false,
            evaluator_notes: ''
          };
        });
        setEvaluations(initialEvals);
      }
    } catch (error) {
      console.error('Error fetching criteria:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      passed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      on_hold: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getRecommendationBadge = (recommendation: string | null) => {
    if (!recommendation) return null;

    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      reject: { bg: 'bg-red-100', text: 'text-red-700', icon: ThumbsDown },
      interview: { bg: 'bg-blue-100', text: 'text-blue-700', icon: ThumbsUp },
      fast_track: { bg: 'bg-green-100', text: 'text-green-700', icon: Star },
      further_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle }
    };

    const badge = badges[recommendation] || badges.further_review;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {recommendation.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const handleSubmitScreening = async () => {
    if (!viewingScreening) return;

    setEvaluating(true);
    try {
      const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
      const weightedScore = criteria.reduce((sum, c) => {
        const evaluation = evaluations[c.id];
        return sum + (evaluation.score * c.weight);
      }, 0);
      const calculatedScore = (weightedScore / (totalWeight * 10)) * 100;

      let recommendation = 'further_review';
      if (calculatedScore >= 80) recommendation = 'fast_track';
      else if (calculatedScore >= 60) recommendation = 'interview';
      else if (calculatedScore < 40) recommendation = 'reject';

      const { data: user } = await supabase.auth.getUser();

      const { error: screeningError } = await supabase
        .from('candidate_screenings')
        .update({
          screening_status: 'in_progress',
          overall_score: Math.round(calculatedScore),
          calculated_score: calculatedScore,
          recommendation: recommendation,
          screened_by: user.user?.id,
          screened_at: new Date().toISOString()
        })
        .eq('id', viewingScreening.id);

      if (screeningError) throw screeningError;

      const evaluationInserts = criteria.map(c => ({
        screening_id: viewingScreening.id,
        criteria_id: c.id,
        ...evaluations[c.id]
      }));

      const { error: evalError } = await supabase
        .from('screening_evaluations')
        .upsert(evaluationInserts, {
          onConflict: 'screening_id,criteria_id'
        });

      if (evalError) throw evalError;

      showToast('Screening evaluation submitted successfully', 'success');
      setViewingScreening(null);
      fetchScreenings();
    } catch (error: any) {
      console.error('Error submitting screening:', error);
      showToast(error.message || 'Error submitting screening', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  const filteredScreenings = screenings.filter(s =>
    s.candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search screenings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold mt-2">
                {screenings.filter(s => s.screening_status === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">In Progress</p>
              <p className="text-3xl font-bold mt-2">
                {screenings.filter(s => s.screening_status === 'in_progress').length}
              </p>
            </div>
            <ClipboardCheck className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Passed</p>
              <p className="text-3xl font-bold mt-2">
                {screenings.filter(s => s.screening_status === 'passed').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Failed</p>
              <p className="text-3xl font-bold mt-2">
                {screenings.filter(s => s.screening_status === 'failed').length}
              </p>
            </div>
            <XCircle className="h-8 w-8 opacity-80" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommendation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredScreenings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No screenings found</p>
                  </td>
                </tr>
              ) : (
                filteredScreenings.map((screening) => (
                  <tr key={screening.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{screening.candidate.full_name}</p>
                        <p className="text-xs text-gray-500">{screening.candidate.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {screening.job_posting?.job_title || screening.candidate.current_position || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{screening.candidate.years_of_experience} years</span>
                    </td>
                    <td className="px-6 py-4">
                      {screening.overall_score !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                            <div
                              className={`h-2 rounded-full ${
                                screening.overall_score >= 80 ? 'bg-green-500' :
                                screening.overall_score >= 60 ? 'bg-blue-500' :
                                screening.overall_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${screening.overall_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{screening.overall_score}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not scored</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(screening.screening_status)}
                    </td>
                    <td className="px-6 py-4">
                      {getRecommendationBadge(screening.recommendation)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {formatDate(screening.created_at, 'en')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setViewingScreening(screening)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Evaluate"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Screening Evaluation</h2>
              <button onClick={() => setViewingScreening(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Candidate Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium text-gray-900">{viewingScreening.candidate.full_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 text-gray-900">{viewingScreening.candidate.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 text-gray-900">{viewingScreening.candidate.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Experience:</span>
                    <span className="ml-2 text-gray-900">{viewingScreening.candidate.years_of_experience} years</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Evaluation Criteria</h3>
                <div className="space-y-4">
                  {criteria.map((criterion) => (
                    <div key={criterion.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{criterion.criteria_name}</h4>
                            {criterion.is_required && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                            )}
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              Weight: {criterion.weight}/10
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
                        </div>
                      </div>

                      {criterion.criteria_type === 'rating' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Score (0-10)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={evaluations[criterion.id]?.score || 5}
                              onChange={(e) => setEvaluations({
                                ...evaluations,
                                [criterion.id]: {
                                  ...evaluations[criterion.id],
                                  score: parseInt(e.target.value)
                                }
                              })}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Poor</span>
                              <span className="font-bold text-lg text-blue-600">
                                {evaluations[criterion.id]?.score || 5}
                              </span>
                              <span>Excellent</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Rating
                            </label>
                            <select
                              value={evaluations[criterion.id]?.rating || 'fair'}
                              onChange={(e) => setEvaluations({
                                ...evaluations,
                                [criterion.id]: {
                                  ...evaluations[criterion.id],
                                  rating: e.target.value
                                }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="poor">Poor</option>
                              <option value="fair">Fair</option>
                              <option value="good">Good</option>
                              <option value="excellent">Excellent</option>
                              <option value="outstanding">Outstanding</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {criterion.criteria_type === 'boolean' && (
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={evaluations[criterion.id]?.meets_requirement || false}
                              onChange={(e) => setEvaluations({
                                ...evaluations,
                                [criterion.id]: {
                                  ...evaluations[criterion.id],
                                  meets_requirement: e.target.checked,
                                  score: e.target.checked ? 10 : 0
                                }
                              })}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Meets Requirement</span>
                          </label>
                        </div>
                      )}

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <textarea
                          value={evaluations[criterion.id]?.evaluator_notes || ''}
                          onChange={(e) => setEvaluations({
                            ...evaluations,
                            [criterion.id]: {
                              ...evaluations[criterion.id],
                              evaluator_notes: e.target.value
                            }
                          })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Add evaluation notes..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={() => setViewingScreening(null)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitScreening}
                disabled={evaluating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {evaluating ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
