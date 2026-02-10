import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/lib/supabase';
import { Pagination } from '@/components/ui/Pagination';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  X,
  Clock,
  DollarSign,
  FileText,
  User,
  Calendar,
  ChevronDown,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Download,
  BarChart3,
  History,
  Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PenaltyType {
  id: string;
  name_en: string;
  name_ar: string | null;
  description: string | null;
  default_amount: number | null;
  is_percentage: boolean;
  is_active: boolean;
}

interface Employee {
  id: string;
  first_name_en: string;
  last_name_en: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  employee_number: string;
  department_id: string | null;
  departments?: { name_en: string; name_ar: string | null } | null;
}

interface Penalty {
  id: string;
  employee_id: string;
  penalty_type_id: string | null;
  amount: number;
  reason: string;
  incident_date: string;
  evidence_url: string | null;
  status: string;
  apply_to_payroll_month: string;
  finance_rejection_reason: string | null;
  created_at: string;
  sla_deadline: string | null;
  payroll_applied: boolean;
  payroll_applied_at: string | null;
  requested_by: string;
  employees: Employee;
  penalty_types: PenaltyType | null;
}

const DEFAULT_PENALTY_TYPES = [
  { name_en: 'Work Errors', name_ar: 'أخطاء العمل' },
  { name_en: 'Attendance Issues', name_ar: 'مشاكل الحضور' },
  { name_en: 'Policy Violation', name_ar: 'مخالفة السياسات' },
  { name_en: 'Safety Violation', name_ar: 'مخالفة السلامة' },
  { name_en: 'Dress Code Violation', name_ar: 'مخالفة الزي' },
  { name_en: 'Unauthorized Absence', name_ar: 'غياب غير مبرر' },
  { name_en: 'Equipment Damage', name_ar: 'إتلاف المعدات' },
  { name_en: 'Misconduct', name_ar: 'سوء السلوك' },
  { name_en: 'Performance Issues', name_ar: 'مشاكل الأداء' },
  { name_en: 'Other', name_ar: 'أخرى' },
];

