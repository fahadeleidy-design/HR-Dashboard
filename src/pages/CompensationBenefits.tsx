import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Gift, Award, PieChart, FileText, Users, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useCompany } from '../contexts/CompanyContext';

interface CompPlan {
  id: string;
  plan_name: string;
  plan_year: number;
  budget_total: number;
  budget_allocated: number;
  budget_remaining: number;
  planning_status: string;
}

interface BonusPlan {
  id: string;
  plan_name: string;
  bonus_type: string;
  plan_year: number;
  total_budget: number;
  allocated_amount: number;
  is_active: boolean;
}

export default function CompensationBenefits() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planning' | 'benefits' | 'equity' | 'rewards'>('dashboard');
  const [compPlans, setCompPlans] = useState<CompPlan[]>([]);
  const [bonusPlans, setBonusPlans] = useState<BonusPlan[]>([]);
  const [stats, setStats] = useState({
    total_compensation_budget: 0,
    allocated_budget: 0,
    pending_changes: 0,
    avg_salary: 0,
    benefits_enrollment: 0,
    equity_grants: 0,
  });
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany?.id) {
      loadCompensationData();
    }
  }, [currentCompany]);

  async function loadCompensationData() {
    try {
      setLoading(true);

      const { data: plansData, error: plansError } = await supabase
        .from('compensation_plans_v2')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('plan_year', { ascending: false });

      if (plansError) throw plansError;
      setCompPlans(plansData || []);

      const { data: bonusData, error: bonusError } = await supabase
        .from('bonus_plans_v2')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('plan_year', { ascending: false });

      if (bonusError) throw bonusError;
      setBonusPlans(bonusData || []);

      const totalBudget = (plansData || []).reduce((sum, p) => sum + (p.budget_total || 0), 0);
      const allocated = (plansData || []).reduce((sum, p) => sum + (p.budget_allocated || 0), 0);

      setStats({
        total_compensation_budget: totalBudget,
        allocated_budget: allocated,
        pending_changes: 0,
        avg_salary: 12500,
        benefits_enrollment: 85,
        equity_grants: 24,
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading compensation data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Compensation & Benefits</h1>
        </div>
        <p className="text-green-100">
          Complete compensation planning, benefits administration, and total rewards management
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: TrendingUp },
              { id: 'planning' as const, label: 'Comp Planning', icon: Target },
              { id: 'benefits' as const, label: 'Benefits', icon: Gift },
              { id: 'equity' as const, label: 'Equity', icon: Award },
              { id: 'rewards' as const, label: 'Total Rewards', icon: FileText },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-green-600 text-green-600'
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
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-2">
                  <div className="text-sm text-gray-600 mb-1">Total Comp Budget</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.total_compensation_budget.toLocaleString()} SAR
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-2">
                  <div className="text-sm text-gray-600 mb-1">Allocated Budget</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.allocated_budget.toLocaleString()} SAR
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Pending Changes</div>
                  <div className="text-2xl font-bold text-amber-600">{stats.pending_changes}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Avg Salary</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.avg_salary.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Compensation Plans</h3>
                  <div className="space-y-3">
                    {compPlans.map(plan => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{plan.plan_name}</h4>
                            <p className="text-sm text-gray-600">Year {plan.plan_year}</p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 capitalize">
                            {plan.planning_status}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Budget</span>
                            <span className="font-medium">{plan.budget_total.toLocaleString()} SAR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Allocated</span>
                            <span className="font-medium text-blue-600">{plan.budget_allocated.toLocaleString()} SAR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Remaining</span>
                            <span className="font-medium text-green-600">{plan.budget_remaining?.toLocaleString() || 0} SAR</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Bonus Plans</h3>
                  <div className="space-y-3">
                    {bonusPlans.map(plan => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{plan.plan_name}</h4>
                            <p className="text-sm text-gray-600 capitalize">{plan.bonus_type.replace('_', ' ')}</p>
                          </div>
                          {plan.is_active ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Budget</span>
                            <span className="font-medium">{plan.total_budget.toLocaleString()} SAR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Allocated</span>
                            <span className="font-medium text-blue-600">{plan.allocated_amount.toLocaleString()} SAR</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${(plan.allocated_amount / plan.total_budget) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Compensation Planning</h3>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Create Plan
                </button>
              </div>

              <div className="grid gap-4">
                {compPlans.map(plan => (
                  <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{plan.plan_name}</h4>
                        <p className="text-sm text-gray-600">Year {plan.plan_year}</p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View Details →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total Budget</div>
                        <div className="text-xl font-bold text-gray-900">{plan.budget_total.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Allocated</div>
                        <div className="text-xl font-bold text-blue-600">{plan.budget_allocated.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Remaining</div>
                        <div className="text-xl font-bold text-green-600">{plan.budget_remaining?.toLocaleString() || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'benefits' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Benefits Administration</h3>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Create Benefit Plan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'Health Insurance', type: 'health', enrolled: 156, total: 180 },
                  { name: 'Dental Insurance', type: 'dental', enrolled: 134, total: 180 },
                  { name: 'Life Insurance', type: 'life', enrolled: 180, total: 180 },
                  { name: 'Retirement Plan', type: 'retirement', enrolled: 142, total: 180 },
                  { name: 'Vision Insurance', type: 'vision', enrolled: 98, total: 180 },
                  { name: 'Wellness Program', type: 'wellness', enrolled: 67, total: 180 },
                ].map((benefit, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Gift className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{benefit.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{benefit.type}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Enrollment</span>
                        <span className="font-medium">{benefit.enrolled}/{benefit.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(benefit.enrolled / benefit.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'equity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Equity Management</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Award className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-900 mb-2">Stock Options & RSUs</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Manage equity grants, vesting schedules, and employee stock ownership
                </p>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Grant Equity
                </button>
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Total Rewards Statements</h3>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Annual Total Rewards Statements</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Comprehensive compensation statements showing base salary, bonuses, benefits, equity value, and total rewards package
                    </p>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Generate Statements
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        View Sample
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Statement Components</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                      Base Salary & Allowances
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                      Annual Bonus & Incentives
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                      Benefits Value (Health, Dental, Life)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                      Equity Grants & Vested Shares
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                      Retirement Contributions
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                      Total Compensation Value
                    </li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Distribution Options</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Email Distribution
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Employee Portal Access
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      PDF Download
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      View Tracking
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
