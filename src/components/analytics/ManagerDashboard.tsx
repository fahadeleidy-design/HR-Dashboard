import { useState, useEffect, useMemo } from 'react';
import {
  Users, CheckCircle, AlertTriangle, Calendar, Star, TrendingUp,
  Clock, Target, Award, UserCheck, BarChart2, Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export function ManagerDashboard() {
  const { userRole } = useAuth();
  const { currentCompany } = useCompany();
  const [team, setTeam] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<any[]>([]);
  const [teamGoals, setTeamGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id && userRole?.employee_id) loadManagerData();
    else if (currentCompany?.id) loadManagerDataNoEmployee();
  }, [currentCompany, userRole]);

  async function loadManagerDataNoEmployee() {
    setLoading(false);
  }

  async function loadManagerData() {
    try {
      setLoading(true);
      const [teamRes, leavesRes, expenseRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, first_name_en, last_name_en, job_title_en, status, hire_date, basic_salary, department:departments(name_en), gender')
          .eq('company_id', currentCompany!.id)
          .eq('manager_id', userRole!.employee_id!)
          .eq('status', 'active'),
        supabase
          .from('leave_requests')
          .select('id, employee_id, start_date, end_date, total_days, status, created_at, leave_type:leave_types(name_en), employee:employees!leave_requests_employee_id_fkey(first_name_en, last_name_en)')
          .eq('company_id', currentCompany!.id)
          .eq('status', 'pending'),
        supabase
          .from('expense_claims')
          .select('id, employee_id, total_amount, approval_status, created_at, employee:employees!expense_claims_employee_id_fkey(first_name_en, last_name_en)')
          .eq('company_id', currentCompany!.id)
          .eq('approval_status', 'submitted'),
      ]);

      const teamData = teamRes.data || [];
      setTeam(teamData);
      setPendingLeaves(leavesRes.data || []);
      setPendingExpenses(expenseRes.data || []);

      if (teamData.length > 0) {
        const teamIds = teamData.map(t => t.id);
        const [reviewsRes, goalsRes] = await Promise.all([
          supabase
            .from('performance_reviews')
            .select('id, employee_id, overall_rating, review_period_end, status')
            .in('employee_id', teamIds)
            .eq('status', 'completed')
            .order('review_period_end', { ascending: false })
            .limit(50),
          supabase
            .from('employee_goals')
            .select('id, employee_id, status, progress_percentage, goal_title')
            .in('employee_id', teamIds),
        ]);
        setPerformanceReviews(reviewsRes.data || []);
        setTeamGoals(goalsRes.data || []);
      }
    } catch (err) {
      console.error('ManagerDashboard loadData error:', err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentJoins = team.filter(t => new Date(t.hire_date) >= thirtyDaysAgo).length;

    const latestReviews: Record<string, any> = {};
    performanceReviews.forEach(r => {
      if (!latestReviews[r.employee_id] ||
        new Date(r.review_period_end) > new Date(latestReviews[r.employee_id].review_period_end)) {
        latestReviews[r.employee_id] = r;
      }
    });

    const reviewedMembers = Object.values(latestReviews);
    const avgRating = reviewedMembers.length > 0
      ? reviewedMembers.reduce((s, r) => s + (r.overall_rating || 0), 0) / reviewedMembers.length
      : 0;

    const ratingDist = [
      { label: 'Outstanding (5)', count: reviewedMembers.filter(r => r.overall_rating >= 4.5).length, color: '#10b981' },
      { label: 'Exceeds (4)', count: reviewedMembers.filter(r => r.overall_rating >= 3.5 && r.overall_rating < 4.5).length, color: '#0ea5e9' },
      { label: 'Meets (3)', count: reviewedMembers.filter(r => r.overall_rating >= 2.5 && r.overall_rating < 3.5).length, color: '#f59e0b' },
      { label: 'Below (2)', count: reviewedMembers.filter(r => r.overall_rating < 2.5).length, color: '#ef4444' },
    ].filter(r => r.count > 0);

    const goalsCompleted = teamGoals.filter(g => g.status === 'completed').length;
    const goalsInProgress = teamGoals.filter(g => g.status === 'in_progress').length;
    const goalsTotal = teamGoals.length;
    const goalsCompletionRate = goalsTotal > 0 ? (goalsCompleted / goalsTotal) * 100 : 0;

    const totalSalary = team.reduce((s, t) => s + (t.basic_salary || 0), 0);

    const deptDist: Record<string, number> = {};
    team.forEach(t => {
      const d = t.department?.name_en || 'Other';
      deptDist[d] = (deptDist[d] || 0) + 1;
    });
    const deptData = Object.entries(deptDist).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    const pendingApprovals = pendingLeaves.length + pendingExpenses.length;

    return {
      teamSize: team.length,
      recentJoins,
      pendingApprovals,
      pendingLeaveCount: pendingLeaves.length,
      pendingExpenseCount: pendingExpenses.length,
      avgRating,
      ratingDist,
      goalsCompleted,
      goalsInProgress,
      goalsTotal,
      goalsCompletionRate,
      totalSalary,
      deptData,
      reviewedCount: reviewedMembers.length,
    };
  }, [team, pendingLeaves, pendingExpenses, performanceReviews, teamGoals]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-28 border border-gray-200" />)}
        </div>
      </div>
    );
  }

  if (!userRole?.employee_id) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No employee profile linked to your account for manager view.</p>
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
          <div className="flex gap-2 text-xs">
            <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded">{stats.pendingLeaveCount} leaves</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{stats.pendingExpenseCount} expenses</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '--'}
              </div>
              <div className="text-xs text-gray-500">Avg Performance Rating</div>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {stats.reviewedCount} of {stats.teamSize} reviewed
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.goalsCompletionRate.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Goals Completion</div>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {stats.goalsCompleted}/{stats.goalsTotal} goals done
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Team Members</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {team.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No direct reports found</p>
            ) : (
              team.map(member => {
                const tenureMonths = Math.max(0, Math.floor((new Date().getTime() - new Date(member.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 30)));
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-blue-600">
                        {member.first_name_en?.[0]}{member.last_name_en?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.first_name_en} {member.last_name_en}</p>
                      <p className="text-xs text-gray-500 truncate">{member.job_title_en || member.department?.name_en}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{tenureMonths}mo</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Pending Actions</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {stats.pendingApprovals === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">All caught up!</p>
              </div>
            ) : (
              <>
                {pendingLeaves.map(leave => {
                  const emp = leave.employee as any;
                  return (
                    <div key={leave.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <Calendar className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {emp ? `${emp.first_name_en} ${emp.last_name_en}` : 'Employee'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {leave.leave_type?.name_en || 'Leave'} · {leave.total_days} days
                        </p>
                        <p className="text-xs text-gray-400">{leave.start_date} – {leave.end_date}</p>
                      </div>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 shrink-0">Leave</span>
                    </div>
                  );
                })}
                {pendingExpenses.map(expense => {
                  const emp = expense.employee as any;
                  return (
                    <div key={expense.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {emp ? `${emp.first_name_en} ${emp.last_name_en}` : 'Employee'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {expense.total_amount?.toLocaleString()} SAR
                        </p>
                      </div>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 shrink-0">Expense</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Goals Status</h3>
          {stats.goalsTotal === 0 ? (
            <div className="text-center py-8">
              <Target className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No goals set yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Completed</span>
                  <span className="font-semibold text-green-600">{stats.goalsCompleted}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.goalsCompletionRate}%` }} />
                </div>

                <div className="flex justify-between text-xs mt-2">
                  <span className="text-gray-500">In Progress</span>
                  <span className="font-semibold text-blue-600">{stats.goalsInProgress}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${stats.goalsTotal > 0 ? (stats.goalsInProgress / stats.goalsTotal) * 100 : 0}%` }} />
                </div>

                <div className="flex justify-between text-xs mt-2">
                  <span className="text-gray-500">Not Started</span>
                  <span className="font-semibold text-gray-500">
                    {stats.goalsTotal - stats.goalsCompleted - stats.goalsInProgress}
                  </span>
                </div>
              </div>

              {stats.ratingDist.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3">Performance Distribution</p>
                  <div className="space-y-2">
                    {stats.ratingDist.map(r => (
                      <div key={r.label} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{r.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{
                              width: `${stats.reviewedCount > 0 ? (r.count / stats.reviewedCount) * 100 : 0}%`,
                              backgroundColor: r.color
                            }} />
                          </div>
                          <span className="font-semibold text-gray-700 w-4 text-right">{r.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {stats.deptData.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Team Composition by Department</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.deptData}>
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40} name="Members">
                  {stats.deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
