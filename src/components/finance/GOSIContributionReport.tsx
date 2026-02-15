import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { FileSpreadsheet, Users, Shield } from 'lucide-react';

interface Props {
  companyIds: string[];
  language: 'ar' | 'en';
  isRTL: boolean;
}

interface GOSISummary {
  employee_name: string;
  is_saudi: boolean;
  wage_subject: number;
  employee_share: number;
  employer_share: number;
  total: number;
}

export function GOSIContributionReport({ companyIds, language, isRTL }: Props) {
  const [data, setData] = useState<GOSISummary[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [companyIds]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data: gosiData } = await supabase
        .from('gosi_contributions')
        .select('wage_subject_to_gosi, employee_contribution, employer_contribution, total_contribution, month, employees!inner(first_name_en, last_name_en, is_saudi)')
        .in('company_id', companyIds)
        .order('month', { ascending: false });

      const latestMonth = gosiData?.[0]?.month;
      const currentMonthData = (gosiData || []).filter(g => g.month === latestMonth);

      const records = currentMonthData.map((g: any) => ({
        employee_name: `${g.employees?.first_name_en || ''} ${g.employees?.last_name_en || ''}`,
        is_saudi: g.employees?.is_saudi || false,
        wage_subject: g.wage_subject_to_gosi || 0,
        employee_share: g.employee_contribution || 0,
        employer_share: g.employer_contribution || 0,
        total: g.total_contribution || 0,
      }));

      const monthMap = new Map<string, { employee: number; employer: number; total: number }>();
      (gosiData || []).forEach((g: any) => {
        const existing = monthMap.get(g.month) || { employee: 0, employer: 0, total: 0 };
        existing.employee += g.employee_contribution || 0;
        existing.employer += g.employer_contribution || 0;
        existing.total += g.total_contribution || 0;
        monthMap.set(g.month, existing);
      });

      const trend = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, vals]) => ({
          month: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
          [language === 'ar' ? 'حصة الموظف' : 'Employee']: vals.employee,
          [language === 'ar' ? 'حصة صاحب العمل' : 'Employer']: vals.employer,
        }));

      setData(records);
      setMonthlyTrend(trend);
    } catch (err) {
      console.error('GOSI report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalWage = data.reduce((s, d) => s + d.wage_subject, 0);
  const totalEmployee = data.reduce((s, d) => s + d.employee_share, 0);
  const totalEmployer = data.reduce((s, d) => s + d.employer_share, 0);
  const grandTotal = data.reduce((s, d) => s + d.total, 0);
  const saudiCount = data.filter(d => d.is_saudi).length;

  const exportToCSV = () => {
    const headers = ['Employee', 'Saudi', 'Wage Subject to GOSI', 'Employee Share', 'Employer Share', 'Total'];
    const rows = data.map(d => [d.employee_name, d.is_saudi ? 'Yes' : 'No', d.wage_subject.toFixed(2), d.employee_share.toFixed(2), d.employer_share.toFixed(2), d.total.toFixed(2)]);
    rows.push(['TOTAL', '', totalWage.toFixed(2), totalEmployee.toFixed(2), totalEmployer.toFixed(2), grandTotal.toFixed(2)]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gosi_contributions_${new Date().toISOString().split('T')[0]}.csv`;
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
          {language === 'ar' ? 'تقرير اشتراكات التأمينات الاجتماعية' : 'GOSI Contribution Report'}
        </h3>
        <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
          <FileSpreadsheet className="h-4 w-4" />
          {language === 'ar' ? 'تصدير' : 'Export CSV'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: language === 'ar' ? 'الموظفون' : 'Employees', value: String(data.length), sub: `${saudiCount} ${language === 'ar' ? 'سعودي' : 'Saudi'}` },
          { label: language === 'ar' ? 'الأجر الخاضع' : 'Subject Wage', value: formatCurrency(totalWage, language) },
          { label: language === 'ar' ? 'حصة الموظف' : 'Employee Share', value: formatCurrency(totalEmployee, language) },
          { label: language === 'ar' ? 'حصة صاحب العمل' : 'Employer Share', value: formatCurrency(totalEmployer, language) },
          { label: language === 'ar' ? 'الإجمالي' : 'Grand Total', value: formatCurrency(grandTotal, language) },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-lg font-bold text-gray-900">{item.value}</p>
            {item.sub && <p className="text-xs text-green-600 mt-0.5">{item.sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : ''}`}>
          {language === 'ar' ? 'الاتجاه الشهري' : 'Monthly Trend'}
        </h4>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={language === 'ar' ? 'حصة الموظف' : 'Employee'} fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey={language === 'ar' ? 'حصة صاحب العمل' : 'Employer'} fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الموظف' : 'Employee'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الجنسية' : 'Nationality'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الأجر الخاضع' : 'Wage Subject'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'حصة الموظف' : 'Employee'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'حصة صاحب العمل' : 'Employer'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className={`px-4 py-3 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{row.employee_name}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${row.is_saudi ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {row.is_saudi ? (language === 'ar' ? 'سعودي' : 'Saudi') : (language === 'ar' ? 'غير سعودي' : 'Non-Saudi')}
                  </span>
                </td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.wage_subject, language)}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.employee_share, language)}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.employer_share, language)}</td>
                <td className={`px-4 py-3 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.total, language)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
              <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الإجمالي' : 'TOTAL'}</td>
              <td className="px-4 py-3 text-center">{data.length}</td>
              <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totalWage, language)}</td>
              <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totalEmployee, language)}</td>
              <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totalEmployer, language)}</td>
              <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(grandTotal, language)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
