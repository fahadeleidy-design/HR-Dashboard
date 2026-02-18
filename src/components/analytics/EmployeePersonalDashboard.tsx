import { useState, useEffect } from 'react';
import { User, Target, Award, Calendar, Clock, FileText, TrendingUp, BookOpen, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

interface PersonalMetrics {
  leave_balance: number;
  leave_taken: number;
  total_leave: number;
  training_hours: number;
  goals_completed: number;
  goals_total: number;
  tenure_months: number;
  last_review_rating: number | null;
  documents_expiring: number;
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
    goals_completed: 0,
    goals_total: 0,
    tenure_months: 0,
    last_review_rating: null,
    documents_expiring: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id && userRole?.employee_id) loadPersonalData();
  }, [currentCompany, userRole]);

  async function loadPersonalData() {
    try {
      setLoading(true);
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userRole!.employee_id!)
        .maybeSingle();

      if (empData) {
        setEmployee(empData);
        const hireDate = new Date(empData.hire_date);
        const now = new Date();
        const tenureMonths = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());

        const [leaveRes, goalsRes] = await Promise.all([
          supabase
            .from('leave_requests')
            .select('id, status, total_days')
            .eq('employee_id', userRole!.employee_id!)
            .eq('status', 'approved'),
          supabase
            .from('employee_goals')
            .select('id, status')
            .eq('employee_id', userRole!.employee_id!),
        ]);

        const leaveTaken = (leaveRes.data || []).reduce((sum, l) => sum + (l.total_days || 0), 0);
        const goalsCompleted = (goalsRes.data || []).filter(g => g.status === 'completed').length;
        const goalsTotal = goalsRes.data?.length || 0;

        setMetrics({
          leave_balance: Math.max(0, 30 - leaveTaken),
          leave_taken: leaveTaken,
          total_leave: 30,
          training_hours: 0,
          goals_completed: goalsCompleted,
          goals_total: goalsTotal,
          tenure_months: tenureMonths,
          last_review_rating: null,
          documents_expiring: 0,
        });
      }
    } catch {
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-28 border border-gray-200" />
        ))}
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No employee profile linked to your account.</p>
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
          <div>
            <h2 className="text-xl font-bold">{employee.first_name_en} {employee.last_name_en}</h2>
            <p className="text-slate-300">{employee.job_title_en || 'Employee'}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
              <span>{employee.employee_number}</span>
              <span>{getTenureLabel(metrics.tenure_months)} tenure</span>
            </div>
          </div>
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
            <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${100 - leavePercentage}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{metrics.leave_taken} of {metrics.total_leave} used</p>
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
          <p className="text-xs text-gray-400 mt-1">{goalsPercentage.toFixed(0)}% completion rate</p>
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
          <p className="text-xs text-gray-400 mt-4">This year</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.last_review_rating ? `${metrics.last_review_rating}/5` : '--'}
              </div>
              <div className="text-xs text-gray-500">Last Review</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">Performance rating</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-2 p-3 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors text-sm font-medium text-teal-700">
              <Calendar className="w-4 h-4" />
              Request Leave
            </button>
            <button className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium text-blue-700">
              <Clock className="w-4 h-4" />
              Clock In/Out
            </button>
            <button className="flex items-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-sm font-medium text-emerald-700">
              <FileText className="w-4 h-4" />
              View Payslip
            </button>
            <button className="flex items-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-sm font-medium text-amber-700">
              <Target className="w-4 h-4" />
              Update Goals
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Development Plan</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Complete onboarding training</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Set Q1 performance goals</p>
                <p className="text-xs text-gray-500">In progress</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Award className="w-5 h-5 text-gray-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Complete leadership certification</p>
                <p className="text-xs text-gray-500">Upcoming</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
