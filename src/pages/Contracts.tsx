import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';

export function Contracts() {
  const { currentCompany } = useCompany();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) {
      supabase.from('contracts').select('*').eq('company_id', currentCompany.id).then(({ data }) => {
        setContracts(data || []);
        setLoading(false);
      });
    }
  }, [currentCompany]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  const active = contracts.filter(c => c.status === 'active').length;
  const expiringSoon = contracts.filter(c => c.end_date && Math.floor((new Date(c.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Contract Management</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Total Contracts</p><p className="text-2xl font-bold">{contracts.length}</p></div>
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Active</p><p className="text-2xl font-bold text-green-600">{active}</p></div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Expiring Soon</p><p className="text-2xl font-bold text-yellow-600">{expiringSoon}</p></div>
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">All Contracts</h2>
        <p className="text-gray-600">Contract list will be displayed here</p>
      </div>
    </div>
  );
}
