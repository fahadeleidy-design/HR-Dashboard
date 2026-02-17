import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react';

interface ExpenseClaim {
  id: string;
  amount_in_sar: number;
  vat_amount: number;
  expense_category: string;
  approval_status: string;
  expense_date: string;
  policy_compliant: boolean;
  employee: {
    first_name_en: string;
    last_name_en: string;
    employee_number: string;
  };
}

interface ExpenseAnalyticsProps {
  claims: ExpenseClaim[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#14B8A6', '#64748B'];

export function ExpenseAnalytics({ claims }: ExpenseAnalyticsProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');

  const approvedClaims = useMemo(() =>
    claims.filter(c => c.approval_status === 'approved'),
    [claims]
  );

  const trendData = useMemo(() => {
    const grouped: Record<string, { total: number; count: number; vat: number }> = {};

    approvedClaims.forEach(claim => {
      const date = new Date(claim.expense_date);
      const key = period === 'monthly'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;

      if (!grouped[key]) grouped[key] = { total: 0, count: 0, vat: 0 };
      grouped[key].total += claim.amount_in_sar || 0;
      grouped[key].count += 1;
      grouped[key].vat += claim.vat_amount || 0;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, data]) => ({
        period: label,
        amount: Math.round(data.total * 100) / 100,
        claims: data.count,
        vat: Math.round(data.vat * 100) / 100,
        avg: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
      }));
  }, [approvedClaims, period]);

  const topSpenders = useMemo(() => {
    const byEmployee: Record<string, { name: string; number: string; total: number; count: number }> = {};

    approvedClaims.forEach(claim => {
      const empKey = claim.employee?.employee_number || 'unknown';
      if (!byEmployee[empKey]) {
        byEmployee[empKey] = {
          name: `${claim.employee?.first_name_en || ''} ${claim.employee?.last_name_en || ''}`.trim(),
          number: claim.employee?.employee_number || '',
          total: 0,
          count: 0,
        };
      }
      byEmployee[empKey].total += claim.amount_in_sar || 0;
      byEmployee[empKey].count += 1;
    });

    return Object.values(byEmployee)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(e => ({ ...e, total: Math.round(e.total * 100) / 100 }));
  }, [approvedClaims]);

  const categoryBreakdown = useMemo(() => {
    const byCat: Record<string, number> = {};
    approvedClaims.forEach(c => {
      const cat = c.expense_category || 'Other';
      byCat[cat] = (byCat[cat] || 0) + (c.amount_in_sar || 0);
    });
    return Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [approvedClaims]);

  const complianceRate = useMemo(() => {
    if (claims.length === 0) return 100;
    return Math.round((claims.filter(c => c.policy_compliant).length / claims.length) * 1000) / 10;
  }, [claims]);

  const totalApproved = approvedClaims.reduce((s, c) => s + (c.amount_in_sar || 0), 0);
  const avgPerClaim = approvedClaims.length > 0 ? totalApproved / approvedClaims.length : 0;
  const currentMonth = trendData.length > 0 ? trendData[trendData.length - 1].amount : 0;
  const previousMonth = trendData.length > 1 ? trendData[trendData.length - 2].amount : 0;
  const monthOverMonth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Spending Analytics</h3>
        <div className="flex items-center gap-2">
          {(['weekly', 'monthly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <p className="text-sm font-medium text-blue-700">Total Approved</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {totalApproved.toLocaleString('en-SA', { maximumFractionDigits: 0 })} SAR
          </p>
          <p className="text-xs text-blue-600 mt-1">{approvedClaims.length} claims</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
          <p className="text-sm font-medium text-emerald-700">Avg per Claim</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {avgPerClaim.toLocaleString('en-SA', { maximumFractionDigits: 0 })} SAR
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Period Trend</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {monthOverMonth >= 0 ? '+' : ''}{monthOverMonth.toFixed(1)}%
              </p>
            </div>
            {monthOverMonth >= 0
              ? <TrendingUp className="h-6 w-6 text-amber-600" />
              : <TrendingDown className="h-6 w-6 text-green-600" />
            }
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5 border border-teal-200">
          <p className="text-sm font-medium text-teal-700">Compliance Rate</p>
          <p className="text-2xl font-bold text-teal-900 mt-1">{complianceRate}%</p>
          <div className="mt-2 bg-teal-200 rounded-full h-2">
            <div
              className="bg-teal-600 h-2 rounded-full transition-all"
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            Spending Over Time
          </h4>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} SAR`} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} name="Amount" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="vat" stroke="#10B981" strokeWidth={2} name="VAT" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">No data available</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Category Breakdown</h4>
          {categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} SAR`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">No data available</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Claims Volume</h4>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="claims" fill="#3B82F6" name="Claims" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">No data available</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            Top Spenders
          </h4>
          {topSpenders.length > 0 ? (
            <div className="space-y-3">
              {topSpenders.map((emp, index) => {
                const maxTotal = topSpenders[0].total;
                const barWidth = maxTotal > 0 ? (emp.total / maxTotal) * 100 : 0;
                return (
                  <div key={emp.number} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-5">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{emp.name}</span>
                        <span className="text-sm font-semibold text-gray-700 ml-2 flex-shrink-0">
                          {emp.total.toLocaleString()} SAR
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{emp.count} claims</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
