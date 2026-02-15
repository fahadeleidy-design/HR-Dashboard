import { formatCurrency } from '@/lib/formatters';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle,
  CreditCard, Receipt, Users, CheckCircle, Banknote
} from 'lucide-react';

interface FinanceKPI {
  totalPayroll: number;
  pendingApprovals: number;
  outstandingLoans: number;
  outstandingAdvances: number;
  gosiLiability: number;
  eosLiability: number;
  monthlyExpenses: number;
  budgetUtilization: number;
  payrollChange: number;
  pendingSLA: number;
}

interface Props {
  kpis: FinanceKPI;
  language: 'ar' | 'en';
  isRTL: boolean;
  onCardClick?: (section: string) => void;
}

const kpiConfig = (kpis: FinanceKPI, language: 'ar' | 'en') => [
  {
    key: 'payroll',
    label: language === 'ar' ? 'إجمالي الرواتب الشهرية' : 'Monthly Payroll',
    value: formatCurrency(kpis.totalPayroll, language),
    icon: DollarSign,
    change: kpis.payrollChange,
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    key: 'approvals',
    label: language === 'ar' ? 'الموافقات المعلقة' : 'Pending Approvals',
    value: String(kpis.pendingApprovals),
    icon: Clock,
    color: 'from-amber-500 to-amber-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    urgent: kpis.pendingSLA > 0,
    badge: kpis.pendingSLA > 0 ? `${kpis.pendingSLA} ${language === 'ar' ? 'متأخرة' : 'overdue'}` : undefined,
  },
  {
    key: 'loans',
    label: language === 'ar' ? 'رصيد القروض القائمة' : 'Outstanding Loans',
    value: formatCurrency(kpis.outstandingLoans, language),
    icon: CreditCard,
    color: 'from-teal-500 to-teal-600',
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-700',
  },
  {
    key: 'advances',
    label: language === 'ar' ? 'السلف المستحقة' : 'Outstanding Advances',
    value: formatCurrency(kpis.outstandingAdvances, language),
    icon: Receipt,
    color: 'from-cyan-500 to-cyan-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-700',
  },
  {
    key: 'gosi',
    label: language === 'ar' ? 'التزامات التأمينات' : 'GOSI Liability',
    value: formatCurrency(kpis.gosiLiability, language),
    icon: Users,
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  {
    key: 'eos',
    label: language === 'ar' ? 'التزامات نهاية الخدمة' : 'EOS Liability',
    value: formatCurrency(kpis.eosLiability, language),
    icon: Banknote,
    color: 'from-rose-500 to-rose-600',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
  {
    key: 'expenses',
    label: language === 'ar' ? 'المصروفات الشهرية' : 'Monthly Expenses',
    value: formatCurrency(kpis.monthlyExpenses, language),
    icon: TrendingDown,
    color: 'from-orange-500 to-orange-600',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-700',
  },
  {
    key: 'budget',
    label: language === 'ar' ? 'استخدام الميزانية' : 'Budget Utilization',
    value: `${Math.round(kpis.budgetUtilization)}%`,
    icon: TrendingUp,
    color: kpis.budgetUtilization > 90 ? 'from-red-500 to-red-600' : kpis.budgetUtilization > 75 ? 'from-amber-500 to-amber-600' : 'from-green-500 to-green-600',
    bgLight: kpis.budgetUtilization > 90 ? 'bg-red-50' : kpis.budgetUtilization > 75 ? 'bg-amber-50' : 'bg-green-50',
    textColor: kpis.budgetUtilization > 90 ? 'text-red-700' : kpis.budgetUtilization > 75 ? 'text-amber-700' : 'text-green-700',
  },
];

export function FinanceKPICards({ kpis, language, isRTL, onCardClick }: Props) {
  const cards = kpiConfig(kpis, language);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.key}
            onClick={() => onCardClick?.(card.key)}
            className={`relative group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'} w-full`}
          >
            <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {card.label}
                </p>
                <p className={`text-xl font-bold ${card.textColor} mt-1`}>
                  {card.value}
                </p>
                {card.change !== undefined && card.change !== 0 && (
                  <div className={`flex items-center gap-1 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {card.change > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                    )}
                    <span className={`text-xs font-medium ${card.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {Math.abs(card.change).toFixed(1)}% {language === 'ar' ? 'من الشهر السابق' : 'vs last month'}
                    </span>
                  </div>
                )}
              </div>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} shadow-lg shadow-${card.color.split('-')[1]}-200/50`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
            {card.badge && (
              <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'}`}>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  {card.badge}
                </span>
              </div>
            )}
            {card.key === 'budget' && (
              <div className="mt-3">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${card.color} transition-all duration-500`}
                    style={{ width: `${Math.min(kpis.budgetUtilization, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
