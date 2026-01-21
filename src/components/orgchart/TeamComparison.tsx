import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Award,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Employee {
  id: string;
  first_name_en: string;
  last_name_en: string;
  job_title_en: string;
  department_name: string | null;
  direct_reports_count: number;
  total_reports_count: number;
  level: number;
}

interface TeamComparisonProps {
  employees: Employee[];
}

interface TeamMetrics {
  managerId: string;
  managerName: string;
  teamSize: number;
  totalTeam: number;
  avgLevel: number;
  depth: number;
  efficiency: number;
  growth: number;
  span: 'optimal' | 'low' | 'high';
}

export function TeamComparison({ employees }: TeamComparisonProps) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  const managers = employees.filter(e => e.direct_reports_count > 0);

  useEffect(() => {
    if (selectedTeams.length > 0) {
      calculateTeamMetrics();
    }
  }, [selectedTeams, employees]);

  const calculateTeamMetrics = () => {
    const metrics: TeamMetrics[] = selectedTeams.map(managerId => {
      const manager = employees.find(e => e.id === managerId);
      if (!manager) return null;

      const teamMembers = getTeamMembers(managerId);
      const avgLevel = teamMembers.length > 0
        ? teamMembers.reduce((sum, emp) => sum + emp.level, 0) / teamMembers.length
        : 0;

      const maxDepth = Math.max(...teamMembers.map(e => e.level), manager.level) - manager.level;

      const span = manager.direct_reports_count >= 5 && manager.direct_reports_count <= 9
        ? 'optimal'
        : manager.direct_reports_count < 5
        ? 'low'
        : 'high';

      return {
        managerId,
        managerName: `${manager.first_name_en} ${manager.last_name_en}`,
        teamSize: manager.direct_reports_count,
        totalTeam: manager.total_reports_count,
        avgLevel: parseFloat(avgLevel.toFixed(1)),
        depth: maxDepth,
        efficiency: manager.total_reports_count / (manager.direct_reports_count || 1),
        growth: 0,
        span
      };
    }).filter(Boolean) as TeamMetrics[];

    setTeamMetrics(metrics);

    const comparison = [
      {
        metric: 'Team Size',
        ...Object.fromEntries(metrics.map(m => [m.managerName, m.teamSize]))
      },
      {
        metric: 'Total Team',
        ...Object.fromEntries(metrics.map(m => [m.managerName, m.totalTeam]))
      },
      {
        metric: 'Depth',
        ...Object.fromEntries(metrics.map(m => [m.managerName, m.depth]))
      },
      {
        metric: 'Efficiency',
        ...Object.fromEntries(metrics.map(m => [m.managerName, parseFloat(m.efficiency.toFixed(1))]))
      }
    ];

    setComparisonData(comparison);
  };

  const getTeamMembers = (managerId: string): Employee[] => {
    const directReports = employees.filter(e => e.manager_id === managerId);
    const allMembers = [...directReports];

    directReports.forEach(report => {
      allMembers.push(...getTeamMembers(report.id));
    });

    return allMembers;
  };

  const handleTeamSelect = (managerId: string) => {
    setSelectedTeams(prev => {
      if (prev.includes(managerId)) {
        return prev.filter(id => id !== managerId);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), managerId];
      }
      return [...prev, managerId];
    });
  };

  const getSpanIcon = (span: 'optimal' | 'low' | 'high') => {
    if (span === 'optimal') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (span === 'low') return <ArrowDownRight className="h-4 w-4 text-blue-600" />;
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  };

  const getSpanColor = (span: 'optimal' | 'low' | 'high') => {
    if (span === 'optimal') return 'bg-green-100 text-green-700 border-green-300';
    if (span === 'low') return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-amber-100 text-amber-700 border-amber-300';
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Select Teams to Compare (Max 4)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {managers.map(manager => (
            <button
              key={manager.id}
              onClick={() => handleTeamSelect(manager.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md ${
                selectedTeams.includes(manager.id)
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-md ${
                  selectedTeams.includes(manager.id)
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}>
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {manager.first_name_en} {manager.last_name_en}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{manager.job_title_en}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {manager.direct_reports_count} direct • {manager.total_reports_count} total
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedTeams.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamMetrics.map((team, index) => (
              <div
                key={team.managerId}
                className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ borderColor: COLORS[index] }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${COLORS[index]}, ${COLORS[index]}dd)` }}
                  >
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate text-sm">{team.managerName}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Team Size</span>
                    <span className="text-lg font-bold text-gray-900">{team.teamSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Total Team</span>
                    <span className="text-lg font-bold text-gray-900">{team.totalTeam}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Depth</span>
                    <span className="text-lg font-bold text-gray-900">{team.depth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Efficiency</span>
                    <span className="text-lg font-bold text-gray-900">{team.efficiency.toFixed(1)}x</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${getSpanColor(team.span)}`}>
                    {getSpanIcon(team.span)}
                    <span className="text-xs font-bold capitalize">{team.span} Span</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Side-by-Side Comparison
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '0.5rem' }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />
                <Legend />
                {teamMetrics.map((team, index) => (
                  <Bar
                    key={team.managerId}
                    dataKey={team.managerName}
                    fill={COLORS[index]}
                    radius={[8, 8, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Key Insights
              </h4>
              <div className="space-y-3">
                {teamMetrics.length > 1 && (
                  <>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Largest Team</p>
                        <p className="text-xs text-gray-600">
                          {teamMetrics.reduce((max, team) => team.totalTeam > max.totalTeam ? team : max).managerName} with {teamMetrics.reduce((max, team) => team.totalTeam > max.totalTeam ? team : max).totalTeam} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Most Efficient</p>
                        <p className="text-xs text-gray-600">
                          {teamMetrics.reduce((max, team) => team.efficiency > max.efficiency ? team : max).managerName} with {teamMetrics.reduce((max, team) => team.efficiency > max.efficiency ? team : max).efficiency.toFixed(1)}x efficiency
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <Award className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Deepest Hierarchy</p>
                        <p className="text-xs text-gray-600">
                          {teamMetrics.reduce((max, team) => team.depth > max.depth ? team : max).managerName} with {teamMetrics.reduce((max, team) => team.depth > max.depth ? team : max).depth} levels
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
                Recommendations
              </h4>
              <div className="space-y-3">
                {teamMetrics.some(t => t.span === 'high') && (
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border-l-4 border-amber-500">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">High Span of Control</p>
                      <p className="text-xs text-gray-600">
                        Consider adding middle management layers for teams with more than 10 direct reports.
                      </p>
                    </div>
                  </div>
                )}
                {teamMetrics.some(t => t.span === 'low') && (
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border-l-4 border-blue-500">
                    <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Low Span of Control</p>
                      <p className="text-xs text-gray-600">
                        Teams with fewer than 5 direct reports may benefit from consolidation or expansion.
                      </p>
                    </div>
                  </div>
                )}
                {teamMetrics.some(t => t.depth > 5) && (
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg border-l-4 border-red-500">
                    <Building2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Deep Hierarchy</p>
                      <p className="text-xs text-gray-600">
                        Consider flattening the organization structure to improve communication and decision-making speed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {selectedTeams.length === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-12 text-center">
          <Users className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Select Teams to Compare</h3>
          <p className="text-gray-600">
            Choose up to 4 teams from the list above to analyze and compare their structure, efficiency, and performance.
          </p>
        </div>
      )}
    </div>
  );
}
