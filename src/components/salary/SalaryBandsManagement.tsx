import { DollarSign } from 'lucide-react';

export function SalaryBandsManagement() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <DollarSign className="h-16 w-16 text-green-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Salary Bands Management</h3>
      <p className="text-gray-600">
        Define and manage salary ranges (min, midpoint, max) for each grade and position
      </p>
    </div>
  );
}
