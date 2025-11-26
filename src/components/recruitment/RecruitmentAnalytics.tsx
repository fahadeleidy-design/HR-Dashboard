import { BarChart3 } from 'lucide-react';

export function RecruitmentAnalytics() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <BarChart3 className="h-16 w-16 text-orange-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Recruitment Analytics</h3>
      <p className="text-gray-600">
        Time-to-hire, cost-per-hire, source effectiveness, and recruitment funnel analysis
      </p>
    </div>
  );
}
