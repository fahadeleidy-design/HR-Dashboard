import { useState, useEffect, useMemo } from 'react';
import { TrendingDown, UserMinus, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid
} from 'recharts';

const REASON_COLORS: Record<string, string> = {
  resignation: '#f59e0b',
  voluntary: '#f59e0b',
  termination: '#ef4444',
  end_of_contract: '#6b7280',
  retirement: '#10b981',
  redundancy: '#3b82f6',
  other: '#9ca3af',
};

export function TurnoverAnalysis() {
  const { currentCompany, isConsolidatedView, loading: companyLoading, companies } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyLoading) return;
    if (currentCompany?.id || isConsolidatedView || companies.length > 0) loadData();
  }, [currentCompany, isConsolidatedView, companyLoading, companies]);

  async function loadData() {
    try {
      setLoading(true);
      let query = supabase
        .from('employees')
        .select('id, department:departments(name_en), status, hire_date, termination_date, termination_reason, gender, nationality, is_saudi, job_title_en, basic_salary');
      if (currentCompany?.id) query = query.eq('company_id', currentCompany.id);
      const { data, error } = await query;
      if (error) console.error('TurnoverAnalysis error:', error);
      setEmployees(data || []);
    } finally {
      setLoading(false);
    }
  }

  const analysis = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const terminated = employees.filter(e => e.status === 'terminated');
    const total = employees.length;

    const VOLUNTARY_REASONS = ['resignation', 'voluntary', 'personal_reasons', 'better_opportunity'];
    const voluntary = terminated.filter(e =>
      VOLUNTARY_REASONS.includes((e.termination_reason || '').toLowerCase())
    );
    const involuntary = terminated.filter(e =>
      !VOLUNTARY_REASONS.includes((e.termination_reason || '').toLowerCase()) && e.termination_reason
    );

    const overallRate = total > 0 ? (terminated.length / total) * 100 : 0;
    const voluntaryRate = total > 0 ? (voluntary.length / total) * 100 : 0;
    const involuntaryRate = total > 0 ? (involuntary.length / total) * 100 : 0;
    const retentionRate = 100 - overallRate;

    const SENIOR_TITLES = ['director', 'vp', 'chief', 'head', 'manager', 'lead', 'senior manager', 'principal'];
    const regrettable = voluntary.filter(e => {
      const title = (e.job_title_en || '').toLowerCase();
      const isSenior = SENIOR_TITLES.some(t => title.includes(t));
      const tenureYears = e.hire_date && e.termination_date
        ? (new Date(e.termination_date).getFullYear() - new Date(e.hire_date).getFullYear())
        : 0;
      const isHighPerformer = tenureYears >= 2;
      return isSenior || isHighPerformer;
    });
    const regrettableRate = total > 0 ? (regrettable.length / total) * 100 : 0;

    const reasonMap: Record<string, number> = {};
    terminated.forEach(e => {
      const reason = e.termination_reason || 'unspecified';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });
    const reasonData = Object.entries(reasonMap)
      .map(([reason, count]) => ({
        reason: reason.replace(/_/g, ' '),
        rawReason: reason,
        count,
        pct: terminated.length > 0 ? parseFloat(((count / terminated.length) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const deptTurnover: Record<string, { total: number; terminated: number; salary: number }> = {};
    employees.forEach(e => {
      const dept = (e.department as any)?.name_en || 'Unassigned';
      if (!deptTurnover[dept]) deptTurnover[dept] = { total: 0, terminated: 0, salary: 0 };
      deptTurnover[dept].total++;
      if (e.status === 'terminated') {
        deptTurnover[dept].terminated++;
        deptTurnover[dept].salary += e.basic_salary || 0;
      }
    });

    const deptData = Object.entries(deptTurnover)
      .filter(([, d]) => d.total >= 2)
      .map(([dept, data]) => ({
        department: dept.length > 16 ? dept.slice(0, 16) + '...' : dept,
        rate: parseFloat((data.total > 0 ? (data.terminated / data.total) * 100 : 0).toFixed(1)),
        count: data.terminated,
        replacementCost: data.salary * 0.5,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);

    const now = new Date();
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const monthTerminated = terminated.filter(e => {
        const td = e.termination_date ? new Date(e.termination_date) : null;
        return td && td >= d && td <= monthEnd;
      }).length;

      const monthVoluntary = voluntary.filter(e => {
        const td = e.termination_date ? new Date(e.termination_date) : null;
        return td && td >= d && td <= monthEnd;
      }).length;

      const monthActive = employees.filter(e => {
        const hired = new Date(e.hire_date) <= monthEnd;
        const term = e.status === 'terminated' && e.termination_date
          ? new Date(e.termination_date) < d
          : false;
        return hired && !term;
      }).length;

      const monthRate = monthActive > 0 ? parseFloat(((monthTerminated / monthActive) * 100).toFixed(2)) : 0;

      monthlyData.push({
        month: monthLabel,
        turnover: monthRate,
        terminated: monthTerminated,
        voluntary: monthVoluntary,
        involuntary: monthTerminated - monthVoluntary,
      });
    }

    const totalReplacementCost = terminated.reduce((sum, e) => sum + (e.basic_salary || 0) * 0.5, 0);

    const tenureBands: Record<string, number> = { '<1 yr': 0, '1-2 yrs': 0, '2-5 yrs': 0, '5-10 yrs': 0, '10+ yrs': 0 };
    terminated.forEach(e => {
      if (!e.hire_date || !e.termination_date) return;
      const years = (new Date(e.termination_date).getTime() - new Date(e.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (years < 1) tenureBands['<1 yr']++;
      else if (years < 2) tenureBands['1-2 yrs']++;
      else if (years < 5) tenureBands['2-5 yrs']++;
      else if (years < 10) tenureBands['5-10 yrs']++;
      else tenureBands['10+ yrs']++;
    });
    const tenureData = Object.entries(tenureBands).map(([band, count]) => ({ band, count }));

    return {
      overallRate,
      voluntaryRate,
      involuntaryRate,
      retentionRate,
      regrettableRate,
      totalTerminated: terminated.length,
      voluntary: voluntary.length,
      involuntary: involuntary.length,
      regrettable: regrettable.length,
      deptData,
      monthlyData,
      reasonData,
      tenureData,
      totalReplacementCost,
    };
  }, [employees]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl h-20 border border-gray-200" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl h-64 border border-gray-200" />
          <div className="bg-white rounded-xl h-64 border border-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Overall Turnover</div>
          <div className="text-2xl font-bold text-red-600">{analysis.overallRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">{analysis.totalTerminated} total exits</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Voluntary</div>
          <div className="text-2xl font-bold text-amber-600">{analysis.voluntaryRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">{analysis.voluntary} resignations</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Involuntary</div>
          <div className="text-2xl font-bold text-gray-700">{analysis.involuntaryRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">{analysis.involuntary} terminations</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            Regrettable
            <div className="relative group">
              <Info className="w-3 h-3 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-40 text-xs bg-gray-800 text-white rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                Senior roles or employees with 2+ years tenure
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-red-500">{analysis.regrettableRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">{analysis.regrettable} key talent lost</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Retention Rate</div>
          <div className="text-2xl font-bold text-green-600">{analysis.retentionRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">
            Est. cost {(analysis.totalReplacementCost / 1000).toFixed(0)}K SAR
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Monthly Turnover Trend</h4>
          <p className="text-xs text-gray-400 mb-4">Last 12 months</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Bar dataKey="voluntary" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} barSize={14} name="Voluntary" />
                <Bar dataKey="involuntary" fill="#ef4444" stackId="a" radius={[2, 2, 0, 0]} barSize={14} name="Involuntary" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Turnover by Department</h4>
          {analysis.deptData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-gray-400">No department data</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.deptData} layout="vertical">
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="department" width={120} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(val: number, name: string) => [
                      name === 'rate' ? `${val}%` : val,
                      name === 'rate' ? 'Turnover Rate' : 'Exits'
                    ]}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={14}>
                    {analysis.deptData.map((entry, i) => (
                      <Cell key={i} fill={entry.rate > 20 ? '#dc2626' : entry.rate > 10 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Exit Reasons Breakdown</h4>
          {analysis.reasonData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No termination data recorded</div>
          ) : (
            <div className="space-y-2">
              {analysis.reasonData.map(r => (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 shrink-0 capitalize">{r.reason}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${r.pct}%`,
                        backgroundColor: REASON_COLORS[r.rawReason] || '#9ca3af',
                      }}
                    />
                  </div>
                  <div className="flex gap-2 w-16 justify-end text-xs">
                    <span className="text-gray-400">{r.pct}%</span>
                    <span className="font-semibold text-gray-700">{r.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Turnover by Tenure at Exit</h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.tenureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="band" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32} name="Employees" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2">High early-tenure turnover may indicate onboarding issues</p>
        </div>
      </div>
    </div>
  );
}
