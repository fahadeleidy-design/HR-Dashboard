import { useState, useEffect } from 'react';
import { Network, Briefcase, DollarSign, Users, TrendingUp, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useCompany } from '../contexts/CompanyContext';

interface Position {
  id: string;
  position_number: string;
  position_title: string;
  department: string;
  status: string;
  fte: number;
  min_salary: number;
  mid_salary: number;
  max_salary: number;
  current_incumbent: {
    first_name: string;
    last_name: string;
  } | null;
}

interface PositionBudget {
  id: string;
  position: {
    position_title: string;
    position_number: string;
  };
  budget_year: number;
  budgeted_salary: number;
  total_budgeted_cost: number;
  actual_salary: number;
  total_actual_cost: number;
  variance: number;
}

export default function OrganizationalManagement() {
  const [activeTab, setActiveTab] = useState<'org-chart' | 'positions' | 'budgeting' | 'planning'>('org-chart');
  const [positions, setPositions] = useState<Position[]>([]);
  const [budgets, setBudgets] = useState<PositionBudget[]>([]);
  const [stats, setStats] = useState({
    total_positions: 0,
    active_positions: 0,
    budgeted_positions: 0,
    vacant_positions: 0,
    total_budget: 0,
    actual_cost: 0,
  });
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany?.id) {
      loadOrgData();
    }
  }, [currentCompany]);

  async function loadOrgData() {
    try {
      setLoading(true);

      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select(`
          *,
          current_incumbent:employees(first_name, last_name)
        `)
        .eq('company_id', currentCompany!.id)
        .order('position_number');

      if (positionsError) throw positionsError;
      setPositions(positionsData || []);

      const currentYear = new Date().getFullYear();
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('position_budgets')
        .select(`
          *,
          position:positions(position_title, position_number)
        `)
        .eq('company_id', currentCompany!.id)
        .eq('budget_year', currentYear);

      if (budgetsError) throw budgetsError;
      setBudgets(budgetsData || []);

      const activeCount = (positionsData || []).filter(p => p.status === 'active').length;
      const budgetedCount = (positionsData || []).filter(p => p.status === 'budgeted').length;
      const vacantCount = (positionsData || []).filter(p => p.status === 'active' && !p.current_incumbent).length;
      const totalBudget = (budgetsData || []).reduce((sum, b) => sum + (b.total_budgeted_cost || 0), 0);
      const actualCost = (budgetsData || []).reduce((sum, b) => sum + (b.total_actual_cost || 0), 0);

      setStats({
        total_positions: positionsData?.length || 0,
        active_positions: activeCount,
        budgeted_positions: budgetedCount,
        vacant_positions: vacantCount,
        total_budget: totalBudget,
        actual_cost: actualCost,
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'budgeted': return 'bg-blue-100 text-blue-800';
      case 'proposed': return 'bg-amber-100 text-amber-800';
      case 'frozen': return 'bg-gray-100 text-gray-800';
      case 'eliminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading organizational data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-600 to-slate-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Network className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Organizational Management</h1>
        </div>
        <p className="text-slate-100">
          Visual org chart, position management, and workforce planning
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Positions</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_positions}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active_positions}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Budgeted</div>
          <div className="text-2xl font-bold text-blue-600">{stats.budgeted_positions}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Vacant</div>
          <div className="text-2xl font-bold text-amber-600">{stats.vacant_positions}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Budget</div>
          <div className="text-2xl font-bold text-gray-900">{(stats.total_budget / 1000000).toFixed(1)}M</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Actual Cost</div>
          <div className="text-2xl font-bold text-gray-900">{(stats.actual_cost / 1000000).toFixed(1)}M</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'org-chart' as const, label: 'Org Chart', icon: Network },
              { id: 'positions' as const, label: 'Position Management', icon: Briefcase },
              { id: 'budgeting' as const, label: 'Position Budgeting', icon: DollarSign },
              { id: 'planning' as const, label: 'Workforce Planning', icon: TrendingUp },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-slate-600 text-slate-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'org-chart' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Visual Organization Chart</h3>
                <button className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
                  Export Chart
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-8">
                <div className="text-center">
                  <div className="inline-block bg-white border-2 border-slate-600 rounded-lg p-4 mb-8">
                    <div className="font-semibold text-gray-900">CEO</div>
                    <div className="text-sm text-gray-600">Executive Office</div>
                  </div>

                  <div className="flex justify-center gap-8">
                    {['CFO', 'COO', 'CTO', 'CHRO'].map(title => (
                      <div key={title} className="inline-block bg-white border border-slate-400 rounded-lg p-3">
                        <div className="font-semibold text-gray-900">{title}</div>
                        <div className="text-xs text-gray-600">Department Head</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                  Interactive org chart visualization with drill-down capabilities
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Span of Control</h4>
                  <div className="text-3xl font-bold text-slate-600">5.2</div>
                  <p className="text-sm text-gray-600 mt-1">Avg direct reports per manager</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Organization Levels</h4>
                  <div className="text-3xl font-bold text-slate-600">7</div>
                  <p className="text-sm text-gray-600 mt-1">Hierarchical levels</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Departments</h4>
                  <div className="text-3xl font-bold text-slate-600">12</div>
                  <p className="text-sm text-gray-600 mt-1">Functional units</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Position Management</h3>
                <button className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Position
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incumbent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary Range</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FTE</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {positions.map(position => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{position.position_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{position.position_title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{position.department}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {position.current_incumbent ? (
                            `${position.current_incumbent.first_name} ${position.current_incumbent.last_name}`
                          ) : (
                            <span className="text-amber-600">Vacant</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {position.min_salary?.toLocaleString()} - {position.max_salary?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{position.fte}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(position.status)}`}>
                            {position.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'budgeting' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Position Budgeting - {new Date().getFullYear()}</h3>
                <button className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
                  Export Budget Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Budget</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.total_budget.toLocaleString()} SAR
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Actual Spend</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.actual_cost.toLocaleString()} SAR
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Variance</div>
                  <div className="text-2xl font-bold text-amber-600">
                    {(stats.total_budget - stats.actual_cost).toLocaleString()} SAR
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Budget Utilization</div>
                  <div className="text-2xl font-bold text-slate-600">
                    {((stats.actual_cost / stats.total_budget) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position #</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budgeted</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {budgets.map(budget => {
                      const percentUsed = (budget.total_actual_cost / budget.total_budgeted_cost) * 100;
                      return (
                        <tr key={budget.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{budget.position?.position_title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{budget.position?.position_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {budget.total_budgeted_cost.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {budget.total_actual_cost.toLocaleString()}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${
                            (budget.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {budget.variance?.toLocaleString() || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {percentUsed.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Workforce Planning</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Headcount Forecast</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Headcount</span>
                      <span className="font-semibold">{stats.total_positions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Q1 Forecast</span>
                      <span className="font-semibold text-blue-600">+12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Q2 Forecast</span>
                      <span className="font-semibold text-blue-600">+8</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Year-End Target</span>
                      <span className="font-semibold text-green-600">{stats.total_positions + 32}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-4">Scenario Planning</h4>
                  <div className="space-y-3">
                    <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="font-medium text-gray-900">Growth Scenario</div>
                      <div className="text-sm text-gray-600">+20% headcount expansion</div>
                    </button>
                    <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="font-medium text-gray-900">Restructuring</div>
                      <div className="text-sm text-gray-600">Department reorganization</div>
                    </button>
                    <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="font-medium text-gray-900">Cost Reduction</div>
                      <div className="text-sm text-gray-600">10% budget optimization</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
