import {
  AlertTriangle, Clock, Shield, CreditCard, Calendar,
  TrendingUp, Bell, ChevronRight, X
} from 'lucide-react';
import { useState } from 'react';

interface FinanceAlert {
  id: string;
  type: 'sla_breach' | 'budget_warning' | 'gosi_deadline' | 'insurance_expiry' | 'negative_salary' | 'loan_overdue' | 'period_close';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action_label?: string;
  action_link?: string;
  created_at: string;
}

interface Props {
  alerts: FinanceAlert[];
  language: 'ar' | 'en';
  isRTL: boolean;
  onDismiss: (id: string) => void;
  onAction: (alert: FinanceAlert) => void;
}

const severityConfig = {
  critical: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
};

const typeIcons: Record<string, typeof AlertTriangle> = {
  sla_breach: Clock,
  budget_warning: TrendingUp,
  gosi_deadline: Calendar,
  insurance_expiry: Shield,
  negative_salary: AlertTriangle,
  loan_overdue: CreditCard,
  period_close: Calendar,
};

export function FinanceAlerts({ alerts, language, isRTL, onDismiss, onAction }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Bell className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-600 animate-pulse' : 'text-amber-600'}`} />
          <h3 className="font-semibold text-gray-900">
            {language === 'ar' ? 'التنبيهات المالية' : 'Financial Alerts'}
          </h3>
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${criticalCount > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
            {alerts.length}
          </span>
        </div>
        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {alerts.map((alert) => {
            const severity = severityConfig[alert.severity];
            const Icon = typeIcons[alert.type] || AlertTriangle;
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-4 py-3 ${severity.bg} border-b last:border-b-0 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-1.5 rounded-lg ${severity.badge} flex-shrink-0 mt-0.5`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{alert.description}</p>
                  {alert.action_label && (
                    <button
                      onClick={() => onAction(alert)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 mt-1 inline-flex items-center gap-1"
                    >
                      {alert.action_label}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="p-1 rounded-lg hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
