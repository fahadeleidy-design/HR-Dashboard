import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, PieChart, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PayrollAnalyticsProps {
  companyId: string;
  batches: any[];
}

interface AnalyticsData {
  period_year: number;
  period_month: number;
  total_employees: number;
  saudi_employees: number;
  non_saudi_employees: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  total_gosi_employee: number;
  total_gosi_employer: number;
  avg_salary: number;
  avg_saudi_salary: number;
  avg_non_saudi_salary: number;
}

export function PayrollAnalytics({ companyId, batches }: PayrollAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'6months' | '12months' | 'all'>('6months');

  useEffect(() => {
    fetchAnalytics();
  }, [companyId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payroll_analytics')
        .select('*')
        .eq('company_id', companyId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (timeRange === '6months') {
        query = query.limit(6);
      } else if (timeRange === '12months') {
        query = query.limit(12);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentAnalytics = analytics[0];
  const previousAnalytics = analytics[1];

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const totalPayrollTrend = analytics.reduce((sum, a) => sum + Number(a.total_net || 0), 0);
  const avgMonthlyPayroll = analytics.length > 0 ? totalPayrollTrend / analytics.length : 0;

  const employeeCountChange = currentAnalytics && previousAnalytics
    ? currentAnalytics.total_employees - previousAnalytics.total_employees
    : 0;

  const payrollChange = currentAnalytics && previousAnalytics
    ? calculateChange(Number(currentAnalytics.total_net), Number(previousAnalytics.total_net))
    : 0;

  const getMonthName = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payroll Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive insights and trends</p>
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
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {currentAnalytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                {payrollChange !== 0 && (
                  <span className={`text-sm font-medium ${payrollChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {payrollChange > 0 ? '+' : ''}{payrollChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-600">Total Payroll</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                SAR {Number(currentAnalytics.total_net || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Current month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                {employeeCountChange !== 0 && (
                  <span className={`text-sm font-medium ${employeeCountChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {employeeCountChange > 0 ? '+' : ''}{employeeCountChange}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {currentAnalytics.total_employees}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentAnalytics.saudi_employees} Saudi • {currentAnalytics.non_saudi_employees} Non-Saudi
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">Avg Salary</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                SAR {Number(currentAnalytics.avg_salary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per employee</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">Avg Monthly</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                SAR {avgMonthlyPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{analytics.length} periods</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <PieChart className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Salary Breakdown</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Gross Payroll</span>
                    <span className="text-sm font-bold text-gray-900">
                      SAR {Number(currentAnalytics.total_gross || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Deductions</span>
                    <span className="text-sm font-bold text-red-600">
                      -SAR {Number(currentAnalytics.total_deductions || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${(Number(currentAnalytics.total_deductions) / Number(currentAnalytics.total_gross)) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">GOSI Employee</span>
                    <span className="text-sm font-bold text-orange-600">
                      -SAR {Number(currentAnalytics.total_gosi_employee || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{
                        width: `${(Number(currentAnalytics.total_gosi_employee) / Number(currentAnalytics.total_gross)) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">GOSI Employer</span>
                    <span className="text-sm font-bold text-purple-600">
                      SAR {Number(currentAnalytics.total_gosi_employer || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: `${(Number(currentAnalytics.total_gosi_employer) / Number(currentAnalytics.total_gross)) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Net Payroll</span>
                    <span className="text-lg font-bold text-blue-600">
                      SAR {Number(currentAnalytics.total_net || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Employee Distribution</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Saudi Employees</span>
                    <span className="text-sm font-bold text-gray-900">
                      {currentAnalytics.saudi_employees} ({((currentAnalytics.saudi_employees / currentAnalytics.total_employees) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(currentAnalytics.saudi_employees / currentAnalytics.total_employees) * 100}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg Salary: SAR {Number(currentAnalytics.avg_saudi_salary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Non-Saudi Employees</span>
                    <span className="text-sm font-bold text-gray-900">
                      {currentAnalytics.non_saudi_employees} ({((currentAnalytics.non_saudi_employees / currentAnalytics.total_employees) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(currentAnalytics.non_saudi_employees / currentAnalytics.total_employees) * 100}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg Salary: SAR {Number(currentAnalytics.avg_non_saudi_salary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-3">Salary Comparison</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600">Saudi Avg</p>
                      <p className="text-lg font-bold text-green-600">
                        {Number(currentAnalytics.avg_saudi_salary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600">Non-Saudi Avg</p>
                      <p className="text-lg font-bold text-blue-600">
                        {Number(currentAnalytics.avg_non_saudi_salary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Payroll Trend</h3>
        </div>
        <div className="space-y-3">
          {analytics.slice().reverse().map((data, index) => {
            const maxValue = Math.max(...analytics.map(a => Number(a.total_net)));
            const percentage = (Number(data.total_net) / maxValue) * 100;

            return (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-600">
                  {getMonthName(data.period_year, data.period_month)}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-end pr-3"
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="text-xs font-medium text-white">
                        SAR {Number(data.total_net || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-16 text-sm font-medium text-gray-900 text-right">
                  {data.total_employees}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {analytics.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Available</p>
          <p className="text-sm text-gray-600">
            Analytics will be generated automatically after processing payroll batches
          </p>
        </div>
      )}
    </div>
  );
}
