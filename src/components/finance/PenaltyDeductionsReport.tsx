import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  companyIds: string[];
  language: 'ar' | 'en';
  isRTL: boolean;
  dateRange: { from: string; to: string };
}

interface PenaltyRow {
  id: string;
  employee_name: string;
  department: string;
  penalty_type: string;
  penalty_amount: number;
  status: string;
  created_at: string;
  reason?: string;
}

const COLORS = ['#dc2626', '#d97706', '#2563eb', '#059669', '#7c3aed', '#0891b2'];

export function PenaltyDeductionsReport({ companyIds, language, isRTL, dateRange }: Props) {
  const [data, setData] = useState<PenaltyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeBreakdown, setTypeBreakdown] = useState<{ type: string; total: number; count: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; amount: number; count: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, [companyIds, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const { data: penalties } = await supabase
      .from('penalties')
      .select('id, penalty_amount, penalty_type, status, reason, created_at, employees!inner(first_name_en, last_name_en, employee_number, departments(name_en))')
      .in('company_id', companyIds)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to + 'T23:59:59')
      .order('created_at', { ascending: false });

    const items = (penalties || []).map((p: any) => ({
      id: p.id,
      employee_name: `${p.employees?.first_name_en || ''} ${p.employees?.last_name_en || ''}`.trim(),
      department: p.employees?.departments?.name_en || 'Unknown',
      penalty_type: p.penalty_type || 'other',
      penalty_amount: p.penalty_amount || 0,
      status: p.status || 'pending',
      created_at: p.created_at,
      reason: p.reason,
    }));

    setData(items);

    const typeMap = new Map<string, { total: number; count: number }>();
    const monthMap = new Map<string, { amount: number; count: number }>();

    items.forEach(p => {
      const t = typeMap.get(p.penalty_type) || { total: 0, count: 0 };
      t.total += p.penalty_amount;
      t.count += 1;
      typeMap.set(p.penalty_type, t);

      const m = (p.created_at || '').substring(0, 7);
      if (m) {
        const mExisting = monthMap.get(m) || { amount: 0, count: 0 };
        mExisting.amount += p.penalty_amount;
        mExisting.count += 1;
        monthMap.set(m, mExisting);
      }
    });

    setTypeBreakdown(
      Array.from(typeMap.entries())
        .map(([type, vals]) => ({ type, ...vals }))
        .sort((a, b) => b.total - a.total)
    );

    setMonthlyData(
      Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, vals]) => ({ month, ...vals }))
    );

    setLoading(false);
  };

  const handleExport = () => {
    const rows = data.map(d => ({
      Employee: d.employee_name,
      Department: d.department,
      Type: d.penalty_type,
      Amount: d.penalty_amount,
      Status: d.status,
      Date: d.created_at?.substring(0, 10),
      Reason: d.reason || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penalties');
    XLSX.writeFile(wb, `penalty_report_${dateRange.from}_${dateRange.to}.xlsx`);
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded" /><div className="h-64 bg-gray-200 rounded" /></div>;

  const totalApproved = data.filter(d => d.status === 'approved' || d.status === 'deducted').reduce((s, d) => s + d.penalty_amount, 0);
  const totalPending = data.filter(d => d.status === 'pending' || d.status === 'pending_finance').reduce((s, d) => s + d.penalty_amount, 0);
  const totalAll = data.reduce((s, d) => s + d.penalty_amount, 0);

  const statusLabels: Record<string, { en: string; ar: string; color: string }> = {
    pending: { en: 'Pending', ar: 'معلق', color: 'bg-amber-100 text-amber-700' },
    pending_finance: { en: 'Finance Review', ar: 'مراجعة مالية', color: 'bg-blue-100 text-blue-700' },
    approved: { en: 'Approved', ar: 'معتمد', color: 'bg-green-100 text-green-700' },
    deducted: { en: 'Deducted', ar: 'تم الخصم', color: 'bg-gray-100 text-gray-700' },
    rejected: { en: 'Rejected', ar: 'مرفوض', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900">
          {language === 'ar' ? 'تقرير خصومات الجزاءات' : 'Penalty Deductions Report'}
        </h3>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
          <Download className="h-4 w-4" />
          {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-xs text-red-600 font-medium">{language === 'ar' ? 'إجمالي الجزاءات' : 'Total Penalties'}</p>
          </div>
          <p className="text-xl font-bold text-red-900">{formatCurrency(totalAll, language)}</p>
          <p className="text-xs text-red-500 mt-1">{data.length} {language === 'ar' ? 'جزاء' : 'penalties'}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <p className="text-xs text-green-600 font-medium mb-1">{language === 'ar' ? 'معتمد / تم الخصم' : 'Approved / Deducted'}</p>
          <p className="text-xl font-bold text-green-900">{formatCurrency(totalApproved, language)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <p className="text-xs text-amber-600 font-medium mb-1">{language === 'ar' ? 'معلق' : 'Pending'}</p>
          <p className="text-xl font-bold text-amber-900">{formatCurrency(totalPending, language)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <p className="text-xs text-blue-600 font-medium mb-1">{language === 'ar' ? 'متوسط الجزاء' : 'Avg Penalty'}</p>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(data.length > 0 ? totalAll / data.length : 0, language)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {typeBreakdown.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">{language === 'ar' ? 'حسب نوع الجزاء' : 'By Penalty Type'}</h4>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={typeBreakdown} dataKey="total" nameKey="type" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {typeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {monthlyData.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">{language === 'ar' ? 'الاتجاه الشهري' : 'Monthly Trend'}</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
                <Bar dataKey="amount" fill="#dc2626" radius={[4, 4, 0, 0]} name={language === 'ar' ? 'المبلغ' : 'Amount'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الموظف' : 'Employee'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'القسم' : 'Department'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'النوع' : 'Type'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'التاريخ' : 'Date'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.slice(0, 50).map((row) => {
              const sl = statusLabels[row.status] || statusLabels.pending;
              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className={`px-4 py-3 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{row.employee_name}</td>
                  <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{row.department}</td>
                  <td className={`px-4 py-3 text-gray-600 capitalize ${isRTL ? 'text-right' : 'text-left'}`}>{row.penalty_type.replace(/_/g, ' ')}</td>
                  <td className={`px-4 py-3 font-semibold text-red-600 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.penalty_amount, language)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sl.color}`}>
                      {language === 'ar' ? sl.ar : sl.en}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{row.created_at?.substring(0, 10)}</td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{language === 'ar' ? 'لا توجد جزاءات في هذه الفترة' : 'No penalties in this period'}</td></tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={3} className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الإجمالي' : 'Total'} ({data.length})</td>
                <td className={`px-4 py-3 text-red-700 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totalAll, language)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
        {data.length > 50 && (
          <p className="text-xs text-gray-500 mt-2 text-center">{language === 'ar' ? `عرض 50 من ${data.length} - صدّر للاطلاع على الكل` : `Showing 50 of ${data.length} - Export to see all`}</p>
        )}
      </div>
    </div>
  );
}
