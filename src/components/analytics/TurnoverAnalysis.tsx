import { useState, useEffect, useMemo } from 'react';
import { TrendingDown, UserMinus, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function TurnoverAnalysis() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('employees')
        .select('id, department:departments(name_en), status, hire_date, termination_date, termination_reason, gender, nationality, is_saudi')
        .eq('company_id', currentCompany!.id);
      setEmployees(data || []);
    } finally {
      setLoading(false);
    }
  }

  const analysis = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const terminated = employees.filter(e => e.status === 'terminated');
    const total = active.length + terminated.length;

    const voluntary = terminated.filter(e => e.termination_reason === 'resignation' || e.termination_reason === 'voluntary');
    const involuntary = terminated.filter(e => e.termination_reason !== 'resignation' && e.termination_reason !== 'voluntary');

    const overallRate = total > 0 ? (terminated.length / total) * 100 : 0;
    const voluntaryRate = total > 0 ? (voluntary.length / total) * 100 : 0;
    const involuntaryRate = total > 0 ? (involuntary.length / total) * 100 : 0;
    const retentionRate = 100 - overallRate;

    const regrettable = voluntary.filter(e => {
      return true;
    });
    const regrettableRate = total > 0 ? (regrettable.length / total) * 100 : 0;

    const deptTurnover: Record<string, { total: number; terminated: number }> = {};
    employees.forEach(e => {
      const dept = e.department?.name_en || 'Unassigned';
      if (!deptTurnover[dept]) deptTurnover[dept] = { total: 0, terminated: 0 };
      deptTurnover[dept].total++;
      if (e.status === 'terminated') deptTurnover[dept].terminated++;
    });

    const deptData = Object.entries(deptTurnover)
      .map(([dept, data]) => ({
        department: dept.length > 15 ? dept.slice(0, 15) + '...' : dept,
        rate: data.total > 0 ? (data.terminated / data.total) * 100 : 0,
        count: data.terminated,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);

    const now = new Date();
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });

      const monthTerminated = terminated.filter(e => {
        const td = new Date(e.termination_date || e.hire_date);
        return td >= d && td <= monthEnd;
      }).length;

      const monthActive = active.filter(e => new Date(e.hire_date) <= monthEnd).length;
      const monthRate = monthActive > 0 ? (monthTerminated / monthActive) * 100 : 0;

      monthlyData.push({
        month: monthLabel,
        turnover: parseFloat(monthRate.toFixed(1)),
        terminated: monthTerminated,
      });
    }

    return {
      overallRate,
      voluntaryRate,
      involuntaryRate,
      retentionRate,
      regrettableRate,
      totalTerminated: terminated.length,
      voluntary: voluntary.length,
      involuntary: involuntary.length,
      deptData,
      monthlyData,
    };
  }, [employees]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Overall Turnover</div>
          <div className="text-2xl font-bold text-red-600">{analysis.overallRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">{analysis.totalTerminated} employees</div>
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
          <div className="text-xs text-gray-500 mb-1">Regrettable</div>
          <div className="text-2xl font-bold text-red-500">{analysis.regrettableRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">Key talent lost</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Retention Rate</div>
          <div className="text-2xl font-bold text-green-600">{analysis.retentionRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">Employee retention</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Monthly Turnover Trend</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysis.monthlyData}>
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Line type="monotone" dataKey="turnover" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Turnover %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Turnover by Department</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.deptData} layout="vertical">
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="department" width={120} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(val: number) => [`${val.toFixed(1)}%`, 'Turnover']} />
                <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
