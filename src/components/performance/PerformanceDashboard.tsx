import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Target, TrendingUp, Users, Award, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function PerformanceDashboard() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReviews: 0,
    pendingReviews: 0,
    avgRating: 0,
    activeGoals: 0,
    completedGoals: 0,
    atRiskGoals: 0,
    activePIPs: 0,
    recognitions: 0
  });

  useEffect(() => {
    if (currentCompany) {
      fetchDashboardStats();
    }
  }, [currentCompany]);

  const fetchDashboardStats = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [reviewsData, goalsData, pipsData, recognitionsData] = await Promise.all([
        supabase
          .from('performance_reviews')
          .select('id, status, overall_rating')
          .eq('company_id', currentCompany.id),
        supabase
          .from('performance_goals')
          .select('id, status')
          .eq('company_id', currentCompany.id),
        supabase
          .from('performance_improvement_plans')
          .select('id, status')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active'),
        supabase
          .from('employee_recognitions')
          .select('id')
          .eq('company_id', currentCompany.id)
          .gte('recognition_date', new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString())
      ]);

      const reviews = reviewsData.data || [];
      const goals = goalsData.data || [];
      const pips = pipsData.data || [];
      const recognitions = recognitionsData.data || [];

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length
        : 0;

      setStats({
        totalReviews: reviews.length,
        pendingReviews: reviews.filter(r => r.status === 'pending' || r.status === 'self_review').length,
        avgRating: Math.round(avgRating * 10) / 10,
        activeGoals: goals.filter(g => g.status === 'active' || g.status === 'on_track').length,
        completedGoals: goals.filter(g => g.status === 'completed').length,
        atRiskGoals: goals.filter(g => g.status === 'at_risk' || g.status === 'behind').length,
        activePIPs: pips.length,
        recognitions: recognitions.length
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Performance Reviews</p>
              <p className="text-3xl font-bold mt-2">{stats.totalReviews}</p>
              <p className="text-blue-100 text-xs mt-1">{stats.pendingReviews} pending</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Average Rating</p>
              <p className="text-3xl font-bold mt-2">{stats.avgRating.toFixed(1)} / 5.0</p>
              <p className="text-green-100 text-xs mt-1">Overall performance</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Active Goals</p>
              <p className="text-3xl font-bold mt-2">{stats.activeGoals}</p>
              <p className="text-purple-100 text-xs mt-1">{stats.completedGoals} completed</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Target className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Recent Recognition</p>
              <p className="text-3xl font-bold mt-2">{stats.recognitions}</p>
              <p className="text-orange-100 text-xs mt-1">Last 3 months</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Award className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Goals Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900">On Track</p>
                  <p className="text-sm text-gray-600">Goals progressing well</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">{stats.activeGoals}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-gray-900">At Risk</p>
                  <p className="text-sm text-gray-600">Requires attention</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{stats.atRiskGoals}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Completed</p>
                  <p className="text-sm text-gray-600">Successfully achieved</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats.completedGoals}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Performance Actions Needed
          </h3>
          <div className="space-y-4">
            {stats.pendingReviews > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Pending Reviews</p>
                    <p className="text-sm text-gray-600 mt-1">Complete {stats.pendingReviews} pending performance reviews</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats.pendingReviews}</span>
                </div>
              </div>
            )}

            {stats.atRiskGoals > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-600">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">At-Risk Goals</p>
                    <p className="text-sm text-gray-600 mt-1">Review and support {stats.atRiskGoals} goals that need attention</p>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">{stats.atRiskGoals}</span>
                </div>
              </div>
            )}

            {stats.activePIPs > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-600">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Active PIPs</p>
                    <p className="text-sm text-gray-600 mt-1">Monitor {stats.activePIPs} performance improvement plans</p>
                  </div>
                  <span className="text-lg font-bold text-red-600">{stats.activePIPs}</span>
                </div>
              </div>
            )}

            {stats.pendingReviews === 0 && stats.atRiskGoals === 0 && stats.activePIPs === 0 && (
              <div className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-gray-900 font-medium">All caught up!</p>
                <p className="text-gray-600 text-sm mt-1">No pending performance actions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
