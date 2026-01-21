import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Award,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Crown,
  Shield
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface Employee {
  id: string;
  department_name: string | null;
  level: number;
  direct_reports_count: number;
  total_reports_count: number;
  manager_id: string | null;
  hire_date: string;
  status: string;
}

interface OrgChartAnalyticsProps {
  employees: Employee[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function OrgChartAnalytics({ employees }: OrgChartAnalyticsProps) {
  const [analytics, setAnalytics] = useState({
    totalEmployees: 0,
    totalManagers: 0,
    avgTeamSize: 0,
    maxTeamSize: 0,
    minTeamSize: 0,
    spanOfControlIssues: 0,
    departmentDistribution: [] as any[],
    levelDistribution: [] as any[],
    managerEfficiency: [] as any[],
    growthTrend: [] as any[],
    topManagers: [] as any[],
    bottomHeavy: false,
    topHeavy: false,
    healthScore: 0
  });

  useEffect(() => {
    calculateAnalytics();
  }, [employees]);

  const calculateAnalytics = () => {
    if (employees.length === 0) return;

    const managers = employees.filter(e => e.direct_reports_count > 0);
    const totalManagers = managers.length;
    const totalEmployees = employees.length;

    const teamSizes = managers.map(m => m.direct_reports_count);
    const avgTeamSize = teamSizes.reduce((sum, size) => sum + size, 0) / (totalManagers || 1);
    const maxTeamSize = Math.max(...teamSizes, 0);
    const minTeamSize = totalManagers > 0 ? Math.min(...teamSizes) : 0;

    const spanOfControlIssues = managers.filter(m => m.direct_reports_count > 10 || m.direct_reports_count < 3).length;

    const deptMap = new Map<string, number>();
    employees.forEach(emp => {
      const dept = emp.department_name || 'No Department';
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });
    const departmentDistribution = Array.from(deptMap.entries())
      .map(([name, value]) => ({ name, value, percentage: ((value / totalEmployees) * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value);

    const levelMap = new Map<number, number>();
    employees.forEach(emp => {
      levelMap.set(emp.level, (levelMap.get(emp.level) || 0) + 1);
    });
    const levelDistribution = Array.from(levelMap.entries())
      .map(([level, count]) => ({ level: `Level ${level}`, count, percentage: ((count / totalEmployees) * 100).toFixed(1) }))
      .sort((a, b) => parseInt(a.level.split(' ')[1]) - parseInt(b.level.split(' ')[1]));

    const topManagers = managers
      .map(m => {
        const emp = employees.find(e => e.id === m.id);
        return {
          name: emp ? `${emp.first_name_en || ''} ${emp.last_name_en || ''}` : 'Unknown',
          teamSize: m.direct_reports_count,
          totalTeam: m.total_reports_count,
          efficiency: m.total_reports_count / (m.direct_reports_count || 1)
        };
      })
      .sort((a, b) => b.totalTeam - a.totalTeam)
      .slice(0, 5);

    const bottomHeavyCheck = levelDistribution.length > 2 &&
      levelDistribution[levelDistribution.length - 1]?.count > levelDistribution[0]?.count * 2;

    const topHeavyCheck = levelDistribution.length > 2 &&
      levelDistribution[0]?.count > levelDistribution[levelDistribution.length - 1]?.count * 3;

    let healthScore = 100;
    if (avgTeamSize > 10) healthScore -= 15;
    if (avgTeamSize < 3 && totalManagers > 0) healthScore -= 10;
    if (spanOfControlIssues > totalManagers * 0.3) healthScore -= 20;
    if (bottomHeavyCheck) healthScore -= 15;
    if (topHeavyCheck) healthScore -= 10;
    if (maxTeamSize > 15) healthScore -= 10;
    if (levelDistribution.length > 7) healthScore -= 10;

    setAnalytics({
      totalEmployees,
      totalManagers,
      avgTeamSize: parseFloat(avgTeamSize.toFixed(1)),
      maxTeamSize,
      minTeamSize,
      spanOfControlIssues,
      departmentDistribution,
      levelDistribution,
      managerEfficiency: topManagers,
      growthTrend: [],
      topManagers,
      bottomHeavy: bottomHeavyCheck,
      topHeavy: topHeavyCheck,
      healthScore: Math.max(0, healthScore)
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-300';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    return 'text-red-600 bg-red-100 border-red-300';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-6 w-6" />;
    if (score >= 60) return <AlertTriangle className="h-6 w-6" />;
    return <XCircle className="h-6 w-6" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`bg-white rounded-xl border-2 p-5 ${getHealthColor(analytics.healthScore)} shadow-lg hover:shadow-xl transition-all duration-300`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {getHealthIcon(analytics.healthScore)}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Org Health Score</p>
                <p className="text-3xl font-bold tabular-nums">{analytics.healthScore}%</p>
              </div>
            </div>
            <Activity className="h-8 w-8 opacity-40" />
          </div>
          <div className="h-2 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-current rounded-full transition-all duration-1000"
              style={{ width: `${analytics.healthScore}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-blue-200 p-5 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Avg Team Size</p>
              <p className="text-3xl font-bold text-blue-900 tabular-nums">{analytics.avgTeamSize}</p>
              <p className="text-xs text-blue-600 mt-1">Range: {analytics.minTeamSize} - {analytics.maxTeamSize}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-amber-200 p-5 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Total Managers</p>
              <p className="text-3xl font-bold text-amber-900 tabular-nums">{analytics.totalManagers}</p>
              <p className="text-xs text-amber-600 mt-1">{((analytics.totalManagers / analytics.totalEmployees) * 100).toFixed(1)}% of workforce</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
              <Award className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-xl border-2 p-5 shadow-lg hover:shadow-xl transition-all duration-300 ${
          analytics.spanOfControlIssues === 0
            ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-100'
            : 'border-red-200 bg-gradient-to-br from-red-50 to-red-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${analytics.spanOfControlIssues === 0 ? 'text-green-600' : 'text-red-600'}`}>
                Span Issues
              </p>
              <p className={`text-3xl font-bold tabular-nums ${analytics.spanOfControlIssues === 0 ? 'text-green-900' : 'text-red-900'}`}>
                {analytics.spanOfControlIssues}
              </p>
              <p className={`text-xs mt-1 ${analytics.spanOfControlIssues === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.spanOfControlIssues === 0 ? 'All within range' : 'Needs attention'}
              </p>
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${
              analytics.spanOfControlIssues === 0
                ? 'bg-gradient-to-br from-green-500 to-green-600'
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}>
              {analytics.spanOfControlIssues === 0 ? (
                <Shield className="h-6 w-6 text-white" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {(analytics.bottomHeavy || analytics.topHeavy) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 mb-2">Organization Structure Alert</h3>
              {analytics.bottomHeavy && (
                <p className="text-sm text-amber-800 mb-2">
                  <strong>Bottom-Heavy Structure:</strong> Your organization has significantly more employees at lower levels.
                  Consider reviewing management layers and span of control to improve efficiency.
                </p>
              )}
              {analytics.topHeavy && (
                <p className="text-sm text-amber-800">
                  <strong>Top-Heavy Structure:</strong> There may be too many managers relative to individual contributors.
                  Consider flattening the hierarchy to reduce overhead and improve decision-making speed.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Department Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.departmentDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.departmentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Level Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.levelDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="level" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '0.5rem' }}
                labelStyle={{ fontWeight: 'bold', color: '#374151' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-600" />
          Top Managers by Team Size
        </h3>
        <div className="space-y-3">
          {analytics.topManagers.map((manager, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{manager.name}</p>
                <p className="text-sm text-gray-600">
                  {manager.teamSize} direct reports • {manager.totalTeam} total team
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-600">Efficiency</p>
                <p className="text-lg font-bold text-blue-900">{manager.efficiency.toFixed(1)}x</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="h-6 w-6 text-blue-600" />
            <h4 className="font-bold text-gray-900">Optimal Span</h4>
          </div>
          <p className="text-sm text-gray-700 mb-2">Industry best practice: 5-9 direct reports per manager</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((analytics.avgTeamSize / 9) * 100, 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-blue-900">{analytics.avgTeamSize}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h4 className="font-bold text-gray-900">Hierarchy Depth</h4>
          </div>
          <p className="text-sm text-gray-700 mb-2">Current organizational levels</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-green-900">{analytics.levelDistribution.length}</span>
            <span className="text-sm text-gray-600">levels</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            <h4 className="font-bold text-gray-900">Manager Ratio</h4>
          </div>
          <p className="text-sm text-gray-700 mb-2">Percentage of workforce in management roles</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-purple-900">
              {((analytics.totalManagers / analytics.totalEmployees) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
