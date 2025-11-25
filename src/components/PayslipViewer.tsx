import { useState, useEffect, useRef } from 'react';
import { X, Download, Send, Eye, Calendar, User, Building2, Hash, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';

interface PayslipViewerProps {
  payrollItemId: string;
  employeeId: string;
  companyId: string;
  onClose: () => void;
}

interface PayslipData {
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
    iqama_number: string;
    job_title_en: string;
    department?: { name_en: string };
  };
  company: {
    name_en: string;
    name_ar?: string;
    cr_number?: string;
  };
  payroll: {
    basic_salary: number;
    housing_allowance: number;
    transportation_allowance: number;
    food_allowance: number;
    mobile_allowance: number;
    other_allowances: number;
    overtime_amount: number;
    bonus_amount: number;
    commission_amount: number;
    total_earnings: number;
    gosi_employee: number;
    gosi_employer: number;
    loan_deduction: number;
    advance_deduction: number;
    absence_deduction: number;
    other_deductions: number;
    total_deductions: number;
    net_salary: number;
    days_worked: number;
    overtime_hours: number;
    absence_days: number;
  };
  batch: {
    month: string;
    period_start: string;
    period_end: string;
  };
}

export function PayslipViewer({ payrollItemId, employeeId, companyId, onClose }: PayslipViewerProps) {
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPayslipData();
    trackView();
  }, [payrollItemId]);

  const fetchPayslipData = async () => {
    setLoading(true);
    try {
      const { data: payrollItem, error: payrollError } = await supabase
        .from('payroll_items')
        .select(`
          *,
          batch:payroll_batches!payroll_items_batch_id_fkey(month, period_start, period_end)
        `)
        .eq('id', payrollItemId)
        .single();

      if (payrollError) throw payrollError;

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('employee_number, first_name_en, last_name_en, iqama_number, job_title_en, department:departments!employees_department_id_fkey(name_en)')
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name_en, name_ar, cr_number')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      setPayslipData({
        employee,
        company,
        payroll: payrollItem,
        batch: payrollItem.batch
      });
    } catch (error) {
      console.error('Error fetching payslip data:', error);
      alert('Failed to load payslip data');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      const { data: existingPayslip } = await supabase
        .from('payslips')
        .select('id')
        .eq('payroll_item_id', payrollItemId)
        .maybeSingle();

      if (existingPayslip) {
        await supabase
          .from('payslips')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', existingPayslip.id);
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleDownload = async () => {
    if (printRef.current) {
      window.print();

      try {
        const { data: existingPayslip } = await supabase
          .from('payslips')
          .select('id, download_count')
          .eq('payroll_item_id', payrollItemId)
          .maybeSingle();

        if (existingPayslip) {
          await supabase
            .from('payslips')
            .update({ download_count: (existingPayslip.download_count || 0) + 1 })
            .eq('id', existingPayslip.id);
        }
      } catch (error) {
        console.error('Error tracking download:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading payslip...</p>
        </div>
      </div>
    );
  }

  if (!payslipData) {
    return null;
  }

  const { employee, company, payroll, batch } = payslipData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 print:hidden">
          <h2 className="text-2xl font-bold text-gray-900">Employee Payslip</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download / Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-8 space-y-8">
          <style>
            {`
              @media print {
                body * {
                  visibility: hidden;
                }
                .print\\:hidden {
                  display: none !important;
                }
                #payslip-content, #payslip-content * {
                  visibility: visible;
                }
                #payslip-content {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
              }
            `}
          </style>

          <div id="payslip-content">
            <div className="border-b-4 border-blue-600 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{company.name_en}</h1>
                  {company.name_ar && (
                    <p className="text-xl text-gray-600 mt-1">{company.name_ar}</p>
                  )}
                  {company.cr_number && (
                    <p className="text-sm text-gray-500 mt-2">CR: {company.cr_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="inline-block px-4 py-2 bg-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">PAYSLIP</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Period: {new Date(batch.period_start).toLocaleDateString()} - {new Date(batch.period_end).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Month: {new Date(batch.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide border-b pb-2">Employee Information</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-medium text-gray-900">{employee.first_name_en} {employee.last_name_en}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Employee Number</p>
                      <p className="text-sm font-medium text-gray-900">{employee.employee_number}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Position</p>
                      <p className="text-sm font-medium text-gray-900">{employee.job_title_en}</p>
                    </div>
                  </div>
                  {employee.department && (
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Department</p>
                        <p className="text-sm font-medium text-gray-900">{employee.department.name_en}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide border-b pb-2">Work Summary</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Days Worked</p>
                      <p className="text-sm font-medium text-gray-900">{payroll.days_worked} days</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Overtime Hours</p>
                      <p className="text-sm font-medium text-gray-900">{payroll.overtime_hours || 0} hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Absence Days</p>
                      <p className="text-sm font-medium text-gray-900">{payroll.absence_days || 0} days</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Iqama Number</p>
                      <p className="text-sm font-medium text-gray-900">{employee.iqama_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 text-sm uppercase tracking-wide mb-4">Earnings</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Basic Salary</span>
                    <span className="font-medium text-gray-900">{formatCurrency(payroll.basic_salary)}</span>
                  </div>
                  {payroll.housing_allowance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Housing Allowance</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.housing_allowance)}</span>
                    </div>
                  )}
                  {payroll.transportation_allowance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Transportation</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.transportation_allowance)}</span>
                    </div>
                  )}
                  {payroll.food_allowance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Food Allowance</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.food_allowance)}</span>
                    </div>
                  )}
                  {payroll.mobile_allowance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Mobile Allowance</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.mobile_allowance)}</span>
                    </div>
                  )}
                  {payroll.other_allowances > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Other Allowances</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.other_allowances)}</span>
                    </div>
                  )}
                  {payroll.overtime_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Overtime</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.overtime_amount)}</span>
                    </div>
                  )}
                  {payroll.bonus_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Bonus</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.bonus_amount)}</span>
                    </div>
                  )}
                  {payroll.commission_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Commission</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.commission_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t-2 border-green-200 pt-2 mt-2">
                    <span className="text-green-900">Total Earnings</span>
                    <span className="text-green-900">{formatCurrency(payroll.total_earnings)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 text-sm uppercase tracking-wide mb-4">Deductions</h3>
                <div className="space-y-2">
                  {payroll.gosi_employee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">GOSI (Employee)</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.gosi_employee)}</span>
                    </div>
                  )}
                  {payroll.loan_deduction > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Loan Deduction</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.loan_deduction)}</span>
                    </div>
                  )}
                  {payroll.advance_deduction > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Advance Deduction</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.advance_deduction)}</span>
                    </div>
                  )}
                  {payroll.absence_deduction > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Absence Deduction</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.absence_deduction)}</span>
                    </div>
                  )}
                  {payroll.other_deductions > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Other Deductions</span>
                      <span className="font-medium text-gray-900">{formatCurrency(payroll.other_deductions)}</span>
                    </div>
                  )}
                  {payroll.total_deductions === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">No deductions</div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t-2 border-red-200 pt-2 mt-2">
                    <span className="text-red-900">Total Deductions</span>
                    <span className="text-red-900">{formatCurrency(payroll.total_deductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Net Salary</p>
                  <p className="text-3xl font-bold">{formatCurrency(payroll.net_salary)}</p>
                </div>
                <DollarSign className="h-16 w-16 opacity-20" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> This is a computer-generated payslip and does not require a signature.
              </p>
              <p className="text-xs text-gray-600">
                Employer GOSI contribution: {formatCurrency(payroll.gosi_employer)} (not deducted from employee salary)
              </p>
              <p className="text-xs text-gray-500">
                Generated on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
