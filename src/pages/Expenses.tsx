import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Receipt } from 'lucide-react';

export function Expenses() {
  const { currentCompany } = useCompany();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) {
      supabase.from('expense_claims').select('*').eq('company_id', currentCompany.id).then(({ data }) => {
        setExpenses(data || []);
        setLoading(false);
      });
    }
  }, [currentCompany]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Expense Management</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Total Claims</p><p className="text-2xl font-bold">{expenses.length}</p></div>
            <Receipt className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Expense Claims</h2>
        <p className="text-gray-600">Expense list will be displayed here</p>
      </div>
    </div>
  );
}
