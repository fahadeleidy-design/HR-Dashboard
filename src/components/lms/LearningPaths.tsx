import React, { useState, useEffect } from 'react';
import { Map, TrendingUp, Award, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface LearningPath {
  id: string;
  path_code: string;
  title: string;
  description: string;
  estimated_duration_hours: number;
  difficulty_level: string;
  thumbnail_url: string;
  awards_certificate: boolean;
  total_enrollments: number;
  total_completions: number;
  total_courses: number;
}

export default function LearningPaths() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: pathsData } = await supabase
        .from('learning_paths')
        .select(`
          *,
          courses:learning_path_courses(count)
        `)
        .eq('is_active', true)
        .order('title');

      const pathsWithCounts = (pathsData || []).map((path: any) => ({
        ...path,
        total_courses: path.courses?.[0]?.count || 0,
      }));

      setPaths(pathsWithCounts);

      const { data: enrollmentsData } = await supabase
        .from('learning_path_enrollments')
        .select('*, learning_path:learning_paths(title)')
        .order('enrolled_at', { ascending: false });

      setEnrollments(enrollmentsData || []);
    } catch (error) {
      logError(error, 'medium', { component: 'LearningPaths', action: 'loadLearningPaths' });
      showToast('Failed to load learning paths', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-orange-100 text-orange-800';
      case 'expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
        <h2 className="text-2xl font-bold text-gray-900">Learning Paths</h2>
        <p className="text-gray-600 mt-1">Structured learning journeys</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Available Paths</h3>

          {paths.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Map className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No learning paths available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paths.map((path) => (
                <div key={path.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{path.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{path.description}</p>
                    </div>
                    {path.awards_certificate && (
                      <Award className="h-5 w-5 text-yellow-500 ml-2" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getLevelColor(path.difficulty_level)}`}>
                      {path.difficulty_level}
                    </span>
                    <div className="flex items-center space-x-4 text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{path.estimated_duration_hours}h</span>
                      </div>
                      <div>{path.total_courses} courses</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {path.total_enrollments} enrolled • {path.total_completions} completed
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                      Start Path
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">My Progress</h3>

          {enrollments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No active learning paths</p>
              <p className="text-sm text-gray-400 mt-1">Start a learning path to begin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{enrollment.learning_path?.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {enrollment.completed_courses_count} of {enrollment.total_courses_count} courses completed
                      </p>
                    </div>
                    {enrollment.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{enrollment.progress_percentage || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress_percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {enrollment.target_completion_date && (
                    <div className="text-sm text-gray-500">
                      Target completion: {new Date(enrollment.target_completion_date).toLocaleDateString()}
                    </div>
                  )}

                  <button className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm">
                    Continue Learning
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
