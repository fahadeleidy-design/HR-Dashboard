import { Calendar } from 'lucide-react';

export function InterviewManagement() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <Calendar className="h-16 w-16 text-green-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Interview Management</h3>
      <p className="text-gray-600">
        Schedule interviews, manage panels, collect feedback, and track interview pipeline
      </p>
    </div>
  );
}
