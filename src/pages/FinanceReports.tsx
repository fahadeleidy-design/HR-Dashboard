import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { PayrollSummaryReport } from '@/components/finance/PayrollSummaryReport';
import { LoanPortfolioReport } from '@/components/finance/LoanPortfolioReport';
import { GOSIContributionReport } from '@/components/finance/GOSIContributionReport';
import { EOSLiabilityReport } from '@/components/finance/EOSLiabilityReport';
import {
  FileText, DollarSign, CreditCard, Shield, Banknote,
  Receipt, AlertTriangle, TrendingUp, Calendar
} from 'lucide-react';

const reportTabs = [
  { key: 'payroll', icon: DollarSign, label: 'Payroll Summary', labelAr: 'ملخص الرواتب' },
  { key: 'gosi', icon: Shield, label: 'GOSI Contributions', labelAr: 'اشتراكات التأمينات' },
  { key: 'loans', icon: CreditCard, label: 'Loan Portfolio', labelAr: 'محفظة القروض' },
  { key: 'eos', icon: Banknote, label: 'EOS Liability', labelAr: 'التزامات نهاية الخدمة' },
  { key: 'expenses', icon: Receipt, label: 'Expense Analysis', labelAr: 'تحليل المصروفات' },
  { key: 'penalties', icon: AlertTriangle, label: 'Penalty Deductions', labelAr: 'خصومات الجزاءات' },
  { key: 'costcenter', icon: TrendingUp, label: 'Cost Center Report', labelAr: 'تقرير مراكز التكلفة' },
];

export function FinanceReports() {
  const { userRole } = useAuth();
  const { currentCompany, companies, isConsolidatedView } = useCompany();
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('payroll');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const companyIds = isConsolidatedView ? companies.map(c => c.id) : currentCompany ? [currentCompany.id] : [];

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <FileText className="h-7 w-7 text-blue-600" />
            {language === 'ar' ? 'التقارير المالية' : 'Financial Reports'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ar' ? 'تقارير مالية شاملة وتحليلات تفصيلية' : 'Comprehensive financial reports and detailed analytics'}
          </p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {language === 'ar' ? tab.labelAr : tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'payroll' && (
          <PayrollSummaryReport companyIds={companyIds} language={language as 'ar' | 'en'} isRTL={isRTL} dateRange={dateRange} />
        )}
        {activeTab === 'gosi' && (
          <GOSIContributionReport companyIds={companyIds} language={language as 'ar' | 'en'} isRTL={isRTL} />
        )}
        {activeTab === 'loans' && (
          <LoanPortfolioReport companyIds={companyIds} language={language as 'ar' | 'en'} isRTL={isRTL} />
        )}
        {activeTab === 'eos' && (
          <EOSLiabilityReport companyIds={companyIds} language={language as 'ar' | 'en'} isRTL={isRTL} />
        )}
        {activeTab === 'expenses' && (
          <ExpenseAnalysisPlaceholder language={language as 'ar' | 'en'} isRTL={isRTL} companyIds={companyIds} />
        )}
        {activeTab === 'penalties' && (
          <PenaltyReportPlaceholder language={language as 'ar' | 'en'} isRTL={isRTL} companyIds={companyIds} />
        )}
        {activeTab === 'costcenter' && (
          <CostCenterReportPlaceholder language={language as 'ar' | 'en'} isRTL={isRTL} companyIds={companyIds} />
        )}
      </div>
    </div>
  );
}

function ExpenseAnalysisPlaceholder({ language, isRTL, companyIds }: { language: 'ar' | 'en'; isRTL: boolean; companyIds: string[] }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: expenses } = await supabase
        .from('expense_claims')
        .select('total_amount, status, category, created_at, employees!inner(first_name_en, last_name_en, departments(name_en))')
        .in('company_id', companyIds);

      const categoryMap = new Map<string, { total: number; count: number; approved: number }>();
      (expenses || []).forEach((e: any) => {
        const cat = e.category || 'Other';
        const existing = categoryMap.get(cat) || { total: 0, count: 0, approved: 0 };
        existing.total += e.total_amount || 0;
        existing.count += 1;
        if (e.status === 'approved') existing.approved += 1;
        categoryMap.set(cat, existing);
      });

      setData(Array.from(categoryMap.entries()).map(([cat, vals]) => ({
        category: cat, ...vals, approvalRate: vals.count > 0 ? ((vals.approved / vals.count) * 100).toFixed(1) : '0',
      })));
      setLoading(false);
    })();
  }, [companyIds]);

  if (loading) return <div className="animate-pulse h-64 bg-gray-200 rounded" />;

  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        {language === 'ar' ? 'تحليل المصروفات حسب الفئة' : 'Expense Analysis by Category'}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الفئة' : 'Category'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'العدد' : 'Count'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'نسبة الاعتماد' : 'Approval %'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row.category} className="hover:bg-gray-50">
                <td className={`px-4 py-3 font-medium text-gray-900 capitalize ${isRTL ? 'text-right' : 'text-left'}`}>{row.category}</td>
                <td className="px-4 py-3 text-center text-gray-600">{row.count}</td>
                <td className={`px-4 py-3 text-gray-900 font-semibold ${isRTL ? 'text-left' : 'text-right'}`}>
                  {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(row.total)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${Number(row.approvalRate) > 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {row.approvalRate}%
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

function PenaltyReportPlaceholder({ language, isRTL, companyIds }: { language: 'ar' | 'en'; isRTL: boolean; companyIds: string[] }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: penalties } = await supabase
        .from('penalties')
        .select('penalty_amount, penalty_type, status, created_at, employees!inner(first_name_en, last_name_en, departments(name_en))')
        .in('company_id', companyIds);

      setData(penalties || []);
      setLoading(false);
    })();
  }, [companyIds]);

  if (loading) return <div className="animate-pulse h-64 bg-gray-200 rounded" />;

  const totalApproved = data.filter(d => d.status === 'approved').reduce((s, d) => s + (d.penalty_amount || 0), 0);
  const totalPending = data.filter(d => d.status === 'pending_finance').reduce((s, d) => s + (d.penalty_amount || 0), 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {language === 'ar' ? 'تقرير خصومات الجزاءات' : 'Penalty Deductions Report'}
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'الإجمالي المعتمد' : 'Total Approved'}</p>
          <p className="text-lg font-bold text-red-600">{new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(totalApproved)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'معلق للمالية' : 'Pending Finance'}</p>
          <p className="text-lg font-bold text-amber-600">{new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(totalPending)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'عدد الجزاءات' : 'Total Penalties'}</p>
          <p className="text-lg font-bold text-gray-900">{data.length}</p>
        </div>
      </div>
    </div>
  );
}

function CostCenterReportPlaceholder({ language, isRTL, companyIds }: { language: 'ar' | 'en'; isRTL: boolean; companyIds: string[] }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: centers } = await supabase
        .from('cost_centers')
        .select('id, name, code, budget_amount, is_active')
        .in('company_id', companyIds);

      setData(centers || []);
      setLoading(false);
    })();
  }, [companyIds]);

  if (loading) return <div className="animate-pulse h-64 bg-gray-200 rounded" />;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {language === 'ar' ? 'تقرير مراكز التكلفة' : 'Cost Center Report'}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الرمز' : 'Code'}</th>
              <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الميزانية' : 'Budget'}</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className={`px-4 py-3 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{row.name}</td>
                <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{row.code}</td>
                <td className={`px-4 py-3 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>
                  {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(row.budget_amount || 0)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {row.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
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
