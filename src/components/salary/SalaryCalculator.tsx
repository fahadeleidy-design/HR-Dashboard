import { Calculator } from 'lucide-react';

export function SalaryCalculator() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <Calculator className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Salary Calculator</h3>
      <p className="text-gray-600">
        Calculate total compensation, compare positions, and run what-if scenarios
      </p>
    </div>
  );
}
