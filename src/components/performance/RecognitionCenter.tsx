import { Award } from 'lucide-react';

export function RecognitionCenter() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <Award className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Recognition Center</h3>
      <p className="text-gray-600">
        Recognize and reward outstanding employee performance and contributions
      </p>
    </div>
  );
}
