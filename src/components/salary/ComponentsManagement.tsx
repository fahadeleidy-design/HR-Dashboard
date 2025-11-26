import { Layers } from 'lucide-react';

export function ComponentsManagement() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <Layers className="h-16 w-16 text-purple-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Salary Components</h3>
      <p className="text-gray-600">
        Manage salary components: Basic, Housing Allowance, Transport, Food, and other allowances
      </p>
    </div>
  );
}
