import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Calculator, Plus, FileText, CheckCircle, XCircle, Clock, AlertCircle, DollarSign, Calendar, User } from 'lucide-react';
import { format, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  basic_salary: number;
  hire_date: string;
  employment_type: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
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

const TERMINATION_REASONS = {
  retirement: { label: 'Retirement', fullBenefit: true, description: 'Employee reached retirement age (60+)' },
  death: { label: 'Death', fullBenefit: true, description: 'Employee deceased' },
  disability: { label: 'Disability', fullBenefit: true, description: 'Employee became disabled' },
  employer_termination: { label: 'Employer Termination', fullBenefit: true, description: 'Terminated by employer without cause' },
  mutual_agreement: { label: 'Mutual Agreement', fullBenefit: true, description: 'Both parties agreed to terminate' },
  female_marriage: { label: 'Female Marriage', fullBenefit: true, description: 'Female employee married (within 6 months)' },
  contract_completion: { label: 'Contract Completion', fullBenefit: true, description: 'Limited term contract completed' },
  employee_resignation: { label: 'Employee Resignation', fullBenefit: false, description: 'Employee voluntarily resigned' },
  termination_for_cause: { label: 'Termination for Cause', fullBenefit: false, description: 'Terminated for disciplinary reasons (No benefits)' },
  probation_period: { label: 'Probation Period', fullBenefit: false, description: 'Terminated during probation (No benefits)' }
};

export function EndOfService() {
  const { currentCompany } = useCompany();
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

    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, basic_salary, hire_date, employment_type, contract_start_date, contract_end_date')
      .eq('company_id', currentCompany.id)
      .eq('employment_status', 'active')
      .order('full_name');

    if (!error && data) {
      setEmployees(data);
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
        employees (employee_code, full_name)
      `)
      .eq('company_id', currentCompany.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData = data.map((calc: any) => ({
        id: calc.id,
        employee_id: calc.employee_id,
        employee_name: calc.employees.full_name,
        employee_code: calc.employees.employee_code,
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
      alert('Please fill all required fields');
      return;
    }

    setCalculating(true);

    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return;

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
      const reasonInfo = TERMINATION_REASONS[terminationReason as keyof typeof TERMINATION_REASONS];
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

      alert('Calculation saved successfully!');
      setShowCalculator(false);
      setCalculationResult(null);
      setSelectedEmployee('');
      setTerminationDate('');
      setTerminationReason('');
      loadCalculations();
    } else {
      alert('Error saving calculation');
    }
  };

  const filteredCalculations = filterStatus === 'all'
    ? calculations
    : calculations.filter(c => c.status === filterStatus);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" /> Draft</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case 'paid':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1"><DollarSign className="h-3 w-3" /> Paid</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="h-7 w-7 text-primary-600" />
            End of Service Benefits
          </h1>
          <p className="text-gray-600 mt-1">Calculate end of service benefits per Saudi Labor Law</p>
        </div>
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Calculation
        </button>
      </div>

      {showCalculator && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary-600" />
            Calculate End of Service Benefits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Employee *
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Choose an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code} - {emp.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termination Date *
              </label>
              <input
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termination Reason *
              </label>
              <select
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Choose a reason...</option>
                {Object.entries(TERMINATION_REASONS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label} - {info.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={calculateEOS}
              disabled={calculating || !selectedEmployee || !terminationDate || !terminationReason}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Calculator className="h-5 w-5" />
              {calculating ? 'Calculating...' : 'Calculate'}
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
              Cancel
            </button>
          </div>

          {calculationResult && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-primary-600">Calculation Results</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary-600" />
                    Employee Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {calculationResult.employee.full_name}</p>
                    <p><span className="font-medium">Code:</span> {calculationResult.employee.employee_code}</p>
                    <p><span className="font-medium">Basic Salary:</span> {calculationResult.basicSalary.toLocaleString()} SAR</p>
                    <p><span className="font-medium">Contract Type:</span> {calculationResult.contractType === 'limited' ? 'Fixed Term' : 'Indefinite'}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    Service Duration
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Hire Date:</span> {format(new Date(calculationResult.hireDate), 'dd/MM/yyyy')}</p>
                    <p><span className="font-medium">Termination Date:</span> {format(new Date(calculationResult.terminationDate), 'dd/MM/yyyy')}</p>
                    <p><span className="font-medium">Total Service:</span> {calculationResult.serviceYears} years, {calculationResult.serviceMonths} months</p>
                    <p><span className="font-medium">Benefit Type:</span> {calculationResult.eligibleForFull ? 'Full Benefits' : 'Half Benefits'}</p>
                  </div>
                </div>
              </div>

              {calculationResult.yearlyBreakdown.length > 0 && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Yearly Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {calculationResult.yearlyBreakdown.map((year: any) => (
                          <tr key={year.year}>
                            <td className="px-4 py-2 text-sm">Year {year.year}</td>
                            <td className="px-4 py-2 text-sm">{year.rate === 1 ? 'Full month' : 'Half month'}</td>
                            <td className="px-4 py-2 text-sm text-right">{year.amount.toLocaleString()} SAR</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary-600" />
                  Financial Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Gross Benefit:</span>
                    <span className="text-green-600 font-semibold">{calculationResult.grossBenefit.toLocaleString()} SAR</span>
                  </div>
                  {calculationResult.loansDeduction > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Outstanding Loans:</span>
                      <span className="text-red-600">-{calculationResult.loansDeduction.toLocaleString()} SAR</span>
                    </div>
                  )}
                  {calculationResult.advancesDeduction > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Outstanding Advances:</span>
                      <span className="text-red-600">-{calculationResult.advancesDeduction.toLocaleString()} SAR</span>
                    </div>
                  )}
                  <div className="border-t border-primary-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-lg">Net Benefit:</span>
                      <span className="font-bold text-lg text-primary-600">{calculationResult.netBenefit.toLocaleString()} SAR</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveCalculation}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                  Save Calculation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold">Previous Calculations</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'draft' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Draft
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'approved' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'paid' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Paid
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Termination Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Years of Service</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filteredCalculations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    No calculations found
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
                      {calc.total_service_years} years
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {calc.gross_benefit_amount.toLocaleString()} SAR
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-primary-600">
                      {calc.net_benefit_amount.toLocaleString()} SAR
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(calc.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Saudi Labor Law - End of Service Benefits Summary:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>Unlimited Contracts:</strong> Less than 2 years = No benefits | 2-5 years = Half month/year | 5+ years = Half month for first 5 years, full month thereafter</li>
              <li><strong>Limited Contracts:</strong> Full benefits if employer terminates | Half benefits if employee resigns</li>
              <li><strong>Full Benefits:</strong> Retirement, death, disability, employer termination, mutual agreement, female marriage (within 6 months)</li>
              <li><strong>Deductions:</strong> Outstanding loans and salary advances are automatically deducted from final settlement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}