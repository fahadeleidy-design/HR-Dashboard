import { FileText } from 'lucide-react';

export function OfferManagement() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <FileText className="h-16 w-16 text-purple-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Offer Management</h3>
      <p className="text-gray-600">
        Create offers, manage approvals, track negotiations, and monitor acceptance rates
      </p>
    </div>
  );
}
