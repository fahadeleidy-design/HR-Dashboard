import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatInteger } from '@/lib/formatters';
import { format, differenceInDays, differenceInMonths, differenceInYears, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  User, Calendar, Clock, FileText, Award, DollarSign, AlertCircle,
  CheckCircle, Briefcase, GraduationCap, Activity, Building2,
  CreditCard, Shield, FileCheck, Wallet, BadgeCheck, CalendarDays,
  AlertTriangle, UserCircle, Contact, Plane, Heart
} from 'lucide-react';

interface EmployeeData {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  email: string;
  position: string;
  position_ar: string | null;
  hire_date: string;
  status: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  is_saudi: boolean;
  national_id: string | null;
  iqama_number: string | null;
  iqama_expiry: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  contract_type: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  department_id: string | null;
  department?: { name_en: string; name_ar: string | null };
}

interface LeaveBalance {
  leave_type_id: string;
  balance: number;
  used: number;
  leave_type?: { name_en: string; name_ar: string | null };
}

interface EmployeeStats {
  leaveBalances: LeaveBalance[];
  totalLeaveAvailable: number;
  totalLeaveUsed: number;
  gosi: {
    employeeShare: number;
    employerShare: number;
    totalContribution: number;
  };
  insurance: {
    hasInsurance: boolean;
    policyNumber: string | null;
    provider: string | null;
    class: string | null;
    expiryDate: string | null;
  };
  contract: {
    type: string;
    startDate: string | null;
    endDate: string | null;
    durationMonths: number;
    remainingDays: number;
    status: string;
  };
  loans: {
    active: number;
    totalAmount: number;
    pendingAmount: number;
    monthlyDeduction: number;
  };
  advances: {
    pending: number;
    approved: number;
    totalAmount: number;
  };
  documents: {
    total: number;
    expiring: number;
  };
  attendance: {
    present: number;
    late: number;
    absent: number;
  };
}

