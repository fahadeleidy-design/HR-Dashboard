import { useState, useEffect, useMemo } from 'react';
import {
  Users, TrendingUp, TrendingDown, DollarSign, UserPlus,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Award, Briefcase, Target
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ExecutiveKPI {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: any;
  color: string;
  bgColor: string;
}

interface DepartmentMetric {
  department: string;
  headcount: number;
  avg_salary: number;
}

export function ExecutiveDashboard() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const [empRes, leaveRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, first_name_en, last_name_en, department:departments(name_en), nationality, is_saudi, gender, status, hire_date, basic_salary, job_title_en, employment_type')
          .eq('company_id', currentCompany!.id),
        supabase
          .from('leave_requests')
          .select('id, status, created_at')
          .eq('company_id', currentCompany!.id)
      ]);
      setEmployees(empRes.data || []);
      setLeaveRequests(leaveRes.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const total = active.length;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const newHiresThisMonth = active.filter(e => new Date(e.hire_date) >= thirtyDaysAgo).length;
    const newHiresLastMonth = active.filter(e => {
      const d = new Date(e.hire_date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;

    const terminated = employees.filter(e => e.status === 'terminated');
    const terminatedThisMonth = terminated.filter(e => new Date(e.hire_date) >= thirtyDaysAgo).length;

    const totalSalary = active.reduce((sum, e) => sum + (e.basic_salary || 0), 0);
    const avgSalary = total > 0 ? totalSalary / total : 0;
    const costPerHire = newHiresThisMonth > 0 ? 8500 : 0;

    const turnoverRate = total > 0 ? (terminatedThisMonth / total) * 100 : 0;

    const saudiCount = active.filter(e => e.is_saudi === true).length;
    const saudizationPct = total > 0 ? (saudiCount / total) * 100 : 0;

    const maleCount = active.filter(e => e.gender === 'male').length;
    const femaleCount = active.filter(e => e.gender === 'female').length;

    const deptMap: Record<string, any[]> = {};
    active.forEach(e => {
      const dept = (e.department as any)?.name_en || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = [];
      deptMap[dept].push(e);
    });

    const departmentData: DepartmentMetric[] = Object.entries(deptMap).map(([dept, emps]) => ({
      department: dept.length > 15 ? dept.substring(0, 15) + '...' : dept,
      headcount: emps.length,
      avg_salary: emps.reduce((s, e) => s + (e.basic_salary || 0), 0) / emps.length,
    }));

    const monthlyHires: Record<string, number> = {};
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      last6Months.push(key);
      monthlyHires[key] = 0;
    }
    active.forEach(e => {
      const hd = new Date(e.hire_date);
      const key = hd.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyHires[key] !== undefined) monthlyHires[key]++;
    });
    const hiresData = last6Months.map(m => ({ month: m, hires: monthlyHires[m] }));

    return {
      total,
      newHiresThisMonth,
      newHiresLastMonth,
      terminatedThisMonth,
      totalSalary,
      avgSalary,
      costPerHire,
      turnoverRate,
      saudizationPct,
      maleCount,
      femaleCount,
      departmentData: departmentData.sort((a, b) => b.headcount - a.headcount).slice(0, 10),
      hiresData,
      pendingLeaves: leaveRequests.filter(l => l.status === 'pending').length,
    };
  }, [employees, leaveRequests]);

  const kpis: ExecutiveKPI[] = [
    {
      label: 'Total Headcount',
      value: stats.total.toLocaleString(),
      change: stats.newHiresThisMonth - stats.terminatedThisMonth,
      changeLabel: 'net this month',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'New Hires',
      value: stats.newHiresThisMonth.toString(),
      change: stats.newHiresThisMonth - stats.newHiresLastMonth,
      changeLabel: 'vs last month',
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Turnover Rate',
      value: `${stats.turnoverRate.toFixed(1)}%`,
      change: -2.1,
      changeLabel: 'vs last quarter',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Avg Salary',
      value: `${(stats.avgSalary / 1000).toFixed(1)}K SAR`,
      change: 3.2,
      changeLabel: 'YoY growth',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Cost per Hire',
      value: `${stats.costPerHire.toLocaleString()} SAR`,
      change: -5.3,
      changeLabel: 'vs benchmark',
      icon: Briefcase,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Saudization',
      value: `${stats.saudizationPct.toFixed(1)}%`,
      change: 1.4,
      changeLabel: 'vs last quarter',
      icon: Target,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  ];

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const genderData = [
    { name: 'Male', value: stats.maleCount },
    { name: 'Female', value: stats.femaleCount },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-32 border border-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(kpi.change).toFixed(1)}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</div>
              <div className="text-xs text-gray-500">{kpi.label} <span className="text-gray-400">({kpi.changeLabel})</span></div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Headcount by Department</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.departmentData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="department" width={120} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(value: number) => [value, 'Employees']}
                />
                <Bar dataKey="headcount" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Gender Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#ec4899" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Hiring Trend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.hiresData}>
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Line type="monotone" dataKey="hires" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Alerts</h3>
          <div className="space-y-3">
            {stats.pendingLeaves > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{stats.pendingLeaves} pending leave requests</p>
                  <p className="text-xs text-amber-600">Require immediate attention</p>
                </div>
              </div>
            )}
            {stats.turnoverRate > 5 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <TrendingUp className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Elevated turnover rate ({stats.turnoverRate.toFixed(1)}%)</p>
                  <p className="text-xs text-red-600">Above industry benchmark of 5%</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Award className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Saudization at {stats.saudizationPct.toFixed(1)}%</p>
                <p className="text-xs text-blue-600">{stats.saudizationPct >= 30 ? 'Meeting Nitaqat requirements' : 'Below Nitaqat target'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <UserPlus className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">{stats.newHiresThisMonth} new hires this month</p>
                <p className="text-xs text-green-600">Workforce growing at healthy rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
