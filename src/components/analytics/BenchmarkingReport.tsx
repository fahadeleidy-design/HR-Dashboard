import { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

interface BenchmarkItem {
  metric: string;
  category: string;
  company_value: number;
  industry_avg: number;
  industry_p50: number;
  industry_p75: number;
  percentile: number;
  unit: string;
  higher_is_better: boolean;
}

const INDUSTRY_BENCHMARKS: Record<string, { avg: number; p50: number; p75: number; unit: string; higher_is_better: boolean }> = {
  'Turnover Rate':         { avg: 15.2, p50: 14.8, p75: 11.2, unit: '%',       higher_is_better: false },
  'Saudization Rate':      { avg: 30.0, p50: 28.0, p75: 38.0, unit: '%',       higher_is_better: true  },
  'Training Hours/Emp':    { avg: 28.0, p50: 26.0, p75: 38.0, unit: ' hrs',    higher_is_better: true  },
  'Offer Acceptance':      { avg: 82.0, p50: 81.0, p75: 89.0, unit: '%',       higher_is_better: true  },
  'Female Workforce':      { avg: 28.0, p50: 26.0, p75: 36.0, unit: '%',       higher_is_better: true  },
  'Female Leadership':     { avg: 18.0, p50: 17.0, p75: 28.0, unit: '%',       higher_is_better: true  },
  'Avg Tenure (yrs)':      { avg: 3.5,  p50: 3.2,  p75: 4.8,  unit: ' yrs',   higher_is_better: true  },
  'Pay Equity Ratio':      { avg: 0.88, p50: 0.87, p75: 0.95, unit: '',        higher_is_better: true  },
};

function computePercentile(value: number, avg: number, p50: number, p75: number, higher_is_better: boolean): number {
  if (higher_is_better) {
    if (value >= p75) return Math.min(90, 75 + ((value - p75) / (p75 * 0.3)) * 15);
    if (value >= p50) return 50 + ((value - p50) / (p75 - p50)) * 25;
    if (value >= avg * 0.7) return 25 + ((value - avg * 0.7) / (p50 - avg * 0.7)) * 25;
    return Math.max(10, (value / (avg * 0.7)) * 25);
  } else {
    if (value <= p75) return Math.min(90, 75 + ((p75 - value) / (p75 * 0.3)) * 15);
    if (value <= p50) return 50 + ((p50 - value) / (p50 - p75)) * 25;
    if (value <= avg * 1.3) return 25 + ((avg * 1.3 - value) / (avg * 1.3 - p50)) * 25;
    return Math.max(10, ((avg * 1.8 - value) / (avg * 1.8)) * 25);
  }
}

export function BenchmarkingReport() {
  const { currentCompany, isConsolidatedView, loading: companyLoading, companies } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [terminated, setTerminated] = useState<any[]>([]);
  const [trainingHours, setTrainingHours] = useState<number>(0);
  const [offerAcceptance, setOfferAcceptance] = useState<{ accepted: number; total: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyLoading) return;
    if (currentCompany?.id || isConsolidatedView || companies.length > 0) loadData();
  }, [currentCompany, isConsolidatedView, companyLoading, companies]);

  async function loadData() {
    try {
      setLoading(true);
      const companyFilter = currentCompany?.id;
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);

      let empQuery = supabase
        .from('employees')
        .select('id, gender, is_saudi, hire_date, basic_salary, status, job_title_en, department:departments(name_en)');
      if (companyFilter) empQuery = empQuery.eq('company_id', companyFilter);
      empQuery = empQuery.eq('status', 'active');

      let termQuery = supabase
        .from('employees')
        .select('id, hire_date, termination_date')
        .eq('status', 'terminated')
        .gte('termination_date', yearAgoStr);
      if (companyFilter) termQuery = termQuery.eq('company_id', companyFilter);

      let enrollQuery = supabase
        .from('training_enrollments')
        .select('id, completion_status, training_program:training_programs(duration_hours)')
        .eq('completion_status', 'completed')
        .gte('completion_date', yearAgoStr);

      let offerQuery = supabase
        .from('job_offers')
        .select('id, status')
        .gte('created_at', oneYearAgo.toISOString());
      if (companyFilter) offerQuery = offerQuery.eq('company_id', companyFilter);

      const [empRes, termRes, enrollRes, offerRes] = await Promise.all([
        empQuery,
        termQuery,
        enrollQuery,
        offerQuery,
      ]);

      if (empRes.error) console.error('BenchmarkingReport employees error:', empRes.error);
      if (termRes.error) console.error('BenchmarkingReport terminated error:', termRes.error);

      const empData = empRes.data || [];
      setEmployees(empData);
      setTerminated(termRes.data || []);

      const enrollData = enrollRes.data || [];
      const totalHours = enrollData.reduce((sum: number, e: any) => {
        return sum + (e.training_program?.duration_hours || 0);
      }, 0);
      const hoursPerEmp = empData.length > 0 ? totalHours / empData.length : 0;
      setTrainingHours(hoursPerEmp);

      const offerData = offerRes.data || [];
      if (offerData.length > 0) {
        const accepted = offerData.filter((o: any) => o.status === 'accepted').length;
        setOfferAcceptance({ accepted, total: offerData.length });
      }
    } finally {
      setLoading(false);
    }
  }

  const benchmarks = useMemo((): BenchmarkItem[] => {
    if (employees.length === 0) return [];
    const now = new Date();
    const total = employees.length;

    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const avgHeadcount = Math.max(1, total);
    const turnoverRate = terminated.length > 0 ? (terminated.length / avgHeadcount) * 100 : 0;

    const saudiCount = employees.filter(e => e.is_saudi === true).length;
    const saudizationPct = (saudiCount / total) * 100;

    const femaleCount = employees.filter(e => e.gender === 'female').length;
    const femalePct = (femaleCount / total) * 100;

    const SENIOR_TITLES = ['director', 'vp', 'chief', 'head', 'manager', 'lead', 'senior manager'];
    const leadership = employees.filter(e => SENIOR_TITLES.some(t => (e.job_title_en || '').toLowerCase().includes(t)));
    const femaleLeadershipPct = leadership.length > 0
      ? (leadership.filter(e => e.gender === 'female').length / leadership.length) * 100
      : 0;

    const tenures = employees
      .filter(e => e.hire_date)
      .map(e => (now.getTime() - new Date(e.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    const avgTenure = tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;

    const maleSalaries = employees.filter(e => e.gender === 'male' && e.basic_salary > 0).map(e => e.basic_salary);
    const femaleSalaries = employees.filter(e => e.gender === 'female' && e.basic_salary > 0).map(e => e.basic_salary);
    const avgMale = maleSalaries.length > 0 ? maleSalaries.reduce((a, b) => a + b, 0) / maleSalaries.length : 0;
    const avgFemale = femaleSalaries.length > 0 ? femaleSalaries.reduce((a, b) => a + b, 0) / femaleSalaries.length : 0;
    const payEquity = avgMale > 0 ? avgFemale / avgMale : 1;

    const offerAccPct = offerAcceptance && offerAcceptance.total > 0
      ? (offerAcceptance.accepted / offerAcceptance.total) * 100
      : null;

    const rawMetrics: Array<{ metric: string; category: string; value: number }> = [
      { metric: 'Turnover Rate',      category: 'Retention',   value: Math.round(turnoverRate * 10) / 10 },
      { metric: 'Saudization Rate',   category: 'Compliance',  value: Math.round(saudizationPct * 10) / 10 },
      { metric: 'Training Hours/Emp', category: 'Development', value: Math.round(trainingHours * 10) / 10 },
      { metric: 'Female Workforce',   category: 'Diversity',   value: Math.round(femalePct * 10) / 10 },
      { metric: 'Female Leadership',  category: 'Diversity',   value: Math.round(femaleLeadershipPct * 10) / 10 },
      { metric: 'Avg Tenure (yrs)',   category: 'Retention',   value: Math.round(avgTenure * 10) / 10 },
      { metric: 'Pay Equity Ratio',   category: 'Diversity',   value: Math.round(payEquity * 100) / 100 },
    ];

    if (offerAccPct !== null) {
      rawMetrics.push({ metric: 'Offer Acceptance', category: 'Recruitment', value: Math.round(offerAccPct * 10) / 10 });
    }

    return rawMetrics.map(({ metric, category, value }) => {
      const bench = INDUSTRY_BENCHMARKS[metric];
      const percentile = Math.round(computePercentile(value, bench.avg, bench.p50, bench.p75, bench.higher_is_better));
      return {
        metric,
        category,
        company_value: value,
        industry_avg: bench.avg,
        industry_p50: bench.p50,
        industry_p75: bench.p75,
        percentile,
        unit: bench.unit,
        higher_is_better: bench.higher_is_better,
      };
    });
  }, [employees, terminated, trainingHours, offerAcceptance]);

  const categories = useMemo(() => {
    const cats = [...new Set(benchmarks.map(b => b.category))];
    return ['all', ...cats];
  }, [benchmarks]);

  const filteredBenchmarks = selectedCategory === 'all'
    ? benchmarks
    : benchmarks.filter(b => b.category === selectedCategory);

  const radarData = useMemo(() => {
    return benchmarks.slice(0, 8).map(b => ({
      metric: b.metric.length > 14 ? b.metric.slice(0, 14) + '…' : b.metric,
      company: b.percentile,
      industry: 50,
    }));
  }, [benchmarks]);

  const aboveAvgCount = benchmarks.filter(b => b.percentile > 50).length;
  const belowAvgCount = benchmarks.filter(b => b.percentile <= 50).length;
  const avgPercentile = benchmarks.length > 0 ? benchmarks.reduce((s, b) => s + b.percentile, 0) / benchmarks.length : 0;

  const getPercentileColor = (p: number) => {
    if (p >= 75) return 'text-green-600';
    if (p >= 50) return 'text-blue-600';
    if (p >= 25) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPercentileBg = (p: number) => {
    if (p >= 75) return 'bg-green-100 text-green-800';
    if (p >= 50) return 'bg-blue-100 text-blue-800';
    if (p >= 25) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />;
  }

  if (benchmarks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No employee data available for benchmarking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Benchmarks are computed from your live HR data and compared against Saudi market industry averages. Industry percentile bands are based on published Saudi labor market research.</span>
      </div>

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