export function EmployeeDashboard() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [stats, setStats] = useState<EmployeeStats>({
    leaveBalances: [],
    totalLeaveAvailable: 0,
    totalLeaveUsed: 0,
    gosi: { employeeShare: 0, employerShare: 0, totalContribution: 0 },
    insurance: { hasInsurance: false, policyNumber: null, provider: null, class: null, expiryDate: null },
    contract: { type: 'indefinite', startDate: null, endDate: null, durationMonths: 0, remainingDays: 0, status: 'active' },
    loans: { active: 0, totalAmount: 0, pendingAmount: 0, monthlyDeduction: 0 },
    advances: { pending: 0, approved: 0, totalAmount: 0 },
    documents: { total: 0, expiring: 0 },
    attendance: { present: 0, late: 0, absent: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && currentCompany) {
      loadEmployeeData();
    }
  }, [user, currentCompany]);

  const loadEmployeeData = async () => {
    if (!user?.email || !currentCompany) return;

    setLoading(true);
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(name_en, name_ar)
        `)
        .eq('email', user.email)
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (empError) throw empError;
      if (!empData) {
        setLoading(false);
        return;
      }

      setEmployee(empData);

      const [
        leaveBalancesData,
        loansData,
        advancesData,
        documentsData,
        attendanceData,
        insuranceData,
        gosiRatesData
      ] = await Promise.all([
        supabase
          .from('leave_balances')
          .select('leave_type_id, balance, used, leave_type:leave_types(name_en, name_ar)')
          .eq('employee_id', empData.id)
          .eq('year', new Date().getFullYear()),
        supabase
          .from('loans')
          .select('status, amount, balance, monthly_deduction')
          .eq('employee_id', empData.id),
        supabase
          .from('advances')
          .select('status, amount')
          .eq('employee_id', empData.id),
        supabase
          .from('employee_documents')
          .select('id, expiry_date')
          .eq('employee_id', empData.id),
        supabase
          .from('attendance')
          .select('status, date')
          .eq('employee_id', empData.id)
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase
          .from('employee_insurance')
          .select('policy_number, provider_name, insurance_class, end_date, status')
          .eq('employee_id', empData.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('gosi_rates_config')
          .select('*')
          .eq('company_id', currentCompany.id)
          .maybeSingle()
      ]);

      const leaveBalances = (leaveBalancesData.data || []) as LeaveBalance[];
      const totalLeaveAvailable = leaveBalances.reduce((sum, lb) => sum + (lb.balance || 0), 0);
      const totalLeaveUsed = leaveBalances.reduce((sum, lb) => sum + (lb.used || 0), 0);

      const loans = loansData.data || [];
      const activeLoans = loans.filter(l => l.status === 'approved' || l.status === 'active');
      const pendingLoans = loans.filter(l => l.status === 'pending');

      const advances = advancesData.data || [];
      const pendingAdvances = advances.filter(a => a.status === 'pending');
      const approvedAdvances = advances.filter(a => a.status === 'approved');

      const documents = documentsData.data || [];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringDocs = documents.filter(doc =>
        doc.expiry_date &&
        new Date(doc.expiry_date) <= thirtyDaysFromNow &&
        new Date(doc.expiry_date) >= new Date()
      );

      const attendance = attendanceData.data || [];

      const gosiRates = gosiRatesData.data;
      const totalSalary = (empData.basic_salary || 0) + (empData.housing_allowance || 0);
      let employeeGosiShare = 0;
      let employerGosiShare = 0;

      if (gosiRates) {
        if (empData.is_saudi) {
          employeeGosiShare = totalSalary * (gosiRates.saudi_employee_pension_rate || 0.0975);
          employerGosiShare = totalSalary * ((gosiRates.saudi_employer_pension_rate || 0.0975) + (gosiRates.employer_oci_rate || 0.02));
        } else {
          employeeGosiShare = 0;
          employerGosiShare = totalSalary * (gosiRates.employer_oci_rate || 0.02);
        }
      }

      let contractDurationMonths = 0;
      let remainingDays = 0;
      let contractStatus = 'active';

      if (empData.contract_start_date) {
        const startDate = parseISO(empData.contract_start_date);
        if (empData.contract_end_date) {
          const endDate = parseISO(empData.contract_end_date);
          contractDurationMonths = differenceInMonths(endDate, startDate);
          remainingDays = differenceInDays(endDate, new Date());
          if (remainingDays < 0) {
            contractStatus = 'expired';
            remainingDays = 0;
          } else if (remainingDays <= 90) {
            contractStatus = 'expiring_soon';
          }
        } else {
          contractStatus = 'indefinite';
        }
      }

      const insurance = insuranceData.data;

      setStats({
        leaveBalances,
        totalLeaveAvailable,
        totalLeaveUsed,
        gosi: {
          employeeShare: employeeGosiShare,
          employerShare: employerGosiShare,
          totalContribution: employeeGosiShare + employerGosiShare
        },
        insurance: {
          hasInsurance: !!insurance,
          policyNumber: insurance?.policy_number || null,
          provider: insurance?.provider_name || null,
          class: insurance?.insurance_class || null,
          expiryDate: insurance?.end_date || null
        },
        contract: {
          type: empData.contract_type || 'indefinite',
          startDate: empData.contract_start_date,
          endDate: empData.contract_end_date,
          durationMonths: contractDurationMonths,
          remainingDays,
          status: contractStatus
        },
        loans: {
          active: activeLoans.length,
          totalAmount: activeLoans.reduce((sum, l) => sum + (l.balance || 0), 0),
          pendingAmount: pendingLoans.reduce((sum, l) => sum + (l.amount || 0), 0),
          monthlyDeduction: activeLoans.reduce((sum, l) => sum + (l.monthly_deduction || 0), 0)
        },
        advances: {
          pending: pendingAdvances.length,
          approved: approvedAdvances.length,
          totalAmount: approvedAdvances.reduce((sum, a) => sum + (a.amount || 0), 0)
        },
        documents: {
          total: documents.length,
          expiring: expiringDocs.length
        },
        attendance: {
          present: attendance.filter(a => a.status === 'present').length,
          late: attendance.filter(a => a.status === 'late').length,
          absent: attendance.filter(a => a.status === 'absent').length
        }
      });

    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTenure = (hireDate: string) => {
    const hire = new Date(hireDate);
    const now = new Date();
    const years = differenceInYears(now, hire);
    const months = differenceInMonths(now, hire) % 12;

    if (years === 0) {
      return isRTL ? `${months} شهر` : `${months} month${months !== 1 ? 's' : ''}`;
    }
    if (months === 0) {
      return isRTL ? `${years} سنة` : `${years} year${years !== 1 ? 's' : ''}`;
    }
    return isRTL
      ? `${years} سنة و ${months} شهر`
      : `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: isRTL ? ar : enUS });
  };

  const getExpiryStatus = (dateStr: string | null) => {
    if (!dateStr) return { status: 'unknown', color: 'gray', label: isRTL ? 'غير محدد' : 'N/A' };
    const date = parseISO(dateStr);
    const daysLeft = differenceInDays(date, new Date());

    if (daysLeft < 0) {
      return { status: 'expired', color: 'red', label: isRTL ? 'منتهي' : 'Expired', days: 0 };
    } else if (daysLeft <= 30) {
      return { status: 'critical', color: 'red', label: isRTL ? 'حرج' : 'Critical', days: daysLeft };
    } else if (daysLeft <= 90) {
      return { status: 'warning', color: 'yellow', label: isRTL ? 'قريباً' : 'Soon', days: daysLeft };
    }
    return { status: 'valid', color: 'green', label: isRTL ? 'صالح' : 'Valid', days: daysLeft };
  };

  const totalSalary = employee
    ? (employee.basic_salary || 0) + (employee.housing_allowance || 0) +
      (employee.transport_allowance || 0) + (employee.other_allowances || 0)
    : 0;

  const netSalary = totalSalary - stats.gosi.employeeShare - stats.loans.monthlyDeduction;

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
          {isRTL ? 'لم يتم العثور على بيانات الموظف' : 'No employee record found'}
        </p>
        <p className="text-sm text-gray-600 mt-2">
          {isRTL ? 'يرجى التواصل مع قسم الموارد البشرية' : 'Please contact HR department'}
        </p>
      </div>
    );
  }

  const iqamaExpiry = getExpiryStatus(employee.iqama_expiry);
  const passportExpiry = getExpiryStatus(employee.passport_expiry);
  const contractExpiry = getExpiryStatus(employee.contract_end_date);
  const insuranceExpiry = getExpiryStatus(stats.insurance.expiryDate);

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-6">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {employee.first_name_en.charAt(0)}{employee.last_name_en.charAt(0)}
                  </span>
                </div>
                <div className="absolute bottom-0 right-0 h-6 w-6 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className={`text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                <h1 className="text-3xl font-bold mb-1">
                  {isRTL ? 'مرحباً' : 'Welcome'}, {isRTL ? (employee.first_name_ar || employee.first_name_en) : employee.first_name_en}
                </h1>
                <p className="text-lg opacity-90 mb-2">
                  {isRTL ? (employee.position_ar || employee.position) : employee.position}
                </p>
                <div className={`flex items-center gap-4 text-sm opacity-80 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{employee.employee_number}</span>
                  <span>•</span>
                  <span>{isRTL ? (employee.department?.name_ar || employee.department?.name_en) : employee.department?.name_en}</span>
                  <span>•</span>
                  <span>{getTenure(employee.hire_date)} {isRTL ? 'خبرة' : 'tenure'}</span>
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
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm font-medium text-gray-600">
                {isRTL ? 'رصيد الإجازات' : 'Leave Balance'}
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">{formatInteger(stats.totalLeaveAvailable, language)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalLeaveUsed} {isRTL ? 'يوم مستخدم' : 'days used'}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <CalendarDays className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/payroll')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm font-medium text-gray-600">
                {isRTL ? 'صافي الراتب' : 'Net Salary'}
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(netSalary, language)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isRTL ? 'شهرياً' : 'Monthly'}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm font-medium text-gray-600">
                {isRTL ? 'اشتراك التأمينات' : 'GOSI Contribution'}
              </p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(stats.gosi.employeeShare, language)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isRTL ? 'حصة الموظف' : 'Employee share'}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <Shield className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm font-medium text-gray-600">
                {isRTL ? 'التأمين الطبي' : 'Medical Insurance'}
              </p>
              {stats.insurance.hasInsurance ? (
                <>
                  <p className="text-lg font-bold text-teal-600 mt-1">{stats.insurance.class || 'Active'}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.insurance.provider}</p>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-400 mt-1">{isRTL ? 'غير متاح' : 'Not Available'}</p>
              )}
            </div>
            <div className="p-3 bg-teal-50 rounded-full">
              <Heart className="h-8 w-8 text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Briefcase className="h-5 w-5 text-primary-600" />
            {isRTL ? 'حالة العقد' : 'Contract Status'}
          </h2>
          <div className="space-y-4">
            <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'نوع العقد' : 'Contract Type'}</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {stats.contract.type === 'indefinite'
                  ? (isRTL ? 'غير محدد المدة' : 'Indefinite')
                  : stats.contract.type === 'fixed_term'
                  ? (isRTL ? 'محدد المدة' : 'Fixed Term')
                  : stats.contract.type
                }
              </span>
            </div>
            <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'تاريخ البداية' : 'Start Date'}</span>
              <span className="text-sm font-medium text-gray-900">{formatDate(stats.contract.startDate)}</span>
            </div>
            {stats.contract.endDate && (
              <>
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-gray-600">{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(stats.contract.endDate)}</span>
                </div>
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-gray-600">{isRTL ? 'الأيام المتبقية' : 'Remaining Days'}</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    contractExpiry.color === 'red' ? 'bg-red-100 text-red-800' :
                    contractExpiry.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {stats.contract.remainingDays} {isRTL ? 'يوم' : 'days'}
                  </span>
                </div>
              </>
            )}
            <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'مدة العقد' : 'Duration'}</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.contract.durationMonths > 0
                  ? `${stats.contract.durationMonths} ${isRTL ? 'شهر' : 'months'}`
                  : (isRTL ? 'غير محدد' : 'Indefinite')
                }
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Contact className="h-5 w-5 text-primary-600" />
            {isRTL ? 'صلاحية الوثائق' : 'Document Validity'}
          </h2>
          <div className="space-y-4">
            {!employee.is_saudi && (
              <div className={`p-3 rounded-lg border ${
                iqamaExpiry.color === 'red' ? 'bg-red-50 border-red-200' :
                iqamaExpiry.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <CreditCard className={`h-5 w-5 ${
                      iqamaExpiry.color === 'red' ? 'text-red-600' :
                      iqamaExpiry.color === 'yellow' ? 'text-yellow-600' :
                      'text-green-600'
                    }`} />
                    <span className="text-sm font-medium">{isRTL ? 'الإقامة' : 'Iqama'}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    iqamaExpiry.color === 'red' ? 'bg-red-100 text-red-800' :
                    iqamaExpiry.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {iqamaExpiry.label}
                  </span>
                </div>
                <p className={`text-sm text-gray-600 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'ينتهي في:' : 'Expires:'} {formatDate(employee.iqama_expiry)}
                </p>
                {iqamaExpiry.days !== undefined && iqamaExpiry.days > 0 && (
                  <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {iqamaExpiry.days} {isRTL ? 'يوم متبقي' : 'days remaining'}
                  </p>
                )}
              </div>
            )}

            <div className={`p-3 rounded-lg border ${
              passportExpiry.color === 'red' ? 'bg-red-50 border-red-200' :
              passportExpiry.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
              passportExpiry.color === 'gray' ? 'bg-gray-50 border-gray-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Plane className={`h-5 w-5 ${
                    passportExpiry.color === 'red' ? 'text-red-600' :
                    passportExpiry.color === 'yellow' ? 'text-yellow-600' :
                    passportExpiry.color === 'gray' ? 'text-gray-400' :
                    'text-green-600'
                  }`} />
                  <span className="text-sm font-medium">{isRTL ? 'جواز السفر' : 'Passport'}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  passportExpiry.color === 'red' ? 'bg-red-100 text-red-800' :
                  passportExpiry.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  passportExpiry.color === 'gray' ? 'bg-gray-100 text-gray-600' :
                  'bg-green-100 text-green-800'
                }`}>
                  {passportExpiry.label}
                </span>
              </div>
              <p className={`text-sm text-gray-600 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'ينتهي في:' : 'Expires:'} {formatDate(employee.passport_expiry)}
              </p>
              {passportExpiry.days !== undefined && passportExpiry.days > 0 && (
                <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {passportExpiry.days} {isRTL ? 'يوم متبقي' : 'days remaining'}
                </p>
              )}
            </div>

            {stats.insurance.hasInsurance && stats.insurance.expiryDate && (
              <div className={`p-3 rounded-lg border ${
                insuranceExpiry.color === 'red' ? 'bg-red-50 border-red-200' :
                insuranceExpiry.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Heart className={`h-5 w-5 ${
                      insuranceExpiry.color === 'red' ? 'text-red-600' :
                      insuranceExpiry.color === 'yellow' ? 'text-yellow-600' :
                      'text-green-600'
                    }`} />
                    <span className="text-sm font-medium">{isRTL ? 'التأمين الطبي' : 'Insurance'}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    insuranceExpiry.color === 'red' ? 'bg-red-100 text-red-800' :
                    insuranceExpiry.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {insuranceExpiry.label}
                  </span>
                </div>
                <p className={`text-sm text-gray-600 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'ينتهي في:' : 'Expires:'} {formatDate(stats.insurance.expiryDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Building2 className="h-5 w-5 text-primary-600" />
            {isRTL ? 'معلومات الوظيفة' : 'Job Information'}
          </h2>
          <div className="space-y-3">
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'رقم الموظف' : 'Employee ID'}</span>
              <span className="text-sm font-medium text-gray-900">{employee.employee_number}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'القسم' : 'Department'}</span>
              <span className="text-sm font-medium text-gray-900">
                {isRTL ? (employee.department?.name_ar || employee.department?.name_en) : employee.department?.name_en || '-'}
              </span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'تاريخ التوظيف' : 'Hire Date'}</span>
              <span className="text-sm font-medium text-gray-900">{formatDate(employee.hire_date)}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'مدة الخدمة' : 'Service Period'}</span>
              <span className="text-sm font-medium text-gray-900">{getTenure(employee.hire_date)}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'الجنسية' : 'Nationality'}</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                employee.is_saudi ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {employee.is_saudi ? (isRTL ? 'سعودي' : 'Saudi') : (isRTL ? 'غير سعودي' : 'Non-Saudi')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <DollarSign className="h-5 w-5 text-primary-600" />
            {isRTL ? 'تفاصيل الراتب' : 'Salary Details'}
          </h2>
          <div className="space-y-3">
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'الراتب الأساسي' : 'Basic Salary'}</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.basic_salary || 0, language)}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'بدل السكن' : 'Housing Allowance'}</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.housing_allowance || 0, language)}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'بدل المواصلات' : 'Transport Allowance'}</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.transport_allowance || 0, language)}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600">{isRTL ? 'بدلات أخرى' : 'Other Allowances'}</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.other_allowances || 0, language)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm font-medium text-gray-700">{isRTL ? 'إجمالي الراتب' : 'Gross Salary'}</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(totalSalary, language)}</span>
              </div>
            </div>
            <div className={`flex justify-between text-red-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm">{isRTL ? 'خصم التأمينات' : 'GOSI Deduction'}</span>
              <span className="text-sm font-medium">-{formatCurrency(stats.gosi.employeeShare, language)}</span>
            </div>
            {stats.loans.monthlyDeduction > 0 && (
              <div className={`flex justify-between text-red-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm">{isRTL ? 'قسط القرض' : 'Loan Deduction'}</span>
                <span className="text-sm font-medium">-{formatCurrency(stats.loans.monthlyDeduction, language)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3">
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-base font-bold text-gray-900">{isRTL ? 'صافي الراتب' : 'Net Salary'}</span>
                <span className="text-base font-bold text-green-600">{formatCurrency(netSalary, language)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Wallet className="h-5 w-5 text-primary-600" />
            {isRTL ? 'القروض والسلف' : 'Loans & Advances'}
          </h2>
          <div className="space-y-4">
            <div
              onClick={() => navigate('/loans')}
              className={`p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors`}
            >
              <div className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm font-medium text-gray-700">{isRTL ? 'القروض النشطة' : 'Active Loans'}</span>
                <span className="text-lg font-bold text-gray-900">{stats.loans.active}</span>
              </div>
              {stats.loans.totalAmount > 0 && (
                <>
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-500">{isRTL ? 'الرصيد المتبقي' : 'Remaining Balance'}</span>
                    <span className="font-medium text-red-600">{formatCurrency(stats.loans.totalAmount, language)}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-500">{isRTL ? 'القسط الشهري' : 'Monthly Deduction'}</span>
                    <span className="font-medium">{formatCurrency(stats.loans.monthlyDeduction, language)}</span>
                  </div>
                </>
              )}
            </div>

            <div
              onClick={() => navigate('/advances')}
              className={`p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors`}
            >
              <div className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm font-medium text-gray-700">{isRTL ? 'السلف' : 'Advances'}</span>
                <span className="text-lg font-bold text-gray-900">{stats.advances.pending + stats.advances.approved}</span>
              </div>
              {stats.advances.pending > 0 && (
                <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-500">{isRTL ? 'قيد الانتظار' : 'Pending'}</span>
                  <span className="font-medium text-yellow-600">{stats.advances.pending}</span>
                </div>
              )}
              {stats.advances.totalAmount > 0 && (
                <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-500">{isRTL ? 'إجمالي السلف' : 'Total Amount'}</span>
                  <span className="font-medium">{formatCurrency(stats.advances.totalAmount, language)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {stats.leaveBalances.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="h-5 w-5 text-primary-600" />
            {isRTL ? 'رصيد الإجازات التفصيلي' : 'Leave Balance Details'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.leaveBalances.map((lb) => (
              <div key={lb.leave_type_id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className={`text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? (lb.leave_type?.name_ar || lb.leave_type?.name_en) : lb.leave_type?.name_en}
                </p>
                <div className={`flex items-end justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="text-2xl font-bold text-green-600">{lb.balance}</p>
                    <p className="text-xs text-gray-500">{isRTL ? 'متاح' : 'Available'}</p>
                  </div>
                  <div className={isRTL ? 'text-left' : 'text-right'}>
                    <p className="text-lg font-medium text-gray-600">{lb.used}</p>
                    <p className="text-xs text-gray-500">{isRTL ? 'مستخدم' : 'Used'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Activity className="h-5 w-5 text-primary-600" />
          {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/leave')}
            className={`flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Calendar className="h-6 w-6 text-blue-600" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="font-medium text-blue-900">{isRTL ? 'طلب إجازة' : 'Request Leave'}</p>
              <p className="text-xs text-blue-600">{isRTL ? 'إنشاء طلب جديد' : 'Create new request'}</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/payroll')}
            className={`flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <FileText className="h-6 w-6 text-green-600" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="font-medium text-green-900">{isRTL ? 'قسيمة الراتب' : 'View Payslip'}</p>
              <p className="text-xs text-green-600">{isRTL ? 'تفاصيل الراتب' : 'Salary details'}</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/loans')}
            className={`flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Wallet className="h-6 w-6 text-orange-600" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="font-medium text-orange-900">{isRTL ? 'طلب قرض' : 'Request Loan'}</p>
              <p className="text-xs text-orange-600">{isRTL ? 'قرض جديد' : 'New loan'}</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/advances')}
            className={`flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <DollarSign className="h-6 w-6 text-purple-600" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="font-medium text-purple-900">{isRTL ? 'طلب سلفة' : 'Request Advance'}</p>
              <p className="text-xs text-purple-600">{isRTL ? 'سلفة جديدة' : 'New advance'}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
