import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Download, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface PositionBudget {
  id: string;
  position_id: string;
  budget_year: number;
  budgeted_salary: number;
  budgeted_benefits: number | null;
  budgeted_bonus: number | null;
  total_budgeted_cost: number;
  actual_salary: number;
  actual_benefits: number | null;
  actual_bonus: number | null;
  total_actual_cost: number;
  variance: number | null;
  position: {
    position_title: string;
    position_number: string;
    department: string;
    status: string;
    fte: number;
  } | null;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export function PositionBudgeting() {
  const { currentCompany } = useCompany();
  const [budgets, setBudgets] = useState<PositionBudget[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany, selectedYear]);

  async function loadData() {
    try {
      setLoading(true);
      const [budgetRes, posRes] = await Promise.all([
        supabase
          .from('position_budgets')
          .select('*, position:positions(position_title, position_number, department, status, fte)')
          .eq('company_id', currentCompany!.id)
          .eq('budget_year', selectedYear),
        supabase
          .from('positions')
          .select('id, position_title, position_number, department, status, fte, min_salary, max_salary')
          .eq('company_id', currentCompany!.id),
      ]);
      setBudgets(budgetRes.data || []);
      setPositions(posRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const totalBudget = budgets.reduce((s, b) => s + (b.total_budgeted_cost || 0), 0);
    const totalActual = budgets.reduce((s, b) => s + (b.total_actual_cost || 0), 0);
    const totalVariance = totalBudget - totalActual;
    const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    const overBudget = budgets.filter(b => (b.total_actual_cost || 0) > (b.total_budgeted_cost || 0)).length;

    const totalFTE = positions.filter(p => p.status === 'active').reduce((s, p) => s + (p.fte || 0), 0);
    const budgetedFTE = budgets.reduce((s, b) => s + (b.position?.fte || 0), 0);
    const costPerFTE = budgetedFTE > 0 ? totalBudget / budgetedFTE : 0;

    const deptBudgets: Record<string, { budget: number; actual: number }> = {};
    budgets.forEach(b => {
      const dept = b.position?.department || 'Unassigned';
      if (!deptBudgets[dept]) deptBudgets[dept] = { budget: 0, actual: 0 };
      deptBudgets[dept].budget += b.total_budgeted_cost || 0;
      deptBudgets[dept].actual += b.total_actual_cost || 0;
    });

    const deptChartData = Object.entries(deptBudgets)
      .map(([dept, data]) => ({
        department: dept.length > 15 ? dept.slice(0, 15) + '...' : dept,
        budget: Math.round(data.budget / 1000),
        actual: Math.round(data.actual / 1000),
      }))
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 8);

    const statusDist = [
      { name: 'Active', value: positions.filter(p => p.status === 'active').length },
      { name: 'Budgeted', value: positions.filter(p => p.status === 'budgeted').length },
      { name: 'Proposed', value: positions.filter(p => p.status === 'proposed').length },
      { name: 'Frozen', value: positions.filter(p => p.status === 'frozen').length },
    ].filter(s => s.value > 0);

    return {
      totalBudget,
      totalActual,
      totalVariance,
      utilization,
      overBudget,
      totalFTE,
      budgetedFTE,
      costPerFTE,
      deptChartData,
      statusDist,
    };
  }, [budgets, positions]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Position Budgeting</h4>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {[0, 1, -1, -2].map(offset => {
            const yr = new Date().getFullYear() + offset;
            return <option key={yr} value={yr}>FY {yr}</option>;
          })}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
          <div className="text-xs text-gray-500">Total Budget</div>
          <div className="text-xl font-bold text-blue-600">{(stats.totalBudget / 1000000).toFixed(2)}M</div>
          <div className="text-[10px] text-gray-400">SAR</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-3">
          <div className="text-xs text-gray-500">Actual Spend</div>
          <div className="text-xl font-bold text-green-600">{(stats.totalActual / 1000000).toFixed(2)}M</div>
          <div className="text-[10px] text-gray-400">SAR</div>
        </div>
        <div className={`${stats.totalVariance >= 0 ? 'bg-teal-50 border-teal-200' : 'bg-red-50 border-red-200'} rounded-lg border p-3`}>
          <div className="text-xs text-gray-500">Variance</div>
          <div className={`text-xl font-bold ${stats.totalVariance >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
            {stats.totalVariance >= 0 ? '+' : ''}{(stats.totalVariance / 1000000).toFixed(2)}M
          </div>
          <div className="text-[10px] text-gray-400">SAR</div>
        </div>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
          <div className="text-xs text-gray-500">Utilization</div>
          <div className="text-xl font-bold text-amber-600">{stats.utilization.toFixed(1)}%</div>
          <div className="text-[10px] text-gray-400">of budget used</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Total FTE</div>
          <div className="text-xl font-bold text-gray-900">{stats.totalFTE.toFixed(1)}</div>
          <div className="text-[10px] text-gray-400">active positions</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Cost/FTE</div>
          <div className="text-xl font-bold text-gray-900">{(stats.costPerFTE / 1000).toFixed(0)}K</div>
          <div className="text-[10px] text-gray-400">SAR per FTE</div>
        </div>
        <div className={`${stats.overBudget > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} rounded-lg border p-3`}>
          <div className="text-xs text-gray-500">Over Budget</div>
          <div className={`text-xl font-bold ${stats.overBudget > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.overBudget}</div>
          <div className="text-[10px] text-gray-400">positions</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h5 className="text-sm font-semibold text-gray-900 mb-4">Budget vs Actual by Department (K SAR)</h5>
          <div className="h-64">
            {stats.deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.deptChartData} layout="vertical">
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="department" width={120} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(val: number) => [`${val}K SAR`]} />
                  <Legend iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                  <Bar dataKey="budget" fill="#0ea5e9" barSize={10} name="Budget" />
                  <Bar dataKey="actual" fill="#10b981" barSize={10} name="Actual" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No budget data available for FY {selectedYear}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h5 className="text-sm font-semibold text-gray-900 mb-4">Position Status Distribution</h5>
          <div className="h-48">
            {stats.statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                    {stats.statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No position data</div>
            )}
          </div>
          <div className="space-y-1.5 mt-2">
            {stats.statusDist.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h5 className="text-sm font-semibold text-gray-900">Position Budget Details</h5>
          <span className="text-xs text-gray-400">{budgets.length} positions budgeted</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Position</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">FTE</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Budget</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actual</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Variance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                    No budgets found for FY {selectedYear}. Budget data will appear here when position budgets are created.
                  </td>
                </tr>
              ) : (
                budgets.map(b => {
                  const util = b.total_budgeted_cost > 0 ? (b.total_actual_cost / b.total_budgeted_cost) * 100 : 0;
                  const variance = (b.total_budgeted_cost || 0) - (b.total_actual_cost || 0);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{b.position?.position_title}</div>
                        <div className="text-xs text-gray-400 font-mono">{b.position?.position_number}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{b.position?.department}</td>
                      <td className="px-4 py-3 text-sm text-center">{b.position?.fte || 1}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {b.total_budgeted_cost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {b.total_actual_cost.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${util > 100 ? 'bg-red-500' : util > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(util, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{util.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
