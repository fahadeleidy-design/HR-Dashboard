import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { FileSpreadsheet, TrendingUp } from 'lucide-react';

interface Props {
  companyIds: string[];
  language: 'ar' | 'en';
  isRTL: boolean;
}

interface EOSRecord {
  employee_name: string;
  department: string;
  hire_date: string;
  years_of_service: number;
  basic_salary: number;
  estimated_eos: number;
}

export function EOSLiabilityReport({ companyIds, language, isRTL }: Props) {
  const [data, setData] = useState<EOSRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [companyIds]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: employees } = await supabase
        .from('employees')
        .select('first_name_en, last_name_en, hire_date, status, departments(name_en, name_ar)')
        .in('company_id', companyIds)
        .eq('status', 'active');

      const { data: payrollData } = await supabase
        .from('payroll')
        .select('employee_id, basic_salary')
        .in('company_id', companyIds);

      const salaryMap = new Map<string, number>();
      (payrollData || []).forEach((p: any) => {
        salaryMap.set(p.employee_id, p.basic_salary || 0);
      });

      const records: EOSRecord[] = (employees || []).map((emp: any) => {
        const yearsOfService = emp.hire_date
          ? (Date.now() - new Date(emp.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          : 0;

        const basicSalary = salaryMap.get(emp.id) || 0;
        const dailyWage = basicSalary / 30;

        let eosAmount = 0;
        if (yearsOfService <= 5) {
          eosAmount = dailyWage * 15 * yearsOfService;
        } else {
          eosAmount = (dailyWage * 15 * 5) + (dailyWage * 30 * (yearsOfService - 5));
        }

        return {
          employee_name: `${emp.first_name_en || ''} ${emp.last_name_en || ''}`,
          department: (language === 'ar' ? emp.departments?.name_ar : emp.departments?.name_en) || '-',
          hire_date: emp.hire_date || '',
          years_of_service: Math.round(yearsOfService * 10) / 10,
          basic_salary: basicSalary,
          estimated_eos: Math.round(eosAmount * 100) / 100,
        };
      }).sort((a, b) => b.estimated_eos - a.estimated_eos);

      setData(records);
    } catch (err) {
      console.error('EOS report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalLiability = data.reduce((s, d) => s + d.estimated_eos, 0);
  const avgYears = data.length > 0 ? data.reduce((s, d) => s + d.years_of_service, 0) / data.length : 0;

  const deptBreakdown = data.reduce((acc, d) => {
    const existing = acc.find(x => x.department === d.department);
    if (existing) { existing.liability += d.estimated_eos; existing.count += 1; }
    else acc.push({ department: d.department, liability: d.estimated_eos, count: 1 });
    return acc;
  }, [] as { department: string; liability: number; count: number }[]).sort((a, b) => b.liability - a.liability);

  const exportToCSV = () => {
    const headers = ['Employee', 'Department', 'Hire Date', 'Years of Service', 'Basic Salary', 'Estimated EOS'];
    const rows = data.map(d => [d.employee_name, d.department, d.hire_date, d.years_of_service, d.basic_salary.toFixed(2), d.estimated_eos.toFixed(2)]);
    rows.push(['TOTAL', '', '', '', '', totalLiability.toFixed(2)]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eos_liability_${new Date().toISOString().split('T')[0]}.csv`;
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
          {language === 'ar' ? 'تقرير التزامات نهاية الخدمة' : 'EOS Liability Report'}
        </h3>
        <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
          <FileSpreadsheet className="h-4 w-4" />
          {language === 'ar' ? 'تصدير' : 'Export CSV'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي الالتزام' : 'Total Liability'}</p>
          <p className="text-lg font-bold text-rose-600">{formatCurrency(totalLiability, language)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'عدد الموظفين' : 'Employees'}</p>
          <p className="text-lg font-bold text-gray-900">{data.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'متوسط سنوات الخدمة' : 'Avg Years of Service'}</p>
          <p className="text-lg font-bold text-blue-600">{avgYears.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'متوسط الالتزام' : 'Avg EOS per Employee'}</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(data.length > 0 ? totalLiability / data.length : 0, language)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : ''}`}>
          {language === 'ar' ? 'الالتزامات حسب القسم' : 'Liability by Department'}
        </h4>
        <div className="space-y-2">
          {deptBreakdown.slice(0, 8).map((dept) => (
            <div key={dept.department} className="flex items-center gap-3">
              <span className={`text-xs text-gray-600 w-32 truncate ${isRTL ? 'text-right' : ''}`}>{dept.department}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-500"
                  style={{ width: `${totalLiability > 0 ? (dept.liability / totalLiability) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-900 w-28 text-right">{formatCurrency(dept.liability, language)}</span>
              <span className="text-[10px] text-gray-400 w-12">{dept.count} emp</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الموظف' : 'Employee'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'القسم' : 'Department'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'سنوات الخدمة' : 'Years'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'التزام نهاية الخدمة' : 'EOS Liability'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className={`px-4 py-3 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{row.employee_name}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{row.department}</td>
                <td className="px-4 py-3 text-center text-gray-600">{row.years_of_service}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.basic_salary, language)}</td>
                <td className={`px-4 py-3 font-semibold text-rose-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.estimated_eos, language)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
              <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`} colSpan={2}>{language === 'ar' ? 'الإجمالي' : 'TOTAL'}</td>
              <td className="px-4 py-3 text-center">{data.length}</td>
              <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>-</td>
              <td className={`px-4 py-3 text-rose-700 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totalLiability, language)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
