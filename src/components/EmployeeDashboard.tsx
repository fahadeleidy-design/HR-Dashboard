import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import {
  User, Calendar, Clock, TrendingUp, FileText, Award,
  DollarSign, AlertCircle, CheckCircle, XCircle, Briefcase,
  Target, GraduationCap, Activity
} from 'lucide-react';

interface EmployeeData {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  email: string;
  position: string;
  hire_date: string;
  status: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  department?: { name_en: string };
}

interface EmployeeStats {
  leaveRequests: {
    pending: number;
    approved: number;
    total: number;
  };
  attendance: {
    present: number;
    late: number;
    absent: number;
    thisMonth: number;
  };
  salary: {
    basic: number;
    allowances: number;
    total: number;
  };
  documents: {
    total: number;
    expiring: number;
  };
  training: {
    completed: number;
    inProgress: number;
    totalHours: number;
  };
  loans: {
    active: number;
    totalAmount: number;
  };
  advances: {
    pending: number;
    totalAmount: number;
  };
}

export function EmployeeDashboard() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [stats, setStats] = useState<EmployeeStats>({
    leaveRequests: { pending: 0, approved: 0, total: 0 },
    attendance: { present: 0, late: 0, absent: 0, thisMonth: 0 },
    salary: { basic: 0, allowances: 0, total: 0 },
    documents: { total: 0, expiring: 0 },
    training: { completed: 0, inProgress: 0, totalHours: 0 },
    loans: { active: 0, totalAmount: 0 },
    advances: { pending: 0, totalAmount: 0 }
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && currentCompany) {
      loadEmployeeData();
    }
  }, [user, currentCompany]);

  const loadEmployeeData = async () => {
    if (!user?.email) return;

    setLoading(true);
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(name_en)
        `)
        .eq('email', user.email)
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (empError) throw empError;
      if (!empData) {
        console.error('No employee record found for this user');
        setLoading(false);
        return;
      }

      setEmployee(empData);

      const [
        leaveData,
        attendanceData,
        documentsData,
        trainingData,
        loansData,
        advancesData
      ] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('status')
          .eq('employee_id', empData.id),

        supabase
          .from('attendance')
          .select('status, date')
          .eq('employee_id', empData.id)
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

        supabase
          .from('employee_documents')
          .select('id, expiry_date')
          .eq('employee_id', empData.id),

        supabase
          .from('employee_training_records')
          .select('completion_status, duration_hours')
          .eq('employee_id', empData.id),

        supabase
          .from('loans')
          .select('status, amount, balance')
          .eq('employee_id', empData.id)
          .eq('status', 'approved'),

        supabase
          .from('advances')
          .select('status, amount')
          .eq('employee_id', empData.id)
      ]);

      const leaves = leaveData.data || [];
      const attendance = attendanceData.data || [];
      const documents = documentsData.data || [];
      const training = trainingData.data || [];
      const loans = loansData.data || [];
      const advances = advancesData.data || [];

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringDocs = documents.filter(doc =>
        doc.expiry_date &&
        new Date(doc.expiry_date) <= thirtyDaysFromNow &&
        new Date(doc.expiry_date) >= new Date()
      );

      const totalSalary = (empData.basic_salary || 0) +
                          (empData.housing_allowance || 0) +
                          (empData.transport_allowance || 0) +
                          (empData.other_allowances || 0);

      setStats({
        leaveRequests: {
          pending: leaves.filter(l => l.status === 'pending').length,
          approved: leaves.filter(l => l.status === 'approved').length,
          total: leaves.length
        },
        attendance: {
          present: attendance.filter(a => a.status === 'present').length,
          late: attendance.filter(a => a.status === 'late').length,
          absent: attendance.filter(a => a.status === 'absent').length,
          thisMonth: attendance.length
        },
        salary: {
          basic: empData.basic_salary || 0,
          allowances: (empData.housing_allowance || 0) +
                      (empData.transport_allowance || 0) +
                      (empData.other_allowances || 0),
          total: totalSalary
        },
        documents: {
          total: documents.length,
          expiring: expiringDocs.length
        },
        training: {
          completed: training.filter(t => t.completion_status === 'completed').length,
          inProgress: training.filter(t => t.completion_status === 'in_progress').length,
          totalHours: training.reduce((sum, t) => sum + (t.duration_hours || 0), 0)
        },
        loans: {
          active: loans.length,
          totalAmount: loans.reduce((sum, l) => sum + (l.balance || 0), 0)
        },
        advances: {
          pending: advances.filter(a => a.status === 'pending').length,
          totalAmount: advances.reduce((sum, a) => sum + (a.amount || 0), 0)
        }
      });

      const activity = [];
      if (leaves.length > 0) {
        activity.push({
          type: 'leave',
          icon: Calendar,
          color: 'blue',
          title: `${leaves.length} leave request${leaves.length > 1 ? 's' : ''}`,
          subtitle: `${leaves.filter(l => l.status === 'pending').length} pending`
        });
      }
      if (attendance.length > 0) {
        activity.push({
          type: 'attendance',
          icon: Clock,
          color: 'green',
          title: `${attendance.length} attendance records`,
          subtitle: 'This month'
        });
      }
      setRecentActivity(activity.slice(0, 5));

    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTenure = (hireDate: string) => {
    const hire = new Date(hireDate);
    const now = new Date();
    const years = now.getFullYear() - hire.getFullYear();
    const months = now.getMonth() - hire.getMonth();

    if (years === 0) {
      return `${months} ${language === 'ar' ? 'شهر' : 'month'}${months !== 1 ? 's' : ''}`;
    }
    return `${years} ${language === 'ar' ? 'سنة' : 'year'}${years !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900">
          {language === 'ar' ? 'لم يتم العثور على بيانات الموظف' : 'No employee record found'}
        </p>
        <p className="text-sm text-gray-600 mt-2">
          {language === 'ar' ? 'يرجى التواصل مع قسم الموارد البشرية' : 'Please contact HR department'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {employee.first_name_en.charAt(0)}{employee.last_name_en.charAt(0)}
                  </span>
                </div>
                <div className="absolute bottom-0 right-0 h-6 w-6 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-1">
                  {language === 'ar' ? 'مرحباً' : 'Welcome'}, {employee.first_name_en}
                </h1>
                <p className="text-lg opacity-90 mb-2">{employee.position}</p>
                <div className="flex items-center gap-4 text-sm opacity-80">
                  <span>{employee.employee_number}</span>
                  <span>•</span>
                  <span>{employee.department?.name_en}</span>
                  <span>•</span>
                  <span>{getTenure(employee.hire_date)} {language === 'ar' ? 'خبرة' : 'tenure'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/leave')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {language === 'ar' ? 'طلبات الإجازة' : 'Leave Requests'}
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.leaveRequests.total}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.leaveRequests.pending} {language === 'ar' ? 'قيد الانتظار' : 'pending'}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/attendance')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {language === 'ar' ? 'الحضور هذا الشهر' : 'Attendance This Month'}
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.attendance.present}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.attendance.late} {language === 'ar' ? 'متأخر' : 'late'}, {stats.attendance.absent} {language === 'ar' ? 'غياب' : 'absent'}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/payroll')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {language === 'ar' ? 'إجمالي الراتب' : 'Total Salary'}
              </p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {formatCurrency(stats.salary.total, language)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'ar' ? 'شهرياً' : 'Monthly'}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full">
              <DollarSign className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/training')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {language === 'ar' ? 'ساعات التدريب' : 'Training Hours'}
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.training.totalHours}h</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.training.completed} {language === 'ar' ? 'مكتمل' : 'completed'}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <GraduationCap className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{language === 'ar' ? 'رقم الموظف' : 'Employee Number'}</span>
              <span className="text-sm font-medium text-gray-900">{employee.employee_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
              <span className="text-sm font-medium text-gray-900">{employee.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{language === 'ar' ? 'تاريخ التوظيف' : 'Hire Date'}</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(employee.hire_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{language === 'ar' ? 'الحالة' : 'Status'}</span>
              <span className={`text-sm font-medium ${
                employee.status === 'active' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {employee.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : employee.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            {language === 'ar' ? 'التنبيهات' : 'Alerts'}
          </h2>
          <div className="space-y-3">
            {stats.documents.expiring > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">
                    {language === 'ar' ? 'مستندات تنتهي قريباً' : 'Documents Expiring Soon'}
                  </span>
                </div>
                <span className="text-lg font-bold text-red-700">{stats.documents.expiring}</span>
              </div>
            )}
            {stats.loans.active > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">
                    {language === 'ar' ? 'قروض نشطة' : 'Active Loans'}
                  </span>
                </div>
                <span className="text-lg font-bold text-yellow-700">{formatCurrency(stats.loans.totalAmount, language)}</span>
              </div>
            )}
            {stats.leaveRequests.pending > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {language === 'ar' ? 'طلبات إجازة معلقة' : 'Pending Leave Requests'}
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-700">{stats.leaveRequests.pending}</span>
              </div>
            )}
            {stats.documents.expiring === 0 && stats.loans.active === 0 && stats.leaveRequests.pending === 0 && (
              <div className="flex items-center justify-center p-6 bg-green-50 rounded-lg">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-900">
                    {language === 'ar' ? 'لا توجد تنبيهات' : 'No alerts'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary-600" />
          {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/leave')}
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Calendar className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-blue-900">{language === 'ar' ? 'طلب إجازة' : 'Request Leave'}</p>
              <p className="text-xs text-blue-600">{language === 'ar' ? 'إنشاء طلب جديد' : 'Create new request'}</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/payroll')}
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <FileText className="h-6 w-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-green-900">{language === 'ar' ? 'عرض قسيمة الراتب' : 'View Payslip'}</p>
              <p className="text-xs text-green-600">{language === 'ar' ? 'تفاصيل الراتب' : 'Salary details'}</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <FileText className="h-6 w-6 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-purple-900">{language === 'ar' ? 'المستندات' : 'My Documents'}</p>
              <p className="text-xs text-purple-600">{language === 'ar' ? 'عرض المستندات' : 'View documents'}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
