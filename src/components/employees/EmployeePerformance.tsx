import { useState, useEffect } from 'react';
import { TrendingUp, Award, Target, AlertCircle, Plus, Eye, Star, ThumbsUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmployeePerformanceProps {
  employeeId: string;
  companyId: string;
}

interface Assessment {
  id: string;
  assessment_type: string;
  assessment_date: string;
  review_period_start: string;
  review_period_end: string;
  overall_rating: number;
  strengths: string;
  areas_for_improvement: string;
  goals_achieved: string;
  comments: string;
  status: string;
  reviewer?: {
    first_name_en: string;
    last_name_en: string;
  };
}

interface Goal {
  id: string;
  goal_title: string;
  goal_description: string;
  goal_type: string;
  target_date: string;
  progress_percentage: number;
  status: string;
}

interface Recognition {
  id: string;
  recognition_type: string;
  title: string;
  description: string;
  recognition_date: string;
  is_public: boolean;
  awarded_by?: {
    first_name_en: string;
    last_name_en: string;
  };
}

export function EmployeePerformance({ employeeId, companyId }: EmployeePerformanceProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assessments' | 'goals' | 'recognitions'>('assessments');

  useEffect(() => {
    fetchPerformanceData();
  }, [employeeId]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const [assessmentsData, goalsData, recognitionsData] = await Promise.all([
        supabase
          .from('employee_assessments')
          .select(`
            *,
            reviewer:employees!employee_assessments_reviewer_id_fkey(first_name_en, last_name_en)
          `)
          .eq('employee_id', employeeId)
          .order('assessment_date', { ascending: false }),

        supabase
          .from('employee_goals')
          .select('*')
          .eq('employee_id', employeeId)
          .order('target_date', { ascending: false }),

        supabase
          .from('employee_recognitions')
          .select(`
            *,
            awarded_by:employees(first_name_en, last_name_en)
          `)
          .eq('employee_id', employeeId)
          .order('recognition_date', { ascending: false })
      ]);

      setAssessments(assessmentsData.data || []);
      setGoals(goalsData.data || []);
      setRecognitions(recognitionsData.data || []);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssessmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      annual_review: 'Annual Review',
      probation_review: 'Probation Review',
      quarterly_review: 'Quarterly Review',
      project_review: 'Project Review',
      '360_feedback': '360° Feedback'
    };
    return labels[type] || type;
  };

  const getAssessmentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      annual_review: 'bg-blue-100 text-blue-800',
      probation_review: 'bg-yellow-100 text-yellow-800',
      quarterly_review: 'bg-green-100 text-green-800',
      project_review: 'bg-purple-100 text-purple-800',
      '360_feedback': 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getGoalTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      performance: 'bg-blue-100 text-blue-800',
      development: 'bg-green-100 text-green-800',
      project: 'bg-purple-100 text-purple-800',
      behavioral: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      deferred: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRecognitionIcon = (type: string) => {
    switch (type) {
      case 'award': return Award;
      case 'employee_of_month': return Star;
      case 'achievement': return TrendingUp;
      case 'milestone': return Target;
      case 'appreciation': return ThumbsUp;
      default: return Award;
    }
  };

  const getRecognitionColor = (type: string) => {
    const colors: Record<string, string> = {
      award: 'bg-yellow-100 text-yellow-800',
      employee_of_month: 'bg-purple-100 text-purple-800',
      achievement: 'bg-green-100 text-green-800',
      milestone: 'bg-blue-100 text-blue-800',
      appreciation: 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const avgRating = assessments.length > 0
    ? assessments.reduce((sum, a) => sum + (a.overall_rating || 0), 0) / assessments.length
    : 0;

  const activeGoalsCount = goals.filter(g => g.status === 'active').length;
  const completedGoalsCount = goals.filter(g => g.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Management</h2>
          <p className="text-gray-600 mt-1">Track performance, goals, and achievements</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4 inline mr-2" />
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Average Rating</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{avgRating.toFixed(1)}/5.0</p>
          <p className="text-xs text-gray-500 mt-1">{assessments.length} reviews</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Active Goals</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{activeGoalsCount}</p>
          <p className="text-xs text-gray-500 mt-1">{completedGoalsCount} completed</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Recognitions</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{recognitions.length}</p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Goal Progress</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {goals.length > 0
              ? Math.round(goals.reduce((sum, g) => sum + g.progress_percentage, 0) / goals.length)
              : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Average</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8 px-6">
            <button
              onClick={() => setActiveTab('assessments')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'assessments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Performance Reviews ({assessments.length})
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'goals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Goals ({goals.length})
            </button>
            <button
              onClick={() => setActiveTab('recognitions')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'recognitions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Recognitions ({recognitions.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'assessments' && (
            <div className="space-y-4">
              {assessments.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No performance reviews yet</p>
                </div>
              ) : (
                assessments.map((assessment) => (
                  <div key={assessment.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAssessmentTypeColor(assessment.assessment_type)}`}>
                            {getAssessmentTypeLabel(assessment.assessment_type)}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(assessment.assessment_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Review Period: {new Date(assessment.review_period_start).toLocaleDateString()} - {new Date(assessment.review_period_end).toLocaleDateString()}
                        </p>
                        {assessment.reviewer && (
                          <p className="text-xs text-gray-500 mt-1">
                            Reviewed by: {assessment.reviewer.first_name_en} {assessment.reviewer.last_name_en}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          <span className="text-2xl font-bold text-gray-900">{assessment.overall_rating}</span>
                          <span className="text-sm text-gray-500">/5.0</span>
                        </div>
                      </div>
                    </div>

                    {assessment.strengths && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">Strengths</p>
                        <p className="text-sm text-gray-600">{assessment.strengths}</p>
                      </div>
                    )}

                    {assessment.areas_for_improvement && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">Areas for Improvement</p>
                        <p className="text-sm text-gray-600">{assessment.areas_for_improvement}</p>
                      </div>
                    )}

                    {assessment.comments && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Comments</p>
                        <p className="text-sm text-gray-600">{assessment.comments}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No goals set yet</p>
                </div>
              ) : (
                goals.map((goal) => (
                  <div key={goal.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGoalTypeColor(goal.goal_type)}`}>
                            {goal.goal_type}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                            {goal.status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{goal.goal_title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{goal.goal_description}</p>
                        <p className="text-xs text-gray-500">
                          Target: {new Date(goal.target_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm font-bold text-blue-600">{goal.progress_percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${goal.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'recognitions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recognitions.length === 0 ? (
                <div className="col-span-3 text-center py-12">
                  <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recognitions yet</p>
                </div>
              ) : (
                recognitions.map((recognition) => {
                  const Icon = getRecognitionIcon(recognition.recognition_type);
                  return (
                    <div key={recognition.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`h-12 w-12 rounded-full ${getRecognitionColor(recognition.recognition_type).replace('text', 'bg').replace('800', '100')} flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${getRecognitionColor(recognition.recognition_type).split(' ')[1]}`} />
                        </div>
                        <div className="flex-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecognitionColor(recognition.recognition_type)}`}>
                            {recognition.recognition_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{recognition.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{recognition.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(recognition.recognition_date).toLocaleDateString()}</span>
                        {recognition.awarded_by && (
                          <span>By: {recognition.awarded_by.first_name_en}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
