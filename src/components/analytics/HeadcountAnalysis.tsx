import { useState, useEffect, useMemo } from 'react';
import { Users, MapPin, Briefcase, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

export function HeadcountAnalysis() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [view, setView] = useState<'department' | 'location' | 'job_family' | 'type'>('department');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('employees')
        .select('id, department:departments(name_en), nationality, gender, employment_type, status, job_title_en, city, work_region')
        .eq('company_id', currentCompany!.id)
        .eq('status', 'active');
      setEmployees(data || []);
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    const groupBy = (getter: (e: any) => string) => {
      const map: Record<string, number> = {};
      employees.forEach(e => {
        const val = getter(e) || 'Unspecified';
        map[val] = (map[val] || 0) + 1;
      });
      return Object.entries(map)
        .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, count }))
        .sort((a, b) => b.count - a.count);
    };

    switch (view) {
      case 'department': return groupBy(e => e.department?.name_en);
      case 'location': return groupBy(e => e.city || e.work_region);
      case 'job_family': return groupBy(e => e.job_title_en);
      case 'type': return groupBy(e => e.employment_type);
      default: return [];
    }
  }, [employees, view]);

  const viewOptions = [
    { id: 'department' as const, label: 'Department', icon: Building2 },
    { id: 'location' as const, label: 'Location', icon: MapPin },
    { id: 'job_family' as const, label: 'Job Family', icon: Briefcase },
    { id: 'type' as const, label: 'Employment Type', icon: Users },
  ];

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Headcount Analysis</h3>
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
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={140} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                  {chartData.slice(0, 12).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Distribution</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.slice(0, 6)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count">
                  {chartData.slice(0, 6).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-3">
            {chartData.slice(0, 6).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
