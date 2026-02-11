import React, { useState, useEffect } from 'react';
import { BookOpen, Target, TrendingUp, CheckCircle, X, Star, Clock, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Recommendation {
  id: string;
  resource: any;
  recommended_for_skill: string;
  recommendation_reason: string;
  priority: number;
  relevance_score: number;
  status: string;
  progress_percentage: number;
}

export default function LearningRecommendations() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<string>('suggested');
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (user) {
      loadRecommendations();
      generateRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);

      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!employeeData) return;

      const { data } = await supabase
        .from('learning_recommendations')
        .select(`
          *,
          resource:skill_learning_resources(*)
        `)
        .eq('employee_id', employeeData.id)
        .order('priority', { ascending: false });

      setRecommendations(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'LearningRecommendations', action: 'loadRecommendations' });
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!employeeData) return;

      const { data: gaps } = await supabase
        .from('skill_gap_analysis')
        .select('*')
        .eq('employee_id', employeeData.id)
        .eq('gap_status', 'open')
        .limit(5);

      if (!gaps || gaps.length === 0) return;

      for (const gap of gaps) {
        const { data: resources } = await supabase
          .from('skill_learning_resources')
          .select('*')
          .contains('target_skills', [gap.skill_name])
          .limit(3);

        if (resources && resources.length > 0) {
          const recommendationsToInsert = resources.map((resource) => ({
            employee_id: employeeData.id,
            resource_id: resource.id,
            recommended_for_skill: gap.skill_name,
            recommendation_reason: `Recommended to close gap in ${gap.skill_name}`,
            recommendation_source: 'gap_analysis',
            priority: gap.priority === 'critical' ? 5 : gap.priority === 'high' ? 4 : 3,
            relevance_score: 0.8,
          }));

          await supabase.from('learning_recommendations').insert(recommendationsToInsert);
        }
      }

      loadRecommendations();
    } catch (error) {
      logError(error, 'medium', { component: 'LearningRecommendations', action: 'generateRecommendations' });
    }
  };

  const updateRecommendationStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('learning_recommendations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      showToast(`Recommendation ${status}`, 'success');
      loadRecommendations();
    } catch (error: any) {
      logError(error, 'medium', { component: 'LearningRecommendations', action: 'updateRecommendation' });
      showToast(error.message || 'Failed to update recommendation', 'error');
    }
  };

  const filteredRecommendations = recommendations.filter((rec) => {
    if (filter === 'all') return true;
    return rec.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'suggested':
        return 'bg-blue-100 text-blue-800';
      case 'enrolled':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600';
    if (priority >= 3) return 'text-orange-600';
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Learning Recommendations</h2>
        <p className="text-gray-600 mt-1">Personalized learning paths based on your skill gaps</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'suggested', label: 'Suggested' },
              { key: 'enrolled', label: 'Enrolled' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No recommendations in this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecommendations.map((rec) => (
                <div key={rec.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {rec.resource?.resource_title}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(rec.status)}`}>
                          {rec.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.resource?.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          For: {rec.recommended_for_skill}
                        </span>
                        {rec.resource?.duration_hours && (
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {rec.resource.duration_hours}h
                          </span>
                        )}
                        {rec.resource?.cost > 0 && (
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ${rec.resource.cost}
                          </span>
                        )}
                        {rec.resource?.is_free && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Free
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${getPriorityColor(rec.priority)}`}>
                        {(rec.relevance_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">Relevance</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Why recommended:</strong> {rec.recommendation_reason}
                    </div>
                    {rec.resource?.provider && (
                      <div className="text-sm text-gray-600">
                        <strong>Provider:</strong> {rec.resource.provider}
                      </div>
                    )}
                  </div>

                  {rec.resource?.tags && rec.resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {rec.resource.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {rec.status === 'in_progress' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{rec.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${rec.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    {rec.resource?.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                        <span className="text-sm font-medium text-gray-900">{rec.resource.rating}</span>
                        <span className="text-sm text-gray-500 ml-1">
                          ({rec.resource.reviews_count} reviews)
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      {rec.status === 'suggested' && (
                        <>
                          <button
                            onClick={() => updateRecommendationStatus(rec.id, 'enrolled')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Enroll
                          </button>
                          <button
                            onClick={() => updateRecommendationStatus(rec.id, 'dismissed')}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {rec.status === 'enrolled' && (
                        <button
                          onClick={() => updateRecommendationStatus(rec.id, 'in_progress')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Start Learning
                        </button>
                      )}
                      {rec.status === 'in_progress' && (
                        <button
                          onClick={() => updateRecommendationStatus(rec.id, 'completed')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Complete
                        </button>
                      )}
                      {rec.resource?.resource_url && (
                        <a
                          href={rec.resource.resource_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm"
                        >
                          View Resource
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
