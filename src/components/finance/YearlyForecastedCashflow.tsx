import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, AlertTriangle, DollarSign, Download } from 'lucide-react';

interface YearlyForecastedCashflowProps {
  language: 'ar' | 'en';
  isRTL: boolean;
}

interface MonthlyForecast {
  month: string;
  monthKey: string;
  salaries: number;
  rent: number;
  gosi: number;
  insurance: number;
  loans: number;
  utilities: number;
  total: number;
}

export function YearlyForecastedCashflow({ language, isRTL }: YearlyForecastedCashflowProps) {
  const { currentCompany, companies, isConsolidatedView } = useCompany();
  const [loading, setLoading] = useState(true);
  const [forecastData, setForecastData] = useState<MonthlyForecast[]>([]);
  const [yearlyTotals, setYearlyTotals] = useState({
    salaries: 0,
    rent: 0,
    gosi: 0,
    insurance: 0,
    loans: 0,
    utilities: 0,
    total: 0
  });

  useEffect(() => {
    if (currentCompany || isConsolidatedView) {
      calculateYearlyForecast();
    }
  }, [currentCompany, isConsolidatedView, companies]);

  const calculateYearlyForecast = async () => {
    if (!currentCompany && !isConsolidatedView) return;

    setLoading(true);
    try {
      const companyIds = isConsolidatedView ? companies.map(c => c.id) : [currentCompany!.id];
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      const [
        employeesRes,
        realEstateRes,
        loansRes,
        insuranceRes,
        gosiRatesRes
      ] = await Promise.all([
        supabase
          .from('employees')
          .select('basic_salary, housing_allowance, transport_allowance, other_allowances, is_saudi')
          .in('company_id', companyIds)
          .eq('status', 'active'),
        supabase
          .from('real_estate_properties')
          .select('monthly_rent, payment_frequency, next_payment_date')
          .in('company_id', companyIds)
          .eq('status', 'active'),
        supabase
          .from('loans')
          .select('remaining_amount, monthly_payment')
          .in('company_id', companyIds)
          .in('status', ['active', 'approved']),
        supabase
          .from('insurance_policies')
          .select('premium_amount, payment_frequency, end_date')
          .in('company_id', companyIds)
          .eq('status', 'active')
          .gte('end_date', currentDate.toISOString()),
        supabase
          .from('gosi_rates_configuration')
          .select('*')
          .eq('is_active', true)
          .single()
      ]);

      const employees = employeesRes.data || [];
      const properties = realEstateRes.data || [];
      const loans = loansRes.data || [];
      const insurancePolicies = insuranceRes.data || [];
      const gosiConfig = gosiRatesRes.data;

      const monthlyBaseSalary = employees.reduce((sum, emp) => {
        return sum + (emp.basic_salary || 0) +
               (emp.housing_allowance || 0) +
               (emp.transport_allowance || 0) +
               (emp.other_allowances || 0);
      }, 0);

      const saudiCount = employees.filter(e => e.is_saudi).length;
      const nonSaudiCount = employees.length - saudiCount;

      const gosiRate = {
        saudi: {
          retirement: gosiConfig?.saudi_retirement_employer_rate || 9,
          annuities: gosiConfig?.saudi_annuities_rate || 2,
          occupational: gosiConfig?.occupational_hazards_rate || 2
        },
        nonSaudi: {
          occupational: gosiConfig?.occupational_hazards_rate || 2
        }
      };

      const monthlyGOSI = employees.reduce((sum, emp) => {
        const salary = (emp.basic_salary || 0) + (emp.housing_allowance || 0);
        if (emp.is_saudi) {
          return sum + (salary * (gosiRate.saudi.retirement + gosiRate.saudi.annuities + gosiRate.saudi.occupational) / 100);
        } else {
          return sum + (salary * gosiRate.nonSaudi.occupational / 100);
        }
      }, 0);

      const monthlyRent = properties.reduce((sum, prop) => {
        const rent = prop.monthly_rent || 0;
        const freq = prop.payment_frequency || 'monthly';

        if (freq === 'monthly') return sum + rent;
        if (freq === 'quarterly') return sum + (rent / 3);
        if (freq === 'semi_annual') return sum + (rent / 6);
        if (freq === 'annual') return sum + (rent / 12);
        return sum;
      }, 0);

      const monthlyLoans = loans.reduce((sum, loan) => {
        return sum + (loan.monthly_payment || 0);
      }, 0);

      const monthlyInsurance = insurancePolicies.reduce((sum, policy) => {
        const premium = policy.premium_amount || 0;
        const freq = policy.payment_frequency || 'monthly';

        if (freq === 'monthly') return sum + premium;
        if (freq === 'quarterly') return sum + (premium / 3);
        if (freq === 'semi_annual') return sum + (premium / 6);
        if (freq === 'annual') return sum + (premium / 12);
        return sum;
      }, 0);

      const estimatedUtilities = monthlyBaseSalary * 0.02;

      const forecast: MonthlyForecast[] = [];
      let totals = {
        salaries: 0,
        rent: 0,
        gosi: 0,
        insurance: 0,
        loans: 0,
        utilities: 0,
        total: 0
      };

      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(currentYear, currentMonth + i, 1);
        const monthKey = monthDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
          month: 'short',
          year: 'numeric'
        });

        const salaryGrowthFactor = 1 + (i * 0.005);
        const monthlySalary = monthlyBaseSalary * salaryGrowthFactor;
        const monthlyGOSIAdjusted = monthlyGOSI * salaryGrowthFactor;

        const monthData: MonthlyForecast = {
          month: monthKey,
          monthKey: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
          salaries: monthlySalary,
          rent: monthlyRent,
          gosi: monthlyGOSIAdjusted,
          insurance: monthlyInsurance,
          loans: monthlyLoans,
          utilities: estimatedUtilities,
          total: monthlySalary + monthlyRent + monthlyGOSIAdjusted + monthlyInsurance + monthlyLoans + estimatedUtilities
        };

        totals.salaries += monthData.salaries;
        totals.rent += monthData.rent;
        totals.gosi += monthData.gosi;
        totals.insurance += monthData.insurance;
        totals.loans += monthData.loans;
        totals.utilities += monthData.utilities;
        totals.total += monthData.total;

        forecast.push(monthData);
      }

      setForecastData(forecast);
      setYearlyTotals(totals);
    } catch (error) {
      console.error('Error calculating yearly forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Month', 'Salaries', 'Rent', 'GOSI', 'Insurance', 'Loans', 'Utilities', 'Total'];
    const rows = forecastData.map(d => [
      d.month,
      d.salaries.toFixed(2),
      d.rent.toFixed(2),
      d.gosi.toFixed(2),
      d.insurance.toFixed(2),
      d.loans.toFixed(2),
      d.utilities.toFixed(2),
      d.total.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cashflow_forecast_${new Date().getFullYear()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  const chartData = forecastData.map(d => ({
    month: d.month,
    [language === 'ar' ? 'الرواتب' : 'Salaries']: Math.round(d.salaries),
    [language === 'ar' ? 'الإيجار' : 'Rent']: Math.round(d.rent),
    [language === 'ar' ? 'التأمينات' : 'GOSI']: Math.round(d.gosi),
    [language === 'ar' ? 'التأمين' : 'Insurance']: Math.round(d.insurance),
    [language === 'ar' ? 'القروض' : 'Loans']: Math.round(d.loans),
    [language === 'ar' ? 'المرافق' : 'Utilities']: Math.round(d.utilities),
  }));

  const totalChartData = forecastData.map(d => ({
    month: d.month,
    [language === 'ar' ? 'إجمالي التدفقات الخارجة' : 'Total Outgoing']: Math.round(d.total)
  }));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl border border-blue-200 p-6 text-white">
        <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="h-6 w-6" />
              <h2 className="text-xl font-bold">
                {language === 'ar' ? 'توقعات التدفقات النقدية الخارجة السنوية' : 'Yearly Forecasted Outgoing Cashflow'}
              </h2>
            </div>
            <p className="text-blue-100 text-sm">
              {language === 'ar'
                ? `توقع شامل لجميع المصروفات للأشهر الـ 12 القادمة من ${forecastData[0]?.month || ''}`
                : `Comprehensive forecast of all expenses for the next 12 months starting from ${forecastData[0]?.month || ''}`}
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="h-4 w-4" />
            <span className="text-sm font-medium">
              {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: language === 'ar' ? 'إجمالي الرواتب السنوية' : 'Total Annual Salaries',
            value: yearlyTotals.salaries,
            icon: DollarSign,
            color: 'blue'
          },
          {
            label: language === 'ar' ? 'إجمالي الإيجارات السنوية' : 'Total Annual Rent',
            value: yearlyTotals.rent,
            icon: DollarSign,
            color: 'emerald'
          },
          {
            label: language === 'ar' ? 'إجمالي التأمينات السنوية' : 'Total Annual GOSI',
            value: yearlyTotals.gosi,
            icon: DollarSign,
            color: 'amber'
          },
          {
            label: language === 'ar' ? 'إجمالي التدفقات السنوية' : 'Total Annual Cashflow',
            value: yearlyTotals.total,
            icon: TrendingUp,
            color: 'red'
          },
        ].map((item, index) => {
          const Icon = item.icon;
          const colorClasses = {
            blue: 'bg-blue-50 border-blue-200 text-blue-600',
            emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
            amber: 'bg-amber-50 border-amber-200 text-amber-600',
            red: 'bg-red-50 border-red-200 text-red-600'
          };

          return (
            <div key={index} className={`bg-white rounded-xl border border-gray-200 p-5 ${colorClasses[item.color as keyof typeof colorClasses].split(' ')[0]}`}>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-sm font-medium text-gray-600">{item.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(item.value, language)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 'متوسط شهري: ' : 'Monthly Avg: '}
                    {formatCurrency(item.value / 12, language)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {language === 'ar' ? 'إجمالي التدفقات الخارجة الشهرية' : 'Total Monthly Outgoing Cashflow'}
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={totalChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value, language)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar
                dataKey={language === 'ar' ? 'إجمالي التدفقات الخارجة' : 'Total Outgoing'}
                fill="#ef4444"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {language === 'ar' ? 'تفصيل المصروفات الشهرية' : 'Monthly Expense Breakdown'}
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value, language)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey={language === 'ar' ? 'الرواتب' : 'Salaries'}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey={language === 'ar' ? 'الإيجار' : 'Rent'}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey={language === 'ar' ? 'التأمينات' : 'GOSI'}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey={language === 'ar' ? 'التأمين' : 'Insurance'}
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey={language === 'ar' ? 'القروض' : 'Loans'}
                stroke="#ec4899"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey={language === 'ar' ? 'المرافق' : 'Utilities'}
                stroke="#14b8a6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm font-medium text-amber-900">
              {language === 'ar' ? 'ملاحظة حول التوقعات' : 'Forecast Note'}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {language === 'ar'
                ? 'هذه التوقعات تعتمد على البيانات الحالية وتتضمن معدل نمو محتمل للرواتب بنسبة 0.5% شهرياً. قد تختلف المصروفات الفعلية بناءً على التغييرات في عدد الموظفين، الاستقالات، أو العوامل الخارجية.'
                : 'These forecasts are based on current data and include a potential salary growth rate of 0.5% monthly. Actual expenses may vary based on changes in employee count, resignations, or external factors.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'الشهر' : 'Month'}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-right'}`}>
                  {language === 'ar' ? 'الرواتب' : 'Salaries'}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-right'}`}>
                  {language === 'ar' ? 'الإيجار' : 'Rent'}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-right'}`}>
                  {language === 'ar' ? 'التأمينات' : 'GOSI'}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-right'}`}>
                  {language === 'ar' ? 'التأمين' : 'Insurance'}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-right'}`}>
                  {language === 'ar' ? 'القروض' : 'Loans'}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-right'}`}>
                  {language === 'ar' ? 'المرافق' : 'Utilities'}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-right'}`}>
                  {language === 'ar' ? 'الإجمالي' : 'Total'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {forecastData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className={`px-4 py-3 text-sm text-gray-900 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                    {data.month}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(data.salaries, language)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(data.rent, language)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(data.gosi, language)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(data.insurance, language)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(data.loans, language)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(data.utilities, language)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">
                    {formatCurrency(data.total, language)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'الإجمالي السنوي' : 'Annual Total'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(yearlyTotals.salaries, language)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(yearlyTotals.rent, language)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(yearlyTotals.gosi, language)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(yearlyTotals.insurance, language)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(yearlyTotals.loans, language)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(yearlyTotals.utilities, language)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-bold text-right">
                  {formatCurrency(yearlyTotals.total, language)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
