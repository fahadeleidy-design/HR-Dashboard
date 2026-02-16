import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import {
  User, Mail, Phone, Building2, Calendar, CheckCircle, Clock,
  AlertCircle, TrendingUp, Users, FileText, DollarSign, Briefcase,
  Target, Award, Bell, ClipboardCheck, UserCheck
} from 'lucide-react';
import { EmployeeDashboard } from '@/components/EmployeeDashboard';

interface UserProfile {
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  job_title?: string;
  employee_id?: string;
}

interface RoleMetrics {
  pendingApprovals?: number;
  teamSize?: number;
  pendingTasks?: number;
  completedThisMonth?: number;
  activeProjects?: number;
  urgentItems?: number;
}

export function MyDashboard() {
  const { user, userRole } = useAuth();
  const { currentCompany } = useCompany();
  const { language, isRTL } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<RoleMetrics>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [quickActions, setQuickActions] = useState<any[]>([]);

  useEffect(() => {
    if (user && currentCompany) {
      fetchUserData();
    }
  }, [user, currentCompany]);

  const fetchUserData = async () => {
    if (!user || !currentCompany) return;

    setLoading(true);
    try {
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select(`
          role,
          employee:employees(
            id,
            full_name,
            email,
            phone,
            job_title,
            department:departments(name_en, name_ar)
          )
        `)
        .eq('user_id', user.id)
        .eq('company_id', currentCompany.id)
        .single();

      if (userRoleData) {
        const employee = userRoleData.employee as any;
        setProfile({
          full_name: employee?.full_name || user.email?.split('@')[0] || 'User',
          email: employee?.email || user.email || '',
          phone: employee?.phone,
          role: userRoleData.role,
          department: language === 'ar' ? employee?.department?.name_ar : employee?.department?.name_en,
          job_title: employee?.job_title,
          employee_id: employee?.id
        });

        await fetchRoleSpecificMetrics(userRoleData.role, employee?.id);
        await fetchRecentActivity(userRoleData.role, employee?.id);
        setQuickActionsForRole(userRoleData.role);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleSpecificMetrics = async (role: string, employeeId?: string) => {
    if (!currentCompany) return;

    try {
      const newMetrics: RoleMetrics = {};

      if (role === 'manager' && employeeId) {
        const [teamResult, approvalsResult] = await Promise.all([
          supabase
            .from('employees')
            .select('id', { count: 'exact' })
            .eq('company_id', currentCompany.id)
            .eq('manager_id', employeeId)
            .eq('status', 'active'),
          supabase
            .from('leave_requests')
            .select('id', { count: 'exact' })
            .eq('company_id', currentCompany.id)
            .eq('status', 'pending')
        ]);

        newMetrics.teamSize = teamResult.count || 0;
        newMetrics.pendingApprovals = approvalsResult.count || 0;
      }

      if (role === 'hr' || role === 'admin' || role === 'super_admin') {
        const [leaveResult, expensesResult] = await Promise.all([
          supabase
            .from('leave_requests')
            .select('id', { count: 'exact' })
            .eq('company_id', currentCompany.id)
            .eq('status', 'pending'),
          supabase
            .from('expenses')
            .select('id', { count: 'exact' })
            .eq('company_id', currentCompany.id)
            .eq('status', 'pending')
        ]);

        newMetrics.pendingApprovals = (leaveResult.count || 0) + (expensesResult.count || 0);
      }

      if (role === 'finance') {
        const [paymentsResult, advancesResult] = await Promise.all([
          supabase
            .from('expenses')
            .select('id', { count: 'exact' })
            .eq('company_id', currentCompany.id)
            .eq('status', 'approved')
            .is('paid_date', null),
          supabase
            .from('advances')
            .select('id', { count: 'exact' })
            .eq('company_id', currentCompany.id)
            .eq('status', 'approved')
        ]);

        newMetrics.pendingTasks = (paymentsResult.count || 0) + (advancesResult.count || 0);
      }

      if (employeeId) {
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const [completedResult] = await Promise.all([
          supabase
            .from('leave_requests')
            .select('id', { count: 'exact' })
            .eq('employee_id', employeeId)
            .eq('status', 'approved')
            .gte('created_at', thisMonth.toISOString())
        ]);

        newMetrics.completedThisMonth = completedResult.count || 0;
      }

      setMetrics(newMetrics);
    } catch (error) {
      console.error('Error fetching role metrics:', error);
    }
  };

  const fetchRecentActivity = async (role: string, employeeId?: string) => {
    if (!currentCompany) return;

    try {
      const activities: any[] = [];

      if (employeeId) {
        const { data: leaveRequests } = await supabase
          .from('leave_requests')
          .select('id, leave_type, status, start_date, created_at')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(3);

        leaveRequests?.forEach(req => {
          activities.push({
            type: 'leave',
            title: language === 'ar' ? 'طلب إجازة' : 'Leave Request',
            description: `${req.leave_type} - ${req.status}`,
            date: new Date(req.created_at),
            status: req.status
          });
        });
      }

      if (role === 'manager' || role === 'hr' || role === 'admin' || role === 'super_admin') {
        const { data: pendingRequests } = await supabase
          .from('leave_requests')
          .select('id, employee:employees(full_name), leave_type, created_at')
          .eq('company_id', currentCompany.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3);

        pendingRequests?.forEach(req => {
          activities.push({
            type: 'approval',
            title: language === 'ar' ? 'موافقة مطلوبة' : 'Approval Required',
            description: `${(req.employee as any)?.full_name} - ${req.leave_type}`,
            date: new Date(req.created_at),
            status: 'pending'
          });
        });
      }

      activities.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const setQuickActionsForRole = (role: string) => {
    const actions: any[] = [];

    if (role === 'employee') {
      actions.push(
        { icon: Calendar, label: language === 'ar' ? 'طلب إجازة' : 'Request Leave', path: '/leave' },
        { icon: DollarSign, label: language === 'ar' ? 'طلب مصروف' : 'Submit Expense', path: '/expenses' },
        { icon: FileText, label: language === 'ar' ? 'مستنداتي' : 'My Documents', path: '/documents' }
      );
    }

    if (role === 'manager') {
      actions.push(
        { icon: Users, label: language === 'ar' ? 'فريقي' : 'My Team', path: '/employees' },
        { icon: CheckCircle, label: language === 'ar' ? 'الموافقات' : 'Approvals', path: '/pending-requests' },
        { icon: Target, label: language === 'ar' ? 'الأهداف' : 'Goals', path: '/performance' }
      );
    }

    if (role === 'hr' || role === 'admin' || role === 'super_admin') {
      actions.push(
        { icon: Users, label: language === 'ar' ? 'الموظفين' : 'Employees', path: '/employees' },
        { icon: ClipboardCheck, label: language === 'ar' ? 'الطلبات المعلقة' : 'Pending Requests', path: '/pending-requests' },
        { icon: FileText, label: language === 'ar' ? 'التقارير' : 'Reports', path: '/finance-reports' }
      );
    }

    if (role === 'finance') {
      actions.push(
        { icon: DollarSign, label: language === 'ar' ? 'لوحة المالية' : 'Finance Dashboard', path: '/finance-dashboard' },
        { icon: FileText, label: language === 'ar' ? 'التقارير المالية' : 'Finance Reports', path: '/finance-reports' },
        { icon: ClipboardCheck, label: language === 'ar' ? 'المدفوعات المعلقة' : 'Pending Payments', path: '/expenses' }
      );
    }

    setQuickActions(actions);
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, { en: string; ar: string }> = {
      super_admin: { en: 'Super Admin', ar: 'مدير النظام' },
      admin: { en: 'Admin', ar: 'مسؤول' },
      hr: { en: 'HR Manager', ar: 'مدير الموارد البشرية' },
      manager: { en: 'Manager', ar: 'مدير' },
      finance: { en: 'Finance', ar: 'المالية' },
      employee: { en: 'Employee', ar: 'موظف' }
    };

    return language === 'ar' ? roleLabels[role]?.ar || role : roleLabels[role]?.en || role;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'leave': return Calendar;
      case 'approval': return CheckCircle;
      case 'expense': return DollarSign;
      default: return Bell;
    }
  };

  if (userRole?.role === 'employee' && userRole?.employee_id) {
    return <EmployeeDashboard />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'ar' ? 'لوحتي' : 'My Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 'نظرة عامة على نشاطك وأداءك' : 'Overview of your activity and performance'}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="h-20 w-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <User className="h-10 w-10 text-white" />
          </div>
          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
            <div className="mt-2 space-y-1">
              <div className={`flex items-center gap-2 text-blue-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Briefcase className="h-4 w-4" />
                <span>{getRoleLabel(profile?.role || '')}</span>
                {profile?.department && (
                  <>
                    <span className="mx-2">•</span>
                    <Building2 className="h-4 w-4" />
                    <span>{profile.department}</span>
                  </>
                )}
              </div>
              {profile?.job_title && (
                <div className={`flex items-center gap-2 text-blue-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Award className="h-4 w-4" />
                  <span>{profile.job_title}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.pendingApprovals !== undefined && (
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-gray-600">
                  {language === 'ar' ? 'الموافقات المعلقة' : 'Pending Approvals'}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatNumber(metrics.pendingApprovals, language)}
                </p>
              </div>
              <ClipboardCheck className="h-12 w-12 text-yellow-500" />
            </div>
          </div>
        )}

        {metrics.teamSize !== undefined && (
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-gray-600">
                  {language === 'ar' ? 'حجم الفريق' : 'Team Size'}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatNumber(metrics.teamSize, language)}
                </p>
              </div>
              <Users className="h-12 w-12 text-blue-500" />
            </div>
          </div>
        )}

        {metrics.pendingTasks !== undefined && (
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-gray-600">
                  {language === 'ar' ? 'المهام المعلقة' : 'Pending Tasks'}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatNumber(metrics.pendingTasks, language)}
                </p>
              </div>
              <Clock className="h-12 w-12 text-orange-500" />
            </div>
          </div>
        )}

        {metrics.completedThisMonth !== undefined && (
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-gray-600">
                  {language === 'ar' ? 'مكتمل هذا الشهر' : 'Completed This Month'}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatNumber(metrics.completedThisMonth, language)}
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className={`flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
              >
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <action.icon className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
          </h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>{language === 'ar' ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {activity.status && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`flex items-center gap-3 p-4 rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
              <p className="font-medium text-gray-900">{profile?.email}</p>
            </div>
          </div>
          {profile?.phone && (
            <div className={`flex items-center gap-3 p-4 rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">{language === 'ar' ? 'الهاتف' : 'Phone'}</p>
                <p className="font-medium text-gray-900">{profile.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
