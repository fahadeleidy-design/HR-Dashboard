import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import {
  CheckCircle, XCircle, Clock, Plus, FileSpreadsheet,
  Upload, Link2, AlertTriangle, Search, X, RefreshCw
} from 'lucide-react';

interface Reconciliation {
  id: string;
  payroll_batch_id: string | null;
  bank_reference: string;
  payment_date: string;
  payment_amount: number;
  matched_amount: number;
  unmatched_amount: number;
  status: string;
  notes: string | null;
  reconciled_by: string | null;
  reconciled_at: string | null;
  created_at: string;
}

interface PayrollBatch {
  id: string;
  batch_name: string;
  total_net_salary: number;
  status: string;
  period_month: string;
}

export function PaymentReconciliation() {
  const { user } = useAuth();
  const { currentCompany, companies, isConsolidatedView } = useCompany();
  const { language, isRTL } = useLanguage();
  const { addToast } = useToast();

  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ payroll_batch_id: '', bank_reference: '', payment_date: new Date().toISOString().split('T')[0], payment_amount: 0, notes: '' });

  const companyIds = isConsolidatedView ? companies.map(c => c.id) : currentCompany ? [currentCompany.id] : [];

  const loadData = useCallback(async () => {
    if (companyIds.length === 0) return;
    setLoading(true);
    try {
      const [reconRes, batchRes] = await Promise.all([
        supabase.from('payment_reconciliations').select('*').in('company_id', companyIds).order('created_at', { ascending: false }),
        supabase.from('payroll_batches').select('id, batch_name, total_net_salary, status, period_month').in('company_id', companyIds).in('status', ['approved', 'processed', 'paid']).order('created_at', { ascending: false }),
      ]);
      setReconciliations(reconRes.data || []);
      setBatches(batchRes.data || []);
    } catch (err) {
      console.error('Reconciliation load error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyIds.join(',')]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    const targetCompanyId = currentCompany?.id || companies[0]?.id;
    if (!targetCompanyId) return;

    const selectedBatch = batches.find(b => b.id === form.payroll_batch_id);
    const matchedAmt = selectedBatch && Math.abs(form.payment_amount - selectedBatch.total_net_salary) < 0.01 ? form.payment_amount : 0;
    const unmatchedAmt = form.payment_amount - matchedAmt;

    try {
      await supabase.from('payment_reconciliations').insert({
        company_id: targetCompanyId,
        payroll_batch_id: form.payroll_batch_id || null,
        bank_reference: form.bank_reference,
        payment_date: form.payment_date,
        payment_amount: form.payment_amount,
        matched_amount: matchedAmt,
        unmatched_amount: unmatchedAmt,
        status: matchedAmt === form.payment_amount ? 'fully_matched' : matchedAmt > 0 ? 'partially_matched' : 'pending',
        reconciled_by: matchedAmt === form.payment_amount ? user?.id : null,
        reconciled_at: matchedAmt === form.payment_amount ? new Date().toISOString() : null,
        notes: form.notes || null,
      });
      addToast(language === 'ar' ? 'تم إنشاء سجل المطابقة' : 'Reconciliation record created', 'success');
      setShowForm(false);
      setForm({ payroll_batch_id: '', bank_reference: '', payment_date: new Date().toISOString().split('T')[0], payment_amount: 0, notes: '' });
      loadData();
    } catch (err) {
      addToast(language === 'ar' ? 'خطأ' : 'Error', 'error');
    }
  };

  const handleMarkMatched = async (id: string) => {
    await supabase.from('payment_reconciliations').update({
      status: 'fully_matched',
      reconciled_by: user?.id,
      reconciled_at: new Date().toISOString(),
    }).eq('id', id);
    addToast(language === 'ar' ? 'تمت المطابقة' : 'Matched successfully', 'success');
    loadData();
  };

  const handleMarkFailed = async (id: string) => {
    await supabase.from('payment_reconciliations').update({ status: 'failed' }).eq('id', id);
    addToast(language === 'ar' ? 'تم تحديد كفشل' : 'Marked as failed', 'success');
    loadData();
  };

  const statusConfig: Record<string, { label: string; labelAr: string; color: string; icon: typeof Clock }> = {
    pending: { label: 'Pending', labelAr: 'معلق', color: 'bg-amber-100 text-amber-700', icon: Clock },
    partially_matched: { label: 'Partial', labelAr: 'جزئي', color: 'bg-blue-100 text-blue-700', icon: Link2 },
    fully_matched: { label: 'Matched', labelAr: 'مطابق', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    failed: { label: 'Failed', labelAr: 'فشل', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const totalPending = reconciliations.filter(r => r.status === 'pending').length;
  const totalMatched = reconciliations.filter(r => r.status === 'fully_matched').length;
  const totalAmount = reconciliations.reduce((s, r) => s + r.payment_amount, 0);

  if (loading) {
    return <div className="space-y-6"><div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" /><div className="h-64 bg-gray-200 rounded animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CheckCircle className="h-7 w-7 text-teal-600" />
            {language === 'ar' ? 'المطابقة البنكية' : 'Bank Reconciliation'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ar' ? 'مطابقة المدفوعات مع كشوف البنك' : 'Match payments with bank statements'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={loadData} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'سجل جديد' : 'New Record'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'الإجمالي' : 'Total Records'}</p>
          <p className="text-xl font-bold text-gray-900">{reconciliations.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'معلق' : 'Pending'}</p>
          <p className="text-xl font-bold text-amber-600">{totalPending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'مطابق' : 'Matched'}</p>
          <p className="text-xl font-bold text-green-600">{totalMatched}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي المبالغ' : 'Total Amount'}</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount, language as 'ar' | 'en')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'مرجع البنك' : 'Bank Ref'}</th>
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}</th>
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                <th className={`px-4 py-3 font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الدفعة' : 'Batch'}</th>
                <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 font-semibold text-gray-700 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reconciliations.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{language === 'ar' ? 'لا توجد سجلات' : 'No records'}</td></tr>
              ) : (
                reconciliations.map((rec) => {
                  const status = statusConfig[rec.status] || statusConfig.pending;
                  const batch = batches.find(b => b.id === rec.payroll_batch_id);
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className={`px-4 py-3 font-mono text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{rec.bank_reference || '-'}</td>
                      <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{rec.payment_date}</td>
                      <td className={`px-4 py-3 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(rec.payment_amount, language as 'ar' | 'en')}</td>
                      <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{batch?.batch_name || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                          {language === 'ar' ? status.labelAr : status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {rec.status === 'pending' && (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleMarkMatched(rec.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Match">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleMarkFailed(rec.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Failed">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">{language === 'ar' ? 'سجل مطابقة جديد' : 'New Reconciliation'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'دفعة الرواتب' : 'Payroll Batch'}</label>
                <select value={form.payroll_batch_id} onChange={(e) => { setForm(prev => ({ ...prev, payroll_batch_id: e.target.value })); const b = batches.find(b => b.id === e.target.value); if (b) setForm(prev => ({ ...prev, payment_amount: b.total_net_salary })); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">{language === 'ar' ? 'اختر الدفعة' : 'Select batch'}</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} - {formatCurrency(b.total_net_salary, language as 'ar' | 'en')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'مرجع البنك' : 'Bank Reference'}</label>
                  <input type="text" value={form.bank_reference} onChange={(e) => setForm(prev => ({ ...prev, bank_reference: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}</label>
                  <input type="date" value={form.payment_date} onChange={(e) => setForm(prev => ({ ...prev, payment_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'المبلغ' : 'Amount'} (SAR)</label>
                <input type="number" value={form.payment_amount} onChange={(e) => setForm(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                <textarea value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className={`flex items-center gap-3 mt-6 justify-end ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleCreate} disabled={form.payment_amount <= 0} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">{language === 'ar' ? 'إنشاء' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
