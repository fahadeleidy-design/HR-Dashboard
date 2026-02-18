import { useState, useEffect, useMemo } from 'react';
import { Users, MapPin, Briefcase, Building2, TrendingUp, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#8b5cf6', '#14b8a6'];

type ViewMode = 'department' | 'location' | 'employment_type' | 'nationality';

export function HeadcountAnalysis() {
  const { currentCompany, isConsolidatedView, loading: companyLoading, companies } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [view, setView] = useState<ViewMode>('department');
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
        .select('id, department:departments(name_en), nationality, gender, employment_type, status, hire_date, termination_date, is_saudi, city, work_region');
      if (currentCompany?.id) query = query.eq('company_id', currentCompany.id);
      const { data, error } = await query;
      if (error) console.error('HeadcountAnalysis query error:', error);
      setEmployees(data || []);
    } finally {
      setLoading(false);
    }
  }

  const analysis = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const total = active.length;
    const allTime = employees.length;

    const groupBy = (getter: (e: any) => string) => {
      const map: Record<string, number> = {};
      active.forEach(e => {
        const val = getter(e) || 'Unspecified';
        map[val] = (map[val] || 0) + 1;
      });
      return Object.entries(map)
        .map(([name, count]) => ({
          name: name.length > 22 ? name.slice(0, 22) + '...' : name,
          fullName: name,
          count,
          pct: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.count - a.count);
    };

    let chartData: { name: string; fullName: string; count: number; pct: number }[] = [];
    switch (view) {
      case 'department': chartData = groupBy(e => e.department?.name_en); break;
      case 'location': chartData = groupBy(e => e.city || e.work_region); break;
      case 'employment_type': chartData = groupBy(e => e.employment_type); break;
      case 'nationality': chartData = groupBy(e => e.nationality); break;
    }

    const now = new Date();
    const monthlyTrend: { month: string; headcount: number; new_hires: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const headcountAtMonth = employees.filter(e => {
        const hired = new Date(e.hire_date) <= monthEnd;
        const terminated = e.status === 'terminated' && e.termination_date
          ? new Date(e.termination_date) <= d
          : false;
        return hired && !terminated;
      }).length;

      const newHires = employees.filter(e => {
        const hd = new Date(e.hire_date);
        return hd >= d && hd <= monthEnd;
      }).length;

      monthlyTrend.push({ month: label, headcount: headcountAtMonth, new_hires: newHires });
    }

    const saudiCount = active.filter(e => e.is_saudi).length;
    const maleCount = active.filter(e => e.gender === 'male').length;
    const femaleCount = active.filter(e => e.gender === 'female').length;

    const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newHiresMonth = active.filter(e => new Date(e.hire_date) >= thirtyAgo).length;

    const terminated = employees.filter(e => e.status === 'terminated');

    return {
      total,
      allTime,
      chartData,
      monthlyTrend,
      saudiCount,
      maleCount,
      femaleCount,
      newHiresMonth,
      terminatedCount: terminated.length,
    };
  }, [employees, view]);

  const viewOptions: { id: ViewMode; label: string; icon: any }[] = [
    { id: 'department', label: 'Department', icon: Building2 },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'employment_type', label: 'Contract Type', icon: Briefcase },
    { id: 'nationality', label: 'Nationality', icon: Users },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-20 border border-gray-200" />)}
        </div>
        <div className="bg-white rounded-xl h-80 border border-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Active Employees</div>
          <div className="text-2xl font-bold text-blue-600">{analysis.total.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">+{analysis.newHiresMonth} this month</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Saudization</div>
          <div className="text-2xl font-bold text-green-600">
            {analysis.total > 0 ? ((analysis.saudiCount / analysis.total) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-xs text-gray-400 mt-1">{analysis.saudiCount} Saudi nationals</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Gender Ratio (M:F)</div>
          <div className="text-2xl font-bold text-teal-600">
            {analysis.maleCount}:{analysis.femaleCount}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {analysis.total > 0 ? ((analysis.femaleCount / analysis.total) * 100).toFixed(1) : 0}% female
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Historical Total</div>
          <div className="text-2xl font-bold text-gray-700">{analysis.allTime.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">{analysis.terminatedCount} terminated</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Headcount Trend</h3>
            <p className="text-xs text-gray-400">Last 12 months workforce evolution</p>
          </div>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analysis.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              <Line type="monotone" dataKey="headcount" stroke="#0ea5e9" strokeWidth={2}
                dot={{ r: 3, fill: '#0ea5e9' }} name="Headcount" />
              <Line type="monotone" dataKey="new_hires" stroke="#10b981" strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }} name="New Hires" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Headcount Breakdown</h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {viewOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setView(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    view === opt.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            {analysis.chartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-sm text-gray-400">
                No data available for this view
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.chartData.slice(0, 14)} layout="vertical" margin={{ left: 0, right: 50 }}>
                    <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={140} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={(value: number, _: string, props: any) => [
                        `${value} employees (${props.payload.pct}%)`,
                        'Count'
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}
                      label={{ position: 'right', fontSize: 11, fill: '#6b7280',
                        formatter: (v: number) => v > 0 ? v : '' }}>
                      {analysis.chartData.slice(0, 14).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Distribution</h4>
            {analysis.chartData.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No data</div>
            ) : (
              <>
                <div className="h-44 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analysis.chartData.slice(0, 6)} cx="50%" cy="50%"
                        innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="count">
                        {analysis.chartData.slice(0, 6).map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {analysis.chartData.slice(0, 6).map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-1">
                        <span className="text-gray-400">{item.pct}%</span>
                        <span className="font-semibold text-gray-900 w-5 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
