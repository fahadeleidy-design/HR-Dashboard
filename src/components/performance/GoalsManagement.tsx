import { Target } from 'lucide-react';

export function GoalsManagement() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <Target className="h-16 w-16 text-purple-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Goals Management</h3>
      <p className="text-gray-600">
        Set, track, and manage employee goals and objectives (OKRs/KPIs)
      </p>
    </div>
  );
}
