import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { supabase } from '@/lib/supabase';
import {
  Calculator,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Shield,
  CreditCard,
  Briefcase,
  ArrowLeft,
  RefreshCw,
  Building2,
} from 'lucide-react';

interface EmployeeSalaryInfo {
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transportation_allowance: number;
  other_allowances: number;
}

interface EmployeeInfo {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  first_name_ar: string;
  last_name_ar: string;
  is_saudi: boolean;
  department_id: string;
  department?: { name_en: string; name_ar: string } | null;
}

interface CalculatedItem {
  employee: EmployeeInfo;
  basicSalary: number;
  housingAllowance: number;
  transportationAllowance: number;
  otherAllowances: number;
  customEarnings: number;
  customEarningsDetail: { name: string; amount: number }[];
  totalEarnings: number;
  gosiEmployee: number;
  gosiEmployer: number;
  gosiBase: number;
  loanDeduction: number;
  loanDetail: { type: string; installment: number; remaining: number }[];
  advanceDeduction: number;
  advanceDetail: { amount: number; remaining: number }[];
  penaltyDeduction: number;
  penaltyDetail: { reason: string; amount: number }[];
  absenceDeduction: number;
  absenceDays: number;
  customDeductions: number;
  customDeductionsDetail: { name: string; amount: number }[];
  totalDeductions: number;
  netSalary: number;
  daysWorked: number;
}

interface BatchSummary {
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalGosiEmployee: number;
  totalGosiEmployer: number;
  totalLoans: number;
  totalAdvances: number;
  totalPenalties: number;
  totalAbsences: number;
  totalCustomEarnings: number;
  totalCustomDeductions: number;
}

interface PayrollBatchCreatorProps {
  onBack: () => void;
  onBatchCreated: (batchId: string) => void;
}

