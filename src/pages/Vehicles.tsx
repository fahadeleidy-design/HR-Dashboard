import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Car, Plus, AlertTriangle, Wrench, DollarSign } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';

interface Vehicle {
  id: string;
  vehicle_number: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  status: string;
  current_mileage: number;
  insurance_expiry: string | null;
  registration_expiry: string | null;
}

interface ViolationSummary {
  total_violations: number;
  total_fines: number;
  pending_fines: number;
}

export function Vehicles() {
  const { currentCompany } = useCompany();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [violations, setViolations] = useState<ViolationSummary>({ total_violations: 0, total_fines: 0, pending_fines: 0 });
  const [maintenanceDue, setMaintenanceDue] = useState(0);
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
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('vehicle_number');

      setVehicles(vehiclesData || []);

      const { data: violationsData } = await supabase
        .from('vehicle_violations')
        .select('fine_amount, paid_amount, status')
        .eq('company_id', currentCompany.id);

      const violationStats = (violationsData || []).reduce((acc, v) => ({
        total_violations: acc.total_violations + 1,
        total_fines: acc.total_fines + v.fine_amount,
        pending_fines: acc.pending_fines + (v.status === 'pending' ? (v.fine_amount - v.paid_amount) : 0)
      }), { total_violations: 0, total_fines: 0, pending_fines: 0 });

      setViolations(violationStats);

      const { data: maintenanceData } = await supabase
        .from('vehicle_maintenance')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('status', 'scheduled');

      setMaintenanceDue((maintenanceData || []).length);
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const expiringInsurance = vehicles.filter(v => {
    if (!v.insurance_expiry) return false;
    const daysUntil = Math.floor((new Date(v.insurance_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  }).length;

  const { sortedData, sortConfig, requestSort } = useSortableData(vehicles);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Management</h1>
          <p className="text-gray-600 mt-1">Fleet management, violations, and maintenance tracking</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vehicles</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{vehicles.length}</p>
            </div>
            <Car className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Vehicles</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeVehicles}</p>
            </div>
            <Car className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Violations</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{violations.total_violations}</p>
              <p className="text-xs text-gray-500">SAR {violations.pending_fines.toLocaleString()}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Maintenance Due</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{maintenanceDue}</p>
            </div>
            <Wrench className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expiring Insurance</h2>
          {expiringInsurance > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <span className="font-bold">{expiringInsurance}</span> vehicle(s) have insurance expiring within 30 days
              </p>
            </div>
          ) : (
            <p className="text-gray-500">All insurance policies are current</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Violations Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Violations:</span>
              <span className="font-bold">{violations.total_violations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Fines:</span>
              <span className="font-bold">SAR {violations.total_fines.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Fines:</span>
              <span className="font-bold text-red-600">SAR {violations.pending_fines.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label="Vehicle Number"
                  sortKey="vehicle_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Plate Number"
                  sortKey="plate_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Make & Model"
                  sortKey="make"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Type"
                  sortKey="vehicle_type"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Mileage"
                  sortKey="current_mileage"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Status"
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No vehicles found. Click "Add Vehicle" to register a vehicle.
                  </td>
                </tr>
              ) : (
                sortedData.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vehicle.vehicle_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.plate_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {vehicle.vehicle_type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.current_mileage.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : vehicle.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
