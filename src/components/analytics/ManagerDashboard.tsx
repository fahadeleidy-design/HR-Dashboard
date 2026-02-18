import { useState, useEffect, useMemo } from 'react';
import { Users, CheckCircle, Clock, AlertTriangle, UserCheck, TrendingUp, Calendar, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  department: string;
  employment_status: string;
  hire_date: string;
}

interface PendingItem {
  id: string;
  type: string;
  employee_name: string;
  submitted_date: string;
  status: string;
}

export function ManagerDashboard() {
  const { userRole } = useAuth();
  const { currentCompany } = useCompany();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id && userRole?.employee_id) loadManagerData();
  }, [currentCompany, userRole]);

  async function loadManagerData() {
    try {
      setLoading(true);
      const [teamRes, leavesRes, expenseRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, first_name, last_name, job_title, department, employment_status, hire_date')
          .eq('company_id', currentCompany!.id)
          .eq('manager_id', userRole!.employee_id!)
          .eq('employment_status', 'active'),
        supabase
          .from('leave_requests')
          .select('id, employee_id, start_date, end_date, status, created_at, employees!inner(first_name, last_name)')
          .eq('company_id', currentCompany!.id)
          .eq('status', 'pending'),
        supabase
          .from('expense_reports')
          .select('id, employee_id, total_amount, status, created_at, employees!inner(first_name, last_name)')
          .eq('company_id', currentCompany!.id)
          .eq('status', 'submitted'),
      ]);
      setTeam(teamRes.data || []);
      setPendingLeaves(leavesRes.data || []);
      setPendingExpenses(expenseRes.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const activeTeam = team.filter(t => t.employment_status === 'active');
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentJoins = activeTeam.filter(t => new Date(t.hire_date) >= thirtyDaysAgo).length;

    return {
      teamSize: activeTeam.length,
      pendingApprovals: pendingLeaves.length + pendingExpenses.length,
      recentJoins,
      pendingLeaveCount: pendingLeaves.length,
      pendingExpenseCount: pendingExpenses.length,
    };
  }, [team, pendingLeaves, pendingExpenses]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-28 border border-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.teamSize}</div>
              <div className="text-xs text-gray-500">Team Members</div>
            </div>
          </div>
          {stats.recentJoins > 0 && (
            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md inline-block">
              +{stats.recentJoins} new this month
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg ${stats.pendingApprovals > 0 ? 'bg-amber-50' : 'bg-green-50'} flex items-center justify-center`}>
              {stats.pendingApprovals > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</div>
              <div className="text-xs text-gray-500">Pending Approvals</div>
            </div>
          </div>
          {stats.pendingApprovals > 0 && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md inline-block">
              Action required
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingLeaveCount}</div>
              <div className="text-xs text-gray-500">Leave Requests</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Star className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingExpenseCount}</div>
              <div className="text-xs text-gray-500">Expense Claims</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Team Members</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {team.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No direct reports found</p>
            ) : (
              team.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                      <p className="text-xs text-gray-500">{member.job_title}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{member.department}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Pending Actions</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {stats.pendingApprovals === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">All caught up! No pending approvals.</p>
              </div>
            ) : (
              <>
                {pendingLeaves.map(leave => (
                  <div key={leave.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Leave Request
                        </p>
                        <p className="text-xs text-gray-500">
                          {leave.start_date} to {leave.end_date}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Pending</span>
                  </div>
                ))}
                {pendingExpenses.map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Expense Claim
                        </p>
                        <p className="text-xs text-gray-500">
                          {expense.total_amount?.toLocaleString()} SAR
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Review</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
