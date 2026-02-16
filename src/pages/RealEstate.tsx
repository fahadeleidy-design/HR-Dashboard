import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Building2, Package, DollarSign, Plus, Edit, Trash2, X, CalendarClock, CheckCircle, Calendar, CreditCard, Receipt } from 'lucide-react';
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
  lease_start_date?: string;
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

interface PropertyPayment {
  id: string;
  property_id: string;
  due_date: string;
  amount: number;
  status: string;
  paid_date?: string;
  verified_at?: string;
  payment_method?: string;
  transaction_reference?: string;
}

export function RealEstate() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [payments, setPayments] = useState<PropertyPayment[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
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

  const [paymentForm, setPaymentForm] = useState({
    paid_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    transaction_reference: '',
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
      case 'monthly': return language === 'ar' ? 'شهري' : 'Monthly';
      case 'quarterly': return language === 'ar' ? 'ربع سنوي' : 'Quarterly';
      case 'semi_annually': return language === 'ar' ? 'نصف سنوي' : 'Semi-Annually';
      case 'annually': return language === 'ar' ? 'سنوي' : 'Annually';
      default: return frequency;
    }
  };

  const calculateNextPaymentDate = (leaseStart: string, frequency: string): string => {
    if (!leaseStart) return '';
    const start = new Date(leaseStart + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let monthsInterval: number;
    switch (frequency) {
      case 'monthly': monthsInterval = 1; break;
      case 'quarterly': monthsInterval = 3; break;
      case 'semi_annually': monthsInterval = 6; break;
      case 'annually': monthsInterval = 12; break;
      default: return '';
    }
    const next = new Date(start);
    while (next < today) {
      next.setMonth(next.getMonth() + monthsInterval);
    }
    return next.toISOString().split('T')[0];
  };

  const updateRentalFields = (updates: Partial<typeof propertyForm>) => {
    const merged = { ...propertyForm, ...updates };
    const monthly = merged.monthly_rent || 0;
    const annual = Math.round(monthly * 12 * 100) / 100;
    const nextDate = calculateNextPaymentDate(merged.lease_start_date, merged.payment_frequency);
    setPropertyForm({
      ...merged,
      annual_rent: annual,
      next_payment_date: nextDate,
    });
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
      fetchUserRole();
    }
  }, [currentCompany]);

  const fetchUserRole = async () => {
    if (!user || !currentCompany) return;
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', currentCompany.id)
        .single();

      setUserRole(data?.role || '');
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [propertiesData, assetsData, paymentsData] = await Promise.all([
        supabase.from('real_estate_properties').select('*').eq('company_id', currentCompany.id).order('property_name'),
        supabase.from('company_assets').select('*').eq('company_id', currentCompany.id).order('asset_name'),
        supabase.from('property_payments').select('*').eq('company_id', currentCompany.id).order('due_date', { ascending: false })
      ]);

      setProperties(propertiesData.data || []);
      setAssets(assetsData.data || []);
      setPayments(paymentsData.data || []);
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
        showToast(language === 'ar' ? 'تم تحديث العقار بنجاح' : 'Property updated successfully', 'success');
      } else {
        const { error } = await supabase.from('real_estate_properties').insert([data]);
        if (error) throw error;
        showToast(language === 'ar' ? 'تم إضافة العقار بنجاح' : 'Property added successfully', 'success');
      }

      setShowPropertyForm(false);
      setEditingProperty(null);
      resetPropertyForm();
      fetchData();
    } catch (error: any) {
      showToast('Failed to save property: ' + error.message, 'error');
    }
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const data = {
        ...assetForm,
        company_id: currentCompany.id,
        asset_tag: assetForm.asset_number,
        description: assetForm.description || null,
        brand: assetForm.manufacturer || null,
        model: assetForm.model || null,
        serial_number: assetForm.serial_number || null,
        assigned_to_employee_id: assetForm.assigned_to_employee_id || null,
        location: assetForm.location || null,
        warranty_expiry: assetForm.warranty_expiry || null,
        next_maintenance_date: assetForm.maintenance_due_date || null,
        notes: assetForm.notes || null
      };

      if (editingAsset) {
        const { error } = await supabase.from('company_assets').update(data).eq('id', editingAsset.id);
        if (error) throw error;
        showToast(language === 'ar' ? 'تم تحديث الأصل بنجاح' : 'Asset updated successfully', 'success');
      } else {
        const { error } = await supabase.from('company_assets').insert([data]);
        if (error) throw error;
        showToast(language === 'ar' ? 'تم إضافة الأصل بنجاح' : 'Asset added successfully', 'success');
      }

      setShowAssetForm(false);
      setEditingAsset(null);
      resetAssetForm();
      fetchData();
    } catch (error: any) {
      showToast('Failed to save asset: ' + error.message, 'error');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedProperty || !currentCompany) return;

    try {
      const paymentAmount = getPaymentAmount(selectedProperty.annual_rent || 0, selectedProperty.payment_frequency || 'monthly');

      const paymentData = {
        company_id: currentCompany.id,
        property_id: selectedProperty.id,
        payment_date: paymentForm.paid_date,
        due_date: selectedProperty.next_payment_date || paymentForm.paid_date,
        amount: paymentAmount,
        payment_frequency: selectedProperty.payment_frequency || 'monthly',
        status: 'paid',
        paid_date: paymentForm.paid_date,
        verified_by: user?.id,
        verified_at: new Date().toISOString(),
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference || null,
        notes: paymentForm.notes || null
      };

      const { error: paymentError } = await supabase.from('property_payments').insert([paymentData]);
      if (paymentError) throw paymentError;

      const nextPaymentDate = calculateNextPaymentDate(
        paymentForm.paid_date,
        selectedProperty.payment_frequency || 'monthly'
      );

      const { error: updateError } = await supabase
        .from('real_estate_properties')
        .update({ next_payment_date: nextPaymentDate })
        .eq('id', selectedProperty.id);

      if (updateError) throw updateError;

      showToast(language === 'ar' ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully', 'success');
      setShowPaymentModal(false);
      setSelectedProperty(null);
      setPaymentForm({
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        transaction_reference: '',
        notes: ''
      });
      fetchData();
    } catch (error: any) {
      showToast('Failed to record payment: ' + error.message, 'error');
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد حذف هذا العقار؟' : 'Are you sure you want to delete this property?')) return;
    try {
      const { error } = await supabase.from('real_estate_properties').delete().eq('id', id);
      if (error) throw error;
      showToast(language === 'ar' ? 'تم حذف العقار' : 'Property deleted', 'success');
      fetchData();
    } catch (error: any) {
      showToast('Failed to delete property: ' + error.message, 'error');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد حذف هذا الأصل؟' : 'Are you sure you want to delete this asset?')) return;
    try {
      const { error } = await supabase.from('company_assets').delete().eq('id', id);
      if (error) throw error;
      showToast(language === 'ar' ? 'تم حذف الأصل' : 'Asset deleted', 'success');
      fetchData();
    } catch (error: any) {
      showToast('Failed to delete asset: ' + error.message, 'error');
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

  const rentedProperties = properties.filter(p =>
    (p.ownership_type === 'rented' || p.ownership_type === 'leased') && p.annual_rent
  );
  const totalAnnualRent = rentedProperties.reduce((sum, p) => sum + (p.annual_rent || 0), 0);
  const totalMonthlyRent = rentedProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);

  const canVerifyPayments = ['super_admin', 'admin', 'finance'].includes(userRole);

  const { sortedData: sortedProperties, sortConfig: propertySortConfig, requestSort: requestPropertySort } = useSortableData(properties);
  const { sortedData: sortedAssets, sortConfig: assetSortConfig, requestSort: requestAssetSort } = useSortableData(assets);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'ar' ? 'العقارات والأصول' : 'Real Estate & Assets'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 'إدارة العقارات والأصول الثابتة للشركة' : 'Manage company properties and fixed assets'}
          </p>
        </div>
        <button
          onClick={() => activeTab === 'properties' ? setShowPropertyForm(true) : setShowAssetForm(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>{activeTab === 'properties' ? (language === 'ar' ? 'إضافة عقار' : 'Add Property') : (language === 'ar' ? 'إضافة أصل' : 'Add Asset')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{language === 'ar' ? 'إجمالي العقارات' : 'Total Properties'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalProperties, language)}</p>
            </div>
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{language === 'ar' ? 'إجمالي الأصول' : 'Total Assets'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalAssets, language)}</p>
            </div>
            <Package className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-600">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalAnnualRent, language)}</p>
              <p className="text-xs text-gray-500 mt-1">{rentedProperties.length} {language === 'ar' ? 'عقار مؤجر' : 'rented properties'}</p>
            </div>
            <Receipt className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-600">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-sm text-gray-600">{language === 'ar' ? 'الإيجار الشهري' : 'Monthly Rent'}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalMonthlyRent, language)}</p>
              <p className="text-xs text-gray-500 mt-1">{language === 'ar' ? 'المبلغ الشهري المتوقع' : 'Expected monthly amount'}</p>
            </div>
            <CreditCard className="h-12 w-12 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'properties'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {language === 'ar' ? 'العقارات' : 'Properties'} ({formatNumber(totalProperties, language)})
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'assets'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {language === 'ar' ? 'الأصول' : 'Assets'} ({formatNumber(totalAssets, language)})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'properties' ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTableHeader label={language === 'ar' ? 'العقار' : 'Property'} sortKey="property_name" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={language === 'ar' ? 'النوع' : 'Type'} sortKey="property_type" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={language === 'ar' ? 'الموقع' : 'Location'} sortKey="city" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={language === 'ar' ? 'الملكية' : 'Ownership'} sortKey="ownership_type" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'} sortKey="annual_rent" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={language === 'ar' ? 'الدفع الدوري' : 'Payment Amount'} sortKey="monthly_rent" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <SortableTableHeader label={language === 'ar' ? 'الدفعة القادمة' : 'Next Payment'} sortKey="next_payment_date" currentSort={propertySortConfig} onSort={requestPropertySort} />
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>
                    {language === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedProperties.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {language === 'ar' ? 'لا توجد عقارات' : 'No properties found'}
                    </td>
                  </tr>
                ) : (
                  sortedProperties.map((property) => {
                    const isRented = property.ownership_type === 'rented' || property.ownership_type === 'leased';
                    const paymentAmount = getPaymentAmount(property.annual_rent || 0, property.payment_frequency || 'monthly');
                    const isPaymentDue = property.next_payment_date && new Date(property.next_payment_date) <= new Date();

                    return (
                      <tr key={property.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{property.property_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 capitalize">{property.property_type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{property.city}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            property.ownership_type === 'owned' ? 'bg-green-100 text-green-800' :
                            property.ownership_type === 'leased' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {property.ownership_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {isRented && property.annual_rent ? (
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(property.annual_rent, language)}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isRented && property.annual_rent ? (
                            <div>
                              <div className="font-medium text-blue-700">{formatCurrency(paymentAmount, language)}</div>
                              <div className="text-xs text-gray-500">/ {getFrequencyLabel(property.payment_frequency || 'monthly')}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {property.next_payment_date ? (
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <CalendarClock className={`h-3.5 w-3.5 flex-shrink-0 ${isPaymentDue ? 'text-red-500' : 'text-blue-500'}`} />
                                <span className={isPaymentDue ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                                  {new Date(property.next_payment_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {isRented && canVerifyPayments && (
                              <button
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setShowPaymentModal(true);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                                title={language === 'ar' ? 'تسجيل دفعة' : 'Mark as Paid'}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>{language === 'ar' ? 'دفع' : 'Paid'}</span>
                              </button>
                            )}
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
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTableHeader label={language === 'ar' ? 'الأصل' : 'Asset'} sortKey="asset_name" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={language === 'ar' ? 'الرقم' : 'Number'} sortKey="asset_number" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={language === 'ar' ? 'النوع' : 'Type'} sortKey="asset_type" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={language === 'ar' ? 'تاريخ الشراء' : 'Purchase Date'} sortKey="purchase_date" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={language === 'ar' ? 'القيمة الحالية' : 'Current Value'} sortKey="current_value" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <SortableTableHeader label={language === 'ar' ? 'الحالة' : 'Status'} sortKey="status" currentSort={assetSortConfig} onSort={requestAssetSort} />
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>
                    {language === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {language === 'ar' ? 'لا توجد أصول' : 'No assets found'}
                    </td>
                  </tr>
                ) : (
                  sortedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{asset.asset_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{asset.asset_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">{asset.asset_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{new Date(asset.purchase_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(asset.current_value, language)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          asset.status === 'active' || asset.status === 'in_use' ? 'bg-green-100 text-green-800' :
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

      {showPaymentModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl shadow-xl w-full max-w-2xl ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'تسجيل دفعة إيجار' : 'Record Rent Payment'}
                  </h2>
                  <p className="text-sm text-gray-600">{selectedProperty.property_name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedProperty(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600">{language === 'ar' ? 'الإيجار السنوي' : 'Annual Rent'}</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedProperty.annual_rent || 0, language)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">{language === 'ar' ? 'مبلغ هذه الدفعة' : 'This Payment Amount'}</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(getPaymentAmount(selectedProperty.annual_rent || 0, selectedProperty.payment_frequency || 'monthly'), language)}
                  </p>
                  <p className="text-xs text-gray-500">/ {getFrequencyLabel(selectedProperty.payment_frequency || 'monthly')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'تاريخ الدفع' : 'Payment Date'} *
                  </label>
                  <input
                    type="date"
                    value={paymentForm.paid_date}
                    onChange={(e) => setPaymentForm({...paymentForm, paid_date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'} *
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    required
                  >
                    <option value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="cheque">{language === 'ar' ? 'شيك' : 'Cheque'}</option>
                    <option value="cash">{language === 'ar' ? 'نقدي' : 'Cash'}</option>
                    <option value="online">{language === 'ar' ? 'دفع إلكتروني' : 'Online Payment'}</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'رقم المرجع / الشيك' : 'Reference / Cheque Number'}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm({...paymentForm, transaction_reference: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    placeholder={language === 'ar' ? 'أدخل رقم المرجع' : 'Enter reference number'}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'ملاحظات' : 'Notes'}
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    rows={3}
                    placeholder={language === 'ar' ? 'أضف أي ملاحظات إضافية' : 'Add any additional notes'}
                  />
                </div>
              </div>

              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedProperty(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>{language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPropertyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                {editingProperty ? (language === 'ar' ? 'تعديل العقار' : 'Edit Property') : (language === 'ar' ? 'إضافة عقار' : 'Add Property')}
              </h2>
              <button onClick={() => { setShowPropertyForm(false); setEditingProperty(null); resetPropertyForm(); }}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handlePropertySubmit} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'نوع العقار' : 'Property Type'} *
                  </label>
                  <select
                    required
                    value={propertyForm.property_type}
                    onChange={(e) => setPropertyForm({...propertyForm, property_type: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <option value="office">{language === 'ar' ? 'مكتب' : 'Office'}</option>
                    <option value="warehouse">{language === 'ar' ? 'مستودع' : 'Warehouse'}</option>
                    <option value="retail">{language === 'ar' ? 'تجاري' : 'Retail'}</option>
                    <option value="factory">{language === 'ar' ? 'مصنع' : 'Factory'}</option>
                    <option value="land">{language === 'ar' ? 'أرض' : 'Land'}</option>
                    <option value="residential">{language === 'ar' ? 'سكني' : 'Residential'}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'اسم العقار' : 'Property Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyForm.property_name}
                    onChange={(e) => setPropertyForm({...propertyForm, property_name: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'العنوان' : 'Address'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyForm.address}
                    onChange={(e) => setPropertyForm({...propertyForm, address: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'المدينة' : 'City'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyForm.city}
                    onChange={(e) => setPropertyForm({...propertyForm, city: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'نوع الملكية' : 'Ownership Type'} *
                  </label>
                  <select
                    required
                    value={propertyForm.ownership_type}
                    onChange={(e) => setPropertyForm({...propertyForm, ownership_type: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <option value="owned">{language === 'ar' ? 'مملوك' : 'Owned'}</option>
                    <option value="leased">{language === 'ar' ? 'مؤجر طويل الأجل' : 'Leased'}</option>
                    <option value="rented">{language === 'ar' ? 'مؤجر' : 'Rented'}</option>
                  </select>
                </div>
                {propertyForm.ownership_type !== 'rented' && propertyForm.ownership_type !== 'leased' && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {language === 'ar' ? 'القيمة الحالية (ر.س)' : 'Current Value (SAR)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={propertyForm.current_value}
                      onChange={(e) => setPropertyForm({...propertyForm, current_value: parseFloat(e.target.value)})}
                      className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                )}
                {(propertyForm.ownership_type === 'leased' || propertyForm.ownership_type === 'rented') && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'ar' ? 'الإيجار الشهري (ر.س)' : 'Monthly Rent (SAR)'} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={propertyForm.monthly_rent}
                        onChange={(e) => updateRentalFields({ monthly_rent: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'ar' ? 'الإيجار السنوي (ر.س)' : 'Annual Rent (SAR)'}
                      </label>
                      <input
                        type="number"
                        value={propertyForm.annual_rent}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'ar' ? 'دورة الدفع' : 'Payment Frequency'}
                      </label>
                      <select
                        value={propertyForm.payment_frequency}
                        onChange={(e) => updateRentalFields({ payment_frequency: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      >
                        <option value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</option>
                        <option value="quarterly">{language === 'ar' ? 'ربع سنوي' : 'Quarterly'}</option>
                        <option value="semi_annually">{language === 'ar' ? 'نصف سنوي' : 'Semi-Annually'}</option>
                        <option value="annually">{language === 'ar' ? 'سنوي' : 'Annually'}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'ar' ? 'مبلغ الدفعة (ر.س)' : 'Payment Amount (SAR)'}
                      </label>
                      <div className="w-full px-3 py-2 border rounded-md bg-blue-50 text-blue-800 font-semibold">
                        {formatCurrency(getPaymentAmount(propertyForm.annual_rent, propertyForm.payment_frequency), language)}
                        <span className="text-xs font-normal text-blue-600 mx-1">/ {getFrequencyLabel(propertyForm.payment_frequency)}</span>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'ar' ? 'تاريخ بداية العقد' : 'Lease Start Date'} *
                      </label>
                      <input
                        type="date"
                        required
                        value={propertyForm.lease_start_date}
                        onChange={(e) => updateRentalFields({ lease_start_date: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'ar' ? 'تاريخ نهاية العقد' : 'Lease End Date'}
                      </label>
                      <input
                        type="date"
                        value={propertyForm.lease_end_date}
                        onChange={(e) => setPropertyForm({...propertyForm, lease_end_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className={`mt-6 flex ${isRTL ? 'justify-start space-x-reverse space-x-3 flex-row-reverse' : 'justify-end space-x-3'}`}>
                <button
                  type="button"
                  onClick={() => { setShowPropertyForm(false); resetPropertyForm(); }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingProperty ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
