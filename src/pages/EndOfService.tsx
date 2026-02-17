import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Calculator, Plus, FileText, CheckCircle, XCircle, Clock, AlertCircle, DollarSign, Calendar, User, Download, Banknote } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  hire_date: string;
  employment_type: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  basic_salary?: number;
}

interface Loan {
  id: string;
  remaining_amount: number;
}

interface Advance {
  id: string;
  remaining_amount: number;
}

interface EOSCalculation {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  calculation_date: string;
  termination_date: string;
  termination_reason: string;
  total_service_years: number;
  gross_benefit_amount: number;
  loans_deduction: number;
  advances_deduction: number;
  other_deductions: number;
  net_benefit_amount: number;
  status: string;
  created_at: string;
}

const TERMINATION_REASONS_DATA = {
  retirement: { labelKey: 'retirementReason', descKey: 'retirementDesc', fullBenefit: true },
  death: { labelKey: 'deathReason', descKey: 'deathDesc', fullBenefit: true },
  disability: { labelKey: 'disabilityReason', descKey: 'disabilityDesc', fullBenefit: true },
  employer_termination: { labelKey: 'employerTermination', descKey: 'employerTerminationDesc', fullBenefit: true },
  mutual_agreement: { labelKey: 'mutualAgreement', descKey: 'mutualAgreementDesc', fullBenefit: true },
  female_marriage: { labelKey: 'femaleMarriage', descKey: 'femaleMarriageDesc', fullBenefit: true },
  contract_completion: { labelKey: 'contractCompletion', descKey: 'contractCompletionDesc', fullBenefit: true },
  employee_resignation: { labelKey: 'employeeResignation', descKey: 'employeeResignationDesc', fullBenefit: false },
  termination_for_cause: { labelKey: 'terminationForCause', descKey: 'terminationForCauseDesc', fullBenefit: false },
  probation_period: { labelKey: 'probationPeriod', descKey: 'probationPeriodDesc', fullBenefit: false }
};

