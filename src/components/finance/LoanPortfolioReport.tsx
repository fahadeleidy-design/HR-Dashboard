import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FileSpreadsheet, CreditCard, AlertTriangle } from 'lucide-react';

interface Props {
  companyIds: string[];
  language: 'ar' | 'en';
  isRTL: boolean;
}

interface LoanRecord {
  id: string;
  employee_name: string;
  loan_type: string;
  loan_amount: number;
  remaining_amount: number;
  monthly_installment: number;
  start_date: string;
  status: string;
  months_remaining: number;
}

export function LoanPortfolioReport({ companyIds, language, isRTL }: Props) {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [companyIds]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('loans')
        .select('id, loan_type, loan_amount, remaining_amount, monthly_installment, start_date, status, number_of_installments, employees!inner(first_name_en, last_name_en)')
        .in('company_id', companyIds)
        .in('status', ['active', 'approved', 'hr_approved', 'finance_approved']);

      const records = (data || []).map((l: any) => {
        const monthsUsed = l.start_date ? Math.max(0, Math.ceil((Date.now() - new Date(l.start_date).getTime()) / (30 * 24 * 60 * 60 * 1000))) : 0;
        return {
          id: l.id,
          employee_name: `${l.employees?.first_name_en || ''} ${l.employees?.last_name_en || ''}`,
          loan_type: l.loan_type || 'personal',
          loan_amount: l.loan_amount || 0,
          remaining_amount: l.remaining_amount || 0,
          monthly_installment: l.monthly_installment || 0,
          start_date: l.start_date || '',
          status: l.status,
          months_remaining: Math.max(0, (l.number_of_installments || 0) - monthsUsed),
        };
      });

      setLoans(records);
    } catch (err) {
      console.error('Loan report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPortfolio = loans.reduce((s, l) => s + l.loan_amount, 0);
  const totalOutstanding = loans.reduce((s, l) => s + l.remaining_amount, 0);
  const totalMonthlyInstallments = loans.reduce((s, l) => s + l.monthly_installment, 0);
  const collected = totalPortfolio - totalOutstanding;

  const agingData = [
    { name: language === 'ar' ? 'حالي (0-3 أشهر)' : 'Current (0-3m)', value: loans.filter(l => l.months_remaining <= 3 && l.months_remaining > 0).reduce((s, l) => s + l.remaining_amount, 0), color: '#10b981' },
    { name: language === 'ar' ? '3-6 أشهر' : '3-6 months', value: loans.filter(l => l.months_remaining > 3 && l.months_remaining <= 6).reduce((s, l) => s + l.remaining_amount, 0), color: '#3b82f6' },
    { name: language === 'ar' ? '6-12 شهر' : '6-12 months', value: loans.filter(l => l.months_remaining > 6 && l.months_remaining <= 12).reduce((s, l) => s + l.remaining_amount, 0), color: '#f59e0b' },
    { name: language === 'ar' ? 'أكثر من 12 شهر' : '12+ months', value: loans.filter(l => l.months_remaining > 12).reduce((s, l) => s + l.remaining_amount, 0), color: '#ef4444' },
  ].filter(d => d.value > 0);

  const exportToCSV = () => {
    const headers = ['Employee', 'Type', 'Loan Amount', 'Remaining', 'Monthly Installment', 'Start Date', 'Months Left', 'Status'];
    const rows = loans.map(l => [l.employee_name, l.loan_type, l.loan_amount.toFixed(2), l.remaining_amount.toFixed(2), l.monthly_installment.toFixed(2), l.start_date, l.months_remaining, l.status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan_portfolio_${new Date().toISOString().split('T')[0]}.csv`;
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
          {language === 'ar' ? 'تقرير محفظة القروض' : 'Loan Portfolio Report'}
        </h3>
        <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
          <FileSpreadsheet className="h-4 w-4" />
          {language === 'ar' ? 'تصدير' : 'Export CSV'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي المحفظة' : 'Total Portfolio'}</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPortfolio, language)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'الرصيد القائم' : 'Outstanding Balance'}</p>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(totalOutstanding, language)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'المحصل' : 'Collected'}</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(collected, language)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'الأقساط الشهرية' : 'Monthly Installments'}</p>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(totalMonthlyInstallments, language)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : ''}`}>
            {language === 'ar' ? 'تحليل الاستحقاق' : 'Aging Analysis'}
          </h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={agingData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {agingData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : ''}`}>
            {language === 'ar' ? 'إحصائيات القروض' : 'Loan Statistics'}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{language === 'ar' ? 'عدد القروض النشطة' : 'Active Loans'}</span>
              <span className="text-sm font-bold text-gray-900">{loans.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{language === 'ar' ? 'متوسط مبلغ القرض' : 'Avg Loan Amount'}</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(loans.length > 0 ? totalPortfolio / loans.length : 0, language)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{language === 'ar' ? 'نسبة التحصيل' : 'Collection Rate'}</span>
              <span className="text-sm font-bold text-green-600">{totalPortfolio > 0 ? ((collected / totalPortfolio) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{language === 'ar' ? 'متوسط الأقساط المتبقية' : 'Avg Months Left'}</span>
              <span className="text-sm font-bold text-gray-900">{loans.length > 0 ? Math.round(loans.reduce((s, l) => s + l.months_remaining, 0) / loans.length) : 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الموظف' : 'Employee'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'النوع' : 'Type'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'المتبقي' : 'Remaining'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'القسط' : 'Installment'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الأشهر المتبقية' : 'Months Left'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loans.map((loan) => (
              <tr key={loan.id} className="hover:bg-gray-50">
                <td className={`px-4 py-3 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{loan.employee_name}</td>
                <td className={`px-4 py-3 text-gray-600 capitalize ${isRTL ? 'text-right' : 'text-left'}`}>{loan.loan_type}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(loan.loan_amount, language)}</td>
                <td className={`px-4 py-3 font-medium text-amber-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(loan.remaining_amount, language)}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(loan.monthly_installment, language)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${loan.months_remaining <= 3 ? 'bg-green-100 text-green-700' : loan.months_remaining <= 6 ? 'bg-blue-100 text-blue-700' : loan.months_remaining <= 12 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {loan.months_remaining}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
