import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import {
  Calendar, CheckCircle, Circle, Lock, Plus, ChevronRight,
  DollarSign, Shield, Receipt, CreditCard, AlertTriangle, FileText, Banknote, RefreshCw
} from 'lucide-react';

interface FinancialPeriod {
  id: string;
  company_id: string;
  period_year: number;
  period_month: number;
  status: string;
  checklist_status: Record<string, boolean>;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
}

const checklistItems = [
  { key: 'payroll_verified', icon: DollarSign, label: 'Payroll batches verified', labelAr: 'التحقق من دفعات الرواتب' },
  { key: 'gosi_filed', icon: Shield, label: 'GOSI contributions filed', labelAr: 'تقديم اشتراكات التأمينات' },
  { key: 'expenses_processed', icon: Receipt, label: 'Expense claims processed', labelAr: 'معالجة مطالبات المصروفات' },
  { key: 'loans_deducted', icon: CreditCard, label: 'Loan installments deducted', labelAr: 'خصم أقساط القروض' },
  { key: 'advances_processed', icon: Banknote, label: 'Advance deductions processed', labelAr: 'معالجة خصومات السلف' },
  { key: 'penalties_applied', icon: AlertTriangle, label: 'Penalty deductions applied', labelAr: 'تطبيق خصومات الجزاءات' },
  { key: 'bank_reconciled', icon: CheckCircle, label: 'Bank payments reconciled', labelAr: 'مطابقة المدفوعات البنكية' },
  { key: 'reports_generated', icon: FileText, label: 'Monthly reports generated', labelAr: 'إنشاء التقارير الشهرية' },
];

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function PeriodClose() {
  const { user } = useAuth();
  const { currentCompany, companies, isConsolidatedView } = useCompany();
  const { language, isRTL } = useLanguage();
  const { addToast } = useToast();

  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod | null>(null);

  const companyIds = isConsolidatedView ? companies.map(c => c.id) : currentCompany ? [currentCompany.id] : [];

  const loadData = useCallback(async () => {
    if (companyIds.length === 0) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('financial_periods')
        .select('*')
        .in('company_id', companyIds)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      setPeriods(data || []);
      if (data && data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(data[0]);
      }
    } catch (err) {
      console.error('Period close load error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyIds.join(',')]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreatePeriod = async () => {
    const targetCompanyId = currentCompany?.id || companies[0]?.id;
    if (!targetCompanyId) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const { data, error } = await supabase.from('financial_periods').insert({
        company_id: targetCompanyId,
        period_year: year,
        period_month: month,
        status: 'open',
      }).select().maybeSingle();

      if (error) {
        if (error.code === '23505') {
          addToast(language === 'ar' ? 'الفترة موجودة بالفعل' : 'Period already exists', 'error');
        } else {
          addToast(language === 'ar' ? 'خطأ في الإنشاء' : 'Creation error', 'error');
        }
        return;
      }

      addToast(language === 'ar' ? 'تم إنشاء الفترة المالية' : 'Financial period created', 'success');
      loadData();
      if (data) setSelectedPeriod(data);
    } catch (err) {
      addToast(language === 'ar' ? 'خطأ' : 'Error', 'error');
    }
  };

  const handleToggleChecklist = async (key: string) => {
    if (!selectedPeriod || selectedPeriod.status === 'closed') return;

    const updated = { ...selectedPeriod.checklist_status, [key]: !selectedPeriod.checklist_status[key] };

    await supabase.from('financial_periods').update({
      checklist_status: updated,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    }).eq('id', selectedPeriod.id);

    setSelectedPeriod(prev => prev ? { ...prev, checklist_status: updated, status: 'in_progress' } : null);
    setPeriods(prev => prev.map(p => p.id === selectedPeriod.id ? { ...p, checklist_status: updated, status: 'in_progress' } : p));
  };

  const handleClosePeriod = async () => {
    if (!selectedPeriod) return;

    const allChecked = checklistItems.every(item => selectedPeriod.checklist_status[item.key]);
    if (!allChecked) {
      addToast(language === 'ar' ? 'يجب إكمال جميع خطوات القائمة' : 'All checklist items must be completed', 'error');
      return;
    }

    await supabase.from('financial_periods').update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedPeriod.id);

    addToast(language === 'ar' ? 'تم إغلاق الفترة المالية' : 'Financial period closed', 'success');
    loadData();
  };

  const getCompletionPercent = (period: FinancialPeriod) => {
    const total = checklistItems.length;
    const done = checklistItems.filter(item => period.checklist_status[item.key]).length;
    return Math.round((done / total) * 100);
  };

  if (loading) {
    return <div className="space-y-6"><div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" /><div className="h-64 bg-gray-200 rounded animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="h-7 w-7 text-amber-600" />
            {language === 'ar' ? 'إغلاق الفترة المالية' : 'Financial Period Close'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ar' ? 'إدارة إغلاق الفترات المالية الشهرية' : 'Manage monthly financial period closing'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={loadData} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={handleCreatePeriod} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'فترة جديدة' : 'New Period'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className={`font-semibold text-gray-900 ${isRTL ? 'text-right' : ''}`}>
              {language === 'ar' ? 'الفترات المالية' : 'Financial Periods'}
            </h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {periods.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                {language === 'ar' ? 'لا توجد فترات' : 'No periods'}
              </div>
            ) : (
              periods.map((period) => {
                const completion = getCompletionPercent(period);
                const isSelected = selectedPeriod?.id === period.id;
                return (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                  >
                    <div className={`p-2 rounded-lg ${period.status === 'closed' ? 'bg-green-100' : period.status === 'in_progress' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                      {period.status === 'closed' ? <Lock className="h-4 w-4 text-green-600" /> : <Calendar className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {language === 'ar' ? monthNamesAr[period.period_month - 1] : monthNames[period.period_month - 1]} {period.period_year}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${period.status === 'closed' ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${completion}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500">{completion}%</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${period.status === 'closed' ? 'bg-green-100 text-green-700' : period.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {period.status === 'closed' ? (language === 'ar' ? 'مغلق' : 'Closed') : period.status === 'in_progress' ? (language === 'ar' ? 'قيد التنفيذ' : 'In Progress') : (language === 'ar' ? 'مفتوح' : 'Open')}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={`p-5 border-b border-gray-100 ${isRTL ? 'text-right' : ''}`}>
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {language === 'ar' ? monthNamesAr[selectedPeriod.period_month - 1] : monthNames[selectedPeriod.period_month - 1]} {selectedPeriod.period_year}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {language === 'ar' ? 'قائمة التحقق لإغلاق الفترة' : 'Period close checklist'}
                    </p>
                  </div>
                  {selectedPeriod.status !== 'closed' && (
                    <button
                      onClick={handleClosePeriod}
                      disabled={!checklistItems.every(item => selectedPeriod.checklist_status[item.key])}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4" />
                      {language === 'ar' ? 'إغلاق الفترة' : 'Close Period'}
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{language === 'ar' ? 'الإنجاز' : 'Completion'}</span>
                    <span className="text-xs font-semibold text-gray-900">{getCompletionPercent(selectedPeriod)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${getCompletionPercent(selectedPeriod) === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${getCompletionPercent(selectedPeriod)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {checklistItems.map((item, index) => {
                  const Icon = item.icon;
                  const isChecked = selectedPeriod.checklist_status[item.key];
                  const isClosed = selectedPeriod.status === 'closed';
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleToggleChecklist(item.key)}
                      disabled={isClosed}
                      className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-all ${isRTL ? 'flex-row-reverse' : ''} ${isClosed ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${isChecked ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {isChecked ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div className={`p-2 rounded-lg ${isChecked ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <Icon className={`h-4 w-4 ${isChecked ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <p className={`text-sm font-medium ${isChecked ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                          {language === 'ar' ? item.labelAr : item.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {language === 'ar' ? `الخطوة ${index + 1} من ${checklistItems.length}` : `Step ${index + 1} of ${checklistItems.length}`}
                        </p>
                      </div>
                      {!isClosed && (
                        <ChevronRight className={`h-4 w-4 text-gray-300 ${isRTL ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedPeriod.status === 'closed' && (
                <div className="p-5 bg-green-50 border-t border-green-100">
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Lock className="h-5 w-5 text-green-600" />
                    <div className={isRTL ? 'text-right' : ''}>
                      <p className="text-sm font-medium text-green-700">
                        {language === 'ar' ? 'تم إغلاق هذه الفترة المالية' : 'This financial period is closed'}
                      </p>
                      {selectedPeriod.closed_at && (
                        <p className="text-xs text-green-600">
                          {language === 'ar' ? 'تاريخ الإغلاق:' : 'Closed on:'} {new Date(selectedPeriod.closed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">{language === 'ar' ? 'اختر فترة مالية أو أنشئ فترة جديدة' : 'Select a period or create a new one'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
