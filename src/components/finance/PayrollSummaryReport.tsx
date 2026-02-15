import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Download, FileSpreadsheet, Users, DollarSign, TrendingUp } from 'lucide-react';

interface Props {
  companyIds: string[];
  language: 'ar' | 'en';
  isRTL: boolean;
  dateRange: { from: string; to: string };
}

interface PayrollSummary {
  department: string;
  total_basic: number;
  total_allowances: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  saudi_count: number;
  non_saudi_count: number;
}

export function PayrollSummaryReport({ companyIds, language, isRTL, dateRange }: Props) {
  const [data, setData] = useState<PayrollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ basic: 0, allowances: 0, deductions: 0, net: 0, employees: 0 });

  useEffect(() => {
    loadReport();
  }, [companyIds, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: payrollData } = await supabase
        .from('payroll')
        .select(`
          basic_salary, housing_allowance, transportation_allowance,
          other_allowances, gosi_employee, other_deductions, net_salary,
          gross_salary, employee_id, company_id,
          employees!inner(is_saudi, department_id, departments(name_en, name_ar))
        `)
        .in('company_id', companyIds);

      if (!payrollData) { setLoading(false); return; }

      const deptMap = new Map<string, PayrollSummary>();

      payrollData.forEach((p: any) => {
        const dept = (language === 'ar' ? p.employees?.departments?.name_ar : p.employees?.departments?.name_en) || (language === 'ar' ? 'غير محدد' : 'Unassigned');
        const existing = deptMap.get(dept) || {
          department: dept, total_basic: 0, total_allowances: 0,
          total_deductions: 0, total_net: 0, employee_count: 0,
          saudi_count: 0, non_saudi_count: 0,
        };

        existing.total_basic += p.basic_salary || 0;
        existing.total_allowances += (p.housing_allowance || 0) + (p.transportation_allowance || 0) + (p.other_allowances || 0);
        existing.total_deductions += (p.gosi_employee || 0) + (p.other_deductions || 0);
        existing.total_net += p.net_salary || 0;
        existing.employee_count += 1;
        if (p.employees?.is_saudi) existing.saudi_count += 1;
        else existing.non_saudi_count += 1;

        deptMap.set(dept, existing);
      });

      const result = Array.from(deptMap.values()).sort((a, b) => b.total_net - a.total_net);
      setData(result);
      setTotals({
        basic: result.reduce((s, d) => s + d.total_basic, 0),
        allowances: result.reduce((s, d) => s + d.total_allowances, 0),
        deductions: result.reduce((s, d) => s + d.total_deductions, 0),
        net: result.reduce((s, d) => s + d.total_net, 0),
        employees: result.reduce((s, d) => s + d.employee_count, 0),
      });
    } catch (err) {
      console.error('Payroll report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Department', 'Employees', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Saudi', 'Non-Saudi'];
    const rows = data.map(d => [d.department, d.employee_count, d.total_basic.toFixed(2), d.total_allowances.toFixed(2), d.total_deductions.toFixed(2), d.total_net.toFixed(2), d.saudi_count, d.non_saudi_count]);
    rows.push(['TOTAL', totals.employees, totals.basic.toFixed(2), totals.allowances.toFixed(2), totals.deductions.toFixed(2), totals.net.toFixed(2), '', '']);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3" /><div className="h-64 bg-gray-200 rounded" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900">
          {language === 'ar' ? 'ملخص الرواتب حسب القسم' : 'Payroll Summary by Department'}
        </h3>
        <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
          <FileSpreadsheet className="h-4 w-4" />
          {language === 'ar' ? 'تصدير Excel' : 'Export CSV'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: language === 'ar' ? 'إجمالي الأساسي' : 'Total Basic', value: totals.basic, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
          { label: language === 'ar' ? 'إجمالي البدلات' : 'Total Allowances', value: totals.allowances, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: language === 'ar' ? 'إجمالي الخصومات' : 'Total Deductions', value: totals.deductions, icon: DollarSign, color: 'text-red-600 bg-red-50' },
          { label: language === 'ar' ? 'صافي الرواتب' : 'Net Salaries', value: totals.net, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`p-1.5 rounded-lg ${item.color}`}><Icon className="h-3.5 w-3.5" /></div>
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(item.value, language)}</p>
            </div>
          );
        })}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 10)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="total_basic" name={language === 'ar' ? 'الأساسي' : 'Basic'} fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="total_allowances" name={language === 'ar' ? 'البدلات' : 'Allowances'} fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="total_deductions" name={language === 'ar' ? 'الخصومات' : 'Deductions'} fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'القسم' : 'Department'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الموظفون' : 'Employees'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الأساسي' : 'Basic'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'البدلات' : 'Allowances'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الخصومات' : 'Deductions'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الصافي' : 'Net'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'سعودي' : 'Saudi'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'غير سعودي' : 'Non-Saudi'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row.department} className="hover:bg-gray-50">
                <td className={`px-4 py-3 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{row.department}</td>
                <td className="px-4 py-3 text-center text-gray-600">{row.employee_count}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.total_basic, language)}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.total_allowances, language)}</td>
                <td className={`px-4 py-3 text-red-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.total_deductions, language)}</td>
                <td className={`px-4 py-3 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.total_net, language)}</td>
                <td className="px-4 py-3 text-center text-green-600 font-medium">{row.saudi_count}</td>
                <td className="px-4 py-3 text-center text-gray-600">{row.non_saudi_count}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
              <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الإجمالي' : 'TOTAL'}</td>
              <td className="px-4 py-3 text-center text-gray-900">{totals.employees}</td>
              <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totals.basic, language)}</td>
              <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totals.allowances, language)}</td>
              <td className={`px-4 py-3 text-red-700 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totals.deductions, language)}</td>
              <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totals.net, language)}</td>
              <td className="px-4 py-3 text-center">-</td>
              <td className="px-4 py-3 text-center">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
