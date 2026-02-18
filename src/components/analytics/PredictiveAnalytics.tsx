import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, DollarSign, Users, Brain, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#22c55e',
};

interface FlightRiskEmployee {
  id: string;
  name: string;
  department: string;
  job_title: string;
  risk_score: number;
  risk_level: string;
  factors: string[];
  tenure_years: number;
  salary: number;
}

function computeRiskScore(emp: any, now: Date): { score: number; factors: string[] } {
  let score = 30;
  const factors: string[] = [];

  const tenureYears = emp.hire_date
    ? (now.getTime() - new Date(emp.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 5;

  if (tenureYears < 0.5) { score += 25; factors.push('Very new hire (<6mo)'); }
  else if (tenureYears < 1) { score += 18; factors.push('New hire (<1yr)'); }
  else if (tenureYears < 2) { score += 10; factors.push('Short tenure'); }
  else if (tenureYears > 8) { score += 8; factors.push('Long tenure (retention risk)'); }

  if (!emp.basic_salary || emp.basic_salary < 5000) { score += 15; factors.push('Below market salary'); }
  else if (emp.basic_salary < 8000) { score += 5; factors.push('Compensation review due'); }

  const empType = (emp.employment_type || '').toLowerCase();
  if (empType === 'contract' || empType === 'fixed_term') { score += 15; factors.push('Fixed-term contract'); }
  else if (empType === 'part_time') { score += 8; factors.push('Part-time position'); }

  if (!emp.is_saudi) { score += 5; factors.push('Expat workforce dynamics'); }

  const title = (emp.job_title_en || '').toLowerCase();
  if (title.includes('intern') || title.includes('trainee')) { score += 10; factors.push('Early career stage'); }

  if (!emp.department?.name_en) { score += 8; factors.push('No department assigned'); }

  score = Math.min(95, Math.max(5, score));
  return { score, factors: factors.slice(0, 4) };
}

export function PredictiveAnalytics() {
  const { currentCompany, isConsolidatedView, loading: companyLoading, companies } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyLoading) return;
    if (currentCompany?.id || isConsolidatedView || companies.length > 0) loadData();
  }, [currentCompany, isConsolidatedView, companyLoading, companies]);

  async function loadData() {
    try {
      setLoading(true);
      let empQuery = supabase
        .from('employees')
        .select('id, first_name_en, last_name_en, department:departments(name_en), job_title_en, hire_date, basic_salary, status, gender, nationality, is_saudi, employment_type')
        .eq('status', 'active');
      let predQuery = supabase
        .from('turnover_predictions')
        .select('*')
        .order('turnover_risk_score', { ascending: false })
        .limit(200);

      if (currentCompany?.id) {
        empQuery = empQuery.eq('company_id', currentCompany.id);
        predQuery = predQuery.eq('company_id', currentCompany.id);
      }

      const [empRes, predRes] = await Promise.all([empQuery, predQuery]);
      setEmployees(empRes.data || []);
      setPredictions(predRes.data || []);
    } catch (err) {
      console.error('PredictiveAnalytics loadData error:', err);
    } finally {
      setLoading(false);
    }
  }

  const flightRiskData = useMemo((): FlightRiskEmployee[] => {
    const now = new Date();

    if (predictions.length > 0) {
      return predictions.map(p => {
        const emp = employees.find(e => e.id === p.employee_id);
        const tenure = emp
          ? (now.getFullYear() - new Date(emp.hire_date).getFullYear())
          : 0;
        return {
          id: p.id,
          name: emp ? `${emp.first_name_en} ${emp.last_name_en}` : 'Unknown',
          department: emp?.department?.name_en || '',
          job_title: emp?.job_title_en || '',
          risk_score: p.turnover_risk_score,
          risk_level: p.risk_category,
          factors: Array.isArray(p.contributing_factors) ? p.contributing_factors : [],
          tenure_years: tenure,
          salary: emp?.basic_salary || 0,
        };
      });
    }

    return employees.map(emp => {
      const { score, factors } = computeRiskScore(emp, now);
      const tenureYears = emp.hire_date
        ? Math.floor((now.getTime() - new Date(emp.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0;
      const riskLevel = score > 75 ? 'critical' : score > 55 ? 'high' : score > 35 ? 'medium' : 'low';
      return {
        id: emp.id,
        name: `${emp.first_name_en} ${emp.last_name_en}`,
        department: emp.department?.name_en || 'Unassigned',
        job_title: emp.job_title_en || '',
        risk_score: score,
        risk_level: riskLevel,
        factors,
        tenure_years: tenureYears,
        salary: emp.basic_salary || 0,
      };
    }).sort((a, b) => b.risk_score - a.risk_score);
  }, [employees, predictions]);

  const summaryStats = useMemo(() => {
    const critical = flightRiskData.filter(e => e.risk_level === 'critical').length;
    const high = flightRiskData.filter(e => e.risk_level === 'high').length;
    const medium = flightRiskData.filter(e => e.risk_level === 'medium').length;
    const low = flightRiskData.filter(e => e.risk_level === 'low').length;

    const deptRisk: Record<string, { scores: number[]; critical: number; high: number }> = {};
    flightRiskData.forEach(e => {
      if (!deptRisk[e.department]) deptRisk[e.department] = { scores: [], critical: 0, high: 0 };
      deptRisk[e.department].scores.push(e.risk_score);
      if (e.risk_level === 'critical') deptRisk[e.department].critical++;
      if (e.risk_level === 'high') deptRisk[e.department].high++;
    });

    const deptAvgRisk = Object.entries(deptRisk)
      .map(([dept, data]) => ({
        department: dept.length > 18 ? dept.slice(0, 18) + '...' : dept,
        avg_risk: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        count: data.scores.length,
        critical: data.critical,
        high: data.high,
      }))
      .sort((a, b) => b.avg_risk - a.avg_risk)
      .slice(0, 8);

    const atRiskSalary = flightRiskData
      .filter(e => e.risk_level === 'critical' || e.risk_level === 'high')
      .reduce((sum, e) => sum + e.salary, 0);
    const forecastCost = atRiskSalary * 0.5;

    const projectedHires = Math.max(1, Math.round(employees.length * 0.12));

    return {
      critical,
      high,
      medium,
      low,
      deptAvgRisk,
      totalAtRisk: critical + high,
      forecastCost,
      projectedHires,
      totalActive: employees.length,
    };
  }, [flightRiskData, employees]);

  const riskDistribution = [
    { level: 'Critical', count: summaryStats.critical, color: '#dc2626' },
    { level: 'High', count: summaryStats.high, color: '#f59e0b' },
    { level: 'Medium', count: summaryStats.medium, color: '#3b82f6' },
    { level: 'Low', count: summaryStats.low, color: '#22c55e' },
  ];

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />;
  }

  const isUsingStoredPredictions = predictions.length > 0;

  return (
    <div className="space-y-6">
      {!isUsingStoredPredictions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Predictive Risk Scoring Active</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Scores computed from tenure, compensation level, contract type, and role data. Store predictions in the
              <code className="bg-blue-100 px-1 rounded mx-1">turnover_predictions</code>table to use ML model outputs.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{summaryStats.totalAtRisk}</div>
              <div className="text-xs text-gray-500">At-Risk Employees</div>
            </div>
          </div>
          <p className="text-xs text-gray-400">Critical: {summaryStats.critical} | High: {summaryStats.high}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{(summaryStats.forecastCost / 1000).toFixed(0)}K</div>
              <div className="text-xs text-gray-500">Potential Turnover Cost (SAR)</div>
            </div>
          </div>
          <p className="text-xs text-gray-400">50% of at-risk employees' salary</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{summaryStats.projectedHires}</div>
              <div className="text-xs text-gray-500">Projected Hires (12mo)</div>
            </div>
          </div>
          <p className="text-xs text-gray-400">~12% annual attrition estimate</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {summaryStats.totalActive > 0
                  ? (((summaryStats.low + summaryStats.medium) / summaryStats.totalActive) * 100).toFixed(0)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500">Stable Workforce</div>
            </div>
          </div>
          <p className="text-xs text-gray-400">Low + Medium risk employees</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Risk Distribution</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="level" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={44}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Department Risk Heatmap</h4>
          {summaryStats.deptAvgRisk.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-gray-400">No department data</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryStats.deptAvgRisk} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="department" width={130} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(val: number, _: string, props: any) => [
                      `Avg: ${val} | Critical: ${props.payload.critical}`,
                      'Risk'
                    ]}
                  />
                  <Bar dataKey="avg_risk" radius={[0, 4, 4, 0]} barSize={14}>
                    {summaryStats.deptAvgRisk.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.avg_risk > 70 ? '#dc2626' : entry.avg_risk > 50 ? '#f59e0b' : entry.avg_risk > 30 ? '#3b82f6' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900">Flight Risk Employees</h4>
          <span className="text-xs text-gray-400">Showing top 20 by risk score</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk Score</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contributing Factors</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {flightRiskData.slice(0, 20).map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                    <div className="text-xs text-gray-500">{emp.job_title}</div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{emp.department}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${emp.risk_score}%`,
                            backgroundColor: RISK_COLORS[emp.risk_level] || '#6b7280',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{emp.risk_score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      emp.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                      emp.risk_level === 'high' ? 'bg-amber-100 text-amber-800' :
                      emp.risk_level === 'medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {emp.risk_level}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {emp.factors.slice(0, 2).map(f => (
                        <span key={f} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{emp.tenure_years}y</td>
                </tr>
              ))}
            </tbody>
          </table>
          {flightRiskData.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">No employee data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
