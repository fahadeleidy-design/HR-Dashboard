import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, UserPlus, UserMinus, Award, GraduationCap, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmployeeAnalyticsDashboardProps {
  companyId: string;
}

interface Analytics {
  total_employees: number;
  active_employees: number;
  new_hires: number;
  terminations: number;
  turnover_rate: number;
  avg_tenure_months: number;
  promotion_count: number;
  transfer_count: number;
  training_hours_total: number;
  avg_training_hours: number;
}

export function EmployeeAnalyticsDashboard({ companyId }: EmployeeAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'6months' | '12months'>('6months');

  useEffect(() => {
    fetchAnalytics();
    fetchHistoricalData();
  }, [companyId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const { data, error } = await supabase
        .from('employee_analytics_summary')
        .select('*')
        .eq('company_id', companyId)
        .eq('period_year', year)
        .eq('period_month', month)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        await supabase.rpc('generate_employee_analytics', {
          p_company_id: companyId,
          p_year: year,
          p_month: month
        });

        const { data: newData } = await supabase
          .from('employee_analytics_summary')
          .select('*')
          .eq('company_id', companyId)
          .eq('period_year', year)
          .eq('period_month', month)
          .maybeSingle();

        setAnalytics(newData);
      } else {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const limit = timeRange === '6months' ? 6 : 12;

      const { data, error } = await supabase
        .from('employee_analytics_summary')
        .select('*')
        .eq('company_id', companyId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setHistoricalData(data || []);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const calculateGrowthRate = () => {
    if (historicalData.length < 2) return 0;
    const current = historicalData[0]?.total_employees || 0;
    const previous = historicalData[1]?.total_employees || 0;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getMonthName = (year: number, month: number) => {
    return new Date(year, month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</p>
        <p className="text-sm text-gray-600">Analytics will be generated automatically</p>
      </div>
    );
  }

  const growthRate = calculateGrowthRate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive workforce insights</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('6months')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '6months'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => setTimeRange('12months')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '12months'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            12 Months
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            {growthRate !== 0 && (
              <span className={`text-sm font-medium ${growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-600">Total Employees</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total_employees}</p>
          <p className="text-xs text-gray-500 mt-1">{analytics.active_employees} active</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">New Hires</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{analytics.new_hires}</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <UserMinus className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Terminations</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{analytics.terminations}</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Turnover Rate</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {analytics.turnover_rate?.toFixed(1) || '0.0'}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Annual rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Tenure</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(analytics.avg_tenure_months / 12)}y {analytics.avg_tenure_months % 12}m
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Promotions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.promotion_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Transfers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.transfer_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Training</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.avg_training_hours?.toFixed(1) || '0'}h
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Workforce Trend</h3>
        <div className="space-y-3">
          {historicalData.slice().reverse().map((data, index) => {
            const maxEmployees = Math.max(...historicalData.map(d => d.total_employees));
            const percentage = (data.total_employees / maxEmployees) * 100;

            return (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-600">
                  {getMonthName(data.period_year, data.period_month)}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="text-xs font-medium text-white">
                        {data.total_employees}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  {data.new_hires > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                      +{data.new_hires}
                    </span>
                  )}
                  {data.terminations > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                      -{data.terminations}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Employee Growth Rate</span>
              <span className={`text-lg font-bold ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Retention Rate</span>
              <span className="text-lg font-bold text-blue-600">
                {(100 - (analytics.turnover_rate || 0)).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Training Hours</span>
              <span className="text-lg font-bold text-purple-600">
                {analytics.training_hours_total?.toFixed(0) || '0'}h
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-700">Active Employees</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{analytics.active_employees}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">New Joiners</span>
              </div>
              <span className="text-lg font-bold text-green-600">{analytics.new_hires}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <span className="text-sm text-gray-700">Career Progressions</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                {analytics.promotion_count + analytics.transfer_count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