export function EndOfService() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { showToast } = useToast();
  const { userRole } = useAuth();
  const { logError, logActivity } = useErrorHandler();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [calculations, setCalculations] = useState<EOSCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [terminationDate, setTerminationDate] = useState('');
  const [terminationReason, setTerminationReason] = useState('');
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (currentCompany) {
      loadEmployees();
      loadCalculations();
    }
  }, [currentCompany]);

  const loadEmployees = async () => {
    if (!currentCompany) return;

    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .select('id, employee_number, first_name_en, last_name_en, hire_date, employment_type, contract_start_date, contract_end_date')
      .eq('company_id', currentCompany.id)
      .eq('status', 'active')
      .order('first_name_en');

    if (!empError && employeesData) {
      const employeeIds = employeesData.map(e => e.id);

      const { data: payrollData } = await supabase
        .from('payroll')
        .select('employee_id, basic_salary')
        .in('employee_id', employeeIds)
        .is('effective_to', null);

      const employeesWithSalary = employeesData.map(emp => {
        const payroll = payrollData?.find(p => p.employee_id === emp.id);
        return {
          ...emp,
          basic_salary: payroll?.basic_salary || 0
        };
      });

      setEmployees(employeesWithSalary);
    }
  };

  const loadCalculations = async () => {
    if (!currentCompany) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('end_of_service_calculations')
      .select(`
        id,
        employee_id,
        calculation_date,
        termination_date,
        termination_reason,
        total_service_years,
        gross_benefit_amount,
        loans_deduction,
        advances_deduction,
        other_deductions,
        net_benefit_amount,
        status,
        created_at,
        employees (employee_number, first_name_en, last_name_en)
      `)
      .eq('company_id', currentCompany.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData = data.map((calc: any) => ({
        id: calc.id,
        employee_id: calc.employee_id,
        employee_name: `${calc.employees?.first_name_en || ''} ${calc.employees?.last_name_en || ''}`.trim(),
        employee_code: calc.employees?.employee_number || '',
        calculation_date: calc.calculation_date,
        termination_date: calc.termination_date,
        termination_reason: calc.termination_reason,
        total_service_years: calc.total_service_years,
        gross_benefit_amount: calc.gross_benefit_amount,
        loans_deduction: calc.loans_deduction,
        advances_deduction: calc.advances_deduction,
        other_deductions: calc.other_deductions,
        net_benefit_amount: calc.net_benefit_amount,
        status: calc.status,
        created_at: calc.created_at
      }));
      setCalculations(formattedData);
    }
    setLoading(false);
  };

  const calculateEOS = async () => {
    if (!selectedEmployee || !terminationDate || !terminationReason || !currentCompany) {
      showToast({ type: 'warning', title: t.endOfService.fillAllRequired });
      return;
    }

    setCalculating(true);

    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) {
      setCalculating(false);
      return;
    }

    const hireDate = new Date(employee.hire_date);
    const termDate = new Date(terminationDate);

    const totalYears = differenceInYears(termDate, hireDate);
    const totalMonths = differenceInMonths(termDate, hireDate) % 12;
    const remainingDays = differenceInDays(termDate, new Date(termDate.getFullYear(), termDate.getMonth(), hireDate.getDate()));

    const contractType = employee.employment_type === 'fixed_term' ? 'limited' : 'unlimited';
    const basicSalary = employee.basic_salary;

    let eligibleForFull = false;
    let grossBenefit = 0;
    const yearlyBreakdown = [];

    if (terminationReason === 'termination_for_cause' || terminationReason === 'probation_period') {
      grossBenefit = 0;
      eligibleForFull = false;
    } else if (contractType === 'limited') {
      if (terminationReason === 'employee_resignation') {
        eligibleForFull = false;
        grossBenefit = (totalYears + totalMonths / 12) * basicSalary * 0.5;
      } else {
        eligibleForFull = true;
        grossBenefit = (totalYears + totalMonths / 12) * basicSalary;
      }
    } else {
      const reasonInfo = TERMINATION_REASONS_DATA[terminationReason as keyof typeof TERMINATION_REASONS_DATA];
      eligibleForFull = reasonInfo?.fullBenefit || false;

      if (totalYears < 2) {
        grossBenefit = 0;
      } else if (totalYears < 5) {
        const benefit = (totalYears + totalMonths / 12) * basicSalary * 0.5;
        grossBenefit = benefit;
        for (let i = 1; i <= totalYears; i++) {
          yearlyBreakdown.push({
            year: i,
            rate: 0.5,
            amount: basicSalary * 0.5
          });
        }
      } else if (totalYears < 10) {
        const first5Years = 5 * basicSalary * 0.5;
        const remaining = (totalYears - 5 + totalMonths / 12) * basicSalary * (eligibleForFull ? 1 : 0.5);
        grossBenefit = first5Years + remaining;

        for (let i = 1; i <= 5; i++) {
          yearlyBreakdown.push({
            year: i,
            rate: 0.5,
            amount: basicSalary * 0.5
          });
        }
        for (let i = 6; i <= totalYears; i++) {
          yearlyBreakdown.push({
            year: i,
            rate: eligibleForFull ? 1 : 0.5,
            amount: basicSalary * (eligibleForFull ? 1 : 0.5)
          });
        }
      } else {
        if (eligibleForFull) {
          grossBenefit = (totalYears + totalMonths / 12) * basicSalary;
          for (let i = 1; i <= totalYears; i++) {
            yearlyBreakdown.push({
              year: i,
              rate: 1,
              amount: basicSalary
            });
          }
        } else {
          const first5Years = 5 * basicSalary * 0.5;
          const remaining = (totalYears - 5 + totalMonths / 12) * basicSalary * 0.5;
          grossBenefit = first5Years + remaining;

          for (let i = 1; i <= 5; i++) {
            yearlyBreakdown.push({
              year: i,
              rate: 0.5,
              amount: basicSalary * 0.5
            });
          }
          for (let i = 6; i <= totalYears; i++) {
            yearlyBreakdown.push({
              year: i,
              rate: 0.5,
              amount: basicSalary * 0.5
            });
          }
        }
      }
    }

    const { data: loansData } = await supabase
      .from('loans')
      .select('remaining_amount')
      .eq('employee_id', selectedEmployee)
      .eq('status', 'active');

    const { data: advancesData } = await supabase
      .from('advances')
      .select('remaining_amount')
      .eq('employee_id', selectedEmployee)
      .eq('status', 'active');

    const totalLoans = loansData?.reduce((sum, loan) => sum + Number(loan.remaining_amount), 0) || 0;
    const totalAdvances = advancesData?.reduce((sum, adv) => sum + Number(adv.remaining_amount), 0) || 0;

    const netBenefit = Math.max(0, grossBenefit - totalLoans - totalAdvances);

    const result = {
      employee,
      hireDate: employee.hire_date,
      terminationDate,
      terminationReason,
      contractType,
      serviceYears: totalYears,
      serviceMonths: totalMonths,
      serviceDays: remainingDays,
      basicSalary,
      eligibleForFull,
      grossBenefit,
      loansDeduction: totalLoans,
      advancesDeduction: totalAdvances,
      netBenefit,
      yearlyBreakdown
    };

    setCalculationResult(result);
    setCalculating(false);
    logActivity('eos_calculated', { employeeId: selectedEmployee, terminationReason, serviceYears: totalYears, grossBenefit, netBenefit });
  };

  const saveCalculation = async () => {
    if (!calculationResult || !currentCompany) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from('end_of_service_calculations')
      .insert({
        company_id: currentCompany.id,
        employee_id: selectedEmployee,
        calculation_date: new Date().toISOString().split('T')[0],
        termination_date: terminationDate,
        termination_reason: terminationReason,
        contract_type: calculationResult.contractType,
        hire_date: calculationResult.hireDate,
        total_service_years: calculationResult.serviceYears,
        total_service_months: calculationResult.serviceMonths,
        total_service_days: calculationResult.serviceDays,
        basic_salary: calculationResult.basicSalary,
        eligible_for_full_benefits: calculationResult.eligibleForFull,
        gross_benefit_amount: calculationResult.grossBenefit,
        loans_deduction: calculationResult.loansDeduction,
        advances_deduction: calculationResult.advancesDeduction,
        other_deductions: 0,
        net_benefit_amount: calculationResult.netBenefit,
        status: 'draft',
        created_by: userData.user.id
      })
      .select()
      .single();

    if (!error && data) {
      if (calculationResult.yearlyBreakdown.length > 0) {
        const detailsToInsert = calculationResult.yearlyBreakdown.map((year: any) => ({
          calculation_id: data.id,
          year_number: year.year,
          benefit_rate: year.rate,
          benefit_amount: year.amount
        }));

        await supabase
          .from('end_of_service_calculation_details')
          .insert(detailsToInsert);
      }

      showToast({ type: 'success', title: t.endOfService.calculationSavedSuccess });
      logActivity('eos_calculation_saved', { calculationId: data.id, employeeId: selectedEmployee, netBenefit: calculationResult.netBenefit });
      setShowCalculator(false);
      setCalculationResult(null);
      setSelectedEmployee('');
      setTerminationDate('');
      setTerminationReason('');
      loadCalculations();
    } else {
      showToast({ type: 'error', title: t.endOfService.errorSavingCalculation });
      logError(error, 'medium', { component: 'EndOfService', action: 'saveCalculation' });
    }
  };

  const handleStatusUpdate = async (calcId: string, newStatus: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const updateData: any = { status: newStatus };
      if (newStatus === 'approved') {
        updateData.approved_by = userData.user?.id;
        updateData.approved_at = new Date().toISOString();
      }
      if (newStatus === 'paid') {
        updateData.paid_by = userData.user?.id;
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('end_of_service_calculations')
        .update(updateData)
        .eq('id', calcId);

      if (error) throw error;
      showToast({ type: 'success', title: language === 'ar' ? 'تم تحديث الحالة' : 'Status updated' });
      logActivity('eos_status_updated', { calculationId: calcId, newStatus });
      loadCalculations();
    } catch (error: any) {
      logError(error, 'medium', { component: 'EndOfService', action: 'updateStatus' });
      showToast({ type: 'error', title: error.message });
    }
  };

  const handleExport = () => {
    const exportData = calculations.map(calc => ({
      [language === 'ar' ? 'الموظف' : 'Employee']: calc.employee_name,
      [language === 'ar' ? 'الرقم الوظيفي' : 'Code']: calc.employee_code,
      [language === 'ar' ? 'تاريخ الإنهاء' : 'Termination Date']: calc.termination_date,
      [language === 'ar' ? 'سنوات الخدمة' : 'Service Years']: calc.total_service_years,
      [language === 'ar' ? 'المبلغ الإجمالي' : 'Gross Amount']: calc.gross_benefit_amount,
      [language === 'ar' ? 'خصم القروض' : 'Loans Deduction']: calc.loans_deduction,
      [language === 'ar' ? 'خصم السلف' : 'Advances Deduction']: calc.advances_deduction,
      [language === 'ar' ? 'صافي المبلغ' : 'Net Amount']: calc.net_benefit_amount,
      [language === 'ar' ? 'الحالة' : 'Status']: calc.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EOS');
    XLSX.writeFile(wb, `eos_calculations_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast({ type: 'success', title: language === 'ar' ? 'تم تصدير التقرير' : 'Report exported' });
  };

  const isFinanceOrAdmin = userRole?.role && ['finance', 'hr', 'super_admin'].includes(userRole.role);

  const filteredCalculations = filterStatus === 'all'
    ? calculations
    : calculations.filter(c => c.status === filterStatus);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" /> {t.endOfService.draft}</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {t.endOfService.approved}</span>;
      case 'paid':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1"><DollarSign className="h-3 w-3" /> {t.endOfService.paid}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calculator className="h-7 w-7 text-primary-600" />
            {t.endOfService.title}
          </h1>
          <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.endOfService.subtitle}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="h-5 w-5" />
            {t.common.export}
          </button>
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="h-5 w-5" />
            {t.endOfService.newCalculation}
          </button>
        </div>
      </div>

      {showCalculator && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calculator className="h-6 w-6 text-primary-600" />
            {t.endOfService.calculateTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.endOfService.selectEmployee} *
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">{t.endOfService.chooseEmployee}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_number} - {emp.first_name_en} {emp.last_name_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.endOfService.terminationDate} *
              </label>
              <input
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.endOfService.terminationReason} *
              </label>
              <select
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">{t.endOfService.chooseReason}</option>
                {Object.entries(TERMINATION_REASONS_DATA).map(([key, info]) => (
                  <option key={key} value={key}>
                    {(t.endOfService as any)[info.labelKey]} - {(t.endOfService as any)[info.descKey]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={calculateEOS}
              disabled={calculating || !selectedEmployee || !terminationDate || !terminationReason}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Calculator className="h-5 w-5" />
              {calculating ? t.endOfService.calculating : t.endOfService.calculate}
            </button>
            <button
              onClick={() => {
                setShowCalculator(false);
                setCalculationResult(null);
                setSelectedEmployee('');
                setTerminationDate('');
                setTerminationReason('');
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.endOfService.cancel}
            </button>
          </div>

          {calculationResult && (
            <div className="mt-6 border-t pt-6">
              <h3 className={`text-lg font-semibold mb-4 text-primary-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.endOfService.calculationResults}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className={`font-medium text-gray-700 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <User className="h-5 w-5 text-primary-600" />
                    {t.endOfService.employeeInformation}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">{t.endOfService.name}:</span> {calculationResult.employee.first_name_en} {calculationResult.employee.last_name_en}</p>
                    <p><span className="font-medium">{t.endOfService.code}:</span> {calculationResult.employee.employee_number}</p>
                    <p><span className="font-medium">{t.endOfService.basicSalary}:</span> {calculationResult.basicSalary.toLocaleString()} SAR</p>
                    <p><span className="font-medium">{t.endOfService.contractType}:</span> {calculationResult.contractType === 'limited' ? t.endOfService.fixedTerm : t.endOfService.indefinite}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className={`font-medium text-gray-700 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Calendar className="h-5 w-5 text-primary-600" />
                    {t.endOfService.serviceDuration}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">{t.endOfService.hireDate}:</span> {format(new Date(calculationResult.hireDate), 'dd/MM/yyyy')}</p>
                    <p><span className="font-medium">{t.endOfService.terminationDate}:</span> {format(new Date(calculationResult.terminationDate), 'dd/MM/yyyy')}</p>
                    <p><span className="font-medium">{t.endOfService.totalService}:</span> {calculationResult.serviceYears} {t.endOfService.years}, {calculationResult.serviceMonths} {t.endOfService.months}</p>
                    <p><span className="font-medium">{t.endOfService.benefitType}:</span> {calculationResult.eligibleForFull ? t.endOfService.fullBenefits : t.endOfService.halfBenefits}</p>
                  </div>
                </div>
              </div>

              {calculationResult.yearlyBreakdown.length > 0 && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">{t.endOfService.yearlyBreakdown}</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className={`px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.endOfService.year}</th>
                          <th className={`px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.endOfService.rate}</th>
                          <th className={`px-4 py-2 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-500 uppercase`}>{t.endOfService.amount}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {calculationResult.yearlyBreakdown.map((year: any) => (
                          <tr key={year.year}>
                            <td className="px-4 py-2 text-sm">{t.endOfService.year} {year.year}</td>
                            <td className="px-4 py-2 text-sm">{year.rate === 1 ? t.endOfService.fullMonth : t.endOfService.halfMonth}</td>
                            <td className={`px-4 py-2 text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{year.amount.toLocaleString()} SAR</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {calculationResult.grossBenefit === 0 && calculationResult.contractType === 'unlimited' && calculationResult.serviceYears < 2 && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className={`text-sm text-yellow-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="font-medium mb-1">{t.endOfService.noEosLessThan2Years}</p>
                      <p>{t.endOfService.noEosLessThan2YearsDesc}</p>
                    </div>
                  </div>
                </div>
              )}

              {calculationResult.grossBenefit === 0 && (terminationReason === 'termination_for_cause' || terminationReason === 'probation_period') && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className={`text-sm text-yellow-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="font-medium mb-1">{t.endOfService.noEosBenefitsTitle}</p>
                      <p>{t.endOfService.noEosForCause}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <h4 className={`font-medium text-gray-700 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <DollarSign className="h-5 w-5 text-primary-600" />
                  {t.endOfService.financialSummary}
                </h4>
                <div className="space-y-2">
                  <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-medium">{t.endOfService.grossBenefit}:</span>
                    <span className={`font-semibold ${calculationResult.grossBenefit > 0 ? 'text-green-600' : 'text-gray-600'}`}>{calculationResult.grossBenefit.toLocaleString()} SAR</span>
                  </div>
                  {calculationResult.loansDeduction > 0 && (
                    <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-medium">{t.endOfService.outstandingLoans}:</span>
                      <span className="text-red-600">-{calculationResult.loansDeduction.toLocaleString()} SAR</span>
                    </div>
                  )}
                  {calculationResult.advancesDeduction > 0 && (
                    <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-medium">{t.endOfService.outstandingAdvances}:</span>
                      <span className="text-red-600">-{calculationResult.advancesDeduction.toLocaleString()} SAR</span>
                    </div>
                  )}
                  <div className="border-t border-primary-300 pt-2 mt-2">
                    <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-bold text-lg">{t.endOfService.netBenefit}:</span>
                      <span className={`font-bold text-lg ${calculationResult.netBenefit > 0 ? 'text-primary-600' : 'text-gray-600'}`}>{calculationResult.netBenefit.toLocaleString()} SAR</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-4 flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={saveCalculation}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                  {t.endOfService.saveCalculation}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold">{t.endOfService.previousCalculations}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {t.endOfService.all}
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'draft' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {t.endOfService.draft}
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'approved' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {t.endOfService.approved}
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'paid' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {t.endOfService.paid}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t.endOfService.employee}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t.endOfService.terminationDate}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t.endOfService.serviceYears}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t.endOfService.grossAmount}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t.endOfService.netAmount}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t.endOfService.status}</th>
                {isFinanceOrAdmin && (
                  <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={isFinanceOrAdmin ? 7 : 6} className="px-6 py-8 text-center text-gray-500">{t.endOfService.loading}</td>
                </tr>
              ) : filteredCalculations.length === 0 ? (
                <tr>
                  <td colSpan={isFinanceOrAdmin ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    {t.endOfService.noCalculationsFound}
                  </td>
                </tr>
              ) : (
                filteredCalculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{calc.employee_name}</div>
                        <div className="text-sm text-gray-500">{calc.employee_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {format(new Date(calc.termination_date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {calc.total_service_years} {t.endOfService.years}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isRTL ? 'text-left' : 'text-right'} text-gray-900`}>
                      {calc.gross_benefit_amount.toLocaleString()} SAR
                    </td>
                    <td className={`px-6 py-4 text-sm ${isRTL ? 'text-left' : 'text-right'} font-medium text-primary-600`}>
                      {calc.net_benefit_amount.toLocaleString()} SAR
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(calc.status)}
                    </td>
                    {isFinanceOrAdmin && (
                      <td className="px-6 py-4">
                        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {calc.status === 'draft' && (
                            <button
                              onClick={() => handleStatusUpdate(calc.id, 'approved')}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                              title={language === 'ar' ? 'موافقة' : 'Approve'}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {language === 'ar' ? 'موافقة' : 'Approve'}
                            </button>
                          )}
                          {calc.status === 'approved' && (
                            <button
                              onClick={() => handleStatusUpdate(calc.id, 'paid')}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                              title={language === 'ar' ? 'تم الدفع' : 'Mark as Paid'}
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              {language === 'ar' ? 'تم الدفع' : 'Mark Paid'}
                            </button>
                          )}
                          {calc.status === 'draft' && (
                            <button
                              onClick={() => handleStatusUpdate(calc.id, 'rejected')}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                              title={language === 'ar' ? 'رفض' : 'Reject'}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {language === 'ar' ? 'رفض' : 'Reject'}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className={`text-sm text-blue-800 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="font-medium mb-2">{t.endOfService.lawSummaryTitle}</p>
            <ul className={`space-y-1 ${isRTL ? 'mr-4' : 'ml-4'} list-disc`}>
              <li>{t.endOfService.lawUnlimited}</li>
              <li>{t.endOfService.lawLimited}</li>
              <li>{t.endOfService.lawFullBenefits}</li>
              <li>{t.endOfService.lawDeductions}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}