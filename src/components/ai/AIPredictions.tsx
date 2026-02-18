import { useState, useEffect } from 'react';
import {
  Activity, RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
  Users, Brain, Loader2, BarChart3, Target, Zap, ArrowUpRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface FlightRiskPrediction {
  employee_id: string;
  employee_name: string;
  department: string;
  job_title: string;
  risk_score: number;
  risk_level: string;
  contributing_factors: { factor: string; impact: number; description: string }[];
  confidence: number;
}

interface SkillsDemandItem {
  skill: string;
  current_demand: number;
  projected_demand: number;
  growth_rate: number;
  category: string;
}

type PredictionView = 'flight_risk' | 'performance' | 'skills_demand';

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981',
};

export function AIPredictions() {
  const [activeView, setActiveView] = useState<PredictionView>('flight_risk');
  const [flightRiskData, setFlightRiskData] = useState<FlightRiskPrediction[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [skillsDemand, setSkillsDemand] = useState<SkillsDemandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [storedPredictions, setStoredPredictions] = useState<any[]>([]);

  const { currentCompany } = useCompany();
  const { showToast } = useToast();

  useEffect(() => {
    if (currentCompany?.id) loadStoredPredictions();
  }, [currentCompany]);

  async function loadStoredPredictions() {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(200);
      setStoredPredictions(data || []);

      const flightRisks = (data || [])
        .filter(p => p.prediction_type === 'flight_risk')
        .map(p => ({
          employee_id: p.target_entity_id,
          employee_name: p.target_entity_name || 'Unknown',
          department: '',
          job_title: '',
          risk_score: p.predicted_value,
          risk_level: p.predicted_value >= 75 ? 'critical' : p.predicted_value >= 50 ? 'high' : p.predicted_value >= 25 ? 'medium' : 'low',
          contributing_factors: p.contributing_factors || [],
          confidence: p.confidence_score,
        }));
      if (flightRisks.length > 0) setFlightRiskData(flightRisks);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function generatePredictions(type: string) {
    if (!currentCompany?.id) return;
    setGenerating(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-hr-assistant`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_predictions',
          company_id: currentCompany.id,
          payload: { prediction_type: type },
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (type === 'flight_risk') {
        setFlightRiskData(data.predictions || []);
        showToast(`Generated ${data.count} flight risk predictions`, 'success');
      } else if (type === 'performance') {
        setPerformanceData(data.predictions || []);
        showToast(`Generated ${data.count} performance predictions`, 'success');
      } else if (type === 'skills_demand') {
        setSkillsDemand(data.forecast || []);
        showToast('Skills demand forecast generated', 'success');
      }

      loadStoredPredictions();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  function getRiskDistribution() {
    const dist = { critical: 0, high: 0, medium: 0, low: 0 };
    flightRiskData.forEach(p => { dist[p.risk_level as keyof typeof dist]++; });
    return Object.entries(dist).map(([level, count]) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: count,
      color: RISK_COLORS[level],
    }));
  }

  function getDeptRiskData() {
    const byDept: Record<string, { total: number; sum: number }> = {};
    flightRiskData.forEach(p => {
      const dept = p.department || 'Unknown';
      if (!byDept[dept]) byDept[dept] = { total: 0, sum: 0 };
      byDept[dept].total++;
      byDept[dept].sum += p.risk_score;
    });
    return Object.entries(byDept)
      .map(([dept, v]) => ({ department: dept, avg_risk: Math.round(v.sum / v.total), employees: v.total }))
      .sort((a, b) => b.avg_risk - a.avg_risk)
      .slice(0, 10);
  }

  const views = [
    { id: 'flight_risk' as const, label: 'Flight Risk', icon: AlertTriangle },
    { id: 'performance' as const, label: 'Performance', icon: TrendingUp },
    { id: 'skills_demand' as const, label: 'Skills Demand', icon: Brain },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Predictive Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">AI-powered forecasting for workforce planning</p>
        </div>
        <button
          onClick={() => generatePredictions(activeView)}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Generate {views.find(v => v.id === activeView)?.label}
        </button>
      </div>

      <div className="flex gap-2">
        {views.map(view => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === view.id
                  ? 'bg-slate-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {activeView === 'flight_risk' && (
            <div className="space-y-6">
              {flightRiskData.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-gray-600 font-medium mb-1">No flight risk data</h3>
                  <p className="text-sm text-gray-400 mb-4">Generate predictions to identify at-risk employees</p>
                  <button
                    onClick={() => generatePredictions('flight_risk')}
                    disabled={generating}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
                  >
                    Generate Flight Risk Analysis
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(RISK_COLORS).map(([level, color]) => {
                      const count = flightRiskData.filter(p => p.risk_level === level).length;
                      return (
                        <div key={level} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-sm text-gray-500 capitalize">{level} Risk</span>
                          </div>
                          <div className="text-2xl font-bold" style={{ color }}>{count}</div>
                          <div className="text-xs text-gray-400">
                            {flightRiskData.length > 0 ? `${Math.round((count / flightRiskData.length) * 100)}%` : '0%'} of workforce
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk Distribution</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={getRiskDistribution()} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                            {getRiskDistribution().map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {getDeptRiskData().length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk by Department</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={getDeptRiskData()} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis type="category" dataKey="department" width={120} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => [`${value}%`, 'Avg Risk']} />
                            <Bar dataKey="avg_risk" fill="#64748b" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">High-Risk Employees</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Top Factors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {flightRiskData
                            .sort((a, b) => b.risk_score - a.risk_score)
                            .slice(0, 20)
                            .map((pred, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{pred.employee_name}</td>
                                <td className="px-4 py-3 text-gray-600">{pred.department || '-'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-gray-100 rounded-full h-2">
                                      <div
                                        className="h-2 rounded-full transition-all"
                                        style={{
                                          width: `${pred.risk_score}%`,
                                          backgroundColor: RISK_COLORS[pred.risk_level],
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium">{Math.round(pred.risk_score)}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs px-2 py-1 rounded-full font-medium capitalize" style={{
                                    backgroundColor: RISK_COLORS[pred.risk_level] + '20',
                                    color: RISK_COLORS[pred.risk_level],
                                  }}>
                                    {pred.risk_level}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{Math.round(pred.confidence)}%</td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                  {pred.contributing_factors?.slice(0, 2).map(f => f.factor || f.description).join(', ') || '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeView === 'performance' && (
            <div className="space-y-6">
              {performanceData.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-gray-600 font-medium mb-1">No performance predictions</h3>
                  <p className="text-sm text-gray-400 mb-4">Generate predictions to forecast employee performance</p>
                  <button
                    onClick={() => generatePredictions('performance')}
                    disabled={generating}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
                  >
                    Generate Performance Predictions
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="text-sm text-gray-500 mb-1">Avg Predicted Rating</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {(performanceData.reduce((s, p) => s + p.predicted_rating, 0) / performanceData.length).toFixed(1)}/5.0
                      </div>
                    </div>
                    <div className="bg-white border border-emerald-200 rounded-xl p-4">
                      <div className="text-sm text-gray-500 mb-1">Improving Trend</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {performanceData.filter(p => p.trend === 'improving').length}
                      </div>
                    </div>
                    <div className="bg-white border border-red-200 rounded-xl p-4">
                      <div className="text-sm text-gray-500 mb-1">Declining Trend</div>
                      <div className="text-2xl font-bold text-red-600">
                        {performanceData.filter(p => p.trend === 'declining').length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Performance Forecast</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Predicted Rating</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {performanceData.slice(0, 20).map((pred, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{pred.employee_name}</td>
                              <td className="px-4 py-3 text-gray-600">{pred.department || '-'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <div
                                        key={star}
                                        className={`w-4 h-4 rounded-sm ${star <= Math.round(pred.predicted_rating) ? 'bg-amber-400' : 'bg-gray-200'}`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-medium">{pred.predicted_rating}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                                  pred.trend === 'improving' ? 'bg-emerald-100 text-emerald-700' :
                                  pred.trend === 'declining' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {pred.trend === 'improving' ? <TrendingUp className="w-3 h-3" /> :
                                   pred.trend === 'declining' ? <TrendingDown className="w-3 h-3" /> :
                                   <Activity className="w-3 h-3" />}
                                  {pred.trend}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{pred.confidence}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeView === 'skills_demand' && (
            <div className="space-y-6">
              {skillsDemand.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-gray-600 font-medium mb-1">No skills demand forecast</h3>
                  <p className="text-sm text-gray-400 mb-4">Generate forecast to see in-demand skills</p>
                  <button
                    onClick={() => generatePredictions('skills_demand')}
                    disabled={generating}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
                  >
                    Generate Skills Forecast
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Skills Demand: Current vs. Projected</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={skillsDemand.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="skill" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="current_demand" fill="#94a3b8" name="Current Demand" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="projected_demand" fill="#0ea5e9" name="Projected (12mo)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Skills Demand Forecast</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Projected</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Growth Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {skillsDemand.map((skill, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{skill.skill}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{skill.category}</span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">{skill.current_demand}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">{skill.projected_demand}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex items-center gap-1 font-medium ${
                                  skill.growth_rate > 30 ? 'text-emerald-600' : skill.growth_rate > 15 ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                  <ArrowUpRight className="w-3 h-3" />
                                  {skill.growth_rate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
