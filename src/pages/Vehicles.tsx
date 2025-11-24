import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Car, Plus, AlertTriangle, Wrench, DollarSign } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { formatCurrency, formatNumber } from '@/lib/formatters';

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
  const { t, language, isRTL } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [violations, setViolations] = useState<ViolationSummary>({ total_violations: 0, total_fines: 0, pending_fines: 0 });
  const [maintenanceDue, setMaintenanceDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_number: '',
    plate_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vehicle_type: 'sedan',
    status: 'active',
    current_mileage: 0,
    purchase_date: '',
    purchase_price: 0,
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_expiry: '',
    registration_expiry: '',
    ownership_type: 'owned',
    notes: ''
  });

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
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">{t.vehicles.title}</h1>
          <p className="text-gray-600 mt-1">{t.vehicles.subtitle}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>{t.vehicles.addVehicle}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.total} {t.vehicles.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{vehicles.length}</p>
            </div>
            <Car className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.vehicles.available}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeVehicles}</p>
            </div>
            <Car className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.pending} {t.common.violations}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatNumber(violations.total_violations, language)}</p>
              <p className="text-xs text-gray-500">{formatCurrency(violations.pending_fines, language)}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.vehicles.maintenance}</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{maintenanceDue}</p>
            </div>
            <Wrench className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.vehicles.insuranceExpiry}</h2>
          {expiringInsurance > 0 ? (
            <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-yellow-800">
                <span className="font-bold">{formatNumber(expiringInsurance, language)}</span> {t.common.vehicles} {t.common.expiringWithin30Days}
              </p>
            </div>
          ) : (
            <p className={`text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.allCurrent}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.violationsSummary}</h2>
          <div className="space-y-2">
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t.common.total} {t.common.violations}:</span>
              <span className="font-bold">{formatNumber(violations.total_violations, language)}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t.common.totalFines}:</span>
              <span className="font-bold">{formatCurrency(violations.total_fines, language)}</span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-600">{t.common.pendingFines}:</span>
              <span className="font-bold text-red-600">{formatCurrency(violations.pending_fines, language)}</span>
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
                  label={t.common.number}
                  sortKey="vehicle_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.vehicles.plateNumber}
                  sortKey="plate_number"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={`${t.vehicles.make} & ${t.vehicles.model}`}
                  sortKey="make"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.common.type}
                  sortKey="vehicle_type"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.vehicles.mileage}
                  sortKey="current_mileage"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.common.status}
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
                    {t.messages.noResults}. {t.common.clickToAdd} "{t.vehicles.addVehicle}".
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
                      {formatNumber(vehicle.current_mileage, language)} {t.common.km}
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{t.vehicles.addVehicle}</h2>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!currentCompany) return;

              try {
                const { error } = await supabase
                  .from('vehicles')
                  .insert([{
                    ...formData,
                    company_id: currentCompany.id,
                    purchase_date: formData.purchase_date || null,
                    insurance_expiry: formData.insurance_expiry || null,
                    registration_expiry: formData.registration_expiry || null,
                    insurance_provider: formData.insurance_provider || null,
                    insurance_policy_number: formData.insurance_policy_number || null,
                    notes: formData.notes || null
                  }]);

                if (error) throw error;

                alert('Vehicle added successfully!');
                setShowForm(false);
                setFormData({
                  vehicle_number: '',
                  plate_number: '',
                  make: '',
                  model: '',
                  year: new Date().getFullYear(),
                  vehicle_type: 'sedan',
                  status: 'active',
                  current_mileage: 0,
                  purchase_date: '',
                  purchase_price: 0,
                  insurance_provider: '',
                  insurance_policy_number: '',
                  insurance_expiry: '',
                  registration_expiry: '',
                  ownership_type: 'owned',
                  notes: ''
                });
                fetchData();
              } catch (error: any) {
                console.error('Error adding vehicle:', error);
                alert('Failed to add vehicle: ' + error.message);
              }
            }} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.number} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.vehicles.plateNumber} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.vehicles.make} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.vehicles.model} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.vehicles.year} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.type} *
                  </label>
                  <select
                    required
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="bus">Bus</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.vehicles.mileage} ({t.common.km}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.current_mileage}
                    onChange={(e) => setFormData({ ...formData, current_mileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.status} *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.realEstate.purchaseDate}
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.realEstate.purchasePrice} ({t.numbers.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.realEstate.ownershipType} *
                  </label>
                  <select
                    required
                    value={formData.ownership_type}
                    onChange={(e) => setFormData({ ...formData, ownership_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="owned">Owned</option>
                    <option value="leased">Leased</option>
                    <option value="rented">Rented</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.insurance.provider}
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_provider}
                    onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.insurance.policyNumber}
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_policy_number}
                    onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.vehicles.insuranceExpiry}
                  </label>
                  <input
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.vehicles.registrationExpiry}
                  </label>
                  <input
                    type="date"
                    value={formData.registration_expiry}
                    onChange={(e) => setFormData({ ...formData, registration_expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.notes}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                form="vehicle-form"
                onClick={(e) => {
                  const form = document.querySelector('form') as HTMLFormElement;
                  if (form) {
                    const event = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(event);
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                {t.vehicles.addVehicle}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
