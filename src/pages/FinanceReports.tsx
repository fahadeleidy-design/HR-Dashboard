import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PayrollSummaryReport } from '@/components/finance/PayrollSummaryReport';
import { LoanPortfolioReport } from '@/components/finance/LoanPortfolioReport';
import { GOSIContributionReport } from '@/components/finance/GOSIContributionReport';
import { EOSLiabilityReport } from '@/components/finance/EOSLiabilityReport';
import { ExpenseAnalysisReport } from '@/components/finance/ExpenseAnalysisReport';
import { PenaltyDeductionsReport } from '@/components/finance/PenaltyDeductionsReport';
import { CostCenterReport } from '@/components/finance/CostCenterReport';
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
          <ExpenseAnalysisReport companyIds={companyIds} language={language as 'ar' | 'en'} isRTL={isRTL} dateRange={dateRange} />
        )}
        {activeTab === 'penalties' && (
          <PenaltyDeductionsReport companyIds={companyIds} language={language as 'ar' | 'en'} isRTL={isRTL} dateRange={dateRange} />
        )}
        {activeTab === 'costcenter' && (
          <CostCenterReport companyIds={companyIds} language={language as 'ar' | 'en'} isRTL={isRTL} dateRange={dateRange} />
        )}
      </div>
    </div>
  );
}
