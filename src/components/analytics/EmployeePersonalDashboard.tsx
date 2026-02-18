import { useState, useEffect } from 'react';
import {
  User, Target, Award, Calendar, Clock, FileText, TrendingUp,
  BookOpen, CheckCircle, AlertTriangle, Star, Shield, Bell
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

interface PersonalMetrics {
  leave_balance: number;
  leave_taken: number;
  total_leave: number;
  training_hours: number;
  training_completed: number;
  goals_completed: number;
  goals_in_progress: number;
  goals_total: number;
  tenure_months: number;
  last_review_rating: number | null;
  last_review_date: string | null;
  documents_expiring: number;
  upcoming_reviews: number;
}

export function EmployeePersonalDashboard() {
  const { userRole } = useAuth();
  const { currentCompany } = useCompany();
  const [employee, setEmployee] = useState<any>(null);
  const [metrics, setMetrics] = useState<PersonalMetrics>({
    leave_balance: 0,
    leave_taken: 0,
    total_leave: 30,
    training_hours: 0,
    training_completed: 0,
    goals_completed: 0,
    goals_in_progress: 0,
    goals_total: 0,
    tenure_months: 0,
    last_review_rating: null,
    last_review_date: null,
    documents_expiring: 0,
    upcoming_reviews: 0,
  });
  const [recentGoals, setRecentGoals] = useState<any[]>([]);
  const [upcomingTrainings, setUpcomingTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id && userRole?.employee_id) loadPersonalData();
    else if (currentCompany?.id) setLoading(false);
  }, [currentCompany, userRole]);

  async function loadPersonalData() {
    try {
      setLoading(true);
      const { data: empData } = await supabase
        .from('employees')
        .select('*, department:departments(name_en)')
        .eq('id', userRole!.employee_id!)
        .maybeSingle();

      if (!empData) {
        setLoading(false);
        return;
      }
      setEmployee(empData);

      const hireDate = new Date(empData.hire_date);
      const now = new Date();
      const tenureMonths = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
      const thisYear = now.getFullYear();
      const yearStart = new Date(thisYear, 0, 1).toISOString().split('T')[0];
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [leaveRes, goalsRes, reviewRes, docsRes, enrollRes] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('id, status, total_days, start_date, end_date')
          .eq('employee_id', userRole!.employee_id!)
          .eq('status', 'approved'),
        supabase
          .from('employee_goals')
          .select('id, status, progress_percentage, goal_title, target_date')
          .eq('employee_id', userRole!.employee_id!)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('performance_reviews')
          .select('id, overall_rating, review_period_end, status')
          .eq('employee_id', userRole!.employee_id!)
          .eq('status', 'completed')
          .order('review_period_end', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('documents')
          .select('id, document_name, expiry_date, document_type')
          .eq('employee_id', userRole!.employee_id!)
          .not('expiry_date', 'is', null)
          .lte('expiry_date', in30Days)
          .gte('expiry_date', now.toISOString().split('T')[0]),
        supabase
          .from('training_enrollments')
          .select('id, completion_status, completion_date, training_program:training_programs(program_name_en, duration_hours, end_date)')
          .eq('employee_id', userRole!.employee_id!)
          .gte('enrollment_date', yearStart),
      ]);

      const approvedLeaves = leaveRes.data || [];
      const leaveTaken = approvedLeaves.reduce((sum, l) => sum + (l.total_days || 0), 0);

      const goals = goalsRes.data || [];
      const goalsCompleted = goals.filter(g => g.status === 'completed').length;
      const goalsInProgress = goals.filter(g => g.status === 'in_progress').length;

      const enrollments = enrollRes.data || [];
      const completedTrainings = enrollments.filter(e => e.completion_status === 'completed');
      const trainingHours = completedTrainings.reduce((sum, e) => {
        const prog = e.training_program as any;
        return sum + (prog?.duration_hours || 0);
      }, 0);

      const pendingTrainings = enrollments
        .filter(e => e.completion_status !== 'completed')
        .map(e => ({
          name: (e.training_program as any)?.program_name_en || 'Training',
          end_date: (e.training_program as any)?.end_date,
        }))
        .slice(0, 3);

      setRecentGoals(goals.slice(0, 4));
      setUpcomingTrainings(pendingTrainings);

      setMetrics({
        leave_balance: Math.max(0, 30 - leaveTaken),
        leave_taken: leaveTaken,
        total_leave: 30,
        training_hours: trainingHours,
        training_completed: completedTrainings.length,
        goals_completed: goalsCompleted,
        goals_in_progress: goalsInProgress,
        goals_total: goals.length,
        tenure_months: tenureMonths,
        last_review_rating: (reviewRes.data as any)?.overall_rating ?? null,
        last_review_date: (reviewRes.data as any)?.review_period_end ?? null,
        documents_expiring: docsRes.data?.length || 0,
        upcoming_reviews: 0,
      });
    } catch (err) {
      console.error('EmployeePersonalDashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  const getTenureLabel = (months: number) => {
    const years = Math.floor(months / 12);
    const remaining = months % 12;
    if (years === 0) return `${remaining} months`;
    return `${years}y ${remaining}m`;
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-white rounded-xl h-28 border border-gray-200" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-28 border border-gray-200" />)}
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No employee profile linked to your account.</p>
        <p className="text-xs text-gray-400 mt-1">Contact HR to link your employee record.</p>
      </div>
    );
  }

  const leavePercentage = metrics.total_leave > 0 ? (metrics.leave_taken / metrics.total_leave) * 100 : 0;
  const goalsPercentage = metrics.goals_total > 0 ? (metrics.goals_completed / metrics.goals_total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {employee.first_name_en?.[0]}{employee.last_name_en?.[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{employee.first_name_en} {employee.last_name_en}</h2>
            <p className="text-slate-300">{employee.job_title_en || 'Employee'}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
              <span>{employee.employee_number}</span>
              {employee.department?.name_en && <span>{employee.department.name_en}</span>}
              <span>{getTenureLabel(metrics.tenure_months)} tenure</span>
            </div>
          </div>
          {metrics.documents_expiring > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              <div>
                <p className="text-xs font-medium text-amber-200">{metrics.documents_expiring} doc{metrics.documents_expiring > 1 ? 's' : ''}</p>
                <p className="text-xs text-amber-300/70">expiring soon</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{metrics.leave_balance}</div>
              <div className="text-xs text-gray-500">Leave Balance (days)</div>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${Math.max(2, 100 - leavePercentage)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{metrics.leave_taken} of {metrics.total_leave} days used</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{metrics.goals_completed}/{metrics.goals_total}</div>
              <div className="text-xs text-gray-500">Goals Completed</div>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${goalsPercentage}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{metrics.goals_in_progress} in progress</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{metrics.training_hours}h</div>
              <div className="text-xs text-gray-500">Training Hours</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{metrics.training_completed} course{metrics.training_completed !== 1 ? 's' : ''} completed this year</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.last_review_rating ? `${Number(metrics.last_review_rating).toFixed(1)}/5` : '--'}
              </div>
              <div className="text-xs text-gray-500">Last Review Rating</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {metrics.last_review_date
              ? `Reviewed ${new Date(metrics.last_review_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
              : 'No review completed yet'
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">My Goals</h3>
          {recentGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No goals assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGoals.map(goal => (
                <div key={goal.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{goal.goal_title}</p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${getGoalStatusColor(goal.status)}`}>
                      {goal.status?.replace('_', ' ')}
                    </span>
                  </div>
                  {typeof goal.progress_percentage === 'number' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${goal.progress_percentage}%` }} />
                    </div>
                  )}
                  {goal.target_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      Due {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <a href="/leave" className="flex items-center gap-2 p-3 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors text-sm font-medium text-teal-700">
                <Calendar className="w-4 h-4" />
                Request Leave
              </a>
              <a href="/attendance" className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium text-blue-700">
                <Clock className="w-4 h-4" />
                Attendance
              </a>
              <a href="/payroll" className="flex items-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-sm font-medium text-emerald-700">
                <FileText className="w-4 h-4" />
                View Payslip
              </a>
              <a href="/performance" className="flex items-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-sm font-medium text-amber-700">
                <TrendingUp className="w-4 h-4" />
                My Performance
              </a>
            </div>
          </div>

          {upcomingTrainings.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Upcoming Trainings
              </h3>
              <div className="space-y-2">
                {upcomingTrainings.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                    {t.end_date && (
                      <span className="text-xs text-emerald-600 shrink-0 ml-2">
                        {new Date(t.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {metrics.documents_expiring > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {metrics.documents_expiring} document{metrics.documents_expiring > 1 ? 's' : ''} expiring within 30 days
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">Contact HR to renew your documents</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
