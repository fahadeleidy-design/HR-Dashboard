import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { buildCompanyFilter } from '@/lib/queryHelpers';
import { FinanceKPICards } from '@/components/finance/FinanceKPICards';
import { FinancePendingActions } from '@/components/finance/FinancePendingActions';
import { FinanceCashFlow } from '@/components/finance/FinanceCashFlow';
import { FinanceAlerts } from '@/components/finance/FinanceAlerts';
import { RecentPayrollBatches } from '@/components/finance/RecentPayrollBatches';
import { YearlyForecastedCashflow } from '@/components/finance/YearlyForecastedCashflow';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import {
  LayoutDashboard, RefreshCw, Calendar, TrendingUp,
  DollarSign, FileText, CheckCircle, ArrowRight
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

export function FinanceDashboard() {
  const { userRole, user } = useAuth();
  const { currentCompany, companies, isConsolidatedView } = useCompany();
  const { language, isRTL } = useLanguage();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<FinanceKPI>({
    totalPayroll: 0, pendingApprovals: 0, outstandingLoans: 0,
    outstandingAdvances: 0, gosiLiability: 0, eosLiability: 0,
    monthlyExpenses: 0, budgetUtilization: 0, payrollChange: 0, pendingSLA: 0,
  });
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<any[]>([]);
  const [approvalProcessing, setApprovalProcessing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!currentCompany && !isConsolidatedView) return;
    setLoading(true);

    try {
      const companyIds = isConsolidatedView ? companies.map(c => c.id) : [currentCompany!.id];

      const [
        payrollRes,
        loansRes,
        advancesRes,
        expenseRes,
        gosiRes,
        eosRes,
        batchRes,
        pendingLoansRes,
        pendingAdvancesRes,
        pendingExpensesRes,
        pendingPenaltiesRes,
      ] = await Promise.all([
        supabase.from('payroll').select('net_salary, gross_salary, gosi_employee, gosi_employer, company_id, effective_from').in('company_id', companyIds),
        supabase.from('loans').select('remaining_amount, status, company_id').in('company_id', companyIds).in('status', ['active', 'approved', 'hr_approved']),
        supabase.from('advances').select('remaining_amount, status, company_id').in('company_id', companyIds).in('status', ['active', 'approved', 'hr_approved']),
        supabase.from('expense_claims').select('total_amount, status, company_id, created_at').in('company_id', companyIds),
        supabase.from('gosi_contributions').select('total_contribution, employer_contribution, employee_contribution, month, company_id').in('company_id', companyIds),
        supabase.from('end_of_service_calculations').select('total_benefit, company_id').in('company_id', companyIds),
        supabase.from('payroll_batches').select('id, batch_name, period_month, status, total_net_salary, total_employees, created_at, company_id').in('company_id', companyIds).order('created_at', { ascending: false }).limit(5),
        supabase.from('loans').select('id, loan_amount, employee_id, created_at, status, company_id, employees!inner(first_name_en, last_name_en, employee_number, departments(name_en))').in('company_id', companyIds).eq('status', 'hr_approved'),
        supabase.from('advances').select('id, advance_amount, employee_id, created_at, status, company_id, employees!inner(first_name_en, last_name_en, employee_number, departments(name_en))').in('company_id', companyIds).eq('status', 'hr_approved'),
        supabase.from('expense_claims').select('id, total_amount, employee_id, created_at, status, company_id, employees!inner(first_name_en, last_name_en, employee_number, departments(name_en))').in('company_id', companyIds).eq('status', 'hr_approved'),
        supabase.from('penalties').select('id, penalty_amount, employee_id, created_at, status, company_id, employees!inner(first_name_en, last_name_en, employee_number, departments(name_en))').in('company_id', companyIds).eq('status', 'pending_finance'),
      ]);

      const totalPayroll = (payrollRes.data || []).reduce((sum, p) => sum + (p.net_salary || 0), 0);
      const outstandingLoans = (loansRes.data || []).reduce((sum, l) => sum + (l.remaining_amount || 0), 0);
      const outstandingAdvances = (advancesRes.data || []).reduce((sum, a) => sum + (a.remaining_amount || 0), 0);
      const gosiLiability = (gosiRes.data || []).reduce((sum, g) => sum + (g.total_contribution || 0), 0);
      const eosLiability = (eosRes.data || []).reduce((sum, e) => sum + (e.total_benefit || 0), 0);

      const now = new Date();
      const currentMonthExpenses = (expenseRes.data || [])
        .filter(e => {
          const d = new Date(e.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.status === 'approved';
        })
        .reduce((sum, e) => sum + (e.total_amount || 0), 0);

      const pendingAll = [
        ...(pendingLoansRes.data || []).map((l: any) => ({
          id: l.id, type: 'loan' as const, amount: l.loan_amount,
          employee_name: `${l.employees?.first_name_en || ''} ${l.employees?.last_name_en || ''}`,
          department: l.employees?.departments?.name_en || '',
          request_date: l.created_at,
          sla_deadline: new Date(new Date(l.created_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          is_overdue: (Date.now() - new Date(l.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000,
          previous_approvals: ['Manager', 'HR'],
        })),
        ...(pendingAdvancesRes.data || []).map((a: any) => ({
          id: a.id, type: 'advance' as const, amount: a.advance_amount,
          employee_name: `${a.employees?.first_name_en || ''} ${a.employees?.last_name_en || ''}`,
          department: a.employees?.departments?.name_en || '',
          request_date: a.created_at,
          sla_deadline: new Date(new Date(a.created_at).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          is_overdue: (Date.now() - new Date(a.created_at).getTime()) > 2 * 24 * 60 * 60 * 1000,
          previous_approvals: ['Manager', 'HR'],
        })),
        ...(pendingExpensesRes.data || []).map((e: any) => ({
          id: e.id, type: 'expense' as const, amount: e.total_amount,
          employee_name: `${e.employees?.first_name_en || ''} ${e.employees?.last_name_en || ''}`,
          department: e.employees?.departments?.name_en || '',
          request_date: e.created_at,
          sla_deadline: new Date(new Date(e.created_at).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          is_overdue: (Date.now() - new Date(e.created_at).getTime()) > 5 * 24 * 60 * 60 * 1000,
          previous_approvals: ['Manager', 'HR'],
        })),
        ...(pendingPenaltiesRes.data || []).map((p: any) => ({
          id: p.id, type: 'penalty' as const, amount: p.penalty_amount,
          employee_name: `${p.employees?.first_name_en || ''} ${p.employees?.last_name_en || ''}`,
          department: p.employees?.departments?.name_en || '',
          request_date: p.created_at,
          sla_deadline: new Date(new Date(p.created_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          is_overdue: (Date.now() - new Date(p.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000,
          previous_approvals: ['HR'],
        })),
      ];

      const overdueCount = pendingAll.filter(p => p.is_overdue).length;

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
        const mStart = `${monthKey}-01`;
        const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const mEnd = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-01`;

        const monthPayroll = (payrollRes.data || [])
          .filter(p => {
            const pMonth = (p as any).effective_from;
            return pMonth && pMonth >= mStart && pMonth < mEnd;
          })
          .reduce((s, p) => s + (p.net_salary || 0), 0);

        const monthGosi = (gosiRes.data || [])
          .filter(g => g.month?.startsWith(monthKey))
          .reduce((s, g) => s + (g.total_contribution || 0), 0);

        const monthExpenses = (expenseRes.data || [])
          .filter(e => {
            const eDate = e.created_at;
            return eDate && eDate >= mStart && eDate < mEnd && e.status === 'approved';
          })
          .reduce((s, e) => s + (e.total_amount || 0), 0);

        months.push({
          month: monthLabel,
          payroll: monthPayroll || totalPayroll,
          gosi: monthGosi || totalPayroll * 0.12,
          loans: outstandingLoans > 0 ? outstandingLoans / 6 : 0,
          advances: outstandingAdvances > 0 ? outstandingAdvances / 3 : 0,
          expenses: monthExpenses,
          insurance: totalPayroll * 0.03,
        });
      }

      const prevMonthPayroll = months.length >= 2 ? months[months.length - 2].payroll : 0;
      const currentMonthPayroll = months.length >= 1 ? months[months.length - 1].payroll : 0;
      const realPayrollChange = prevMonthPayroll > 0 ? ((currentMonthPayroll - prevMonthPayroll) / prevMonthPayroll) * 100 : 0;

      const breakdownData = [
        { name: language === 'ar' ? 'الرواتب' : 'Payroll', value: totalPayroll, color: '#3b82f6' },
        { name: language === 'ar' ? 'التأمينات' : 'GOSI', value: gosiLiability * 0.08, color: '#10b981' },
        { name: language === 'ar' ? 'القروض' : 'Loans', value: outstandingLoans * 0.05, color: '#14b8a6' },
        { name: language === 'ar' ? 'السلف' : 'Advances', value: outstandingAdvances * 0.1, color: '#06b6d4' },
        { name: language === 'ar' ? 'المصروفات' : 'Expenses', value: currentMonthExpenses, color: '#f97316' },
      ].filter(d => d.value > 0);

      const generatedAlerts: any[] = [];
      if (overdueCount > 0) {
        generatedAlerts.push({
          id: 'sla-1', type: 'sla_breach', severity: 'critical',
          title: language === 'ar' ? `${overdueCount} موافقات تجاوزت المدة المحددة` : `${overdueCount} approvals past SLA deadline`,
          description: language === 'ar' ? 'يرجى مراجعة الموافقات المعلقة فوراً' : 'Please review pending approvals immediately',
          action_label: language === 'ar' ? 'مراجعة الآن' : 'Review Now',
          created_at: new Date().toISOString(),
        });
      }

      const budgetRes = await supabase.from('budgets').select('annual_amount, status').in('company_id', companyIds).eq('status', 'active');
      const totalBudget = (budgetRes.data || []).reduce((s, b) => s + (b.annual_amount || 0), 0);
      const budgetUtil = totalBudget > 0 ? ((totalPayroll * 12) / totalBudget) * 100 : 0;

      if (budgetUtil > 90) {
        generatedAlerts.push({
          id: 'budget-1', type: 'budget_warning', severity: 'warning',
          title: language === 'ar' ? 'تحذير: الميزانية تقترب من الحد الأقصى' : 'Warning: Budget nearing limit',
          description: language === 'ar' ? `استخدام الميزانية وصل إلى ${Math.round(budgetUtil)}%` : `Budget utilization at ${Math.round(budgetUtil)}%`,
          action_label: language === 'ar' ? 'إدارة الميزانية' : 'Manage Budget',
          created_at: new Date().toISOString(),
        });
      }

      const insuranceRes = await supabase.from('insurance_policies').select('id, end_date, policy_number').in('company_id', companyIds).gte('end_date', now.toISOString().split('T')[0]);
      const expiringSoon = (insuranceRes.data || []).filter(p => {
        const daysLeft = Math.ceil((new Date(p.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 30 && daysLeft > 0;
      });
      if (expiringSoon.length > 0) {
        generatedAlerts.push({
          id: 'ins-1', type: 'insurance_expiry', severity: 'warning',
          title: language === 'ar' ? `${expiringSoon.length} وثيقة تأمين تنتهي قريباً` : `${expiringSoon.length} insurance policy(s) expiring soon`,
          description: language === 'ar' ? 'يرجى مراجعة التجديدات' : 'Please review renewals',
          action_label: language === 'ar' ? 'عرض التأمين' : 'View Insurance',
          created_at: new Date().toISOString(),
        });
      }

      const overdueLoans = (loansRes.data || []).filter(l => l.status === 'active' && (l.remaining_amount || 0) > 0);
      if (overdueLoans.length > 5) {
        generatedAlerts.push({
          id: 'loan-1', type: 'loan_overdue', severity: 'info',
          title: language === 'ar' ? `${overdueLoans.length} قرض نشط قيد السداد` : `${overdueLoans.length} active loans outstanding`,
          description: language === 'ar' ? 'مراقبة محفظة القروض' : 'Monitor loan portfolio health',
          action_label: language === 'ar' ? 'عرض القروض' : 'View Loans',
          created_at: new Date().toISOString(),
        });
      }

      const periodCloseRes = await supabase.from('financial_periods').select('id, status, period_month, period_year').in('company_id', companyIds).eq('status', 'open');
      const openPeriods = periodCloseRes.data || [];
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const hasPrevOpen = openPeriods.some(p => p.period_month === prevMonth.getMonth() + 1 && p.period_year === prevMonth.getFullYear());
      if (hasPrevOpen) {
        generatedAlerts.push({
          id: 'period-1', type: 'period_close', severity: 'warning',
          title: language === 'ar' ? 'الفترة المالية السابقة لم تُغلق بعد' : 'Previous financial period still open',
          description: language === 'ar' ? 'يرجى إتمام إغلاق الفترة' : 'Please complete period close checklist',
          action_label: language === 'ar' ? 'إغلاق الفترة' : 'Close Period',
          created_at: new Date().toISOString(),
        });
      }

      setKpis({
        totalPayroll, pendingApprovals: pendingAll.length, outstandingLoans,
        outstandingAdvances, gosiLiability, eosLiability,
        monthlyExpenses: currentMonthExpenses, budgetUtilization: budgetUtil,
        payrollChange: realPayrollChange, pendingSLA: overdueCount,
      });
      setPendingItems(pendingAll);
      setCashFlowData(months);
      setAlerts(generatedAlerts);
      setRecentBatches(batchRes.data || []);
      setCostBreakdown(breakdownData);
    } catch (err) {
      console.error('Finance dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentCompany, isConsolidatedView, companies, language]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApprove = async (ids: string[]) => {
    setApprovalProcessing(true);
    try {
      for (const id of ids) {
        const item = pendingItems.find(p => p.id === id);
        if (!item) continue;

        const table = item.type === 'loan' ? 'loans' : item.type === 'advance' ? 'advances' : item.type === 'expense' ? 'expense_claims' : 'penalties';
        const newStatus = item.type === 'penalty' ? 'approved' : 'finance_approved';

        await supabase.from(table).update({
          status: newStatus,
          finance_approved_by: user?.id,
          finance_approved_at: new Date().toISOString(),
        }).eq('id', id);
      }
      addToast(language === 'ar' ? `تم اعتماد ${ids.length} طلب بنجاح` : `${ids.length} request(s) approved`, 'success');
      loadDashboardData();
    } catch (err) {
      addToast(language === 'ar' ? 'خطأ في الاعتماد' : 'Approval error', 'error');
    } finally {
      setApprovalProcessing(false);
    }
  };

  const handleReject = async (ids: string[], reason: string) => {
    setApprovalProcessing(true);
    try {
      for (const id of ids) {
        const item = pendingItems.find(p => p.id === id);
        if (!item) continue;

        const table = item.type === 'loan' ? 'loans' : item.type === 'advance' ? 'advances' : item.type === 'expense' ? 'expense_claims' : 'penalties';

        await supabase.from(table).update({
          status: 'rejected',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        }).eq('id', id);
      }
      addToast(language === 'ar' ? `تم رفض ${ids.length} طلب` : `${ids.length} request(s) rejected`, 'success');
      loadDashboardData();
    } catch (err) {
      addToast(language === 'ar' ? 'خطأ في الرفض' : 'Rejection error', 'error');
    } finally {
      setApprovalProcessing(false);
    }
  };

  const handleKPIClick = (section: string) => {
    const routes: Record<string, string> = {
      payroll: '/payroll', loans: '/loans', advances: '/advances',
      expenses: '/expenses', gosi: '/gosi', eos: '/end-of-service',
      budget: '/budgets', approvals: '/pending-requests',
    };
    if (routes[section]) navigate(routes[section]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-80 animate-pulse" />
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#14b8a6', '#06b6d4', '#f97316', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-7 w-7 text-blue-600" />
            {language === 'ar' ? 'لوحة التحكم المالية' : 'Finance Command Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ar' ? 'نظرة شاملة على العمليات المالية والموافقات' : 'Complete overview of financial operations and approvals'}
          </p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <button
            onClick={loadDashboardData}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <FinanceKPICards
        kpis={kpis}
        language={language as 'ar' | 'en'}
        isRTL={isRTL}
        onCardClick={handleKPIClick}
      />

      {alerts.length > 0 && (
        <FinanceAlerts
          alerts={alerts}
          language={language as 'ar' | 'en'}
          isRTL={isRTL}
          onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
          onAction={(alert) => {
            if (alert.type === 'sla_breach') navigate('/pending-requests');
            else if (alert.type === 'budget_warning') navigate('/budgets');
            else if (alert.type === 'insurance_expiry') navigate('/insurance');
            else if (alert.type === 'loan_overdue') navigate('/loans');
            else if (alert.type === 'period_close') navigate('/period-close');
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FinancePendingActions
            items={pendingItems}
            language={language as 'ar' | 'en'}
            isRTL={isRTL}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetail={(item) => {
              const routes: Record<string, string> = {
                loan: '/loans', advance: '/advances', expense: '/expenses', penalty: '/penalties', eos: '/end-of-service',
              };
              navigate(routes[item.type] || '/pending-requests');
            }}
            loading={approvalProcessing}
          />
        </div>
        <div>
          <RecentPayrollBatches
            batches={recentBatches}
            language={language as 'ar' | 'en'}
            isRTL={isRTL}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FinanceCashFlow
            data={cashFlowData}
            language={language as 'ar' | 'en'}
            isRTL={isRTL}
          />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className={`font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
            {language === 'ar' ? 'توزيع التكاليف الشهرية' : 'Monthly Cost Breakdown'}
          </h3>
          {costBreakdown.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {costBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, language as 'ar' | 'en')} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {costBreakdown.map((item, i) => (
                  <div key={item.name} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">
                      {formatCurrency(item.value, language as 'ar' | 'en')}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
            </div>
          )}
        </div>
      </div>

      <YearlyForecastedCashflow
        language={language as 'ar' | 'en'}
        isRTL={isRTL}
      />

      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${isRTL ? 'direction-rtl' : ''}`}>
        {[
          { label: language === 'ar' ? 'التقارير المالية' : 'Financial Reports', icon: FileText, path: '/finance-reports', color: 'from-blue-500 to-blue-600' },
          { label: language === 'ar' ? 'إدارة الميزانية' : 'Budget Management', icon: TrendingUp, path: '/budgets', color: 'from-emerald-500 to-emerald-600' },
          { label: language === 'ar' ? 'إغلاق الفترة' : 'Period Close', icon: Calendar, path: '/period-close', color: 'from-amber-500 to-amber-600' },
          { label: language === 'ar' ? 'المطابقة البنكية' : 'Bank Reconciliation', icon: CheckCircle, path: '/payment-reconciliation', color: 'from-teal-500 to-teal-600' },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`group relative bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${link.color} w-fit shadow-lg mb-3`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{link.label}</p>
              <ArrowRight className={`absolute top-4 ${isRTL ? 'left-4 rotate-180' : 'right-4'} h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
