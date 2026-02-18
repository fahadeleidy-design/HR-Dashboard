import { useState, useEffect, useMemo } from 'react';
import {
  Users, TrendingUp, TrendingDown, DollarSign, UserPlus,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Award, Briefcase, Target, Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';

interface DepartmentMetric {
  department: string;
  headcount: number;
  avg_salary: number;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];

export function ExecutiveDashboard() {
  const { currentCompany, isConsolidatedView, loading: companyLoading, companies } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [payrollBatches, setPayrollBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyLoading) return;
    if (currentCompany?.id || isConsolidatedView || companies.length > 0) loadData();
  }, [currentCompany, isConsolidatedView, companyLoading, companies]);

  async function loadData() {
    setLoading(true);
    try {
      let empQuery = supabase
        .from('employees')
        .select('id, first_name_en, last_name_en, department:departments(name_en), nationality, is_saudi, gender, status, hire_date, termination_date, basic_salary, job_title_en, employment_type, date_of_birth');
      let leaveQuery = supabase
        .from('leave_requests')
        .select('id, status, created_at, total_days');
      let payrollQuery = supabase
        .from('payroll_batches')
        .select('id, period_month, period_year, total_net_salary, total_employees, status, created_at')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(12);

      if (currentCompany?.id) {
        empQuery = empQuery.eq('company_id', currentCompany.id);
        leaveQuery = leaveQuery.eq('company_id', currentCompany.id);
        payrollQuery = payrollQuery.eq('company_id', currentCompany.id);
      }

      const [empRes, leaveRes, payrollRes] = await Promise.all([empQuery, leaveQuery, payrollQuery]);

      if (empRes.error) console.error('Employees query error:', empRes.error);
      if (leaveRes.error) console.error('Leave requests query error:', leaveRes.error);

      setEmployees(empRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      setPayrollBatches(payrollRes.data || []);
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const terminated = employees.filter(e => e.status === 'terminated');
    const total = active.length;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninety = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const newHiresThisMonth = active.filter(e => new Date(e.hire_date) >= thirtyDaysAgo).length;
    const newHiresLastMonth = active.filter(e => {
      const d = new Date(e.hire_date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;

    const terminatedThisMonth = terminated.filter(e => {
      const td = e.termination_date ? new Date(e.termination_date) : null;
      return td && td >= thirtyDaysAgo;
    }).length;
    const terminatedLastMonth = terminated.filter(e => {
      const td = e.termination_date ? new Date(e.termination_date) : null;
      return td && td >= sixtyDaysAgo && td < thirtyDaysAgo;
    }).length;

    const totalSalary = active.reduce((sum, e) => sum + (e.basic_salary || 0), 0);
    const avgSalary = total > 0 ? totalSalary / total : 0;

    const turnoverRate = (total + terminatedThisMonth) > 0
      ? (terminatedThisMonth / (total + terminatedThisMonth)) * 100
      : 0;
    const lastMonthTurnover = (total + terminatedLastMonth) > 0
      ? (terminatedLastMonth / (total + terminatedLastMonth)) * 100
      : 0;

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
      department: dept.length > 18 ? dept.substring(0, 18) + '...' : dept,
      headcount: emps.length,
      avg_salary: emps.reduce((s, e) => s + (e.basic_salary || 0), 0) / emps.length,
    }));

    const monthlyMap: Record<string, { hires: number; exits: number; headcount: number }> = {};
    const last12Labels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      last12Labels.push(key);
      monthlyMap[key] = { hires: 0, exits: 0, headcount: 0 };
    }

    active.forEach(e => {
      const hd = new Date(e.hire_date);
      const key = hd.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyMap[key]) monthlyMap[key].hires++;
    });
    terminated.forEach(e => {
      const td = e.termination_date ? new Date(e.termination_date) : null;
      if (td) {
        const key = td.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (monthlyMap[key]) monthlyMap[key].exits++;
      }
    });

    let runningHeadcount = total;
    const hiresData = last12Labels.map(m => {
      const entry = monthlyMap[m];
      runningHeadcount = runningHeadcount - entry.hires + entry.exits;
      return {
        month: m,
        hires: entry.hires,
        exits: entry.exits,
        net: entry.hires - entry.exits,
      };
    });

    const payrollTrend = [...payrollBatches]
      .filter(p => p.status === 'approved' || p.status === 'paid')
      .sort((a, b) => {
        if (a.period_year !== b.period_year) return a.period_year - b.period_year;
        return a.period_month - b.period_month;
      })
      .slice(-6)
      .map(p => ({
        month: new Date(p.period_year, p.period_month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        cost: Math.round((p.total_net_salary || 0) / 1000),
      }));

    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
    const recentLeaves = leaveRequests.filter(l => new Date(l.created_at) >= ninety).length;

    const probationEndingSoon = active.filter(e => {
      if (!e.probation_end_date) return false;
      const pd = new Date(e.probation_end_date);
      const future30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return pd >= now && pd <= future30;
    }).length;

    return {
      total,
      newHiresThisMonth,
      newHiresLastMonth,
      terminatedThisMonth,
      totalSalary,
      avgSalary,
      turnoverRate,
      lastMonthTurnover,
      saudizationPct,
      maleCount,
      femaleCount,
      departmentData: departmentData.sort((a, b) => b.headcount - a.headcount).slice(0, 10),
      hiresData,
      payrollTrend,
      pendingLeaves,
      recentLeaves,
      probationEndingSoon,
    };
  }, [employees, leaveRequests, payrollBatches]);

  const genderData = [
    { name: 'Male', value: stats.maleCount },
    { name: 'Female', value: stats.femaleCount },
  ].filter(d => d.value > 0);

  const kpis = [
    {
      label: 'Total Headcount',
      value: stats.total.toLocaleString(),
      change: stats.newHiresThisMonth - stats.terminatedThisMonth,
      changeLabel: 'net change this month',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      positive: true,
    },
    {
      label: 'New Hires',
      value: stats.newHiresThisMonth.toString(),
      change: stats.newHiresThisMonth - stats.newHiresLastMonth,
      changeLabel: 'vs last month',
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      positive: true,
    },
    {
      label: 'Turnover Rate',
      value: `${stats.turnoverRate.toFixed(1)}%`,
      change: parseFloat((stats.turnoverRate - stats.lastMonthTurnover).toFixed(1)),
      changeLabel: 'vs last month',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      positive: false,
    },
    {
      label: 'Avg Basic Salary',
      value: `${(stats.avgSalary / 1000).toFixed(1)}K SAR`,
      change: 0,
      changeLabel: 'total payroll budget',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      positive: true,
    },
    {
      label: 'Total Payroll Cost',
      value: `${(stats.totalSalary / 1000000).toFixed(2)}M SAR`,
      change: 0,
      changeLabel: 'monthly payroll',
      icon: Briefcase,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      positive: true,
    },
    {
      label: 'Saudization',
      value: `${stats.saudizationPct.toFixed(1)}%`,
      change: 0,
      changeLabel: stats.saudizationPct >= 30 ? 'Nitaqat compliant' : 'Below Nitaqat target',
      icon: Target,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      positive: true,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-28 border border-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl h-72 border border-gray-200" />
          <div className="bg-white rounded-xl h-72 border border-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositiveChange = kpi.positive ? kpi.change >= 0 : kpi.change <= 0;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                {kpi.change !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositiveChange ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpi.change)}
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</div>
              <div className="text-xs text-gray-500">{kpi.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{kpi.changeLabel}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Headcount by Department</h3>
          <div className="h-72">
            {stats.departmentData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">No department data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.departmentData} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="department" width={130} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(value: number, name: string) => [
                      name === 'headcount' ? value : `${Math.round(value).toLocaleString()} SAR`,
                      name === 'headcount' ? 'Employees' : 'Avg Salary'
                    ]}
                  />
                  <Bar dataKey="headcount" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={18}
                    label={{ position: 'right', fontSize: 11, fill: '#6b7280' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Gender Distribution</h3>
          <div className="h-72">
            {genderData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">No gender data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {genderData.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? '#0ea5e9' : '#ec4899'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle"
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-700">{stats.maleCount}</div>
              <div className="text-xs text-blue-500">Male</div>
            </div>
            <div className="text-center p-2 bg-pink-50 rounded-lg">
              <div className="text-lg font-bold text-pink-700">{stats.femaleCount}</div>
              <div className="text-xs text-pink-500">Female</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Hiring & Attrition Trend</h3>
          <p className="text-xs text-gray-400 mb-4">Last 12 months</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hiresData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Bar dataKey="hires" fill="#10b981" radius={[2, 2, 0, 0]} barSize={10} name="Hires" />
                <Bar dataKey="exits" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={10} name="Exits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {stats.payrollTrend.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Payroll Cost Trend</h3>
            <p className="text-xs text-gray-400 mb-4">Net salary (K SAR)</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.payrollTrend}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(v: number) => [`${v}K SAR`, 'Net Payroll']}
                  />
                  <Area type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2}
                    fill="url(#costGrad)" dot={{ r: 4, fill: '#f59e0b' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
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
                  <p className="text-xs text-green-600">Workforce growing</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {(stats.pendingLeaves > 0 || stats.probationEndingSoon > 0 || stats.turnoverRate > 5) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-600" />
            Alerts & Attention Required
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.pendingLeaves > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{stats.pendingLeaves} Pending Leaves</p>
                  <p className="text-xs text-amber-600">Require approval</p>
                </div>
              </div>
            )}
            {stats.turnoverRate > 5 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <TrendingDown className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">High Turnover: {stats.turnoverRate.toFixed(1)}%</p>
                  <p className="text-xs text-red-600">Above 5% benchmark</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Award className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Saudization: {stats.saudizationPct.toFixed(1)}%</p>
                <p className="text-xs text-blue-600">{stats.saudizationPct >= 30 ? 'Compliant' : 'Below target'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
