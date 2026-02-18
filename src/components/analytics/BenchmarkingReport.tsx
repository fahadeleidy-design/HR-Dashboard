import { useState, useEffect, useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface BenchmarkItem {
  metric: string;
  category: string;
  company_value: number;
  industry_avg: number;
  industry_p25: number;
  industry_p50: number;
  industry_p75: number;
  industry_p90: number;
  best_in_class: number;
  percentile: number;
  unit: string;
}

const DEFAULT_BENCHMARKS: BenchmarkItem[] = [
  { metric: 'Turnover Rate', category: 'Retention', company_value: 12.5, industry_avg: 15.2, industry_p25: 18.5, industry_p50: 14.8, industry_p75: 11.2, industry_p90: 8.5, best_in_class: 6.0, percentile: 68, unit: '%' },
  { metric: 'Time to Fill', category: 'Recruitment', company_value: 42, industry_avg: 48, industry_p25: 62, industry_p50: 46, industry_p75: 35, industry_p90: 25, best_in_class: 18, percentile: 62, unit: 'days' },
  { metric: 'Cost per Hire', category: 'Recruitment', company_value: 8500, industry_avg: 11200, industry_p25: 15000, industry_p50: 10800, industry_p75: 7500, industry_p90: 5200, best_in_class: 4000, percentile: 70, unit: 'SAR' },
  { metric: 'Revenue per Employee', category: 'Productivity', company_value: 285000, industry_avg: 265000, industry_p25: 195000, industry_p50: 260000, industry_p75: 310000, industry_p90: 380000, best_in_class: 450000, percentile: 58, unit: 'SAR' },
  { metric: 'Training Hours', category: 'Development', company_value: 32, industry_avg: 28, industry_p25: 16, industry_p50: 26, industry_p75: 38, industry_p90: 52, best_in_class: 65, percentile: 62, unit: 'hrs/emp' },
  { metric: 'Engagement Score', category: 'Culture', company_value: 4.1, industry_avg: 3.8, industry_p25: 3.2, industry_p50: 3.7, industry_p75: 4.2, industry_p90: 4.6, best_in_class: 4.8, percentile: 72, unit: '/5.0' },
  { metric: 'Absentee Rate', category: 'Attendance', company_value: 3.8, industry_avg: 4.5, industry_p25: 6.2, industry_p50: 4.3, industry_p75: 3.1, industry_p90: 2.0, best_in_class: 1.5, percentile: 65, unit: '%' },
  { metric: 'Offer Acceptance', category: 'Recruitment', company_value: 88, industry_avg: 82, industry_p25: 72, industry_p50: 81, industry_p75: 89, industry_p90: 94, best_in_class: 97, percentile: 73, unit: '%' },
  { metric: 'Saudization Rate', category: 'Compliance', company_value: 35, industry_avg: 30, industry_p25: 22, industry_p50: 28, industry_p75: 38, industry_p90: 52, best_in_class: 65, percentile: 72, unit: '%' },
  { metric: 'Span of Control', category: 'Organization', company_value: 5.2, industry_avg: 6.8, industry_p25: 8.5, industry_p50: 6.5, industry_p75: 5.0, industry_p90: 4.2, best_in_class: 3.8, percentile: 70, unit: ':1' },
];

export function BenchmarkingReport() {
  const { currentCompany } = useCompany();
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>(DEFAULT_BENCHMARKS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id) loadBenchmarks();
  }, [currentCompany]);

  async function loadBenchmarks() {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('benchmarking_data')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        const mapped = data.map(d => ({
          metric: d.metric_name,
          category: d.benchmark_category,
          company_value: d.company_value,
          industry_avg: d.industry_avg || 0,
          industry_p25: d.industry_p25 || 0,
          industry_p50: d.industry_p50 || 0,
          industry_p75: d.industry_p75 || 0,
          industry_p90: d.industry_p90 || 0,
          best_in_class: d.best_in_class || 0,
          percentile: d.percentile_rank || 50,
          unit: '',
        }));
        setBenchmarks(mapped);
      }
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const cats = [...new Set(benchmarks.map(b => b.category))];
    return ['all', ...cats];
  }, [benchmarks]);

  const filteredBenchmarks = selectedCategory === 'all'
    ? benchmarks
    : benchmarks.filter(b => b.category === selectedCategory);

  const radarData = useMemo(() => {
    return benchmarks.slice(0, 8).map(b => ({
      metric: b.metric.length > 12 ? b.metric.slice(0, 12) + '...' : b.metric,
      company: b.percentile,
      industry: 50,
    }));
  }, [benchmarks]);

  const aboveAvgCount = benchmarks.filter(b => b.percentile > 50).length;
  const belowAvgCount = benchmarks.filter(b => b.percentile <= 50).length;
  const avgPercentile = benchmarks.length > 0 ? benchmarks.reduce((s, b) => s + b.percentile, 0) / benchmarks.length : 0;

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 50) return 'text-blue-600';
    if (percentile >= 25) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPercentileBg = (percentile: number) => {
    if (percentile >= 75) return 'bg-green-100 text-green-800';
    if (percentile >= 50) return 'bg-blue-100 text-blue-800';
    if (percentile >= 25) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">Overall Percentile</div>
          <div className={`text-3xl font-bold ${getPercentileColor(avgPercentile)}`}>
            P{avgPercentile.toFixed(0)}
          </div>
          <p className="text-xs text-gray-400 mt-1">Average across all metrics</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">Above Average</div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-green-600">{aboveAvgCount}</span>
            <ArrowUpRight className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Metrics above industry median</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500 mb-1">Below Average</div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-amber-600">{belowAvgCount}</span>
            <ArrowDownRight className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Metrics below industry median</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Metric Comparison</h4>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedCategory === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Metric</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ours</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ind. Avg</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">P50</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">P75</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Percentile</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBenchmarks.map(b => (
                  <tr key={b.metric} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-gray-900">{b.metric}</div>
                      <div className="text-xs text-gray-400">{b.category}</div>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                      {b.company_value.toLocaleString()}{b.unit}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-500">
                      {b.industry_avg.toLocaleString()}{b.unit}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-500">
                      {b.industry_p50.toLocaleString()}{b.unit}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-500">
                      {b.industry_p75.toLocaleString()}{b.unit}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-sm font-bold ${getPercentileColor(b.percentile)}`}>
                        P{b.percentile}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPercentileBg(b.percentile)}`}>
                        {b.percentile >= 75 ? 'Leading' : b.percentile >= 50 ? 'On Par' : b.percentile >= 25 ? 'Lagging' : 'Critical'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Competitive Position</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={80}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Company" dataKey="company" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Industry" dataKey="industry" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} strokeWidth={1} strokeDasharray="4 4" />
                <Legend iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 text-xs text-gray-500">
            <p>Outer ring = P100 (best in class)</p>
            <p>Dashed line = Industry median (P50)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
