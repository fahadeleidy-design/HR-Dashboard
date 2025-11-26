import { SystemHealthDashboard } from '@/components/SystemHealthDashboard';
import { useLanguage } from '@/contexts/LanguageContext';

export function ComplianceDashboard() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'لوحة التحكم في الامتثال' : 'Compliance Dashboard'}
        </h1>
        <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'مراقبة الامتثال للوائح نظام العمل السعودي' : 'Monitor compliance with Saudi Labor Law regulations'}
        </p>
      </div>

      <SystemHealthDashboard />
    </div>
  );
}
