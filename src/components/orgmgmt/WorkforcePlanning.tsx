import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, Plus, Users, DollarSign, AlertTriangle, Calendar, Target,
  ArrowUpRight, ArrowDownRight, X, Check, BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface WorkforcePlan {
  id: string;
  plan_name: string;
  fiscal_year: number;
  plan_type: string;
  status: string;
  current_headcount: number;
  target_headcount: number;
  q1_target: number;
  q2_target: number;
  q3_target: number;
  q4_target: number;
  total_budget: number;
  allocated_budget: number;
  description: string | null;
}

interface DemandForecast {
  id: string;
  department: string;
  job_family: string | null;
  current_count: number;
  demand_count: number;
  supply_count: number;
  gap: number;
  attrition_forecast: number;
  retirement_forecast: number;
  internal_mobility: number;
  external_hire_need: number;
  priority: string;
  estimated_cost: number;
}

interface Scenario {
  id: string;
  scenario_name: string;
  scenario_type: string;
  base_headcount: number;
  projected_headcount: number;
  cost_impact: number;
  status: string;
}

const PLAN_TYPE_COLORS: Record<string, string> = {
  growth: 'bg-green-100 text-green-800',
  restructuring: 'bg-amber-100 text-amber-800',
  downsizing: 'bg-red-100 text-red-800',
  maintenance: 'bg-blue-100 text-blue-800',
};

