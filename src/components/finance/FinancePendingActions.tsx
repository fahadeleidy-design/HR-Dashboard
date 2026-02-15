import { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';
import {
  Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight,
  CreditCard, Receipt, FileText, Banknote, Filter
} from 'lucide-react';

interface PendingItem {
  id: string;
  type: 'loan' | 'advance' | 'expense' | 'penalty' | 'eos';
  employee_name: string;
  department: string;
  amount: number;
  request_date: string;
  sla_deadline: string;
  is_overdue: boolean;
  previous_approvals: string[];
}

interface Props {
  items: PendingItem[];
  language: 'ar' | 'en';
  isRTL: boolean;
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[], reason: string) => void;
  onViewDetail: (item: PendingItem) => void;
  loading?: boolean;
}

const typeConfig: Record<string, { icon: typeof Clock; label: string; labelAr: string; color: string }> = {
  loan: { icon: CreditCard, label: 'Loan', labelAr: 'قرض', color: 'text-teal-600 bg-teal-50' },
  advance: { icon: Receipt, label: 'Advance', labelAr: 'سلفة', color: 'text-cyan-600 bg-cyan-50' },
  expense: { icon: FileText, label: 'Expense', labelAr: 'مصروف', color: 'text-orange-600 bg-orange-50' },
  penalty: { icon: AlertTriangle, label: 'Penalty', labelAr: 'جزاء', color: 'text-red-600 bg-red-50' },
  eos: { icon: Banknote, label: 'End of Service', labelAr: 'نهاية الخدمة', color: 'text-rose-600 bg-rose-50' },
};

export function FinancePendingActions({ items, language, isRTL, onApprove, onReject, onViewDetail, loading }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const filtered = filterType === 'all' ? items : items.filter(i => i.type === filterType);
  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const toggleItem = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleBulkApprove = () => {
    onApprove(Array.from(selected));
    setSelected(new Set());
  };

  const handleBulkReject = () => {
    if (rejectReason.trim()) {
      onReject(Array.from(selected), rejectReason);
      setSelected(new Set());
      setRejectReason('');
      setShowRejectModal(false);
    }
  };

  const getDaysUntilSLA = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const typeCounts = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`flex items-center justify-between p-4 border-b border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Clock className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">
            {language === 'ar' ? 'الإجراءات المعلقة' : 'Pending Actions'}
          </h3>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
            {items.length}
          </span>
        </div>
        {selected.size > 0 && (
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs text-gray-500">
              {selected.size} {language === 'ar' ? 'محدد' : 'selected'}
            </span>
            <button
              onClick={handleBulkApprove}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {language === 'ar' ? 'اعتماد الكل' : 'Approve All'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              {language === 'ar' ? 'رفض الكل' : 'Reject All'}
            </button>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Filter className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${filterType === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
        >
          {language === 'ar' ? 'الكل' : 'All'} ({items.length})
        </button>
        {Object.entries(typeCounts).map(([type, count]) => {
          const config = typeConfig[type];
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${filterType === type ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              {language === 'ar' ? config.labelAr : config.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-300" />
            <p className="text-sm font-medium">
              {language === 'ar' ? 'لا توجد إجراءات معلقة' : 'No pending actions'}
            </p>
          </div>
        ) : (
          <>
            <div className={`flex items-center gap-3 px-4 py-2 bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 font-medium">
                {language === 'ar' ? 'تحديد الكل' : 'Select All'}
              </span>
            </div>
            {filtered.map((item) => {
              const config = typeConfig[item.type];
              const Icon = config.icon;
              const daysLeft = getDaysUntilSLA(item.sla_deadline);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.employee_name}</p>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${config.color}`}>
                        {language === 'ar' ? config.labelAr : config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{item.department}</p>
                  </div>
                  <div className={`text-right flex-shrink-0 ${isRTL ? 'text-left' : 'text-right'}`}>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.amount, language)}
                    </p>
                    <p className={`text-xs font-medium ${item.is_overdue ? 'text-red-600' : daysLeft <= 1 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {item.is_overdue
                        ? (language === 'ar' ? 'متأخر' : 'Overdue')
                        : `${daysLeft}d ${language === 'ar' ? 'متبقي' : 'left'}`
                      }
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                      onClick={() => onApprove([item.id])}
                      disabled={loading}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      title={language === 'ar' ? 'اعتماد' : 'Approve'}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onViewDetail(item)}
                      className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                      title={language === 'ar' ? 'تفاصيل' : 'Details'}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
              placeholder={language === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
            />
            <div className={`flex items-center gap-3 mt-4 ${isRTL ? 'flex-row-reverse' : ''} justify-end`}>
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
