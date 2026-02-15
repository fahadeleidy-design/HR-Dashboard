import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  companyIds: string[];
  language: 'ar' | 'en';
  isRTL: boolean;
  dateRange: { from: string; to: string };
}

interface CostCenterRow {
  id: string;
  name: string;
  code: string;
  budget: number;
  actualSpend: number;
  utilization: number;
  headcount: number;
  is_active: boolean;
}

export function CostCenterReport({ companyIds, language, isRTL, dateRange }: Props) {
  const [data, setData] = useState<CostCenterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ budget: 0, spend: 0, centers: 0, overBudget: 0 });

  useEffect(() => {
    fetchData();
  }, [companyIds, dateRange]);

  const fetchData = async () => {
    setLoading(true);

    const { data: centers } = await supabase
      .from('cost_centers')
      .select('id, name, code, budget_amount, is_active')
      .in('company_id', companyIds);

    const { data: payrollItems } = await supabase
      .from('payroll_items')
      .select('cost_center_id, net_salary, basic_salary')
      .in('company_id', companyIds)
      .not('cost_center_id', 'is', null);

    const { data: expenses } = await supabase
      .from('expense_claims')
      .select('id, total_amount, status, created_at')
      .in('company_id', companyIds)
      .in('status', ['approved', 'paid'])
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to + 'T23:59:59');

    const payrollByCc = new Map<string, { spend: number; count: number }>();
    (payrollItems || []).forEach((pi: any) => {
      if (pi.cost_center_id) {
        const existing = payrollByCc.get(pi.cost_center_id) || { spend: 0, count: 0 };
        existing.spend += (pi.net_salary || 0);
        existing.count += 1;
        payrollByCc.set(pi.cost_center_id, existing);
      }
    });

    const totalExpenseAmount = (expenses || []).reduce((s: number, e: any) => s + (e.total_amount || 0), 0);
    const centerCount = (centers || []).filter(c => c.is_active).length;
    const expensePerCenter = centerCount > 0 ? totalExpenseAmount / centerCount : 0;

    const rows: CostCenterRow[] = (centers || []).map((c: any) => {
      const payroll = payrollByCc.get(c.id) || { spend: 0, count: 0 };
      const actual = payroll.spend + expensePerCenter;
      const budget = c.budget_amount || 0;
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        budget,
        actualSpend: actual,
        utilization: budget > 0 ? (actual / budget) * 100 : 0,
        headcount: payroll.count,
        is_active: c.is_active,
      };
    }).sort((a: CostCenterRow, b: CostCenterRow) => b.actualSpend - a.actualSpend);

    setData(rows);
    setTotals({
      budget: rows.reduce((s, r) => s + r.budget, 0),
      spend: rows.reduce((s, r) => s + r.actualSpend, 0),
      centers: rows.length,
      overBudget: rows.filter(r => r.utilization > 100).length,
    });
    setLoading(false);
  };

  const handleExport = () => {
    const rows = data.map(d => ({
      'Cost Center': d.name,
      Code: d.code,
      Budget: d.budget,
      'Actual Spend': Math.round(d.actualSpend),
      'Utilization %': d.utilization.toFixed(1),
      Headcount: d.headcount,
      Status: d.is_active ? 'Active' : 'Inactive',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cost Centers');
    XLSX.writeFile(wb, `cost_center_report_${dateRange.from}_${dateRange.to}.xlsx`);
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded" /><div className="h-64 bg-gray-200 rounded" /></div>;

  const chartData = data.filter(d => d.is_active).slice(0, 10).map(d => ({
    name: d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
    budget: d.budget,
    actual: Math.round(d.actualSpend),
  }));

  const overallUtilization = totals.budget > 0 ? (totals.spend / totals.budget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900">
          {language === 'ar' ? 'تقرير مراكز التكلفة' : 'Cost Center Report'}
        </h3>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
          <Download className="h-4 w-4" />
          {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-blue-600 font-medium">{language === 'ar' ? 'إجمالي الميزانية' : 'Total Budget'}</p>
          </div>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(totals.budget, language)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <p className="text-xs text-green-600 font-medium mb-1">{language === 'ar' ? 'إجمالي الإنفاق' : 'Total Spend'}</p>
          <p className="text-xl font-bold text-green-900">{formatCurrency(totals.spend, language)}</p>
        </div>
        <div className={`bg-gradient-to-br rounded-xl p-4 border ${overallUtilization > 90 ? 'from-red-50 to-red-100 border-red-200' : 'from-teal-50 to-teal-100 border-teal-200'}`}>
          <p className={`text-xs font-medium mb-1 ${overallUtilization > 90 ? 'text-red-600' : 'text-teal-600'}`}>{language === 'ar' ? 'نسبة الاستخدام' : 'Utilization'}</p>
          <p className={`text-xl font-bold ${overallUtilization > 90 ? 'text-red-900' : 'text-teal-900'}`}>{overallUtilization.toFixed(1)}%</p>
        </div>
        <div className={`bg-gradient-to-br rounded-xl p-4 border ${totals.overBudget > 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-gray-50 to-gray-100 border-gray-200'}`}>
          <p className={`text-xs font-medium mb-1 ${totals.overBudget > 0 ? 'text-red-600' : 'text-gray-600'}`}>{language === 'ar' ? 'تجاوز الميزانية' : 'Over Budget'}</p>
          <p className={`text-xl font-bold ${totals.overBudget > 0 ? 'text-red-900' : 'text-gray-900'}`}>{totals.overBudget} / {totals.centers}</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">{language === 'ar' ? 'الميزانية مقابل الإنفاق الفعلي' : 'Budget vs Actual Spend'}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
              <Legend />
              <Bar dataKey="budget" fill="#2563eb" name={language === 'ar' ? 'الميزانية' : 'Budget'} radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#059669" name={language === 'ar' ? 'الإنفاق الفعلي' : 'Actual Spend'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الرمز' : 'Code'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الميزانية' : 'Budget'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الإنفاق' : 'Spend'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center" style={{ minWidth: '200px' }}>{language === 'ar' ? 'الاستخدام' : 'Utilization'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'عدد الموظفين' : 'Headcount'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => {
              const barColor = row.utilization > 100 ? 'bg-red-500' : row.utilization > 80 ? 'bg-amber-500' : 'bg-green-500';
              const barWidth = Math.min(row.utilization, 100);
              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className={`px-4 py-3 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{row.name}</td>
                  <td className={`px-4 py-3 text-gray-600 font-mono text-xs ${isRTL ? 'text-right' : 'text-left'}`}>{row.code}</td>
                  <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.budget, language)}</td>
                  <td className={`px-4 py-3 font-semibold ${row.utilization > 100 ? 'text-red-600' : 'text-gray-900'} ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.actualSpend, language)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className={`text-xs font-semibold min-w-[48px] text-right ${row.utilization > 100 ? 'text-red-600' : row.utilization > 80 ? 'text-amber-600' : 'text-green-600'}`}>
                        {row.utilization.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.headcount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {row.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                    </span>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{language === 'ar' ? 'لا توجد مراكز تكلفة' : 'No cost centers found'}</td></tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={2} className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</td>
                <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totals.budget, language)}</td>
                <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totals.spend, language)}</td>
                <td className="px-4 py-3 text-center">{overallUtilization.toFixed(1)}%</td>
                <td className="px-4 py-3 text-center">{data.reduce((s, r) => s + r.headcount, 0)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
