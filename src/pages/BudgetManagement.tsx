import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import {
  TrendingUp, Plus, Edit, Trash2, CheckCircle, FileSpreadsheet,
  AlertTriangle, DollarSign, BarChart3, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

interface Budget {
  id: string;
  company_id: string;
  fiscal_year: number;
  cost_center_id: string | null;
  department_id: string | null;
  category: string;
  annual_amount: number;
  monthly_amounts: Record<string, number>;
  status: string;
  notes: string | null;
  cost_centers?: { name: string; code: string } | null;
  departments?: { name_en: string } | null;
}

interface CostCenter {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name_en: string;
}

export function BudgetManagement() {
  const { user } = useAuth();
  const { currentCompany, companies, isConsolidatedView } = useCompany();
  const { language, isRTL } = useLanguage();
  const { addToast } = useToast();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [form, setForm] = useState({
    fiscal_year: new Date().getFullYear(),
    cost_center_id: '',
    department_id: '',
    category: 'salaries',
    annual_amount: 0,
    notes: '',
  });

  const companyIds = isConsolidatedView ? companies.map(c => c.id) : currentCompany ? [currentCompany.id] : [];

  const loadData = useCallback(async () => {
    if (companyIds.length === 0) return;
    setLoading(true);
    try {
      const [budgetRes, ccRes, deptRes] = await Promise.all([
        supabase.from('budgets').select('*, cost_centers(name, code), departments(name_en)').in('company_id', companyIds).order('fiscal_year', { ascending: false }),
        supabase.from('cost_centers').select('id, name, code').in('company_id', companyIds).eq('is_active', true),
        supabase.from('departments').select('id, name_en').in('company_id', companyIds),
      ]);
      setBudgets(budgetRes.data || []);
      setCostCenters(ccRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      console.error('Budget load error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyIds.join(',')]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!currentCompany && !isConsolidatedView) return;
    const targetCompanyId = currentCompany?.id || companies[0]?.id;
    if (!targetCompanyId) return;

    try {
      const monthlyAmounts: Record<string, number> = {};
      const monthlyBase = form.annual_amount / 12;
      for (let i = 1; i <= 12; i++) {
        monthlyAmounts[String(i)] = Math.round(monthlyBase * 100) / 100;
      }

      const payload = {
        company_id: targetCompanyId,
        fiscal_year: form.fiscal_year,
        cost_center_id: form.cost_center_id || null,
        department_id: form.department_id || null,
        category: form.category,
        annual_amount: form.annual_amount,
        monthly_amounts: monthlyAmounts,
        notes: form.notes || null,
        status: 'draft' as const,
      };

      if (editingBudget) {
        await supabase.from('budgets').update(payload).eq('id', editingBudget.id);
        addToast(language === 'ar' ? 'تم تحديث الميزانية' : 'Budget updated', 'success');
      } else {
        await supabase.from('budgets').insert(payload);
        addToast(language === 'ar' ? 'تم إنشاء الميزانية' : 'Budget created', 'success');
      }

      setShowForm(false);
      setEditingBudget(null);
      setForm({ fiscal_year: new Date().getFullYear(), cost_center_id: '', department_id: '', category: 'salaries', annual_amount: 0, notes: '' });
      loadData();
    } catch (err) {
      addToast(language === 'ar' ? 'خطأ في الحفظ' : 'Save error', 'error');
    }
  };

  const handleActivate = async (id: string) => {
    await supabase.from('budgets').update({ status: 'active', approved_by: user?.id }).eq('id', id);
    addToast(language === 'ar' ? 'تم تفعيل الميزانية' : 'Budget activated', 'success');
    loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('budgets').delete().eq('id', id);
    addToast(language === 'ar' ? 'تم حذف الميزانية' : 'Budget deleted', 'success');
    loadData();
  };

  const totalBudget = budgets.filter(b => b.status === 'active').reduce((s, b) => s + b.annual_amount, 0);
  const categories = ['salaries', 'allowances', 'training', 'travel', 'equipment', 'other'];

  const chartData = categories.map(cat => ({
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    amount: budgets.filter(b => b.category === cat && b.status === 'active').reduce((s, b) => s + b.annual_amount, 0),
  })).filter(d => d.amount > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TrendingUp className="h-7 w-7 text-emerald-600" />
            {language === 'ar' ? 'إدارة الميزانية' : 'Budget Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ar' ? 'تخطيط ومتابعة الميزانيات المالية' : 'Plan and track financial budgets'}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingBudget(null); setForm({ fiscal_year: new Date().getFullYear(), cost_center_id: '', department_id: '', category: 'salaries', annual_amount: 0, notes: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'ميزانية جديدة' : 'New Budget'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 rounded-lg bg-emerald-50"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي الميزانية النشطة' : 'Total Active Budget'}</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBudget, language as 'ar' | 'en')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 rounded-lg bg-blue-50"><BarChart3 className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">{language === 'ar' ? 'عدد الميزانيات' : 'Budget Count'}</p>
              <p className="text-xl font-bold text-gray-900">{budgets.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 rounded-lg bg-amber-50"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">{language === 'ar' ? 'مسودات' : 'Draft Budgets'}</p>
              <p className="text-xl font-bold text-amber-600">{budgets.filter(b => b.status === 'draft').length}</p>
            </div>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className={`font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
            {language === 'ar' ? 'توزيع الميزانية حسب الفئة' : 'Budget by Category'}
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v, language as 'ar' | 'en')} />
                <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'السنة المالية' : 'Fiscal Year'}</th>
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'مركز التكلفة / القسم' : 'Cost Center / Dept'}</th>
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الفئة' : 'Category'}</th>
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'المبلغ السنوي' : 'Annual Amount'}</th>
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الشهري' : 'Monthly'}</th>
                <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {language === 'ar' ? 'لا توجد ميزانيات بعد' : 'No budgets yet'}
                  </td>
                </tr>
              ) : (
                budgets.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className={`px-4 py-3 font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{budget.fiscal_year}</td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {budget.cost_centers?.name || budget.departments?.name_en || '-'}
                    </td>
                    <td className={`px-4 py-3 text-gray-600 capitalize ${isRTL ? 'text-right' : 'text-left'}`}>{budget.category}</td>
                    <td className={`px-4 py-3 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>
                      {formatCurrency(budget.annual_amount, language as 'ar' | 'en')}
                    </td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-left' : 'text-right'}`}>
                      {formatCurrency(budget.annual_amount / 12, language as 'ar' | 'en')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${budget.status === 'active' ? 'bg-green-100 text-green-700' : budget.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                        {budget.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : budget.status === 'closed' ? (language === 'ar' ? 'مغلق' : 'Closed') : (language === 'ar' ? 'مسودة' : 'Draft')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {budget.status === 'draft' && (
                          <>
                            <button onClick={() => handleActivate(budget.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title={language === 'ar' ? 'تفعيل' : 'Activate'}>
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setEditingBudget(budget); setForm({ fiscal_year: budget.fiscal_year, cost_center_id: budget.cost_center_id || '', department_id: budget.department_id || '', category: budget.category, annual_amount: budget.annual_amount, notes: budget.notes || '' }); setShowForm(true); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title={language === 'ar' ? 'تعديل' : 'Edit'}>
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(budget.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title={language === 'ar' ? 'حذف' : 'Delete'}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBudget ? (language === 'ar' ? 'تعديل الميزانية' : 'Edit Budget') : (language === 'ar' ? 'ميزانية جديدة' : 'New Budget')}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingBudget(null); }} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'السنة المالية' : 'Fiscal Year'}</label>
                  <input type="number" value={form.fiscal_year} onChange={(e) => setForm(prev => ({ ...prev, fiscal_year: parseInt(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الفئة' : 'Category'}</label>
                  <select value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</label>
                <select value={form.cost_center_id} onChange={(e) => setForm(prev => ({ ...prev, cost_center_id: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
                  <option value="">{language === 'ar' ? 'الكل' : 'All'}</option>
                  {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'القسم' : 'Department'}</label>
                <select value={form.department_id} onChange={(e) => setForm(prev => ({ ...prev, department_id: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
                  <option value="">{language === 'ar' ? 'الكل' : 'All'}</option>
                  {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name_en}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'المبلغ السنوي' : 'Annual Amount'} (SAR)</label>
                <input type="number" value={form.annual_amount} onChange={(e) => setForm(prev => ({ ...prev, annual_amount: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
                {form.annual_amount > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 'شهرياً:' : 'Monthly:'} {formatCurrency(form.annual_amount / 12, language as 'ar' | 'en')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                <textarea value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className={`flex items-center gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''} justify-end`}>
              <button onClick={() => { setShowForm(false); setEditingBudget(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={form.annual_amount <= 0} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {language === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
