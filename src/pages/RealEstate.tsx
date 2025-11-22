import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Building2, Package, DollarSign, MapPin } from 'lucide-react';

export function RealEstate() {
  const { currentCompany } = useCompany();
  const [properties, setProperties] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [propertiesData, assetsData] = await Promise.all([
        supabase.from('real_estate_properties').select('*').eq('company_id', currentCompany.id),
        supabase.from('company_assets').select('*').eq('company_id', currentCompany.id)
      ]);

      setProperties(propertiesData.data || []);
      setAssets(assetsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalProperties = properties.length;
  const totalAssets = assets.length;
  const totalPropertyValue = properties.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalAssetValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Real Estate & Assets</h1>
        <p className="text-gray-600 mt-1">Manage properties, equipment, and company assets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Properties</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalProperties}</p>
            </div>
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assets</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalAssets}</p>
            </div>
            <Package className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Property Value</p>
              <p className="text-xl font-bold text-gray-900 mt-1">SAR {(totalPropertyValue / 1000000).toFixed(1)}M</p>
            </div>
            <DollarSign className="h-12 w-12 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Asset Value</p>
              <p className="text-xl font-bold text-gray-900 mt-1">SAR {(totalAssetValue / 1000).toFixed(0)}K</p>
            </div>
            <DollarSign className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Properties</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ownership</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No properties found</td>
                </tr>
              ) : (
                properties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{property.property_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{property.property_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{property.city}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{property.ownership_type}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {property.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assets ({assets.length})</h2>
        <p className="text-gray-600">
          Total asset value: <span className="font-bold">SAR {totalAssetValue.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}
