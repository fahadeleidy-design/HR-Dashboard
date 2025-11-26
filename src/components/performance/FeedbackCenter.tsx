import { MessageCircle } from 'lucide-react';

export function FeedbackCenter() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <MessageCircle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">360° Feedback</h3>
      <p className="text-gray-600">
        Collect multi-rater feedback from managers, peers, and direct reports
      </p>
    </div>
  );
}
