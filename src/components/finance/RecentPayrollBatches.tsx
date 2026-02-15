import { formatCurrency } from '@/lib/formatters';
import { FileText, CheckCircle, Clock, AlertCircle, Download, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PayrollBatch {
  id: string;
  batch_name: string;
  period_month: string;
  status: string;
  total_net_salary: number;
  total_employees: number;
  created_at: string;
}

interface Props {
  batches: PayrollBatch[];
  language: 'ar' | 'en';
  isRTL: boolean;
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; labelAr: string; color: string }> = {
  draft: { icon: FileText, label: 'Draft', labelAr: 'مسودة', color: 'text-gray-600 bg-gray-100' },
  pending_approval: { icon: Clock, label: 'Pending', labelAr: 'بانتظار الموافقة', color: 'text-amber-600 bg-amber-100' },
  approved: { icon: CheckCircle, label: 'Approved', labelAr: 'معتمد', color: 'text-green-600 bg-green-100' },
  processed: { icon: CheckCircle, label: 'Processed', labelAr: 'تمت المعالجة', color: 'text-blue-600 bg-blue-100' },
  paid: { icon: CheckCircle, label: 'Paid', labelAr: 'مدفوع', color: 'text-emerald-600 bg-emerald-100' },
};

export function RecentPayrollBatches({ batches, language, isRTL }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`flex items-center justify-between p-4 border-b border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {language === 'ar' ? 'دفعات الرواتب الأخيرة' : 'Recent Payroll Batches'}
          </h3>
        </div>
        <button
          onClick={() => navigate('/payroll')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          {language === 'ar' ? 'عرض الكل' : 'View All'}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="divide-y divide-gray-50">
        {batches.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{language === 'ar' ? 'لا توجد دفعات رواتب' : 'No payroll batches'}</p>
          </div>
        ) : (
          batches.map((batch) => {
            const status = statusConfig[batch.status] || statusConfig.draft;
            const StatusIcon = status.icon;
            return (
              <div
                key={batch.id}
                onClick={() => navigate('/payroll')}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-2 rounded-lg ${status.color} flex-shrink-0`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                  <p className="text-sm font-medium text-gray-900 truncate">{batch.batch_name}</p>
                  <div className={`flex items-center gap-3 mt-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs text-gray-500">{batch.period_month}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">
                      {batch.total_employees} {language === 'ar' ? 'موظف' : 'employees'}
                    </span>
                  </div>
                </div>
                <div className={`flex-shrink-0 ${isRTL ? 'text-left' : 'text-right'}`}>
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(batch.total_net_salary, language)}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${status.color}`}>
                    {language === 'ar' ? status.labelAr : status.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
