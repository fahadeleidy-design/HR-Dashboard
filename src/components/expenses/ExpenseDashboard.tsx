import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ExpenseClaim {
  id: string;
  amount_in_sar: number;
  expense_category: string;
  approval_status: string;
  expense_date: string;
  policy_compliant: boolean;
}

interface ExpenseDashboardProps {
  claims: ExpenseClaim[];
  period: 'week' | 'month' | 'year';
}

export function ExpenseDashboard({ claims, period }: ExpenseDashboardProps) {
  const analytics = useMemo(() => {
    const total = claims.reduce((sum, c) => sum + (c.amount_in_sar || 0), 0);
    const pending = claims.filter(c => c.approval_status === 'pending');
    const approved = claims.filter(c => c.approval_status === 'approved');
    const rejected = claims.filter(c => c.approval_status === 'rejected');
    const violations = claims.filter(c => !c.policy_compliant);

    const avgClaim = claims.length > 0 ? total / claims.length : 0;

    const byCategory = claims.reduce((acc, claim) => {
      const cat = claim.expense_category || 'Other';
      acc[cat] = (acc[cat] || 0) + (claim.amount_in_sar || 0);
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return {
      total,
      pending: { count: pending.length, amount: pending.reduce((sum, c) => sum + (c.amount_in_sar || 0), 0) },
      approved: { count: approved.length, amount: approved.reduce((sum, c) => sum + (c.amount_in_sar || 0), 0) },
      rejected: { count: rejected.length, amount: rejected.reduce((sum, c) => sum + (c.amount_in_sar || 0), 0) },
      violations: violations.length,
      avgClaim,
      categoryData,
    };
  }, [claims]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Expenses</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {analytics.total.toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
              </p>
              <p className="text-sm text-blue-600 mt-1">{claims.length} claims</p>
            </div>
            <div className="h-14 w-14 bg-blue-200 rounded-full flex items-center justify-center">
              <DollarSign className="h-7 w-7 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">Pending</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{analytics.pending.count}</p>
              <p className="text-sm text-yellow-600 mt-1">
                {analytics.pending.amount.toLocaleString('en-SA', { maximumFractionDigits: 0 })} SAR
              </p>
            </div>
            <div className="h-14 w-14 bg-yellow-200 rounded-full flex items-center justify-center">
              <Clock className="h-7 w-7 text-yellow-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Approved</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{analytics.approved.count}</p>
              <p className="text-sm text-green-600 mt-1">
                {analytics.approved.amount.toLocaleString('en-SA', { maximumFractionDigits: 0 })} SAR
              </p>
            </div>
            <div className="h-14 w-14 bg-green-200 rounded-full flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Policy Violations</p>
              <p className="text-3xl font-bold text-red-900 mt-2">{analytics.violations}</p>
              <p className="text-sm text-red-600 mt-1">Require review</p>
            </div>
            <div className="h-14 w-14 bg-red-200 rounded-full flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} SAR`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} SAR`} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Average Claim</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {analytics.avgClaim.toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Approval Rate</h3>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {claims.length > 0 ? ((analytics.approved.count / claims.length) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Rejection Rate</h3>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {claims.length > 0 ? ((analytics.rejected.count / claims.length) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
