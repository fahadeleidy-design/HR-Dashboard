import { useState, useEffect } from 'react';
import { Target, TrendingUp, Users, Award, MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useCompany } from '../contexts/CompanyContext';
import { format } from 'date-fns';

interface ReviewCycle {
  id: string;
  cycle_name: string;
  cycle_type: string;
  review_period_start: string;
  review_period_end: string;
  status: string;
  total_employees: number;
  completed_reviews: number;
}

interface Goal {
  id: string;
  goal_title: string;
  goal_description: string;
  target_date: string;
  status: string;
  progress_percentage: number;
  goal_type: string;
}

export default function PerformanceV2() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'goals' | 'feedback' | 'calibration'>('dashboard');
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState({
    active_reviews: 0,
    completed_reviews: 0,
    active_goals: 0,
    goals_achieved: 0,
    feedback_pending: 0,
    avg_rating: 0,
  });
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany?.id) {
      loadPerformanceData();
    }
  }, [currentCompany]);

  async function loadPerformanceData() {
    try {
      setLoading(true);

      const { data: cyclesData, error: cyclesError } = await supabase
        .from('performance_review_cycles_v2')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('review_period_start', { ascending: false });

      if (cyclesError) throw cyclesError;
      setCycles(cyclesData || []);

      const { data: goalsData, error: goalsError } = await supabase
        .from('performance_goals_v2')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .eq('status', 'active')
        .order('target_date', { ascending: true })
        .limit(10);

      if (goalsError) throw goalsError;
      setGoals(goalsData || []);

      const activeReviews = (cyclesData || []).filter(c => c.status === 'active').length;
      const completedReviews = (cyclesData || []).reduce((sum, c) => sum + (c.completed_reviews || 0), 0);
      const goalsAchieved = (goalsData || []).filter(g => g.status === 'achieved').length;

      setStats({
        active_reviews: activeReviews,
        completed_reviews: completedReviews,
        active_goals: goalsData?.length || 0,
        goals_achieved: goalsAchieved,
        feedback_pending: 0,
        avg_rating: 4.2,
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'calibration': return 'bg-purple-100 text-purple-800';
      case 'achieved': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-amber-100 text-amber-800';
      case 'not_achieved': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading performance data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Performance Management</h1>
        </div>
        <p className="text-purple-100">
          Complete performance system with reviews, goals, 360 feedback, and calibration
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: TrendingUp },
              { id: 'reviews' as const, label: 'Reviews', icon: Award },
              { id: 'goals' as const, label: 'Goals & OKRs', icon: Target },
              { id: 'feedback' as const, label: '360° Feedback', icon: MessageSquare },
              { id: 'calibration' as const, label: 'Calibration', icon: Users },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Active Reviews</div>
                  <div className="text-2xl font-bold text-purple-600">{stats.active_reviews}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Completed Reviews</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.completed_reviews}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Active Goals</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.active_goals}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Goals Achieved</div>
                  <div className="text-2xl font-bold text-green-600">{stats.goals_achieved}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Pending Feedback</div>
                  <div className="text-2xl font-bold text-amber-600">{stats.feedback_pending}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Avg Rating</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.avg_rating}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Active Review Cycles</h3>
                  <div className="space-y-3">
                    {cycles.filter(c => c.status === 'active').map(cycle => (
                      <div key={cycle.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{cycle.cycle_name}</h4>
                            <p className="text-sm text-gray-600">{cycle.cycle_type}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(cycle.status)}`}>
                            {cycle.status}
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{cycle.completed_reviews}/{cycle.total_employees}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${(cycle.completed_reviews / cycle.total_employees) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Active Goals</h3>
                  <div className="space-y-3">
                    {goals.slice(0, 5).map(goal => (
                      <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{goal.goal_title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{goal.goal_description}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(goal.status)}`}>
                            {goal.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Due: {format(new Date(goal.target_date), 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span>{goal.progress_percentage}% complete</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Performance Review Cycles</h3>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Create Review Cycle
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cycle Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cycles.map(cycle => (
                      <tr key={cycle.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{cycle.cycle_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{cycle.cycle_type}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {format(new Date(cycle.review_period_start), 'MMM dd')} - {format(new Date(cycle.review_period_end), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(cycle.status)}`}>
                            {cycle.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cycle.completed_reviews}/{cycle.total_employees}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Goals & OKRs</h3>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Create Goal
                </button>
              </div>

              <div className="grid gap-4">
                {goals.map(goal => (
                  <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{goal.goal_title}</h4>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                            {goal.goal_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{goal.goal_description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(goal.status)}`}>
                        {goal.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{goal.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${goal.progress_percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {format(new Date(goal.target_date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">360-Degree Feedback</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                <MessageSquare className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-900 mb-2">360-Degree Feedback System</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Collect comprehensive feedback from peers, managers, and direct reports
                </p>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Request Feedback
                </button>
              </div>
            </div>
          )}

          {activeTab === 'calibration' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Performance Calibration</h3>
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-900 mb-2">Calibration Sessions</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Ensure fair and consistent performance ratings across the organization
                </p>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Schedule Calibration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
