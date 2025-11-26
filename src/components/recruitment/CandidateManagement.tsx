import { Users } from 'lucide-react';

export function CandidateManagement() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <Users className="h-16 w-16 text-blue-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Candidate Management</h3>
      <p className="text-gray-600">
        Complete candidate database with applications, documents, and screening management
      </p>
    </div>
  );
}
