import { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Users, DollarSign, Clock, Award, AlertTriangle, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useCompany } from '../contexts/CompanyContext';

interface WorkforceMetric {
  metric_date: string;
  total_headcount: number;
  turnover_rate: number;
  retention_rate: number;
  time_to_fill_avg: number;
  avg_compensation: number;
  performance_rating_avg: number;
}

interface BenchmarkData {
  metric_name: string;
  company_value: number;
  industry_avg: number;
  industry_p50: number;
  percentile_rank: number;
}

export default function WorkforceAnalytics() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'predictive' | 'benchmarking' | 'diversity'>('dashboard');
  const [metrics, setMetrics] = useState<WorkforceMetric[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [stats, setStats] = useState({
    total_headcount: 0,
    turnover_rate: 0,
    retention_rate: 0,
    time_to_fill: 0,
    avg_compensation: 0,
    performance_rating: 0,
    open_positions: 0,
    flight_risk_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany?.id) {
      loadAnalyticsData();
    }
  }, [currentCompany]);

  async function loadAnalyticsData() {
    try {
      setLoading(true);

      const { data: metricsData, error: metricsError } = await supabase
        .from('workforce_metrics')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('metric_date', { ascending: false })
        .limit(12);

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      const latestMetric = metricsData?.[0];
      if (latestMetric) {
        setStats({
          total_headcount: latestMetric.total_headcount,
          turnover_rate: latestMetric.turnover_rate || 0,
          retention_rate: latestMetric.retention_rate || 0,
          time_to_fill: latestMetric.time_to_fill_avg || 0,
          avg_compensation: latestMetric.avg_compensation || 0,
          performance_rating: latestMetric.performance_rating_avg || 0,
          open_positions: latestMetric.open_positions || 0,
          flight_risk_count: 0,
        });
      }

      const { data: benchmarkData } = await supabase
        .from('benchmarking_data')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setBenchmarks(benchmarkData || []);

    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading workforce analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Workforce Analytics</h1>
        </div>
        <p className="text-cyan-100">
          Real-time HR dashboards, predictive analytics, and benchmarking insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-cyan-600" />
            <div className="text-xs text-gray-600">Headcount</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_headcount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <div className="text-xs text-gray-600">Turnover</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.turnover_rate.toFixed(1)}%</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-green-600" />
            <div className="text-xs text-gray-600">Retention</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.retention_rate.toFixed(1)}%</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <div className="text-xs text-gray-600">Time to Fill</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.time_to_fill.toFixed(0)} days</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div className="text-xs text-gray-600">Avg Compensation</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.avg_compensation.toLocaleString()} SAR</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-600" />
            <div className="text-xs text-gray-600">Avg Rating</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.performance_rating.toFixed(1)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div className="text-xs text-gray-600">Open Roles</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.open_positions}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'dashboard' as const, label: 'HR Dashboard', icon: BarChart },
              { id: 'predictive' as const, label: 'Predictive Analytics', icon: TrendingUp },
              { id: 'benchmarking' as const, label: 'Benchmarking', icon: Target },
              { id: 'diversity' as const, label: 'Diversity & Inclusion', icon: Users },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-cyan-600 text-cyan-600'
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
              <div>
                <h3 className="text-lg font-semibold mb-4">Headcount Trends</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Headcount trend chart visualization
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Turnover Analysis</h3>
                  <div className="space-y-3">
                    {metrics.slice(0, 6).map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <span className="text-sm text-gray-600">{metric.metric_date}</span>
                        <span className="font-semibold text-gray-900">{metric.turnover_rate?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Employee Satisfaction</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-cyan-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                        <span className="font-semibold">78%</span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Training Completion</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-cyan-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                        <span className="font-semibold">92%</span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Benefits Enrollment</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-cyan-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <span className="font-semibold">85%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'predictive' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Predictive Analytics Engine</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Turnover Risk</h4>
                      <p className="text-sm text-gray-600">ML-powered predictions</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-red-600 mb-1">24</div>
                  <div className="text-sm text-gray-600">Employees at risk (next 6 months)</div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Performance Forecast</h4>
                      <p className="text-sm text-gray-600">Expected ratings</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-1">4.1</div>
                  <div className="text-sm text-gray-600">Predicted avg rating (next cycle)</div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Hiring Needs</h4>
                      <p className="text-sm text-gray-600">12-month forecast</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-1">42</div>
                  <div className="text-sm text-gray-600">Projected new positions</div>
                </div>
              </div>

              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">AI Model Performance</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-cyan-600">87%</div>
                    <div className="text-sm text-gray-600">Accuracy</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-600">84%</div>
                    <div className="text-sm text-gray-600">Precision</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-600">91%</div>
                    <div className="text-sm text-gray-600">Recall</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'benchmarking' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Industry Benchmarking</h3>
                <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  Import Benchmark Data
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Our Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry Avg</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Median</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentile</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {benchmarks.map((benchmark, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{benchmark.metric_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{benchmark.company_value.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{benchmark.industry_avg?.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{benchmark.industry_p50?.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{benchmark.percentile_rank?.toFixed(0)}%</td>
                        <td className="px-4 py-3">
                          {benchmark.company_value > (benchmark.industry_avg || 0) ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Above Avg
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                              Below Avg
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'diversity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Diversity & Inclusion Metrics</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Gender Distribution</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Male</span>
                        <span>68%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '68%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Female</span>
                        <span>32%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-pink-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Female Leadership</h4>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-600 mb-2">24%</div>
                    <p className="text-sm text-gray-600">Women in leadership positions</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Nationality Mix</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Saudi</span>
                      <span className="font-semibold">72%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GCC</span>
                      <span className="font-semibold">12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other Arab</span>
                      <span className="font-semibold">8%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>International</span>
                      <span className="font-semibold">8%</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Pay Equity Ratio</h4>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-600 mb-2">0.96</div>
                    <p className="text-sm text-gray-600">Female to male compensation ratio</p>
                    <p className="text-xs text-gray-500 mt-2">(1.0 = perfect equity)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
