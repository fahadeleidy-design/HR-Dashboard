import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plane } from 'lucide-react';

export function Travel() {
  const { currentCompany } = useCompany();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) {
      supabase.from('business_travel').select('*').eq('company_id', currentCompany.id).then(({ data }) => {
        setTrips(data || []);
        setLoading(false);
      });
    }
  }, [currentCompany]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Business Travel</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">Total Trips</p><p className="text-2xl font-bold">{trips.length}</p></div>
            <Plane className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Travel Requests</h2>
        <p className="text-gray-600">Travel list will be displayed here</p>
      </div>
    </div>
  );
}
