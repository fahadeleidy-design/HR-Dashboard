import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle, XCircle, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface GovSubscription {
  id: string;
  company_id: string;
  platform_name: string;
  platform_name_ar: string | null;
  subscription_type: string | null;
  username: string | null;
  account_number: string | null;
  subscription_status: 'active' | 'expired' | 'suspended' | 'cancelled';
  start_date: string | null;
  expiry_date: string | null;
  annual_cost: number;
  payment_frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
}

const commonPlatforms = [
  { name_en: 'Qiwa', name_ar: 'قوى', description: 'Ministry of Human Resources & Social Development' },
  { name_en: 'Mudad', name_ar: 'مدد', description: 'Employee Services Platform' },
  { name_en: 'Muqeem', name_ar: 'مقيم', description: 'Immigration Services (Iqama, Work Permits)' },
  { name_en: 'GOSI', name_ar: 'التأمينات الاجتماعية', description: 'General Organization for Social Insurance' },
  { name_en: 'Absher', name_ar: 'أبشر', description: 'Ministry of Interior Services' },
  { name_en: 'Zajil', name_ar: 'زاجل', description: 'Chamber of Commerce Portal' },
  { name_en: 'ZATCA', name_ar: 'هيئة الزكاة والضريبة والجمارك', description: 'Zakat, Tax and Customs Authority' },
  { name_en: 'Balady', name_ar: 'بلدي', description: 'Municipal Services' },
  { name_en: 'Elm', name_ar: 'علم', description: 'Credit Information Services' },
  { name_en: 'Tawtheeq', name_ar: 'توثيق', description: 'Employment Contract Authentication' },
];

