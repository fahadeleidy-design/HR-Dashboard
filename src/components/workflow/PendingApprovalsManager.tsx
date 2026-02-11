import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import {
  Clock, Calendar, DollarSign, CreditCard, AlertTriangle,
  CheckCircle, XCircle, User, ChevronRight, Filter, RefreshCw,
  Timer, ArrowRight, FileText
} from 'lucide-react';

interface PendingRequest {
  id: string;
  type: 'leave' | 'loan' | 'advance';
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  requestDate: string;
  amount?: number;
  days?: number;
  leaveType?: string;
  loanType?: string;
  status: string;
  pendingAtLevel: 'manager' | 'hr' | 'finance';
  slaDeadline?: string;
  slaStatus?: 'on_time' | 'at_risk' | 'overdue';
  reason?: string;
}

export function PendingApprovalsManager() {
  const { user, userRole } = useAuth();
  const { currentCompany } = useCompany();
  const { t, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();
  const [filter, setFilter] = useState<'all' | 'leave' | 'loan' | 'advance'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'overdue' | 'at_risk'>('all');

  useEffect(() => {
    if (currentCompany && userRole) {
      fetchPendingRequests();
    }
  }, [currentCompany, userRole]);

  const fetchPendingRequests = async () => {
    if (!currentCompany || !userRole) return;
    setLoading(true);

    try {
      const pendingRequests: PendingRequest[] = [];
      const now = new Date();

      const canApproveAtLevel = (level: string): boolean => {
        const roleApprovalMap: Record<string, string[]> = {
          manager: ['manager', 'hr', 'admin', 'super_admin'],
          hr: ['hr', 'admin', 'super_admin'],
          finance: ['finance', 'admin', 'super_admin']
        };
        return roleApprovalMap[level]?.includes(userRole.role) || false;
      };

      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en, department:departments(name_en)),
          leave_type:leave_types(name_en, name_ar)
        `)
        .eq('company_id', currentCompany.id)
        .in('status', ['pending', 'manager_approved', 'hr_approved']);

      (leaveData || []).forEach((req: any) => {
        let pendingAtLevel: 'manager' | 'hr' | 'finance' = 'manager';
        if (req.status === 'pending') pendingAtLevel = 'manager';
        else if (req.status === 'manager_approved') pendingAtLevel = 'hr';
        else if (req.status === 'hr_approved') pendingAtLevel = 'finance';

        if (canApproveAtLevel(pendingAtLevel)) {
          const slaDeadline = req.sla_deadline ? new Date(req.sla_deadline) : null;
          let slaStatus: 'on_time' | 'at_risk' | 'overdue' = 'on_time';
          if (slaDeadline) {
            const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursRemaining < 0) slaStatus = 'overdue';
            else if (hoursRemaining < 8) slaStatus = 'at_risk';
          }

          pendingRequests.push({
            id: req.id,
            type: 'leave',
            employeeId: req.employee_id,
            employeeName: `${req.employee?.first_name_en || ''} ${req.employee?.last_name_en || ''}`,
            employeeNumber: req.employee?.employee_number || '',
            department: req.employee?.department?.name_en || '',
            requestDate: req.created_at,
            days: req.total_days,
            leaveType: req.leave_type?.name_en,
            status: req.status,
            pendingAtLevel,
            slaDeadline: req.sla_deadline,
            slaStatus,
            reason: req.reason
          });
        }
      });

      const { data: loanData } = await supabase
        .from('loans')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en, department:departments(name_en))
        `)
        .eq('company_id', currentCompany.id)
        .in('status', ['pending', 'manager_approved', 'hr_approved']);

      (loanData || []).forEach((req: any) => {
        let pendingAtLevel: 'manager' | 'hr' | 'finance' = 'manager';
        if (req.status === 'pending') pendingAtLevel = 'manager';
        else if (req.status === 'manager_approved') pendingAtLevel = 'hr';
        else if (req.status === 'hr_approved') pendingAtLevel = 'finance';

        if (canApproveAtLevel(pendingAtLevel)) {
          const slaDeadline = req.sla_deadline ? new Date(req.sla_deadline) : null;
          let slaStatus: 'on_time' | 'at_risk' | 'overdue' = 'on_time';
          if (slaDeadline) {
            const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursRemaining < 0) slaStatus = 'overdue';
            else if (hoursRemaining < 8) slaStatus = 'at_risk';
          }

          pendingRequests.push({
            id: req.id,
            type: 'loan',
            employeeId: req.employee_id,
            employeeName: `${req.employee?.first_name_en || ''} ${req.employee?.last_name_en || ''}`,
            employeeNumber: req.employee?.employee_number || '',
            department: req.employee?.department?.name_en || '',
            requestDate: req.created_at,
            amount: req.loan_amount,
            loanType: req.loan_type,
            status: req.status,
            pendingAtLevel,
            slaDeadline: req.sla_deadline,
            slaStatus,
            reason: req.notes
          });
        }
      });

      const { data: advanceData } = await supabase
        .from('advances')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en, department:departments(name_en))
        `)
        .eq('company_id', currentCompany.id)
        .in('status', ['pending', 'manager_approved', 'hr_approved']);

      (advanceData || []).forEach((req: any) => {
        let pendingAtLevel: 'manager' | 'hr' | 'finance' = 'manager';
        if (req.status === 'pending') pendingAtLevel = 'manager';
        else if (req.status === 'manager_approved') pendingAtLevel = 'hr';
        else if (req.status === 'hr_approved') pendingAtLevel = 'finance';

        if (canApproveAtLevel(pendingAtLevel)) {
          const slaDeadline = req.sla_deadline ? new Date(req.sla_deadline) : null;
          let slaStatus: 'on_time' | 'at_risk' | 'overdue' = 'on_time';
          if (slaDeadline) {
            const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursRemaining < 0) slaStatus = 'overdue';
            else if (hoursRemaining < 8) slaStatus = 'at_risk';
          }

          pendingRequests.push({
            id: req.id,
            type: 'advance',
            employeeId: req.employee_id,
            employeeName: `${req.employee?.first_name_en || ''} ${req.employee?.last_name_en || ''}`,
            employeeNumber: req.employee?.employee_number || '',
            department: req.employee?.department?.name_en || '',
            requestDate: req.request_date || req.created_at,
            amount: req.amount,
            status: req.status,
            pendingAtLevel,
            slaDeadline: req.sla_deadline,
            slaStatus,
            reason: req.notes
          });
        }
      });

      pendingRequests.sort((a, b) => {
        const slaOrder = { overdue: 0, at_risk: 1, on_time: 2 };
        const aOrder = slaOrder[a.slaStatus || 'on_time'];
        const bOrder = slaOrder[b.slaStatus || 'on_time'];
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime();
      });

      setRequests(pendingRequests);
    } catch (error) {
      logError(error, 'medium', { component: 'PendingApprovalsManager', action: 'fetchPendingRequests' });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leave': return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'loan': return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'advance': return <CreditCard className="h-5 w-5 text-orange-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      leave: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Leave', labelAr: 'إجازة' },
      loan: { bg: 'bg-green-100', text: 'text-green-800', label: 'Loan', labelAr: 'قرض' },
      advance: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Advance', labelAr: 'سلفة' }
    };
    return badges[type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type, labelAr: type };
  };

  const getLevelBadge = (level: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      manager: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Manager', labelAr: 'المدير' },
      hr: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'HR', labelAr: 'الموارد البشرية' },
      finance: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Finance', labelAr: 'المالية' }
    };
    return badges[level] || { bg: 'bg-gray-100', text: 'text-gray-800', label: level, labelAr: level };
  };

  const getSlaIndicator = (status?: string) => {
    if (!status) return null;
    const indicators: Record<string, { color: string; label: string; labelAr: string }> = {
      overdue: { color: 'text-red-600', label: 'Overdue', labelAr: 'متأخر' },
      at_risk: { color: 'text-yellow-600', label: 'At Risk', labelAr: 'في خطر' },
      on_time: { color: 'text-green-600', label: 'On Time', labelAr: 'في الوقت' }
    };
    return indicators[status];
  };

  const handleNavigate = (request: PendingRequest) => {
    switch (request.type) {
      case 'leave': navigate('/leave'); break;
      case 'loan': navigate('/loans'); break;
      case 'advance': navigate('/advances'); break;
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter !== 'all' && req.type !== filter) return false;
    if (urgencyFilter !== 'all' && req.slaStatus !== urgencyFilter) return false;
    return true;
  });

  const stats = {
    total: requests.length,
    overdue: requests.filter(r => r.slaStatus === 'overdue').length,
    atRisk: requests.filter(r => r.slaStatus === 'at_risk').length,
    leave: requests.filter(r => r.type === 'leave').length,
    loan: requests.filter(r => r.type === 'loan').length,
    advance: requests.filter(r => r.type === 'advance').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-bold text-gray-900">
            {isRTL ? 'الموافقات المعلقة' : 'Pending Approvals'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isRTL ? `${stats.total} طلب بانتظار موافقتك` : `${stats.total} requests waiting for your approval`}
          </p>
        </div>
        <button
          onClick={fetchPendingRequests}
          className={`flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <RefreshCw className="h-4 w-4" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-primary-500">
          <p className="text-sm text-gray-600">{isRTL ? 'الإجمالي' : 'Total'}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-600">{isRTL ? 'متأخر' : 'Overdue'}</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">{isRTL ? 'في خطر' : 'At Risk'}</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.atRisk}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">{isRTL ? 'إجازات' : 'Leave'}</p>
          <p className="text-2xl font-bold text-blue-600">{stats.leave}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600">{isRTL ? 'قروض' : 'Loans'}</p>
          <p className="text-2xl font-bold text-green-600">{stats.loan}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm text-gray-600">{isRTL ? 'سلف' : 'Advances'}</p>
          <p className="text-2xl font-bold text-orange-600">{stats.advance}</p>
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">{isRTL ? 'النوع:' : 'Type:'}</span>
        </div>
        {['all', 'leave', 'loan', 'advance'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? (isRTL ? 'الكل' : 'All') :
             f === 'leave' ? (isRTL ? 'إجازات' : 'Leave') :
             f === 'loan' ? (isRTL ? 'قروض' : 'Loans') :
             (isRTL ? 'سلف' : 'Advances')}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <span className="text-sm text-gray-600">{isRTL ? 'الحالة:' : 'Urgency:'}</span>
        {['all', 'overdue', 'at_risk'].map((f) => (
          <button
            key={f}
            onClick={() => setUrgencyFilter(f as any)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              urgencyFilter === f
                ? f === 'overdue' ? 'bg-red-600 text-white' :
                  f === 'at_risk' ? 'bg-yellow-500 text-white' :
                  'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? (isRTL ? 'الكل' : 'All') :
             f === 'overdue' ? (isRTL ? 'متأخر' : 'Overdue') :
             (isRTL ? 'في خطر' : 'At Risk')}
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isRTL ? 'لا توجد طلبات معلقة' : 'No Pending Requests'}
          </h3>
          <p className="text-gray-600">
            {isRTL ? 'تم معالجة جميع الطلبات' : 'All requests have been processed'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => {
              const typeBadge = getTypeBadge(request.type);
              const levelBadge = getLevelBadge(request.pendingAtLevel);
              const slaIndicator = getSlaIndicator(request.slaStatus);

              return (
                <div
                  key={`${request.type}-${request.id}`}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    request.slaStatus === 'overdue' ? 'bg-red-50' :
                    request.slaStatus === 'at_risk' ? 'bg-yellow-50' : ''
                  }`}
                  onClick={() => handleNavigate(request)}
                >
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getTypeIcon(request.type)}
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="font-semibold text-gray-900">{request.employeeName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.bg} ${typeBadge.text}`}>
                            {isRTL ? typeBadge.labelAr : typeBadge.label}
                          </span>
                        </div>
                        <div className={`flex items-center gap-3 mt-1 text-sm text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span>{request.employeeNumber}</span>
                          {request.department && (
                            <>
                              <span>•</span>
                              <span>{request.department}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatDate(request.requestDate, language)}</span>
                        </div>
                        <div className={`flex items-center gap-3 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {request.type === 'leave' && request.days && (
                            <span className="text-sm font-medium text-blue-600">
                              {request.days} {isRTL ? 'يوم' : 'days'} - {request.leaveType}
                            </span>
                          )}
                          {(request.type === 'loan' || request.type === 'advance') && request.amount && (
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(request.amount, language)}
                              {request.loanType && ` - ${request.loanType}`}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${levelBadge.bg} ${levelBadge.text}`}>
                            {isRTL ? `في انتظار ${levelBadge.labelAr}` : `Pending ${levelBadge.label}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {slaIndicator && (
                        <div className={`flex items-center gap-1 ${slaIndicator.color}`}>
                          {request.slaStatus === 'overdue' && <AlertTriangle className="h-5 w-5" />}
                          {request.slaStatus === 'at_risk' && <Timer className="h-5 w-5" />}
                          {request.slaStatus === 'on_time' && <Clock className="h-5 w-5" />}
                          <span className="text-sm font-medium">
                            {isRTL ? slaIndicator.labelAr : slaIndicator.label}
                          </span>
                        </div>
                      )}
                      <ChevronRight className={`h-5 w-5 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