export function PayrollBatchCreator({ onBack, onBatchCreated }: PayrollBatchCreatorProps) {
  const { currentCompany } = useCompany();
  const { language, isRTL } = useLanguage();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const { logError, logActivity } = useErrorHandler();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [step, setStep] = useState<'config' | 'preview' | 'creating'>('config');
  const [calculating, setCalculating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [calculatedItems, setCalculatedItems] = useState<CalculatedItem[]>([]);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [existingBatch, setExistingBatch] = useState(false);

  const checkExistingBatch = useCallback(async () => {
    if (!currentCompany) return;
    const { data } = await supabase
      .from('payroll_batches')
      .select('id')
      .eq('company_id', currentCompany.id)
      .eq('month', selectedMonth)
      .maybeSingle();
    setExistingBatch(!!data);
  }, [currentCompany, selectedMonth]);

  useEffect(() => {
    checkExistingBatch();
  }, [checkExistingBatch]);

  const calculatePayroll = async () => {
    if (!currentCompany) return;
    setCalculating(true);
    setStep('preview');

    try {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, is_saudi, department_id, department:departments(name_en, name_ar)')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('employee_number');

      if (!employees || employees.length === 0) {
        showToast({ type: 'warning', title: 'No active employees found' });
        setStep('config');
        setCalculating(false);
        return;
      }

      const { data: latestPayroll } = await supabase
        .from('payroll')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('effective_from', { ascending: false });

      const salaryMap = new Map<string, EmployeeSalaryInfo>();
      latestPayroll?.forEach(p => {
        if (!salaryMap.has(p.employee_id)) {
          salaryMap.set(p.employee_id, {
            employee_id: p.employee_id,
            basic_salary: Number(p.basic_salary) || 0,
            housing_allowance: Number(p.housing_allowance) || 0,
            transportation_allowance: Number(p.transportation_allowance) || 0,
            other_allowances: Number(p.other_allowances) || 0,
          });
        }
      });

      const periodStart = new Date(selectedMonth + '-01');
      const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
      const periodStartStr = periodStart.toISOString().split('T')[0];
      const periodEndStr = periodEnd.toISOString().split('T')[0];
      const daysInMonth = periodEnd.getDate();
      const gosiMonth = periodStartStr;

      const { data: approvedLeaves } = await supabase
        .from('leave_requests')
        .select('employee_id, total_days, leave_type:leave_types!leave_requests_leave_type_id_fkey(is_paid)')
        .eq('company_id', currentCompany.id)
        .eq('status', 'approved')
        .gte('start_date', periodStartStr)
        .lte('end_date', periodEndStr);

      const unpaidLeaveMap: Record<string, number> = {};
      (approvedLeaves || []).forEach((l: any) => {
        if (l.leave_type && !l.leave_type.is_paid) {
          unpaidLeaveMap[l.employee_id] = (unpaidLeaveMap[l.employee_id] || 0) + (l.total_days || 0);
        }
      });

      const { data: activeLoans } = await supabase
        .from('loans')
        .select('employee_id, loan_type, monthly_installment, remaining_amount, status')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active');

      const loanMap: Record<string, { type: string; installment: number; remaining: number }[]> = {};
      (activeLoans || []).forEach((l: any) => {
        if (!loanMap[l.employee_id]) loanMap[l.employee_id] = [];
        loanMap[l.employee_id].push({
          type: l.loan_type || 'loan',
          installment: Number(l.monthly_installment) || 0,
          remaining: Number(l.remaining_amount) || 0,
        });
      });

      const { data: approvedAdvances } = await supabase
        .from('advances')
        .select('employee_id, amount, remaining_amount, deduction_amount, status')
        .eq('company_id', currentCompany.id)
        .in('status', ['approved', 'active']);

      const advanceMap: Record<string, { amount: number; remaining: number; deduction: number }[]> = {};
      (approvedAdvances || []).forEach((a: any) => {
        const remaining = Number(a.remaining_amount) || 0;
        if (remaining <= 0) return;
        if (!advanceMap[a.employee_id]) advanceMap[a.employee_id] = [];
        advanceMap[a.employee_id].push({
          amount: Number(a.amount) || 0,
          remaining,
          deduction: Number(a.deduction_amount) || 0,
        });
      });

      const { data: approvedPenalties } = await supabase
        .from('employee_penalties')
        .select('employee_id, amount, reason')
        .eq('company_id', currentCompany.id)
        .eq('status', 'approved')
        .eq('payroll_applied', false);

      const penaltyMap: Record<string, { reason: string; amount: number }[]> = {};
      (approvedPenalties || []).forEach((p: any) => {
        if (!penaltyMap[p.employee_id]) penaltyMap[p.employee_id] = [];
        penaltyMap[p.employee_id].push({
          reason: p.reason || 'Penalty',
          amount: Number(p.amount) || 0,
        });
      });

      const { data: customEarnings } = await supabase
        .from('employee_earnings')
        .select('employee_id, amount, earning_type:earnings_types(name_en, name_ar)')
        .eq('company_id', currentCompany.id)
        .lte('effective_date', periodEndStr)
        .or(`end_date.is.null,end_date.gte.${periodStartStr}`);

      const earningsMap: Record<string, { name: string; amount: number }[]> = {};
      (customEarnings || []).forEach((e: any) => {
        if (!earningsMap[e.employee_id]) earningsMap[e.employee_id] = [];
        earningsMap[e.employee_id].push({
          name: (language === 'ar' ? e.earning_type?.name_ar : e.earning_type?.name_en) || 'Earning',
          amount: Number(e.amount) || 0,
        });
      });

      const { data: customDeductions } = await supabase
        .from('employee_deductions')
        .select('employee_id, amount, deduction_type:deduction_types(name_en, name_ar)')
        .eq('company_id', currentCompany.id)
        .lte('effective_date', periodEndStr)
        .or(`end_date.is.null,end_date.gte.${periodStartStr}`);

      const deductionsMap: Record<string, { name: string; amount: number }[]> = {};
      (customDeductions || []).forEach((d: any) => {
        if (!deductionsMap[d.employee_id]) deductionsMap[d.employee_id] = [];
        deductionsMap[d.employee_id].push({
          name: (language === 'ar' ? d.deduction_type?.name_ar : d.deduction_type?.name_en) || 'Deduction',
          amount: Number(d.amount) || 0,
        });
      });

      const items: CalculatedItem[] = [];

      for (const emp of employees as any[]) {
        const salary = salaryMap.get(emp.id);
        const basicSalary = salary?.basic_salary || 0;
        const housingAllowance = salary?.housing_allowance || 0;
        const transportationAllowance = salary?.transportation_allowance || 0;
        const otherAllowances = salary?.other_allowances || 0;

        const empCustomEarnings = earningsMap[emp.id] || [];
        const customEarningsTotal = empCustomEarnings.reduce((s, e) => s + e.amount, 0);

        const totalEarnings = basicSalary + housingAllowance + transportationAllowance + otherAllowances + customEarningsTotal;

        let gosiEmployee = 0;
        let gosiEmployer = 0;
        let gosiBase = 0;

        try {
          const { data: ratesData } = await supabase.rpc('get_employee_gosi_rates', {
            p_employee_id: emp.id,
            p_company_id: currentCompany.id,
          });
          if (ratesData && ratesData.length > 0) {
            const rates = ratesData[0];
            gosiBase = Math.min(basicSalary + housingAllowance, Number(rates.max_wage_ceiling) || 45000);
            gosiEmployee = gosiBase * Number(rates.employee_rate);
            gosiEmployer = gosiBase * Number(rates.employer_rate);
          }
        } catch {
          // fallback defaults
        }

        const empLoans = loanMap[emp.id] || [];
        const loanDeduction = empLoans.reduce((s, l) => s + l.installment, 0);

        const empAdvances = advanceMap[emp.id] || [];
        const advanceDeduction = empAdvances.reduce((s, a) => s + Math.min(a.deduction, a.remaining), 0);

        const empPenalties = penaltyMap[emp.id] || [];
        const penaltyDeduction = empPenalties.reduce((s, p) => s + p.amount, 0);

        const unpaidDays = unpaidLeaveMap[emp.id] || 0;
        const dailyRate = basicSalary / (daysInMonth || 30);
        const absenceDeduction = dailyRate * unpaidDays;

        const empCustomDeductions = deductionsMap[emp.id] || [];
        const customDeductionsTotal = empCustomDeductions.reduce((s, d) => s + d.amount, 0);

        const totalDeductions = gosiEmployee + loanDeduction + advanceDeduction + penaltyDeduction + absenceDeduction + customDeductionsTotal;
        const netSalary = totalEarnings - totalDeductions;

        items.push({
          employee: emp as EmployeeInfo,
          basicSalary,
          housingAllowance,
          transportationAllowance,
          otherAllowances,
          customEarnings: customEarningsTotal,
          customEarningsDetail: empCustomEarnings,
          totalEarnings,
          gosiEmployee,
          gosiEmployer,
          gosiBase,
          loanDeduction,
          loanDetail: empLoans,
          advanceDeduction,
          advanceDetail: empAdvances.map(a => ({ amount: a.amount, remaining: a.remaining })),
          penaltyDeduction,
          penaltyDetail: empPenalties,
          absenceDeduction,
          absenceDays: unpaidDays,
          customDeductions: customDeductionsTotal,
          customDeductionsDetail: empCustomDeductions,
          totalDeductions,
          netSalary,
          daysWorked: daysInMonth - unpaidDays,
        });
      }

      setCalculatedItems(items);

      const batchSummary: BatchSummary = {
        totalEmployees: items.length,
        totalGross: items.reduce((s, i) => s + i.totalEarnings, 0),
        totalDeductions: items.reduce((s, i) => s + i.totalDeductions, 0),
        totalNet: items.reduce((s, i) => s + i.netSalary, 0),
        totalGosiEmployee: items.reduce((s, i) => s + i.gosiEmployee, 0),
        totalGosiEmployer: items.reduce((s, i) => s + i.gosiEmployer, 0),
        totalLoans: items.reduce((s, i) => s + i.loanDeduction, 0),
        totalAdvances: items.reduce((s, i) => s + i.advanceDeduction, 0),
        totalPenalties: items.reduce((s, i) => s + i.penaltyDeduction, 0),
        totalAbsences: items.reduce((s, i) => s + i.absenceDeduction, 0),
        totalCustomEarnings: items.reduce((s, i) => s + i.customEarnings, 0),
        totalCustomDeductions: items.reduce((s, i) => s + i.customDeductions, 0),
      };
      setSummary(batchSummary);
    } catch (error: any) {
      logError(error, 'medium', { component: 'PayrollBatchCreator', action: 'calculatePayroll' });
      showToast({ type: 'error', title: 'Failed to calculate payroll', message: error.message });
      setStep('config');
    } finally {
      setCalculating(false);
    }
  };

  const confirmAndCreate = async () => {
    if (!currentCompany || !summary || calculatedItems.length === 0) return;
    setCreating(true);

    try {
      const periodStart = new Date(selectedMonth + '-01');
      const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
      const daysInMonth = periodEnd.getDate();
      const gosiMonth = periodStart.toISOString().split('T')[0];

      const { data: batch, error: batchError } = await supabase
        .from('payroll_batches')
        .insert([{
          company_id: currentCompany.id,
          month: selectedMonth,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          total_employees: summary.totalEmployees,
          total_gross: summary.totalGross,
          total_net: summary.totalNet,
          total_deductions: summary.totalDeductions,
          status: 'draft',
        }])
        .select()
        .single();

      if (batchError) throw batchError;

      const payrollItemsToInsert = calculatedItems.map(item => ({
        batch_id: batch.id,
        employee_id: item.employee.id,
        company_id: currentCompany.id,
        basic_salary: item.basicSalary,
        housing_allowance: item.housingAllowance,
        transportation_allowance: item.transportationAllowance,
        other_allowances: item.otherAllowances + item.customEarnings,
        total_earnings: item.totalEarnings,
        gosi_employee: item.gosiEmployee,
        gosi_employer: item.gosiEmployer,
        loan_deduction: item.loanDeduction,
        advance_deduction: item.advanceDeduction,
        absence_deduction: item.absenceDeduction,
        other_deductions: item.penaltyDeduction + item.customDeductions,
        total_deductions: item.totalDeductions,
        net_salary: item.netSalary,
        days_worked: item.daysWorked,
        absence_days: item.absenceDays,
        payment_method: 'wps',
        payment_status: 'pending',
      }));

      if (payrollItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('payroll_items')
          .insert(payrollItemsToInsert);
        if (itemsError) throw itemsError;
      }

      const gosiRecords = calculatedItems
        .filter(item => item.gosiEmployee > 0 || item.gosiEmployer > 0)
        .map(item => ({
          employee_id: item.employee.id,
          company_id: currentCompany.id,
          month: gosiMonth,
          wage_subject_to_gosi: item.gosiBase,
          employee_contribution: item.gosiEmployee,
          employer_contribution: item.gosiEmployer,
          total_contribution: item.gosiEmployee + item.gosiEmployer,
          payment_status: 'pending',
        }));

      if (gosiRecords.length > 0) {
        const { error: gosiError } = await supabase
          .from('gosi_contributions')
          .upsert(gosiRecords, { onConflict: 'employee_id,month' });
        if (gosiError) {
          logError(gosiError, 'low', { component: 'PayrollBatchCreator', action: 'recordGOSI' });
        }
      }

      const penaltyEmployeeIds = calculatedItems
        .filter(item => item.penaltyDeduction > 0)
        .map(item => item.employee.id);

      if (penaltyEmployeeIds.length > 0) {
        await supabase
          .from('employee_penalties')
          .update({ payroll_applied: true, payroll_applied_at: new Date().toISOString() })
          .eq('company_id', currentCompany.id)
          .eq('status', 'approved')
          .eq('payroll_applied', false);
      }

      showToast({
        type: 'success',
        title: `Payroll batch created for ${selectedMonth}`,
        message: `${summary.totalEmployees} employees processed. Net total: SAR ${summary.totalNet.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      });
      logActivity('payroll_batch_created', {
        month: selectedMonth,
        employeeCount: summary.totalEmployees,
        totalNet: summary.totalNet,
      });
      onBatchCreated(batch.id);
    } catch (error: any) {
      logError(error, 'high', { component: 'PayrollBatchCreator', action: 'confirmAndCreate' });
      showToast({ type: 'error', title: 'Failed to create batch', message: error.message });
    } finally {
      setCreating(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });
  })();

  if (step === 'config') {
    return (
      <div className="space-y-6">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className={`h-5 w-5 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'ar' ? 'إنشاء دفعة رواتب جديدة' : 'Create New Salary Batch'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {language === 'ar' ? 'حساب شامل للرواتب مع جميع البدلات والاستقطاعات' : 'Comprehensive salary calculation with all allowances and deductions'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-semibold text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {language === 'ar' ? 'اختر الشهر' : 'Select Payroll Month'}
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>

            {existingBatch && (
              <div className={`flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">
                    {language === 'ar' ? 'دفعة موجودة مسبقاً' : 'Batch Already Exists'}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {language === 'ar'
                      ? 'يوجد بالفعل دفعة رواتب لهذا الشهر. يرجى اختيار شهر مختلف أو حذف الدفعة الحالية.'
                      : 'A payroll batch already exists for this month. Please select a different month or delete the existing batch.'}
                  </p>
                </div>
              </div>
            )}

            <div className={`bg-gray-50 rounded-lg p-5 space-y-3 ${isRTL ? 'text-right' : ''}`}>
              <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                {language === 'ar' ? 'ما سيتم حسابه تلقائياً' : 'Auto-Calculated Components'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: DollarSign, label: language === 'ar' ? 'الراتب الأساسي والبدلات' : 'Base Salary & Allowances', color: 'text-green-600' },
                  { icon: Shield, label: language === 'ar' ? 'اشتراكات التأمينات (GOSI)' : 'GOSI Contributions', color: 'text-blue-600' },
                  { icon: CreditCard, label: language === 'ar' ? 'أقساط القروض النشطة' : 'Active Loan Installments', color: 'text-orange-600' },
                  { icon: Briefcase, label: language === 'ar' ? 'خصم السلف المعتمدة' : 'Approved Advance Deductions', color: 'text-red-600' },
                  { icon: AlertTriangle, label: language === 'ar' ? 'الجزاءات المعتمدة' : 'Approved Penalties', color: 'text-amber-600' },
                  { icon: FileText, label: language === 'ar' ? 'خصم الإجازات غير المدفوعة' : 'Unpaid Leave Deductions', color: 'text-gray-600' },
                  { icon: Users, label: language === 'ar' ? 'البدلات المخصصة للموظفين' : 'Custom Employee Allowances', color: 'text-teal-600' },
                  { icon: Calculator, label: language === 'ar' ? 'الاستقطاعات المخصصة' : 'Custom Deductions', color: 'text-rose-600' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <item.icon className={`h-4 w-4 ${item.color} shrink-0`} />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`flex gap-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={onBack}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={calculatePayroll}
                disabled={existingBatch}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Calculator className="h-5 w-5" />
                {language === 'ar' ? 'حساب ومعاينة الرواتب' : 'Calculate & Preview'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (calculating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-lg font-medium text-gray-700">
          {language === 'ar' ? 'جاري حساب الرواتب...' : 'Calculating payroll...'}
        </p>
        <p className="text-sm text-gray-500">
          {language === 'ar' ? 'يتم جمع البيانات من التأمينات والقروض والسلف والجزاءات والإجازات' : 'Gathering GOSI, loans, advances, penalties, leaves, and allowances'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setStep('config')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className={`h-5 w-5 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'ar' ? 'معاينة دفعة الرواتب' : 'Payroll Batch Preview'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {monthLabel} - {summary?.totalEmployees} {language === 'ar' ? 'موظف' : 'employees'}
            </p>
          </div>
        </div>
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => { setStep('config'); setCalculatedItems([]); setSummary(null); }}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <RefreshCw className="h-4 w-4" />
            {language === 'ar' ? 'إعادة الحساب' : 'Recalculate'}
          </button>
          <button
            onClick={confirmAndCreate}
            disabled={creating || calculatedItems.length === 0}
            className={`flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {creating
              ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
              : (language === 'ar' ? 'تأكيد وإنشاء الدفعة' : 'Confirm & Create Batch')}
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label={language === 'ar' ? 'إجمالي المستحقات' : 'Total Earnings'}
            value={`SAR ${fmt(summary.totalGross)}`}
            icon={DollarSign}
            color="bg-green-50 text-green-700 border-green-200"
            iconColor="text-green-600"
            isRTL={isRTL}
          />
          <SummaryCard
            label={language === 'ar' ? 'إجمالي الاستقطاعات' : 'Total Deductions'}
            value={`SAR ${fmt(summary.totalDeductions)}`}
            icon={Calculator}
            color="bg-red-50 text-red-700 border-red-200"
            iconColor="text-red-600"
            isRTL={isRTL}
          />
          <SummaryCard
            label={language === 'ar' ? 'صافي الرواتب' : 'Net Payable'}
            value={`SAR ${fmt(summary.totalNet)}`}
            icon={DollarSign}
            color="bg-blue-50 text-blue-700 border-blue-200"
            iconColor="text-blue-600"
            isRTL={isRTL}
          />
          <SummaryCard
            label={language === 'ar' ? 'عدد الموظفين' : 'Total Employees'}
            value={String(summary.totalEmployees)}
            icon={Users}
            color="bg-gray-50 text-gray-700 border-gray-200"
            iconColor="text-gray-600"
            isRTL={isRTL}
          />
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className={`text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 ${isRTL ? 'text-right' : ''}`}>
            {language === 'ar' ? 'تفصيل الاستقطاعات' : 'Deductions Breakdown'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: language === 'ar' ? 'التأمينات (موظف)' : 'GOSI (Employee)', value: summary.totalGosiEmployee, color: 'text-blue-600' },
              { label: language === 'ar' ? 'التأمينات (صاحب عمل)' : 'GOSI (Employer)', value: summary.totalGosiEmployer, color: 'text-blue-400' },
              { label: language === 'ar' ? 'أقساط القروض' : 'Loan Installments', value: summary.totalLoans, color: 'text-orange-600' },
              { label: language === 'ar' ? 'خصم السلف' : 'Advances', value: summary.totalAdvances, color: 'text-red-600' },
              { label: language === 'ar' ? 'الجزاءات' : 'Penalties', value: summary.totalPenalties, color: 'text-amber-600' },
              { label: language === 'ar' ? 'خصم الغياب' : 'Absences', value: summary.totalAbsences, color: 'text-gray-600' },
            ].map((item, i) => (
              <div key={i} className={`text-center p-3 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : ''}`}>
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>
                  {fmt(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className={`px-5 py-4 border-b border-gray-100 ${isRTL ? 'text-right' : ''}`}>
          <h3 className="font-semibold text-gray-900">
            {language === 'ar' ? 'تفاصيل الموظفين' : 'Employee Details'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {language === 'ar' ? 'انقر على أي صف لعرض التفاصيل الكاملة' : 'Click any row to expand full breakdown'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'الموظف' : 'Employee'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  {language === 'ar' ? 'الراتب الأساسي' : 'Basic'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  {language === 'ar' ? 'البدلات' : 'Allowances'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  {language === 'ar' ? 'إجمالي المستحقات' : 'Total Earnings'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  {language === 'ar' ? 'التأمينات' : 'GOSI'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  {language === 'ar' ? 'قروض/سلف' : 'Loans/Adv'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  {language === 'ar' ? 'جزاءات/غياب' : 'Pen/Abs'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  {language === 'ar' ? 'إجمالي الخصم' : 'Total Ded'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                  {language === 'ar' ? 'صافي الراتب' : 'Net Salary'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calculatedItems.map((item) => {
                const isExpanded = expandedEmployee === item.employee.id;
                const hasIssues = item.netSalary < 0;
                return (
                  <EmployeeRow
                    key={item.employee.id}
                    item={item}
                    isExpanded={isExpanded}
                    hasIssues={hasIssues}
                    onToggle={() => setExpandedEmployee(isExpanded ? null : item.employee.id)}
                    fmt={fmt}
                    language={language}
                    isRTL={isRTL}
                  />
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr className="font-bold text-gray-900">
                <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : ''}`}>
                  {language === 'ar' ? 'الإجمالي' : 'TOTAL'} ({summary?.totalEmployees})
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {fmt(calculatedItems.reduce((s, i) => s + i.basicSalary, 0))}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {fmt(calculatedItems.reduce((s, i) => s + i.housingAllowance + i.transportationAllowance + i.otherAllowances + i.customEarnings, 0))}
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-700">
                  {fmt(summary?.totalGross || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  -{fmt(summary?.totalGosiEmployee || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  -{fmt((summary?.totalLoans || 0) + (summary?.totalAdvances || 0))}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  -{fmt((summary?.totalPenalties || 0) + (summary?.totalAbsences || 0))}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-700">
                  -{fmt(summary?.totalDeductions || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-blue-700">
                  {fmt(summary?.totalNet || 0)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, iconColor, isRTL }: {
  label: string; value: string; icon: any; color: string; iconColor: string; isRTL: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color} ${isRTL ? 'text-right' : ''}`}>
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${iconColor} opacity-40`} />
      </div>
    </div>
  );
}

function EmployeeRow({ item, isExpanded, hasIssues, onToggle, fmt, language, isRTL }: {
  item: CalculatedItem; isExpanded: boolean; hasIssues: boolean;
  onToggle: () => void; fmt: (n: number) => string; language: string; isRTL: boolean;
}) {
  const totalAllowances = item.housingAllowance + item.transportationAllowance + item.otherAllowances + item.customEarnings;
  const empName = language === 'ar'
    ? `${item.employee.first_name_ar || item.employee.first_name_en} ${item.employee.last_name_ar || item.employee.last_name_en}`
    : `${item.employee.first_name_en} ${item.employee.last_name_en}`;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors ${hasIssues ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
      >
        <td className="px-4 py-3">
          <div className={isRTL ? 'text-right' : ''}>
            <p className="text-sm font-medium text-gray-900">{empName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">{item.employee.employee_number}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${item.employee.is_saudi ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {item.employee.is_saudi ? (language === 'ar' ? 'سعودي' : 'Saudi') : (language === 'ar' ? 'مقيم' : 'Non-Saudi')}
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-right text-gray-900">{fmt(item.basicSalary)}</td>
        <td className="px-4 py-3 text-sm text-right text-gray-900">{fmt(totalAllowances)}</td>
        <td className="px-4 py-3 text-sm text-right font-medium text-green-700">{fmt(item.totalEarnings)}</td>
        <td className="px-4 py-3 text-sm text-right text-red-600">-{fmt(item.gosiEmployee)}</td>
        <td className="px-4 py-3 text-sm text-right text-red-600">
          {item.loanDeduction + item.advanceDeduction > 0 ? `-${fmt(item.loanDeduction + item.advanceDeduction)}` : '-'}
        </td>
        <td className="px-4 py-3 text-sm text-right text-red-600">
          {item.penaltyDeduction + item.absenceDeduction > 0 ? `-${fmt(item.penaltyDeduction + item.absenceDeduction)}` : '-'}
        </td>
        <td className="px-4 py-3 text-sm text-right font-medium text-red-700">-{fmt(item.totalDeductions)}</td>
        <td className={`px-4 py-3 text-sm text-right font-bold ${item.netSalary < 0 ? 'text-red-700' : 'text-blue-700'}`}>
          {fmt(item.netSalary)}
        </td>
        <td className="px-4 py-3 text-center">
          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={10} className="px-4 py-0">
            <div className="py-4 border-t border-dashed border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className={`text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 ${isRTL ? 'text-right' : ''}`}>
                    {language === 'ar' ? 'المستحقات' : 'Earnings'}
                  </h4>
                  <div className="space-y-2">
                    <DetailLine label={language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'} value={fmt(item.basicSalary)} isRTL={isRTL} />
                    <DetailLine label={language === 'ar' ? 'بدل السكن' : 'Housing Allowance'} value={fmt(item.housingAllowance)} isRTL={isRTL} />
                    <DetailLine label={language === 'ar' ? 'بدل النقل' : 'Transportation'} value={fmt(item.transportationAllowance)} isRTL={isRTL} />
                    {item.otherAllowances > 0 && (
                      <DetailLine label={language === 'ar' ? 'بدلات أخرى' : 'Other Allowances'} value={fmt(item.otherAllowances)} isRTL={isRTL} />
                    )}
                    {item.customEarningsDetail.map((e, i) => (
                      <DetailLine key={i} label={e.name} value={fmt(e.amount)} isRTL={isRTL} highlight />
                    ))}
                    <div className={`flex justify-between pt-2 border-t border-green-200 font-semibold text-green-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs">{language === 'ar' ? 'إجمالي المستحقات' : 'TOTAL EARNINGS'}</span>
                      <span className="text-sm">{fmt(item.totalEarnings)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className={`text-xs font-semibold text-red-700 uppercase tracking-wide mb-3 ${isRTL ? 'text-right' : ''}`}>
                    {language === 'ar' ? 'الاستقطاعات' : 'Deductions'}
                  </h4>
                  <div className="space-y-2">
                    <DetailLine
                      label={`${language === 'ar' ? 'التأمينات (موظف)' : 'GOSI (Employee)'} ${item.employee.is_saudi ? '9.75%' : '0%'}`}
                      value={fmt(item.gosiEmployee)}
                      negative
                      isRTL={isRTL}
                    />
                    <DetailLine
                      label={`${language === 'ar' ? 'التأمينات (صاحب عمل)' : 'GOSI (Employer)'} ${item.employee.is_saudi ? '11.75%' : '2%'}`}
                      value={fmt(item.gosiEmployer)}
                      muted
                      isRTL={isRTL}
                    />
                    {item.loanDetail.map((l, i) => (
                      <DetailLine
                        key={i}
                        label={`${language === 'ar' ? 'قسط قرض' : 'Loan'} (${l.type}) - ${language === 'ar' ? 'متبقي' : 'rem'}: ${fmt(l.remaining)}`}
                        value={fmt(l.installment)}
                        negative
                        isRTL={isRTL}
                      />
                    ))}
                    {item.advanceDetail.map((a, i) => (
                      <DetailLine
                        key={i}
                        label={`${language === 'ar' ? 'خصم سلفة' : 'Advance'} - ${language === 'ar' ? 'متبقي' : 'rem'}: ${fmt(a.remaining)}`}
                        value={fmt(item.advanceDeduction / item.advanceDetail.length)}
                        negative
                        isRTL={isRTL}
                      />
                    ))}
                    {item.penaltyDetail.map((p, i) => (
                      <DetailLine
                        key={i}
                        label={`${language === 'ar' ? 'جزاء' : 'Penalty'}: ${p.reason}`}
                        value={fmt(p.amount)}
                        negative
                        isRTL={isRTL}
                      />
                    ))}
                    {item.absenceDays > 0 && (
                      <DetailLine
                        label={`${language === 'ar' ? 'خصم غياب' : 'Absence'} (${item.absenceDays} ${language === 'ar' ? 'أيام' : 'days'})`}
                        value={fmt(item.absenceDeduction)}
                        negative
                        isRTL={isRTL}
                      />
                    )}
                    {item.customDeductionsDetail.map((d, i) => (
                      <DetailLine key={i} label={d.name} value={fmt(d.amount)} negative highlight isRTL={isRTL} />
                    ))}
                    <div className={`flex justify-between pt-2 border-t border-red-200 font-semibold text-red-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs">{language === 'ar' ? 'إجمالي الاستقطاعات' : 'TOTAL DEDUCTIONS'}</span>
                      <span className="text-sm">-{fmt(item.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-4 p-3 rounded-lg font-bold text-lg flex justify-between items-center ${
                item.netSalary < 0 ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-800'
              } ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span>{language === 'ar' ? 'صافي الراتب المستحق' : 'NET SALARY PAYABLE'}</span>
                <span>SAR {fmt(item.netSalary)}</span>
              </div>

              {item.netSalary < 0 && (
                <div className={`mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span className="text-sm text-red-700">
                    {language === 'ar'
                      ? 'تنبيه: صافي الراتب سالب. يرجى مراجعة الاستقطاعات.'
                      : 'Warning: Net salary is negative. Please review deductions.'}
                  </span>
                </div>
              )}

              <div className={`mt-3 text-xs text-gray-400 ${isRTL ? 'text-right' : ''}`}>
                {language === 'ar' ? 'أيام العمل' : 'Working days'}: {item.daysWorked} |
                {' '}{language === 'ar' ? 'قاعدة التأمينات' : 'GOSI base'}: SAR {fmt(item.gosiBase)}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailLine({ label, value, negative, muted, highlight, isRTL }: {
  label: string; value: string; negative?: boolean; muted?: boolean; highlight?: boolean; isRTL: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
      <span className={`${muted ? 'text-gray-400 italic' : highlight ? 'text-teal-700' : 'text-gray-600'}`}>
        {label}
      </span>
      <span className={`font-medium ${negative ? 'text-red-600' : muted ? 'text-gray-400 italic' : 'text-gray-900'}`}>
        {negative ? '-' : ''}{value}
      </span>
    </div>
  );
}