export function GovSubscriptions() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [subscriptions, setSubscriptions] = useState<GovSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<GovSubscription | null>(null);
  const [formData, setFormData] = useState({
    platform_name: '',
    platform_name_ar: '',
    subscription_type: '',
    username: '',
    account_number: '',
    subscription_status: 'active' as const,
    start_date: '',
    expiry_date: '',
    annual_cost: '0',
    payment_frequency: 'annual' as const,
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    notes: '',
  });

  useEffect(() => {
    if (currentCompany) {
      fetchSubscriptions();
    }
  }, [currentCompany]);

  const fetchSubscriptions = async () => {
    if (!currentCompany) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('governmental_subscriptions')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('platform_name');

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const subscriptionData = {
        company_id: currentCompany.id,
        platform_name: formData.platform_name,
        platform_name_ar: formData.platform_name_ar || null,
        subscription_type: formData.subscription_type || null,
        username: formData.username || null,
        account_number: formData.account_number || null,
        subscription_status: formData.subscription_status,
        start_date: formData.start_date || null,
        expiry_date: formData.expiry_date || null,
        annual_cost: parseFloat(formData.annual_cost) || 0,
        payment_frequency: formData.payment_frequency,
        contact_person: formData.contact_person || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        notes: formData.notes || null,
      };

      if (editingSubscription) {
        const { error } = await supabase
          .from('governmental_subscriptions')
          .update(subscriptionData)
          .eq('id', editingSubscription.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('governmental_subscriptions')
          .insert([subscriptionData]);
        if (error) throw error;
      }

      fetchSubscriptions();
      handleCloseForm();
    } catch (error: any) {
      console.error('Error saving subscription:', error);
      alert(error.message || 'Failed to save subscription');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      const { error } = await supabase
        .from('governmental_subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  const handleEdit = (subscription: GovSubscription) => {
    setEditingSubscription(subscription);
    setFormData({
      platform_name: subscription.platform_name,
      platform_name_ar: subscription.platform_name_ar || '',
      subscription_type: subscription.subscription_type || '',
      username: subscription.username || '',
      account_number: subscription.account_number || '',
      subscription_status: subscription.subscription_status,
      start_date: subscription.start_date || '',
      expiry_date: subscription.expiry_date || '',
      annual_cost: subscription.annual_cost.toString(),
      payment_frequency: subscription.payment_frequency,
      contact_person: subscription.contact_person || '',
      contact_phone: subscription.contact_phone || '',
      contact_email: subscription.contact_email || '',
      notes: subscription.notes || '',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSubscription(null);
    setFormData({
      platform_name: '',
      platform_name_ar: '',
      subscription_type: '',
      username: '',
      account_number: '',
      subscription_status: 'active',
      start_date: '',
      expiry_date: '',
      annual_cost: '0',
      payment_frequency: 'annual',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      notes: '',
    });
  };

  const selectPlatform = (platform: typeof commonPlatforms[0]) => {
    setFormData(prev => ({
      ...prev,
      platform_name: platform.name_en,
      platform_name_ar: platform.name_ar,
    }));
  };

  const handleExport = () => {
    const exportData = filteredSubscriptions.map(sub => ({
      'Platform Name': sub.platform_name,
      'Platform Name (AR)': sub.platform_name_ar || '',
      'Subscription Type': sub.subscription_type || '',
      'Username': sub.username || '',
      'Account Number': sub.account_number || '',
      'Status': sub.subscription_status,
      'Start Date': sub.start_date || '',
      'Expiry Date': sub.expiry_date || '',
      'Annual Cost (SAR)': sub.annual_cost,
      'Payment Frequency': sub.payment_frequency,
      'Contact Person': sub.contact_person || '',
      'Contact Phone': sub.contact_phone || '',
      'Contact Email': sub.contact_email || '',
      'Notes': sub.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gov Subscriptions');
    XLSX.writeFile(wb, `gov_subscriptions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'suspended':
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.platform_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.platform_name_ar || '').includes(searchTerm) ||
      (sub.account_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sub.subscription_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalAnnualCost = filteredSubscriptions
    .filter(sub => sub.subscription_status === 'active')
    .reduce((sum, sub) => sum + sub.annual_cost, 0);

  const expiringCount = subscriptions.filter(sub => {
    if (!sub.expiry_date || sub.subscription_status !== 'active') return false;
    const daysUntilExpiry = Math.floor(
      (new Date(sub.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  }).length;

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-3xl font-bold text-gray-900">{t.govSubscriptions.title}</h1>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="h-4 w-4" />
            <span>{t.common.export}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="h-5 w-5" />
            <span>{t.govSubscriptions.addSubscription}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.govSubscriptions.totalActive}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatNumber(subscriptions.filter(s => s.subscription_status === 'active').length, language)}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.govSubscriptions.annualCost}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalAnnualCost, language)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.govSubscriptions.expiringSoon}</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{formatNumber(expiringCount, language)}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t.govSubscriptions.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">{t.common.all} {t.common.status}</option>
                <option value="active">{t.common.active}</option>
                <option value="expired">{t.common.expired}</option>
                <option value="suspended">{t.govSubscriptions.suspended}</option>
                <option value="cancelled">{t.govSubscriptions.cancelled}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.govSubscriptions.platform}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.govSubscriptions.account}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.common.status}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.documents.expiryDate}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.govSubscriptions.annualCost}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t.common.contact}</th>
                <th className={`px-6 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-500 uppercase`}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{subscription.platform_name}</p>
                        {subscription.platform_name_ar && (
                          <p className="text-sm text-gray-500" dir="rtl">{subscription.platform_name_ar}</p>
                        )}
                        {subscription.subscription_type && (
                          <p className="text-xs text-gray-500">{subscription.subscription_type}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {subscription.account_number && (
                        <p className="text-sm text-gray-900 font-mono">{subscription.account_number}</p>
                      )}
                      {subscription.username && (
                        <p className="text-xs text-gray-500">{subscription.username}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(subscription.subscription_status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(subscription.subscription_status)}`}>
                          {subscription.subscription_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {subscription.expiry_date ? (
                        <>
                          {new Date(subscription.expiry_date).toLocaleDateString()}
                          {(() => {
                            const daysUntilExpiry = Math.floor(
                              (new Date(subscription.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                            );
                            if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
                              return <p className="text-xs text-orange-600 font-semibold">{daysUntilExpiry} days left</p>;
                            }
                            return null;
                          })()}
                        </>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {subscription.annual_cost > 0 ? (
                        <>
                          {subscription.annual_cost.toLocaleString()} SAR
                          <p className="text-xs text-gray-500 capitalize">{subscription.payment_frequency}</p>
                        </>
                      ) : (
                        <span className="text-gray-400">Free</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {subscription.contact_person && (
                        <p className="text-gray-900">{subscription.contact_person}</p>
                      )}
                      {subscription.contact_phone && (
                        <p className="text-gray-500 text-xs">{subscription.contact_phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={() => handleEdit(subscription)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(subscription.id)}
                          className="text-red-600 hover:text-red-800"
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
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSubscription ? 'Edit Subscription' : 'Add New Subscription'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {!editingSubscription && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Quick Select Common Platforms:</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {commonPlatforms.map((platform) => (
                      <button
                        key={platform.name_en}
                        type="button"
                        onClick={() => selectPlatform(platform)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-primary-50 hover:border-primary-500 transition-colors text-left"
                      >
                        <p className="font-medium text-gray-900">{platform.name_en}</p>
                        <p className="text-xs text-gray-500" dir="rtl">{platform.name_ar}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.platform_name}
                    onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform Name (Arabic)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.platform_name_ar}
                    onChange={(e) => setFormData({ ...formData, platform_name_ar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Type
                  </label>
                  <input
                    type="text"
                    placeholder="Basic, Premium, Enterprise, etc."
                    value={formData.subscription_type}
                    onChange={(e) => setFormData({ ...formData, subscription_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.subscription_status}
                    onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Cost (SAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.annual_cost}
                    onChange={(e) => setFormData({ ...formData, annual_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Frequency
                  </label>
                  <select
                    value={formData.payment_frequency}
                    onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="one_time">One Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingSubscription ? 'Update' : 'Create'} Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