export function WorkforcePlanning() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [plans, setPlans] = useState<WorkforcePlan[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'demand' | 'scenarios' | 'demographics'>('overview');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showForecastForm, setShowForecastForm] = useState(false);

  const [planForm, setPlanForm] = useState({
    plan_name: '',
    fiscal_year: new Date().getFullYear(),
    plan_type: 'growth',
    description: '',
    current_headcount: 0,
    target_headcount: 0,
    q1_target: 0,
    q2_target: 0,
    q3_target: 0,
    q4_target: 0,
    total_budget: 0,
  });

  const [forecastForm, setForecastForm] = useState({
    department: '',
    job_family: '',
    current_count: 0,
    demand_count: 0,
    attrition_forecast: 0,
    retirement_forecast: 0,
    internal_mobility: 0,
    priority: 'medium',
    estimated_cost: 0,
  });

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const [planRes, forecastRes, scenarioRes, empRes] = await Promise.all([
        supabase.from('workforce_plans').select('*').eq('company_id', currentCompany!.id).order('fiscal_year', { ascending: false }),
        supabase.from('workforce_demand_forecasts').select('*').eq('company_id', currentCompany!.id),
        supabase.from('workforce_scenarios').select('*').eq('company_id', currentCompany!.id),
        supabase.from('employees').select('id, hire_date, status, gender, nationality, basic_salary, department:departments!employees_department_id_fkey(name_en)').eq('company_id', currentCompany!.id).eq('status', 'active'),
      ]);
      setPlans(planRes.data || []);
      setForecasts(forecastRes.data || []);
      setScenarios(scenarioRes.data || []);
      setEmployees(empRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  const demographics = useMemo(() => {
    const now = new Date();
    const tenureBuckets: Record<string, number> = { '<1yr': 0, '1-3yr': 0, '3-5yr': 0, '5-10yr': 0, '10+yr': 0 };

    employees.forEach(e => {
      const hireDate = new Date(e.hire_date);
      const years = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (years < 1) tenureBuckets['<1yr']++;
      else if (years < 3) tenureBuckets['1-3yr']++;
      else if (years < 5) tenureBuckets['3-5yr']++;
      else if (years < 10) tenureBuckets['5-10yr']++;
      else tenureBuckets['10+yr']++;
    });

    const tenureData = Object.entries(tenureBuckets).map(([range, count]) => ({ range, count }));

    const deptCounts: Record<string, number> = {};
    employees.forEach(e => {
      const dept = e.department?.name_en || 'Unassigned';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const deptData = Object.entries(deptCounts)
      .map(([dept, count]) => ({ department: dept.length > 18 ? dept.slice(0, 18) + '...' : dept, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const retirementRisk = employees.filter(e => {
      const years = (now.getTime() - new Date(e.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return years > 25;
    }).length;

    const totalSalary = employees.reduce((s, e) => s + (e.basic_salary || 0), 0);

    return { tenureData, deptData, retirementRisk, totalSalary, totalEmployees: employees.length };
  }, [employees]);

  const gapData = useMemo(() => {
    if (forecasts.length > 0) {
      return forecasts.map(f => ({
        department: f.department.length > 15 ? f.department.slice(0, 15) + '...' : f.department,
        demand: f.demand_count,
        supply: f.supply_count || f.current_count,
        gap: f.gap,
      }));
    }

    const deptCounts: Record<string, number> = {};
    employees.forEach(e => {
      const dept = e.department?.name_en || 'Unassigned';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    return Object.entries(deptCounts).slice(0, 8).map(([dept, count]) => ({
      department: dept.length > 15 ? dept.slice(0, 15) + '...' : dept,
      demand: Math.round(count * 1.15),
      supply: count,
      gap: Math.round(count * 0.15),
    }));
  }, [forecasts, employees]);

  const quarterlyData = useMemo(() => {
    const activePlan = plans.find(p => p.status === 'active') || plans[0];
    if (activePlan) {
      return [
        { quarter: 'Current', headcount: activePlan.current_headcount },
        { quarter: 'Q1', headcount: activePlan.q1_target || activePlan.current_headcount },
        { quarter: 'Q2', headcount: activePlan.q2_target || activePlan.current_headcount },
        { quarter: 'Q3', headcount: activePlan.q3_target || activePlan.current_headcount },
        { quarter: 'Q4', headcount: activePlan.q4_target || activePlan.target_headcount },
      ];
    }
    const base = employees.length;
    return [
      { quarter: 'Current', headcount: base },
      { quarter: 'Q1', headcount: Math.round(base * 1.03) },
      { quarter: 'Q2', headcount: Math.round(base * 1.06) },
      { quarter: 'Q3', headcount: Math.round(base * 1.09) },
      { quarter: 'Q4', headcount: Math.round(base * 1.12) },
    ];
  }, [plans, employees]);

  async function savePlan() {
    try {
      const { error } = await supabase.from('workforce_plans').insert({
        company_id: currentCompany!.id,
        ...planForm,
        allocated_budget: 0,
        created_by: user?.id,
      });
      if (error) throw error;
      showToast('Workforce plan created', 'success');
      setShowPlanForm(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  async function saveForecast() {
    try {
      const gap = forecastForm.demand_count - forecastForm.current_count;
      const extHire = Math.max(0, gap + forecastForm.attrition_forecast + forecastForm.retirement_forecast - forecastForm.internal_mobility);
      const { error } = await supabase.from('workforce_demand_forecasts').insert({
        company_id: currentCompany!.id,
        forecast_year: new Date().getFullYear(),
        supply_count: forecastForm.current_count,
        gap,
        external_hire_need: extHire,
        ...forecastForm,
      });
      if (error) throw error;
      showToast('Demand forecast created', 'success');
      setShowForecastForm(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: 'overview' as const, label: 'Planning Overview' },
          { id: 'demand' as const, label: 'Demand & Supply' },
          { id: 'scenarios' as const, label: 'Scenarios' },
          { id: 'demographics' as const, label: 'Demographics' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              activeView === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {activeView === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Workforce Plans</h4>
            <button onClick={() => { setPlanForm({ plan_name: '', fiscal_year: new Date().getFullYear(), plan_type: 'growth', description: '', current_headcount: employees.length, target_headcount: employees.length, q1_target: 0, q2_target: 0, q3_target: 0, q4_target: 0, total_budget: 0 }); setShowPlanForm(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-medium hover:bg-slate-800">
              <Plus className="w-3.5 h-3.5" />
              New Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="text-xs text-gray-500">Current Headcount</div>
              <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="text-xs text-gray-500">Year-End Target</div>
              <div className="text-2xl font-bold text-green-600">{quarterlyData[quarterlyData.length - 1]?.headcount || 0}</div>
            </div>
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <div className="text-xs text-gray-500">Net Growth</div>
              <div className="text-2xl font-bold text-amber-600">+{(quarterlyData[quarterlyData.length - 1]?.headcount || 0) - employees.length}</div>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-gray-500">Active Plans</div>
              <div className="text-2xl font-bold text-slate-600">{plans.filter(p => p.status === 'active').length}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h5 className="text-sm font-semibold text-gray-900 mb-4">Quarterly Headcount Forecast</h5>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quarterlyData}>
                  <XAxis dataKey="quarter" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Line type="monotone" dataKey="headcount" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 5, fill: '#0ea5e9' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {plans.length > 0 && (
            <div className="space-y-2">
              {plans.map(plan => (
                <div key={plan.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-semibold text-gray-900">{plan.plan_name}</h5>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${PLAN_TYPE_COLORS[plan.plan_type] || 'bg-gray-100 text-gray-800'}`}>
                          {plan.plan_type}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${plan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {plan.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">FY{plan.fiscal_year} | {plan.current_headcount} &rarr; {plan.target_headcount} headcount</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{plan.total_budget > 0 ? `${(plan.total_budget / 1000000).toFixed(1)}M SAR` : '-'}</div>
                      <div className="text-xs text-gray-400">Total Budget</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'demand' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Demand vs Supply Analysis</h4>
            <button onClick={() => setShowForecastForm(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-medium hover:bg-slate-800">
              <Plus className="w-3.5 h-3.5" />
              Add Forecast
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h5 className="text-sm font-semibold text-gray-900 mb-4">Skills Gap by Department</h5>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapData} layout="vertical">
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="department" width={120} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                  <Bar dataKey="supply" fill="#0ea5e9" barSize={12} name="Current Supply" />
                  <Bar dataKey="demand" fill="#f59e0b" barSize={12} name="Projected Demand" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {forecasts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Current</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Demand</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Gap</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Attrition</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Retirements</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Ext. Hires</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {forecasts.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{f.department}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{f.current_count}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{f.demand_count}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={f.gap > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {f.gap > 0 ? `+${f.gap}` : f.gap}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{f.attrition_forecast}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{f.retirement_forecast}</td>
                      <td className="px-4 py-3 text-sm text-center font-medium text-blue-600">{f.external_hire_need}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          f.priority === 'high' ? 'bg-red-100 text-red-800' :
                          f.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {f.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === 'scenarios' && (
        <div className="space-y-6">
          <h4 className="text-sm font-semibold text-gray-900">Workforce Scenarios</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'Growth', icon: ArrowUpRight, color: 'green', desc: '+20% headcount expansion', impact: `+${Math.round(employees.length * 0.2)} employees`, cost: `+${((employees.length * 0.2 * 8000) / 1000000).toFixed(1)}M SAR` },
              { type: 'Restructuring', icon: BarChart3, color: 'amber', desc: 'Department reorganization', impact: 'Optimize structure', cost: `${(employees.length * 500 / 1000000).toFixed(1)}M SAR transition` },
              { type: 'Cost Reduction', icon: ArrowDownRight, color: 'red', desc: '10% budget optimization', impact: `-${Math.round(employees.length * 0.1)} positions`, cost: `-${((employees.length * 0.1 * 8000) / 1000000).toFixed(1)}M SAR savings` },
            ].map(scenario => {
              const Icon = scenario.icon;
              return (
                <div key={scenario.type} className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-${scenario.color}-50 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${scenario.color}-600`} />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900">{scenario.type}</h5>
                      <p className="text-xs text-gray-500">{scenario.desc}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Impact:</span>
                      <span className="font-medium text-gray-900">{scenario.impact}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Cost:</span>
                      <span className="font-medium text-gray-900">{scenario.cost}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {scenarios.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scenario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Base HC</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Projected HC</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Cost Impact</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scenarios.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.scenario_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.scenario_type}</td>
                      <td className="px-4 py-3 text-sm text-center">{s.base_headcount}</td>
                      <td className="px-4 py-3 text-sm text-center font-medium">{s.projected_headcount}</td>
                      <td className="px-4 py-3 text-sm text-right">{s.cost_impact?.toLocaleString()} SAR</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${s.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === 'demographics' && (
        <div className="space-y-6">
          <h4 className="text-sm font-semibold text-gray-900">Workforce Demographics Analysis</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Total Active Workforce</div>
              <div className="text-2xl font-bold text-gray-900">{demographics.totalEmployees}</div>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <div className="text-xs text-gray-500">Retirement Risk (25+ yrs)</div>
              <div className="text-2xl font-bold text-red-600">{demographics.retirementRisk}</div>
            </div>
            <div className="bg-teal-50 rounded-lg border border-teal-200 p-4">
              <div className="text-xs text-gray-500">Workforce Cost (monthly)</div>
              <div className="text-2xl font-bold text-teal-600">{(demographics.totalSalary / 1000000).toFixed(2)}M</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h5 className="text-sm font-semibold text-gray-900 mb-4">Tenure Distribution</h5>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demographics.tenureData}>
                    <XAxis dataKey="range" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h5 className="text-sm font-semibold text-gray-900 mb-4">Department Headcount</h5>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demographics.deptData} layout="vertical">
                    <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="department" width={130} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPlanForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Create Workforce Plan</h3>
              <button onClick={() => setShowPlanForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Plan Name</label>
                <input type="text" value={planForm.plan_name} onChange={e => setPlanForm(f => ({ ...f, plan_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. FY2026 Growth Plan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fiscal Year</label>
                  <input type="number" value={planForm.fiscal_year} onChange={e => setPlanForm(f => ({ ...f, fiscal_year: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Plan Type</label>
                  <select value={planForm.plan_type} onChange={e => setPlanForm(f => ({ ...f, plan_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="growth">Growth</option>
                    <option value="restructuring">Restructuring</option>
                    <option value="downsizing">Downsizing</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Headcount</label>
                  <input type="number" value={planForm.current_headcount} onChange={e => setPlanForm(f => ({ ...f, current_headcount: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Headcount</label>
                  <input type="number" value={planForm.target_headcount} onChange={e => setPlanForm(f => ({ ...f, target_headcount: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {(['q1_target', 'q2_target', 'q3_target', 'q4_target'] as const).map(q => (
                  <div key={q}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{q.replace('_target', '').toUpperCase()}</label>
                    <input type="number" value={planForm[q]} onChange={e => setPlanForm(f => ({ ...f, [q]: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Total Budget (SAR)</label>
                <input type="number" value={planForm.total_budget} onChange={e => setPlanForm(f => ({ ...f, total_budget: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowPlanForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={savePlan} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 flex items-center gap-2">
                <Check className="w-4 h-4" /> Create Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {showForecastForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Add Demand Forecast</h3>
              <button onClick={() => setShowForecastForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <input type="text" value={forecastForm.department} onChange={e => setForecastForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Family</label>
                  <input type="text" value={forecastForm.job_family} onChange={e => setForecastForm(f => ({ ...f, job_family: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Count</label>
                  <input type="number" value={forecastForm.current_count} onChange={e => setForecastForm(f => ({ ...f, current_count: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Demand Count</label>
                  <input type="number" value={forecastForm.demand_count} onChange={e => setForecastForm(f => ({ ...f, demand_count: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Attrition Forecast</label>
                  <input type="number" value={forecastForm.attrition_forecast} onChange={e => setForecastForm(f => ({ ...f, attrition_forecast: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Retirements</label>
                  <input type="number" value={forecastForm.retirement_forecast} onChange={e => setForecastForm(f => ({ ...f, retirement_forecast: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Internal Mobility</label>
                  <input type="number" value={forecastForm.internal_mobility} onChange={e => setForecastForm(f => ({ ...f, internal_mobility: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select value={forecastForm.priority} onChange={e => setForecastForm(f => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Cost (SAR)</label>
                  <input type="number" value={forecastForm.estimated_cost} onChange={e => setForecastForm(f => ({ ...f, estimated_cost: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowForecastForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={saveForecast} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 flex items-center gap-2">
                <Check className="w-4 h-4" /> Add Forecast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
