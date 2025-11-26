import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar, Users, DollarSign, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/formatters';

interface ReviewCycle {
  id: string;
  cycle_name: string;
  cycle_year: number;
  start_date: string;
  end_date: string;
  status: string;
  total_budget: number;
  allocated_budget: number;
  utilized_budget: number;
  eligible_employees: number;
  proposals_submitted: number;
  proposals_approved: number;
}

export function SalaryReviewCycles() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);

  useEffect(() => {
    if (currentCompany) {
      fetchCycles();
    }
  }, [currentCompany]);

  const fetchCycles = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salary_review_cycles')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('cycle_year', { ascending: false });

      if (!error && data) {
        setCycles(data);
      }
    } catch (error) {
      console.error('Error fetching cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle },
      open: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      review: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Users },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      closed: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle }
    };

    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Salary Review Cycles</h2>
          <p className="text-gray-600 mt-1">Manage annual salary reviews and merit increases</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
          <Plus className="h-5 w-5" />
          Create Review Cycle
        </button>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Review Cycles</h3>
          <p className="text-gray-600 mb-6">Create your first salary review cycle to manage annual merit increases</p>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md mx-auto">
            <Plus className="h-5 w-5" />
            Create First Cycle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {cycles.map((cycle) => {
            const budgetUtilization = cycle.total_budget > 0
              ? (cycle.utilized_budget / cycle.total_budget) * 100
              : 0;
            const proposalCompletion = cycle.eligible_employees > 0
              ? (cycle.proposals_submitted / cycle.eligible_employees) * 100
              : 0;

            return (
              <div key={cycle.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{cycle.cycle_name}</h3>
                      <p className="text-gray-600 mt-1">
                        {formatDate(cycle.start_date, 'en')} - {formatDate(cycle.end_date, 'en')}
                      </p>
                    </div>
                    {getStatusBadge(cycle.status)}
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <p className="text-sm font-medium text-gray-700">Total Budget</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(cycle.total_budget, 'en')}</p>
                      <p className="text-xs text-gray-600 mt-1">SAR allocated</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-green-600" />
                        <p className="text-sm font-medium text-gray-700">Eligible</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{cycle.eligible_employees}</p>
                      <p className="text-xs text-gray-600 mt-1">Employees</p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <p className="text-sm font-medium text-gray-700">Proposals</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{cycle.proposals_submitted}</p>
                      <p className="text-xs text-gray-600 mt-1">Submitted</p>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-orange-600" />
                        <p className="text-sm font-medium text-gray-700">Approved</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{cycle.proposals_approved}</p>
                      <p className="text-xs text-gray-600 mt-1">Proposals</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Budget Utilization</span>
                        <span className="text-sm font-bold text-gray-900">{budgetUtilization.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${budgetUtilization > 90 ? 'bg-red-500' : budgetUtilization > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-gray-600">
                          {formatNumber(cycle.utilized_budget, 'en')} SAR used
                        </span>
                        <span className="text-gray-600">
                          {formatNumber(cycle.total_budget - cycle.utilized_budget, 'en')} SAR remaining
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Proposal Completion</span>
                        <span className="text-sm font-bold text-gray-900">{proposalCompletion.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                          style={{ width: `${Math.min(proposalCompletion, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-gray-600">
                          {cycle.proposals_submitted} submitted
                        </span>
                        <span className="text-gray-600">
                          {cycle.eligible_employees - cycle.proposals_submitted} pending
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      View Proposals
                    </button>
                    {cycle.status === 'open' && (
                      <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                        Submit Proposal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Salary Review Cycle Workflow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {['Draft', 'Open', 'HR Review', 'Budget Review', 'Executive Approval', 'Approved', 'Closed'].map((stage, idx) => (
            <div key={stage} className="p-3 bg-white rounded-lg text-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                {idx + 1}
              </div>
              <p className="text-xs font-semibold text-gray-900">{stage}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
