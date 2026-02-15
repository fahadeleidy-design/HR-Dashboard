import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface CashFlowData {
  month: string;
  payroll: number;
  gosi: number;
  loans: number;
  advances: number;
  expenses: number;
  insurance: number;
}

interface Props {
  data: CashFlowData[];
  language: 'ar' | 'en';
  isRTL: boolean;
}

export function FinanceCashFlow({ data, language, isRTL }: Props) {
  const currentMonth = data[data.length - 1];
  const previousMonth = data.length > 1 ? data[data.length - 2] : null;

  const currentTotal = currentMonth
    ? currentMonth.payroll + currentMonth.gosi + currentMonth.loans + currentMonth.advances + currentMonth.expenses + currentMonth.insurance
    : 0;
  const previousTotal = previousMonth
    ? previousMonth.payroll + previousMonth.gosi + previousMonth.loans + previousMonth.advances + previousMonth.expenses + previousMonth.insurance
    : 0;
  const changePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  const categories = [
    { key: 'payroll', label: language === 'ar' ? 'الرواتب' : 'Payroll', color: '#3b82f6' },
    { key: 'gosi', label: language === 'ar' ? 'التأمينات' : 'GOSI', color: '#10b981' },
    { key: 'loans', label: language === 'ar' ? 'القروض' : 'Loans', color: '#14b8a6' },
    { key: 'advances', label: language === 'ar' ? 'السلف' : 'Advances', color: '#06b6d4' },
    { key: 'expenses', label: language === 'ar' ? 'المصروفات' : 'Expenses', color: '#f97316' },
    { key: 'insurance', label: language === 'ar' ? 'التأمين' : 'Insurance', color: '#8b5cf6' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h3 className={`font-semibold text-gray-900 ${isRTL ? 'text-right' : ''}`}>
            {language === 'ar' ? 'التدفق النقدي الشهري' : 'Monthly Cash Outflow'}
          </h3>
          <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentTotal, language)}
            </span>
            {changePercent !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${changePercent > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {changePercent > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(changePercent).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              formatter={(value: number, name: string) => [formatCurrency(value, language), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {categories.map((cat) => (
              <Bar key={cat.key} dataKey={cat.key} name={cat.label} fill={cat.color} stackId="a" radius={cat.key === 'insurance' ? [4, 4, 0, 0] : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {currentMonth && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-4 border-t border-gray-100">
          {categories.map((cat) => (
            <div key={cat.key} className={`text-center ${isRTL ? 'text-right' : ''}`}>
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[10px] text-gray-500 font-medium">{cat.label}</span>
              </div>
              <p className="text-xs font-semibold text-gray-700">
                {formatCurrency((currentMonth as any)[cat.key] || 0, language)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
