import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Building2, Package, DollarSign, Plus, Edit, Trash2, X, CalendarClock } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Property {
  id: string;
  property_type: string;
  property_name: string;
  address: string;
  city: string;
  ownership_type: string;
  current_value: number;
  status: string;
  monthly_rent?: number;
  annual_rent?: number;
  payment_frequency?: string;
  next_payment_date?: string;
  lease_end_date?: string;
}

interface Asset {
  id: string;
  asset_type: string;
  asset_name: string;
  asset_number: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  status: string;
}

export function RealEstate() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'assets'>('properties');

  const [propertyForm, setPropertyForm] = useState({
    property_type: 'office',
    property_name: '',
    address: '',
    city: '',
    district: '',
    ownership_type: 'owned',
    deed_number: '',
    purchase_price: 0,
    current_value: 0,
    area_sqm: 0,
    lease_start_date: '',
    lease_end_date: '',
    monthly_rent: 0,
    annual_rent: 0,
    payment_frequency: 'monthly',
    next_payment_date: '',
    landlord_name: '',
    landlord_contact: '',
    purpose: '',
    status: 'active',
    notes: ''
  });

  const getPaymentAmount = (annualRent: number, frequency: string) => {
    if (!annualRent) return 0;
    switch (frequency) {
      case 'monthly': return annualRent / 12;
      case 'quarterly': return annualRent / 4;
      case 'semi_annually': return annualRent / 2;
      case 'annually': return annualRent;
      default: return 0;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return t.realEstate.monthly;
      case 'quarterly': return t.realEstate.quarterly;
      case 'semi_annually': return t.realEstate.semiAnnually;
      case 'annually': return t.realEstate.annually;
      default: return frequency;
    }
  };

  const [assetForm, setAssetForm] = useState({
    asset_type: 'equipment',
    asset_name: '',
    asset_number: '',
    description: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_cost: 0,
    current_value: 0,
    depreciation_rate: 0,
    assigned_to_employee_id: '',
    assigned_to_department_id: '',
    location: '',
    warranty_expiry: '',
    maintenance_due_date: '',
    status: 'active',
    notes: ''
  });
  const { logError } = useErrorHandler();

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
        supabase.from('real_estate_properties').select('*').eq('company_id', currentCompany.id).order('property_name'),
        supabase.from('company_assets').select('*').eq('company_id', currentCompany.id).order('asset_name')
      ]);

      setProperties(propertiesData.data || []);
      setAssets(assetsData.data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'RealEstate', action: 'fetchData' });
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const data = {
        ...propertyForm,
        company_id: currentCompany.id,
        district: propertyForm.district || null,
        deed_number: propertyForm.deed_number || null,
        lease_start_date: propertyForm.lease_start_date || null,
        lease_end_date: propertyForm.lease_end_date || null,
        next_payment_date: propertyForm.next_payment_date || null,
        landlord_name: propertyForm.landlord_name || null,
        landlord_contact: propertyForm.landlord_contact || null,
        purpose: propertyForm.purpose || null,
        notes: propertyForm.notes || null
      };

      if (editingProperty) {
        const { error } = await supabase.from('real_estate_properties').update(data).eq('id', editingProperty.id);
        if (error) throw error;
        alert(t.realEstate.propertyUpdatedSuccess);
      } else {
        const { error } = await supabase.from('real_estate_properties').insert([data]);
        if (error) throw error;
        alert(t.realEstate.propertyAddedSuccess);
      }

      setShowPropertyForm(false);
      setEditingProperty(null);
      resetPropertyForm();
      fetchData();
    } catch (error: any) {
      alert('Failed to save property: ' + error.message);
    }
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const data = {
        ...assetForm,
        company_id: currentCompany.id,
        description: assetForm.description || null,
        manufacturer: assetForm.manufacturer || null,
        model: assetForm.model || null,
        serial_number: assetForm.serial_number || null,
        assigned_to_employee_id: assetForm.assigned_to_employee_id || null,
        assigned_to_department_id: assetForm.assigned_to_department_id || null,
        location: assetForm.location || null,
        warranty_expiry: assetForm.warranty_expiry || null,
        maintenance_due_date: assetForm.maintenance_due_date || null,
        notes: assetForm.notes || null
      };

      if (editingAsset) {
        const { error } = await supabase.from('company_assets').update(data).eq('id', editingAsset.id);
        if (error) throw error;
        alert(t.realEstate.assetUpdatedSuccess);
      } else {
        const { error } = await supabase.from('company_assets').insert([data]);
        if (error) throw error;
        alert(t.realEstate.assetAddedSuccess);
      }

      setShowAssetForm(false);
      setEditingAsset(null);
      resetAssetForm();
      fetchData();
    } catch (error: any) {
      alert('Failed to save asset: ' + error.message);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm(t.realEstate.deletePropertyConfirm)) return;
    try {
      const { error } = await supabase.from('real_estate_properties').delete().eq('id', id);
      if (error) throw error;
      alert(t.realEstate.propertyDeletedSuccess);
      fetchData();
    } catch (error: any) {
      alert('Failed to delete property: ' + error.message);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm(t.realEstate.deleteAssetConfirm)) return;
    try {
      const { error } = await supabase.from('company_assets').delete().eq('id', id);
      if (error) throw error;
      alert(t.realEstate.assetDeletedSuccess);
      fetchData();
    } catch (error: any) {
      alert('Failed to delete asset: ' + error.message);
    }
  };

  const resetPropertyForm = () => {
    setPropertyForm({
      property_type: 'office',
      property_name: '',
      address: '',
      city: '',
      district: '',
      ownership_type: 'owned',
      deed_number: '',
      purchase_price: 0,
      current_value: 0,
      area_sqm: 0,
      lease_start_date: '',
      lease_end_date: '',
      monthly_rent: 0,
      annual_rent: 0,
      payment_frequency: 'monthly',
      next_payment_date: '',
      landlord_name: '',
      landlord_contact: '',
      purpose: '',
      status: 'active',
      notes: ''
    });
  };

  const resetAssetForm = () => {
    setAssetForm({
      asset_type: 'equipment',
      asset_name: '',
      asset_number: '',
      description: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      purchase_date: '',
      purchase_cost: 0,
      current_value: 0,
      depreciation_rate: 0,
      assigned_to_employee_id: '',
      assigned_to_department_id: '',
      location: '',
      warranty_expiry: '',
      maintenance_due_date: '',
      status: 'active',
      notes: ''
    });
  };

  const totalProperties = properties.length;
  const totalAssets = assets.length;
  const totalPropertyValue = properties.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalAssetValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0);

  const { sortedData: sortedProperties, sortConfig: propertySortConfig, requestSort: requestPropertySort } = useSortableData(properties);
  const { sortedData: sortedAssets, sortConfig: assetSortConfig, requestSort: requestAssetSort } = useSortableData(assets);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">{t.realEstate.title}</h1>
          <p className="text-gray-600 mt-1">{t.realEstate.subtitle}</p>
        </div>
        <button
          onClick={() => activeTab === 'properties' ? setShowPropertyForm(true) : setShowAssetForm(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>{activeTab === 'properties' ? t.realEstate.addProperty : t.realEstate.addAsset}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{t.realEstate.properties}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalProperties, language)}</p>
            </div>
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{t.realEstate.assets}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalAssets, language)}</p>
            </div>
            <Package className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{t.realEstate.propertyValue}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalPropertyValue, language)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{t.realEstate.assetValue}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalAssetValue, language)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'properties'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.realEstate.properties} ({formatNumber(totalProperties, language)})
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'assets'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.realEstate.assets} ({formatNumber(totalAssets, language)})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'properties' ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTableHeader label={t.realEstate.property} sortKey="property_name" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={t.common.type} sortKey="property_type" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={t.realEstate.location} sortKey="city" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={t.realEstate.ownership} sortKey="ownership_type" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={t.realEstate.value} sortKey="current_value" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={t.realEstate.annualRent} sortKey="annual_rent" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={t.realEstate.nextPayment} sortKey="next_payment_date" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={t.common.status} sortKey="status" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedProperties.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">{t.messages.noResults}</td>
                  </tr>
                ) : (
                  sortedProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{property.property_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">{property.property_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{property.city}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">{property.ownership_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">SAR {property.current_value?.toLocaleString() || '0'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {(property.ownership_type === 'rented' || property.ownership_type === 'leased') && property.annual_rent ? (
                          <div>
                            <div className="font-medium">SAR {property.annual_rent.toLocaleString()}</div>
                            {property.payment_frequency && (
                              <div className="text-xs text-gray-500">
                                SAR {getPaymentAmount(property.annual_rent, property.payment_frequency).toLocaleString()} / {getFrequencyLabel(property.payment_frequency)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {property.next_payment_date ? (
                          <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <CalendarClock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span className={new Date(property.next_payment_date) <= new Date() ? 'text-red-600 font-medium' : 'text-gray-900'}>
                              {new Date(property.next_payment_date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {property.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className={`flex ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                          <button
                            onClick={() => {
                              setEditingProperty(property);
                              setPropertyForm(property as any);
                              setShowPropertyForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProperty(property.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTableHeader label={t.realEstate.asset} sortKey="asset_name" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={t.realEstate.number} sortKey="asset_number" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={t.common.type} sortKey="asset_type" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={t.realEstate.purchaseDate} sortKey="purchase_date" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={t.realEstate.currentValue} sortKey="current_value" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={t.common.status} sortKey="status" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t.realEstate.noAssetsFound}</td>
                  </tr>
                ) : (
                  sortedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{asset.asset_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.asset_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">{asset.asset_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{new Date(asset.purchase_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">SAR {asset.current_value.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          asset.status === 'active' ? 'bg-green-100 text-green-800' :
                          asset.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className={`flex ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                          <button
                            onClick={() => {
                              setEditingAsset(asset);
                              setAssetForm(asset as any);
                              setShowAssetForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showPropertyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>{editingProperty ? t.realEstate.editProperty : t.realEstate.addProperty}</h2>
              <button onClick={() => { setShowPropertyForm(false); setEditingProperty(null); resetPropertyForm(); }}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handlePropertySubmit} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.propertyType} *</label>
                  <select required value={propertyForm.property_type} onChange={(e) => setPropertyForm({...propertyForm, property_type: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <option value="office">{t.realEstate.office}</option>
                    <option value="warehouse">{t.realEstate.warehouse}</option>
                    <option value="retail">{t.realEstate.retail}</option>
                    <option value="factory">{t.realEstate.factory}</option>
                    <option value="land">{t.realEstate.land}</option>
                    <option value="residential">{t.realEstate.residential}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.propertyName} *</label>
                  <input type="text" required value={propertyForm.property_name} onChange={(e) => setPropertyForm({...propertyForm, property_name: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.address} *</label>
                  <input type="text" required value={propertyForm.address} onChange={(e) => setPropertyForm({...propertyForm, address: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.city} *</label>
                  <input type="text" required value={propertyForm.city} onChange={(e) => setPropertyForm({...propertyForm, city: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.district}</label>
                  <input type="text" value={propertyForm.district} onChange={(e) => setPropertyForm({...propertyForm, district: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.ownershipType} *</label>
                  <select required value={propertyForm.ownership_type} onChange={(e) => setPropertyForm({...propertyForm, ownership_type: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <option value="owned">{t.realEstate.owned}</option>
                    <option value="leased">{t.realEstate.leased}</option>
                    <option value="rented">{t.realEstate.rented}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.currentValue} ({isRTL ? 'ر.س' : 'SAR'})</label>
                  <input type="number" min="0" value={propertyForm.current_value} onChange={(e) => setPropertyForm({...propertyForm, current_value: parseFloat(e.target.value)})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.areaSqm}</label>
                  <input type="number" min="0" value={propertyForm.area_sqm} onChange={(e) => setPropertyForm({...propertyForm, area_sqm: parseFloat(e.target.value)})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                {propertyForm.ownership_type === 'leased' || propertyForm.ownership_type === 'rented' ? (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.annualRent} ({isRTL ? 'ر.س' : 'SAR'}) *</label>
                      <input type="number" min="0" required value={propertyForm.annual_rent} onChange={(e) => {
                        const annual = parseFloat(e.target.value) || 0;
                        setPropertyForm({...propertyForm, annual_rent: annual, monthly_rent: Math.round((annual / 12) * 100) / 100});
                      }} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.monthlyRent} ({isRTL ? 'ر.س' : 'SAR'})</label>
                      <input type="number" min="0" value={propertyForm.monthly_rent} readOnly className={`w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.paymentFrequency}</label>
                      <select value={propertyForm.payment_frequency} onChange={(e) => setPropertyForm({...propertyForm, payment_frequency: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        <option value="monthly">{t.realEstate.monthly}</option>
                        <option value="quarterly">{t.realEstate.quarterly}</option>
                        <option value="semi_annually">{t.realEstate.semiAnnually}</option>
                        <option value="annually">{t.realEstate.annually}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.paymentAmount} ({isRTL ? 'ر.س' : 'SAR'})</label>
                      <div className="w-full px-3 py-2 border rounded-md bg-blue-50 text-blue-800 font-semibold">
                        {formatCurrency(getPaymentAmount(propertyForm.annual_rent, propertyForm.payment_frequency), language)}
                        <span className="text-xs font-normal text-blue-600 mx-1">/ {getFrequencyLabel(propertyForm.payment_frequency)}</span>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.nextPaymentDate}</label>
                      <input type="date" value={propertyForm.next_payment_date} onChange={(e) => setPropertyForm({...propertyForm, next_payment_date: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.leaseStartDate}</label>
                      <input type="date" value={propertyForm.lease_start_date} onChange={(e) => setPropertyForm({...propertyForm, lease_start_date: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.leaseEndDate}</label>
                      <input type="date" value={propertyForm.lease_end_date} onChange={(e) => setPropertyForm({...propertyForm, lease_end_date: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.landlordName}</label>
                      <input type="text" value={propertyForm.landlord_name} onChange={(e) => setPropertyForm({...propertyForm, landlord_name: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                    </div>
                  </>
                ) : null}
              </div>
              <div className={`mt-6 flex ${isRTL ? 'justify-start space-x-reverse space-x-3 flex-row-reverse' : 'justify-end space-x-3'}`}>
                <button type="button" onClick={() => { setShowPropertyForm(false); resetPropertyForm(); }} className="px-4 py-2 border rounded-md">{t.common.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md">{editingProperty ? t.common.update : t.common.add} {t.realEstate.property}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>{editingAsset ? t.realEstate.editAsset : t.realEstate.addAsset}</h2>
              <button onClick={() => { setShowAssetForm(false); setEditingAsset(null); resetAssetForm(); }}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAssetSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.assetType} *</label>
                  <select required value={assetForm.asset_type} onChange={(e) => setAssetForm({...assetForm, asset_type: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <option value="equipment">{t.realEstate.equipment}</option>
                    <option value="furniture">{t.realEstate.furniture}</option>
                    <option value="computer">{t.realEstate.computer}</option>
                    <option value="vehicle">{t.realEstate.vehicle}</option>
                    <option value="machinery">{t.realEstate.machinery}</option>
                    <option value="tools">{t.realEstate.tools}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.assetNumber} *</label>
                  <input type="text" required value={assetForm.asset_number} onChange={(e) => setAssetForm({...assetForm, asset_number: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.assetName} *</label>
                  <input type="text" required value={assetForm.asset_name} onChange={(e) => setAssetForm({...assetForm, asset_name: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.purchaseDate} *</label>
                  <input type="date" required value={assetForm.purchase_date} onChange={(e) => setAssetForm({...assetForm, purchase_date: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.purchaseCost} ({isRTL ? 'ر.س' : 'SAR'})</label>
                  <input type="number" min="0" value={assetForm.purchase_cost} onChange={(e) => setAssetForm({...assetForm, purchase_cost: parseFloat(e.target.value)})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.currentValue} ({isRTL ? 'ر.س' : 'SAR'})</label>
                  <input type="number" min="0" value={assetForm.current_value} onChange={(e) => setAssetForm({...assetForm, current_value: parseFloat(e.target.value)})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.manufacturer}</label>
                  <input type="text" value={assetForm.manufacturer} onChange={(e) => setAssetForm({...assetForm, manufacturer: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.model}</label>
                  <input type="text" value={assetForm.model} onChange={(e) => setAssetForm({...assetForm, model: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.realEstate.serialNumber}</label>
                  <input type="text" value={assetForm.serial_number} onChange={(e) => setAssetForm({...assetForm, serial_number: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.status} *</label>
                  <select required value={assetForm.status} onChange={(e) => setAssetForm({...assetForm, status: e.target.value})} className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <option value="active">{t.common.active}</option>
                    <option value="maintenance">{t.realEstate.maintenance}</option>
                    <option value="retired">{t.realEstate.retired}</option>
                    <option value="disposed">{t.realEstate.disposed}</option>
                  </select>
                </div>
              </div>
              <div className={`mt-6 flex ${isRTL ? 'justify-start space-x-reverse space-x-3 flex-row-reverse' : 'justify-end space-x-3'}`}>
                <button type="button" onClick={() => { setShowAssetForm(false); resetAssetForm(); }} className="px-4 py-2 border rounded-md">{t.common.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md">{editingAsset ? t.common.update : t.common.add} {t.realEstate.asset}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