export default function Penalties() {
  const { currentCompany } = useCompany();
  const { user, userRole } = useAuth();
  const { language, t, isRTL } = useLanguage();
  const { showToast } = useToast();
  const { logError, logActivity } = useErrorHandler();

  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [penaltyTypes, setPenaltyTypes] = useState<PenaltyType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    penalty_type_id: '',
    custom_type: '',
    amount: '',
    incident_date: format(new Date(), 'yyyy-MM-dd'),
    apply_to_payroll_month: format(new Date(), 'yyyy-MM-01'),
    reason: '',
  });

  const [newPenaltyType, setNewPenaltyType] = useState({
    name_en: '',
    name_ar: '',
    description: '',
    default_amount: '',
    is_percentage: false,
  });

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');

  const isHR = ['hr', 'admin', 'super_admin'].includes(userRole?.role || '');
  const isFinance = ['finance', 'admin', 'super_admin'].includes(userRole?.role || '');
  const canCreate = isHR;
  const canApprove = isFinance;

  const stats = {
    total: penalties.length,
    pending: penalties.filter(p => p.status === 'pending_finance').length,
    approved: penalties.filter(p => p.status === 'approved').length,
    rejected: penalties.filter(p => p.status === 'rejected').length,
    deducted: penalties.filter(p => p.status === 'deducted' || p.payroll_applied).length,
    totalAmount: penalties.reduce((sum, p) => sum + (p.amount || 0), 0),
    approvedAmount: penalties.filter(p => p.status === 'approved' || p.status === 'deducted').reduce((sum, p) => sum + (p.amount || 0), 0),
    thisMonth: penalties.filter(p => {
      const d = new Date(p.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    lastMonth: penalties.filter(p => {
      const d = new Date(p.created_at);
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }).length,
  };

  const penaltiesByType = penaltyTypes.map(pt => ({
    type: language === 'ar' && pt.name_ar ? pt.name_ar : pt.name_en,
    count: penalties.filter(p => p.penalty_type_id === pt.id).length,
    amount: penalties.filter(p => p.penalty_type_id === pt.id).reduce((sum, p) => sum + (p.amount || 0), 0),
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  const employeePenaltyCounts = penalties.reduce((acc, p) => {
    const empId = p.employee_id;
    if (!acc[empId]) {
      acc[empId] = {
        employee: p.employees,
        count: 0,
        totalAmount: 0,
      };
    }
    acc[empId].count++;
    acc[empId].totalAmount += p.amount || 0;
    return acc;
  }, {} as Record<string, { employee: Employee; count: number; totalAmount: number }>);

  const repeatOffenders = Object.values(employeePenaltyCounts)
    .filter(e => e.count >= 2)
    .sort((a, b) => b.count - a.count);

  const getEmployeeName = (emp: Employee | null | undefined) => {
    if (!emp) return '';
    return language === 'ar' && emp.first_name_ar
      ? `${emp.first_name_ar} ${emp.last_name_ar || ''}`
      : `${emp.first_name_en || ''} ${emp.last_name_en || ''}`;
  };

  const exportToExcel = () => {
    const exportData = filteredPenalties.map(p => ({
      [language === 'ar' ? 'رقم الموظف' : 'Employee #']: p.employees?.employee_number || '',
      [language === 'ar' ? 'اسم الموظف' : 'Employee Name']: getEmployeeName(p.employees),
      [language === 'ar' ? 'نوع الجزاء' : 'Penalty Type']: p.penalty_types
        ? (language === 'ar' && p.penalty_types.name_ar ? p.penalty_types.name_ar : p.penalty_types.name_en)
        : '-',
      [language === 'ar' ? 'المبلغ' : 'Amount']: p.amount,
      [language === 'ar' ? 'تاريخ الحادثة' : 'Incident Date']: format(new Date(p.incident_date), 'yyyy-MM-dd'),
      [language === 'ar' ? 'شهر الخصم' : 'Deduction Month']: p.apply_to_payroll_month,
      [language === 'ar' ? 'الحالة' : 'Status']: p.status,
      [language === 'ar' ? 'السبب' : 'Reason']: p.reason,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, language === 'ar' ? 'الجزاءات' : 'Penalties');
    XLSX.writeFile(wb, `penalties_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const employeeHistoryPenalties = selectedEmployeeHistory
    ? penalties.filter(p => p.employee_id === selectedEmployeeHistory)
    : [];

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  async function fetchData() {
    setLoading(true);
    try {
      await Promise.all([fetchPenalties(), fetchPenaltyTypes(), fetchEmployees()]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPenalties() {
    const { data, error } = await supabase
      .from('employee_penalties')
      .select(`
        *,
        employees:employee_id (id, first_name_en, last_name_en, first_name_ar, last_name_ar, employee_number, department_id, departments:department_id (name_en, name_ar)),
        penalty_types:penalty_type_id (id, name_en, name_ar, description, default_amount, is_percentage, is_active)
      `)
      .eq('company_id', currentCompany?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPenalties(data as Penalty[]);
    }
  }

  async function fetchPenaltyTypes() {
    const { data, error } = await supabase
      .from('penalty_types')
      .select('*')
      .eq('company_id', currentCompany?.id)
      .eq('is_active', true)
      .order('name_en');

    if (!error && data) {
      setPenaltyTypes(data);
    }
  }

  async function fetchEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name_en, last_name_en, first_name_ar, last_name_ar, employee_number, department_id, departments:department_id (name_en, name_ar)')
      .eq('company_id', currentCompany?.id)
      .eq('status', 'active')
      .order('first_name_en');

    if (!error && data) {
      setEmployees(data as Employee[]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany || !user) return;

    setSubmitting(true);
    try {
      const slaDeadline = new Date();
      slaDeadline.setDate(slaDeadline.getDate() + 3);

      const { error } = await supabase.from('employee_penalties').insert({
        company_id: currentCompany.id,
        employee_id: formData.employee_id,
        penalty_type_id: formData.penalty_type_id || null,
        amount: parseFloat(formData.amount),
        incident_date: formData.incident_date,
        apply_to_payroll_month: formData.apply_to_payroll_month,
        reason: formData.reason,
        requested_by: user.id,
        status: 'pending_finance',
        sla_deadline: slaDeadline.toISOString(),
      });

      if (error) throw error;

      logActivity('create', 'penalty', { employeeId: formData.employee_id, amount: formData.amount });
      showToast('success', language === 'ar' ? 'تم إنشاء الجزاء بنجاح' : 'Penalty created successfully');
      setShowForm(false);
      setFormData({
        employee_id: '',
        penalty_type_id: '',
        custom_type: '',
        amount: '',
        incident_date: format(new Date(), 'yyyy-MM-dd'),
        apply_to_payroll_month: format(new Date(), 'yyyy-MM-01'),
        reason: '',
      });
      fetchPenalties();
    } catch (error) {
      logError(error, 'medium', { component: 'Penalties', action: 'createPenalty' });
      showToast('error', language === 'ar' ? 'فشل في إنشاء الجزاء' : 'Failed to create penalty');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(penaltyId: string) {
    if (!user) return;
    setActionLoading(penaltyId);
    try {
      const { error } = await supabase
        .from('employee_penalties')
        .update({
          status: 'approved',
          finance_approved_by: user.id,
          finance_approved_at: new Date().toISOString(),
        })
        .eq('id', penaltyId);

      if (error) throw error;
      logActivity('approve', 'penalty', { penaltyId });
      showToast('success', language === 'ar' ? 'تم اعتماد الجزاء' : 'Penalty approved successfully');
      fetchPenalties();
    } catch (error) {
      logError(error, 'medium', { component: 'Penalties', action: 'approvePenalty' });
      showToast('error', language === 'ar' ? 'فشل في اعتماد الجزاء' : 'Failed to approve penalty');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(penaltyId: string, reason: string) {
    if (!user || !reason.trim()) return;
    setActionLoading(penaltyId);
    try {
      const { error } = await supabase
        .from('employee_penalties')
        .update({
          status: 'rejected',
          finance_approved_by: user.id,
          finance_approved_at: new Date().toISOString(),
          finance_rejection_reason: reason,
        })
        .eq('id', penaltyId);

      if (error) throw error;
      logActivity('reject', 'penalty', { penaltyId, reason });
      showToast('success', language === 'ar' ? 'تم رفض الجزاء' : 'Penalty rejected successfully');
      fetchPenalties();
    } catch (error) {
      logError(error, 'medium', { component: 'Penalties', action: 'rejectPenalty' });
      showToast('error', language === 'ar' ? 'فشل في رفض الجزاء' : 'Failed to reject penalty');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddPenaltyType(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const { error } = await supabase.from('penalty_types').insert({
        company_id: currentCompany.id,
        name_en: newPenaltyType.name_en,
        name_ar: newPenaltyType.name_ar || null,
        description: newPenaltyType.description || null,
        default_amount: newPenaltyType.default_amount ? parseFloat(newPenaltyType.default_amount) : null,
        is_percentage: newPenaltyType.is_percentage,
        is_active: true,
      });

      if (error) throw error;

      logActivity('create', 'penaltyType', { name: newPenaltyType.name_en });
      showToast('success', language === 'ar' ? 'تم إضافة نوع الجزاء' : 'Penalty type added successfully');
      setNewPenaltyType({
        name_en: '',
        name_ar: '',
        description: '',
        default_amount: '',
        is_percentage: false,
      });
      fetchPenaltyTypes();
    } catch (error) {
      logError(error, 'medium', { component: 'Penalties', action: 'addPenaltyType' });
      showToast('error', language === 'ar' ? 'فشل في إضافة نوع الجزاء' : 'Failed to add penalty type');
    }
  }

  async function seedDefaultTypes() {
    if (!currentCompany) return;

    try {
      const typesToInsert = DEFAULT_PENALTY_TYPES.map((pt) => ({
        company_id: currentCompany.id,
        name_en: pt.name_en,
        name_ar: pt.name_ar,
        is_active: true,
      }));

      const { error } = await supabase.from('penalty_types').insert(typesToInsert);
      if (error) throw error;
      logActivity('create', 'penaltyTypes', { action: 'seedDefaults' });
      showToast('success', language === 'ar' ? 'تم إضافة الأنواع الافتراضية' : 'Default types added successfully');
      fetchPenaltyTypes();
    } catch (error) {
      logError(error, 'medium', { component: 'Penalties', action: 'seedDefaultTypes' });
      showToast('error', language === 'ar' ? 'فشل في إضافة الأنواع الافتراضية' : 'Failed to seed default types');
    }
  }

  const filteredPenalties = penalties.filter((p) => {
    const empName = language === 'ar'
      ? `${p.employees?.first_name_ar || ''} ${p.employees?.last_name_ar || ''}`
      : `${p.employees?.first_name_en || ''} ${p.employees?.last_name_en || ''}`;

    const matchesSearch =
      empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employees?.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const penaltyPagination = usePagination(filteredPenalties, { initialPageSize: 25 });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_finance: 'bg-amber-100 text-amber-800 border-amber-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      deducted: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    const labels: Record<string, string> = {
      pending_finance: language === 'ar' ? 'بانتظار المالية' : 'Pending Finance',
      approved: language === 'ar' ? 'معتمد' : 'Approved',
      rejected: language === 'ar' ? 'مرفوض' : 'Rejected',
      deducted: language === 'ar' ? 'تم الخصم' : 'Deducted',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSLAIndicator = (deadline: string | null, status: string) => {
    if (!deadline || !['pending_finance'].includes(status)) return null;
    const now = new Date();
    const sla = new Date(deadline);
    const hoursLeft = (sla.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      return <span className="text-red-600 text-xs font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Overdue</span>;
    } else if (hoursLeft < 24) {
      return <span className="text-amber-600 text-xs font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(hoursLeft)}h left</span>;
    }
    return <span className="text-green-600 text-xs font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(hoursLeft / 24)}d left</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
            {language === 'ar' ? 'الجزاءات والخصومات' : 'Penalties & Deductions'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar'
              ? 'إدارة جزاءات الموظفين وطلبات الخصم من الراتب'
              : 'Manage employee penalties and salary deduction requests'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </button>
          {isHR && (
            <button
              onClick={() => setShowTypeManager(!showTypeManager)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {language === 'ar' ? 'إدارة الأنواع' : 'Manage Types'}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'إضافة جزاء' : 'Add Penalty'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'بانتظار الموافقة' : 'Pending'}</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'معتمد' : 'Approved'}</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'مرفوض' : 'Rejected'}</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'إجمالي المبالغ' : 'Total Amount'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">SAR</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
              {stats.thisMonth > stats.lastMonth ? (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +{stats.thisMonth - stats.lastMonth}
                </p>
              ) : stats.thisMonth < stats.lastMonth ? (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> {stats.thisMonth - stats.lastMonth}
                </p>
              ) : null}
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {language === 'ar' ? 'قائمة الجزاءات' : 'Penalties List'}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              {language === 'ar' ? 'التحليلات' : 'Analytics'}
            </button>
          </nav>
        </div>

        {activeTab === 'analytics' && (
          <div className="p-6 space-y-6">
            {/* Analytics by Type */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary-600" />
                  {language === 'ar' ? 'حسب النوع' : 'By Type'}
                </h3>
                <div className="space-y-3">
                  {penaltiesByType.length === 0 ? (
                    <p className="text-gray-500 text-sm">{language === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
                  ) : (
                    penaltiesByType.slice(0, 6).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{item.type}</span>
                            <span className="text-gray-500">{item.count} ({item.amount.toLocaleString()} SAR)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 rounded-full"
                              style={{ width: `${(item.count / stats.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Repeat Offenders */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  {language === 'ar' ? 'تكرار المخالفات' : 'Repeat Offenders'}
                </h3>
                {repeatOffenders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>{language === 'ar' ? 'لا يوجد موظفون بمخالفات متكررة' : 'No repeat offenders'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {repeatOffenders.slice(0, 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => setSelectedEmployeeHistory(item.employee?.id || null)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            item.count >= 5 ? 'bg-red-600' : item.count >= 3 ? 'bg-amber-500' : 'bg-amber-400'
                          }`}>
                            {item.count}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{getEmployeeName(item.employee)}</p>
                            <p className="text-xs text-gray-500">{item.employee?.employee_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">{item.totalAmount.toLocaleString()} SAR</p>
                          <p className="text-xs text-gray-500">
                            {language === 'ar' ? 'إجمالي الخصومات' : 'Total deductions'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'list' && (
        <>
      {showTypeManager && isHR && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            {language === 'ar' ? 'أنواع الجزاءات' : 'Penalty Types'}
          </h3>

          {penaltyTypes.length === 0 && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 mb-2">
                {language === 'ar' ? 'لم يتم إعداد أنواع الجزاءات بعد.' : 'No penalty types configured yet.'}
              </p>
              <button
                onClick={seedDefaultTypes}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
              >
                {language === 'ar' ? 'إضافة الأنواع الافتراضية' : 'Add Default Types'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
            {penaltyTypes.map((pt) => (
              <div key={pt.id} className="px-3 py-2 bg-gray-50 rounded-lg border text-sm">
                {language === 'ar' && pt.name_ar ? pt.name_ar : pt.name_en}
                {pt.default_amount && (
                  <span className="text-gray-500 text-xs ml-1">
                    ({pt.default_amount}{pt.is_percentage ? '%' : ' SAR'})
                  </span>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddPenaltyType} className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (EN)'}</label>
              <input
                type="text"
                value={newPenaltyType.name_en}
                onChange={(e) => setNewPenaltyType({ ...newPenaltyType, name_en: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{language === 'ar' ? 'الاسم (عربي)' : 'Name (AR)'}</label>
              <input
                type="text"
                value={newPenaltyType.name_ar}
                onChange={(e) => setNewPenaltyType({ ...newPenaltyType, name_ar: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{language === 'ar' ? 'المبلغ الافتراضي' : 'Default Amount'}</label>
              <input
                type="number"
                value={newPenaltyType.default_amount}
                onChange={(e) => setNewPenaltyType({ ...newPenaltyType, default_amount: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-24"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
            >
              {language === 'ar' ? 'إضافة' : 'Add'}
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`} />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
          />
        </div>
        <div className="relative">
          <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${isRTL ? 'pr-10 pl-8' : 'pl-10 pr-8'} py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white`}
          >
            <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
            <option value="pending_finance">{language === 'ar' ? 'بانتظار المالية' : 'Pending Finance'}</option>
            <option value="approved">{language === 'ar' ? 'معتمد' : 'Approved'}</option>
            <option value="rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</option>
            <option value="deducted">{language === 'ar' ? 'تم الخصم' : 'Deducted'}</option>
          </select>
          <ChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none`} />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredPenalties.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {language === 'ar' ? 'لا توجد جزاءات' : 'No Penalties Found'}
            </h3>
            <p className="text-gray-500">
              {language === 'ar' ? 'لم يتم تسجيل أي جزاءات بعد' : 'No penalties have been recorded yet'}
            </p>
          </div>
        ) : (
          <>
            {penaltyPagination.paginatedData.map((penalty) => (
              <PenaltyCard
                key={penalty.id}
                penalty={penalty}
                language={language}
                isRTL={isRTL}
                canApprove={canApprove}
                actionLoading={actionLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                getStatusBadge={getStatusBadge}
                getSLAIndicator={getSLAIndicator}
                onViewHistory={() => setSelectedEmployeeHistory(penalty.employee_id)}
              />
            ))}
            <Pagination
              currentPage={penaltyPagination.currentPage}
              totalPages={penaltyPagination.totalPages}
              totalItems={penaltyPagination.totalItems}
              pageSize={penaltyPagination.pageSize}
              onPageChange={penaltyPagination.goToPage}
              onPageSizeChange={penaltyPagination.setPageSize}
              isRTL={isRTL}
            />
          </>
        )}
      </div>
        </>
      )}

      {/* Employee History Modal */}
      {selectedEmployeeHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5 text-primary-600" />
                {language === 'ar' ? 'سجل جزاءات الموظف' : 'Employee Penalty History'}
              </h2>
              <button onClick={() => setSelectedEmployeeHistory(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {employeeHistoryPenalties.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ${
                      employeeHistoryPenalties.length >= 5 ? 'bg-red-600' : employeeHistoryPenalties.length >= 3 ? 'bg-amber-500' : 'bg-gray-500'
                    }`}>
                      {employeeHistoryPenalties.length}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{getEmployeeName(employeeHistoryPenalties[0]?.employees)}</p>
                      <p className="text-gray-500">{employeeHistoryPenalties[0]?.employees?.employee_number}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-bold text-red-600">
                        {employeeHistoryPenalties.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()} SAR
                      </p>
                      <p className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي الخصومات' : 'Total Deductions'}</p>
                    </div>
                  </div>
                  {employeeHistoryPenalties.length >= 3 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {language === 'ar'
                          ? 'تحذير: هذا الموظف لديه سجل جزاءات متكررة. يُنصح بمراجعة الأداء.'
                          : 'Warning: This employee has repeated penalties. Performance review recommended.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {employeeHistoryPenalties.map((p, idx) => (
                  <div key={p.id} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {employeeHistoryPenalties.length - idx}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {p.penalty_types
                            ? (language === 'ar' && p.penalty_types.name_ar ? p.penalty_types.name_ar : p.penalty_types.name_en)
                            : (language === 'ar' ? 'نوع مخصص' : 'Custom')}
                        </span>
                        {getStatusBadge(p.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{p.reason}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(p.incident_date), 'dd/MM/yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {p.amount.toLocaleString()} SAR
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <PenaltyFormModal
          formData={formData}
          setFormData={setFormData}
          employees={employees}
          penaltyTypes={penaltyTypes}
          language={language}
          isRTL={isRTL}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

interface PenaltyCardProps {
  penalty: Penalty;
  language: string;
  isRTL: boolean;
  canApprove: boolean;
  actionLoading: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  getStatusBadge: (status: string) => JSX.Element;
  getSLAIndicator: (deadline: string | null, status: string) => JSX.Element | null;
  onViewHistory: () => void;
}

function PenaltyCard({
  penalty,
  language,
  isRTL,
  canApprove,
  actionLoading,
  onApprove,
  onReject,
  getStatusBadge,
  getSLAIndicator,
  onViewHistory,
}: PenaltyCardProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(penalty.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  {language === 'ar' && penalty.employees?.first_name_ar
                    ? `${penalty.employees.first_name_ar} ${penalty.employees.last_name_ar || ''}`
                    : `${penalty.employees?.first_name_en || ''} ${penalty.employees?.last_name_en || ''}`}
                  <span className="text-sm text-gray-500 font-normal">
                    ({penalty.employees?.employee_number})
                  </span>
                </h3>
                {penalty.employees?.departments && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {language === 'ar' && penalty.employees.departments.name_ar
                      ? penalty.employees.departments.name_ar
                      : penalty.employees.departments.name_en}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getSLAIndicator(penalty.sla_deadline, penalty.status)}
                {getStatusBadge(penalty.status)}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="font-medium">
                  {penalty.penalty_types
                    ? (language === 'ar' && penalty.penalty_types.name_ar
                        ? penalty.penalty_types.name_ar
                        : penalty.penalty_types.name_en)
                    : (language === 'ar' ? 'نوع مخصص' : 'Custom')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="font-semibold text-red-600">{penalty.amount.toLocaleString()} SAR</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{language === 'ar' ? 'تاريخ الحادثة:' : 'Incident:'} {format(new Date(penalty.incident_date), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{language === 'ar' ? 'شهر الخصم:' : 'Deduct in:'} {format(new Date(penalty.apply_to_payroll_month), 'MMM yyyy')}</span>
              </div>
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{language === 'ar' ? 'السبب:' : 'Reason:'}</span> {penalty.reason}
              </p>
            </div>

            {penalty.status === 'rejected' && penalty.finance_rejection_reason && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <span className="font-medium">{language === 'ar' ? 'سبب الرفض:' : 'Rejection Reason:'}</span>{' '}
                  {penalty.finance_rejection_reason}
                </p>
              </div>
            )}
          </div>

          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} gap-2 lg:flex-col`}>
            <button
              onClick={onViewHistory}
              className="flex items-center gap-1.5 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <History className="h-4 w-4" />
              {language === 'ar' ? 'السجل' : 'History'}
            </button>
            {canApprove && penalty.status === 'pending_finance' && (
              <>
                <button
                  onClick={() => onApprove(penalty.id)}
                  disabled={actionLoading === penalty.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === penalty.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {language === 'ar' ? 'اعتماد' : 'Approve'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading === penalty.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {language === 'ar' ? 'رفض' : 'Reject'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder={language === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface PenaltyFormModalProps {
  formData: {
    employee_id: string;
    penalty_type_id: string;
    custom_type: string;
    amount: string;
    incident_date: string;
    apply_to_payroll_month: string;
    reason: string;
  };
  setFormData: (data: typeof formData) => void;
  employees: Employee[];
  penaltyTypes: PenaltyType[];
  language: string;
  isRTL: boolean;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function PenaltyFormModal({
  formData,
  setFormData,
  employees,
  penaltyTypes,
  language,
  isRTL,
  submitting,
  onSubmit,
  onClose,
}: PenaltyFormModalProps) {
  const selectedType = penaltyTypes.find((pt) => pt.id === formData.penalty_type_id);

  useEffect(() => {
    if (selectedType?.default_amount && !formData.amount) {
      setFormData({ ...formData, amount: selectedType.default_amount.toString() });
    }
  }, [formData.penalty_type_id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            {language === 'ar' ? 'إضافة جزاء جديد' : 'Add New Penalty'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'ar' ? 'الموظف' : 'Employee'} *
            </label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">{language === 'ar' ? 'اختر موظف...' : 'Select employee...'}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {language === 'ar' && emp.first_name_ar
                    ? `${emp.first_name_ar} ${emp.last_name_ar || ''}`
                    : `${emp.first_name_en} ${emp.last_name_en}`} ({emp.employee_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'ar' ? 'نوع الجزاء' : 'Penalty Type'} *
            </label>
            <select
              value={formData.penalty_type_id}
              onChange={(e) => setFormData({ ...formData, penalty_type_id: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">{language === 'ar' ? 'اختر نوع...' : 'Select type...'}</option>
              {penaltyTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {language === 'ar' && pt.name_ar ? pt.name_ar : pt.name_en}
                  {pt.default_amount && ` (${pt.default_amount} SAR)`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'ar' ? 'المبلغ (ر.س)' : 'Amount (SAR)'} *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'تاريخ الحادثة' : 'Incident Date'} *
              </label>
              <input
                type="date"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'شهر الخصم' : 'Deduction Month'} *
              </label>
              <input
                type="month"
                value={formData.apply_to_payroll_month.substring(0, 7)}
                onChange={(e) => setFormData({ ...formData, apply_to_payroll_month: e.target.value + '-01' })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'ar' ? 'السبب / التفاصيل' : 'Reason / Details'} *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={3}
              required
              placeholder={language === 'ar' ? 'اكتب تفاصيل الجزاء...' : 'Describe the penalty details...'}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {language === 'ar'
                ? 'سيتم إرسال هذا الجزاء إلى الإدارة المالية للاعتماد قبل خصمه من الراتب.'
                : 'This penalty will be sent to Finance for approval before being deducted from salary.'}
            </p>
          </div>

          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} gap-3 pt-4`}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {language === 'ar' ? 'إرسال للمالية' : 'Submit to Finance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
