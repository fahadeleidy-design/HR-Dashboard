import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Receipt, TrendingUp, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  companyIds: string[];
  language: 'ar' | 'en';
  isRTL: boolean;
  dateRange: { from: string; to: string };
}

interface CategoryData {
  category: string;
  total: number;
  count: number;
  approved: number;
  pending: number;
  rejected: number;
  approvalRate: string;
}

interface DepartmentData {
  department: string;
  total: number;
  count: number;
}

const COLORS = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0d9488', '#ea580c'];

export function ExpenseAnalysisReport({ companyIds, language, isRTL, dateRange }: Props) {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, count: 0, avgClaim: 0 });

  useEffect(() => {
    fetchData();
  }, [companyIds, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const { data: expenses } = await supabase
      .from('expense_claims')
      .select('total_amount, status, category, created_at, submitted_at, employees!inner(first_name_en, last_name_en, departments(name_en))')
      .in('company_id', companyIds)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to + 'T23:59:59');

    const items = expenses || [];

    const catMap = new Map<string, CategoryData>();
    const deptMap = new Map<string, DepartmentData>();
    const monthMap = new Map<string, { approved: number; pending: number; rejected: number }>();

    let totalAmount = 0;
    let approvedAmount = 0;
    let pendingAmount = 0;
    let rejectedAmount = 0;

    items.forEach((e: any) => {
      const amt = e.total_amount || 0;
      const cat = e.category || 'Other';
      const dept = e.employees?.departments?.name_en || 'Unknown';
      const month = (e.created_at || '').substring(0, 7);

      totalAmount += amt;
      if (e.status === 'approved' || e.status === 'paid') approvedAmount += amt;
      if (e.status === 'pending' || e.status === 'submitted') pendingAmount += amt;
      if (e.status === 'rejected') rejectedAmount += amt;

      const existing = catMap.get(cat) || { category: cat, total: 0, count: 0, approved: 0, pending: 0, rejected: 0, approvalRate: '0' };
      existing.total += amt;
      existing.count += 1;
      if (e.status === 'approved' || e.status === 'paid') existing.approved += 1;
      if (e.status === 'pending' || e.status === 'submitted') existing.pending += 1;
      if (e.status === 'rejected') existing.rejected += 1;
      existing.approvalRate = existing.count > 0 ? ((existing.approved / existing.count) * 100).toFixed(1) : '0';
      catMap.set(cat, existing);

      const deptExisting = deptMap.get(dept) || { department: dept, total: 0, count: 0 };
      deptExisting.total += amt;
      deptExisting.count += 1;
      deptMap.set(dept, deptExisting);

      if (month) {
        const mExisting = monthMap.get(month) || { approved: 0, pending: 0, rejected: 0 };
        if (e.status === 'approved' || e.status === 'paid') mExisting.approved += amt;
        else if (e.status === 'rejected') mExisting.rejected += amt;
        else mExisting.pending += amt;
        monthMap.set(month, mExisting);
      }
    });

    setCategoryData(Array.from(catMap.values()).sort((a, b) => b.total - a.total));
    setDepartmentData(Array.from(deptMap.values()).sort((a, b) => b.total - a.total).slice(0, 10));
    setMonthlyData(
      Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, vals]) => ({ month, ...vals }))
    );
    setTotals({
      total: totalAmount,
      approved: approvedAmount,
      pending: pendingAmount,
      rejected: rejectedAmount,
      count: items.length,
      avgClaim: items.length > 0 ? totalAmount / items.length : 0,
    });
    setLoading(false);
  };

  const handleExport = () => {
    const rows = categoryData.map(d => ({
      Category: d.category,
      'Total Amount': d.total,
      'Claim Count': d.count,
      Approved: d.approved,
      Pending: d.pending,
      Rejected: d.rejected,
      'Approval Rate %': d.approvalRate,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expense Analysis');

    const deptRows = departmentData.map(d => ({
      Department: d.department,
      'Total Amount': d.total,
      'Claim Count': d.count,
    }));
    const ws2 = XLSX.utils.json_to_sheet(deptRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'By Department');

    XLSX.writeFile(wb, `expense_analysis_${dateRange.from}_${dateRange.to}.xlsx`);
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded" /><div className="h-64 bg-gray-200 rounded" /></div>;

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900">
          {language === 'ar' ? 'تحليل المصروفات' : 'Expense Analysis'}
        </h3>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
          <Download className="h-4 w-4" />
          {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-blue-600 font-medium">{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</p>
          </div>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(totals.total, language)}</p>
          <p className="text-xs text-blue-500 mt-1">{totals.count} {language === 'ar' ? 'مطالبة' : 'claims'}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <p className="text-xs text-green-600 font-medium mb-1">{language === 'ar' ? 'معتمد' : 'Approved'}</p>
          <p className="text-xl font-bold text-green-900">{formatCurrency(totals.approved, language)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <p className="text-xs text-amber-600 font-medium mb-1">{language === 'ar' ? 'معلق' : 'Pending'}</p>
          <p className="text-xl font-bold text-amber-900">{formatCurrency(totals.pending, language)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <p className="text-xs text-red-600 font-medium mb-1">{language === 'ar' ? 'مرفوض' : 'Rejected'}</p>
          <p className="text-xl font-bold text-red-900">{formatCurrency(totals.rejected, language)}</p>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">{language === 'ar' ? 'الاتجاه الشهري' : 'Monthly Trend'}</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
              <Legend />
              <Bar dataKey="approved" stackId="a" fill="#059669" name={language === 'ar' ? 'معتمد' : 'Approved'} radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" stackId="a" fill="#d97706" name={language === 'ar' ? 'معلق' : 'Pending'} />
              <Bar dataKey="rejected" stackId="a" fill="#dc2626" name={language === 'ar' ? 'مرفوض' : 'Rejected'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">{language === 'ar' ? 'حسب الفئة' : 'By Category'}</h4>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">{language === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">{language === 'ar' ? 'أعلى الأقسام إنفاقاً' : 'Top Spending Departments'}</h4>
          {departmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => formatCurrency(v, language)} />
                <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">{language === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الفئة' : 'Category'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'العدد' : 'Claims'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'معتمد' : 'Approved'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'معلق' : 'Pending'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'مرفوض' : 'Rejected'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'نسبة الاعتماد' : 'Approval %'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categoryData.map((row) => (
              <tr key={row.category} className="hover:bg-gray-50 transition-colors">
                <td className={`px-4 py-3 font-medium text-gray-900 capitalize ${isRTL ? 'text-right' : 'text-left'}`}>{row.category}</td>
                <td className="px-4 py-3 text-center text-gray-600">{row.count}</td>
                <td className={`px-4 py-3 text-gray-900 font-semibold ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(row.total, language)}</td>
                <td className="px-4 py-3 text-center text-green-600 font-medium">{row.approved}</td>
                <td className="px-4 py-3 text-center text-amber-600 font-medium">{row.pending}</td>
                <td className="px-4 py-3 text-center text-red-600 font-medium">{row.rejected}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${Number(row.approvalRate) > 80 ? 'bg-green-100 text-green-700' : Number(row.approvalRate) > 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {row.approvalRate}%
                  </span>
                </td>
              </tr>
            ))}
            {categoryData.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{language === 'ar' ? 'لا توجد مصروفات في هذه الفترة' : 'No expenses in this period'}</td></tr>
            )}
          </tbody>
          {categoryData.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</td>
                <td className="px-4 py-3 text-center">{totals.count}</td>
                <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totals.total, language)}</td>
                <td className="px-4 py-3 text-center text-green-600">{categoryData.reduce((s, d) => s + d.approved, 0)}</td>
                <td className="px-4 py-3 text-center text-amber-600">{categoryData.reduce((s, d) => s + d.pending, 0)}</td>
                <td className="px-4 py-3 text-center text-red-600">{categoryData.reduce((s, d) => s + d.rejected, 0)}</td>
                <td className="px-4 py-3 text-center">-</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
