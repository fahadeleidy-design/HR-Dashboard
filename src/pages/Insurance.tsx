import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import {
  Shield, Plus, Eye, Edit, AlertTriangle, CheckCircle, Clock,
  XCircle, Search, Filter, Download, RefreshCw, Heart, Users,
  Car, Building2, User, Calendar, DollarSign, FileCheck
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface InsurancePolicy {
  id: string;
  policy_number: string;
  policy_type: string;
  insurance_provider: string;
  policy_class: string | null;
  coverage_type: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  status: string;
  cchi_approval_code: string | null;
  network_type: string | null;
  coverage_limit: number | null;
  deductible: number | null;
  copay_percentage: number | null;
  maternity_covered: boolean;
  dental_covered: boolean;
  optical_covered: boolean;
  emergency_covered: boolean;
  covered_employees_count: number | null;
  covered_dependents_count: number | null;
  created_at: string;
}

interface Beneficiary {
  id: string;
  policy_id: string;
  beneficiary_name: string;
  relationship: string;
  national_id: string | null;
  date_of_birth: string | null;
  percentage_share: number;
  status: string;
}

export function Insurance() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'health' | 'vehicle' | 'workmen' | 'all'>('health');

  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBeneficiariesModal, setShowBeneficiariesModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    policy_number: '',
    policy_type: 'health',
    insurance_provider: '',
    policy_class: '',
    coverage_type: 'individual',
    start_date: '',
    end_date: '',
    premium_amount: '',
    cchi_approval_code: '',
    network_type: 'nationwide',
    coverage_limit: '',
    deductible: '',
    copay_percentage: '',
    maternity_covered: true,
    dental_covered: true,
    optical_covered: true,
    emergency_covered: true,
    covered_employees_count: '',
    covered_dependents_count: ''
  });

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const [policiesRes, beneficiariesRes] = await Promise.all([
      supabase
        .from('insurance_policies')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('insurance_beneficiaries')
        .select('*')
        .order('created_at', { ascending: false })
    ]);

    setPolicies(policiesRes.data || []);
    setBeneficiaries(beneficiariesRes.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      policy_number: '',
      policy_type: 'health',
      insurance_provider: '',
      policy_class: '',
      coverage_type: 'individual',
      start_date: '',
      end_date: '',
      premium_amount: '',
      cchi_approval_code: '',
      network_type: 'nationwide',
      coverage_limit: '',
      deductible: '',
      copay_percentage: '',
      maternity_covered: true,
      dental_covered: true,
      optical_covered: true,
      emergency_covered: true,
      covered_employees_count: '',
      covered_dependents_count: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('insurance_policies').insert([{
        company_id: currentCompany.id,
        policy_number: formData.policy_number,
        policy_type: formData.policy_type,
        insurance_provider: formData.insurance_provider,
        policy_class: formData.policy_class || null,
        coverage_type: formData.coverage_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        premium_amount: parseFloat(formData.premium_amount) || 0,
        status: 'active',
        cchi_approval_code: formData.cchi_approval_code || null,
        network_type: formData.network_type || null,
        coverage_limit: formData.coverage_limit ? parseFloat(formData.coverage_limit) : null,
        deductible: formData.deductible ? parseFloat(formData.deductible) : null,
        copay_percentage: formData.copay_percentage ? parseFloat(formData.copay_percentage) : null,
        maternity_covered: formData.maternity_covered,
        dental_covered: formData.dental_covered,
        optical_covered: formData.optical_covered,
        emergency_covered: formData.emergency_covered,
        covered_employees_count: formData.covered_employees_count ? parseInt(formData.covered_employees_count) : null,
        covered_dependents_count: formData.covered_dependents_count ? parseInt(formData.covered_dependents_count) : null
      }]);

      if (error) throw error;

      await fetchData();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating insurance policy:', error);
      alert('Failed to create insurance policy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  const getStatusBadge = (status: string, daysUntilExpiry: number) => {
    if (status === 'cancelled' || status === 'terminated') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Cancelled</span>;
    }
    if (daysUntilExpiry < 0) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Expired</span>;
    }
    if (daysUntilExpiry <= 30) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Expiring Soon</span>;
    }
    if (status === 'active') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Pending</span>;
  };

  const getPolicyIcon = (type: string) => {
    switch (type) {
      case 'health':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'vehicle':
        return <Car className="h-5 w-5 text-blue-600" />;
      case 'workmen_compensation':
        return <Users className="h-5 w-5 text-orange-600" />;
      case 'property':
        return <Building2 className="h-5 w-5 text-green-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const filterPolicies = () => {
    let filtered = policies;

    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.policy_type === activeTab ||
        (activeTab === 'workmen' && p.policy_type === 'workmen_compensation'));
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.insurance_provider.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredPolicies = filterPolicies();

  const activePolicies = policies.filter(p => p.status === 'active').length;
  const healthPolicies = policies.filter(p => p.policy_type === 'health').length;
  const vehiclePolicies = policies.filter(p => p.policy_type === 'vehicle').length;
  const workmenPolicies = policies.filter(p => p.policy_type === 'workmen_compensation').length;

  const expiringPolicies = policies.filter(p => {
    const days = getDaysUntilExpiry(p.end_date);
    return p.status === 'active' && days <= 30 && days >= 0;
  }).length;

  const totalPremium = policies
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + p.premium_amount, 0);

  const totalCovered = policies
    .filter(p => p.status === 'active' && p.policy_type === 'health')
    .reduce((sum, p) => (p.covered_employees_count || 0) + (p.covered_dependents_count || 0), 0);

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
          <h1 className="text-3xl font-bold text-gray-900">{t.insurance.title}</h1>
          <p className="text-gray-600 mt-1">{t.insurance.subtitle}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>{t.insurance.newPolicy}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.insurance.activePolicies}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(activePolicies, language)}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.expiringSoon}</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{formatNumber(expiringPolicies, language)}</p>
              <p className="text-xs text-gray-500 mt-1">{t.insurance.within30Days}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.insurance.totalPremium}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(totalPremium, language)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t.insurance.annual}</p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">People Covered</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{totalCovered}</p>
              <p className="text-xs text-gray-500 mt-1">Employees + Dependents</p>
            </div>
            <Users className="h-12 w-12 text-purple-600 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">CCHI Compliance Notice</h3>
            <p className="text-sm text-blue-800 mt-1">
              All health insurance policies must be CCHI-approved. Ensure your policies have valid CCHI approval codes and meet minimum coverage requirements as mandated by Saudi law.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex justify-between items-center p-4">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('health')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'health'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Heart className="h-4 w-4" />
                <span>Health ({healthPolicies})</span>
              </button>
              <button
                onClick={() => setActiveTab('vehicle')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'vehicle'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Car className="h-4 w-4" />
                <span>Vehicle ({vehiclePolicies})</span>
              </button>
              <button
                onClick={() => setActiveTab('workmen')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'workmen'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Workmen ({workmenPolicies})</span>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({policies.length})
              </button>
            </div>
            <button
              onClick={fetchData}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by policy number or provider..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coverage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Premium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Shield className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg font-medium">No policies found</p>
                    <p className="text-sm mt-1">Create your first insurance policy to get started</p>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => {
                  const daysUntilExpiry = getDaysUntilExpiry(policy.end_date);
                  return (
                    <tr key={policy.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getPolicyIcon(policy.policy_type)}
                          <span className="text-sm font-medium text-gray-900">{policy.policy_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">
                          {policy.policy_type.replace('_', ' ')}
                        </span>
                        {policy.policy_type === 'health' && policy.cchi_approval_code && (
                          <div className="flex items-center text-xs text-green-600 mt-1">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            CCHI Approved
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{policy.insurance_provider}</div>
                        {policy.policy_class && (
                          <div className="text-xs text-gray-500">Class: {policy.policy_class}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{policy.coverage_type}</div>
                        {policy.policy_type === 'health' && (
                          <div className="flex items-center space-x-2 mt-1">
                            {policy.maternity_covered && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                                Maternity
                              </span>
                            )}
                            {policy.dental_covered && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Dental
                              </span>
                            )}
                            {policy.optical_covered && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Optical
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(policy.end_date), 'dd MMM yyyy')}
                        </div>
                        {daysUntilExpiry >= 0 && (
                          <div className={`text-xs ${daysUntilExpiry <= 30 ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                            {daysUntilExpiry} days left
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {policy.premium_amount.toLocaleString()} SAR
                        </div>
                        {policy.copay_percentage && (
                          <div className="text-xs text-gray-500">
                            Copay: {policy.copay_percentage}%
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(policy.status, daysUntilExpiry)}
                        {policy.network_type && (
                          <div className="text-xs text-gray-500 mt-1 capitalize">
                            {policy.network_type} network
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPolicy(policy);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPolicy(policy);
                              setShowBeneficiariesModal(true);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="View Beneficiaries"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetailsModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPolicy.policy_number}</h2>
                  <p className="text-gray-600 mt-1">{selectedPolicy.insurance_provider}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy Type</label>
                  <p className="text-gray-900 capitalize">{selectedPolicy.policy_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p>{getStatusBadge(selectedPolicy.status, getDaysUntilExpiry(selectedPolicy.end_date))}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Type</label>
                  <p className="text-gray-900">{selectedPolicy.coverage_type}</p>
                </div>
                {selectedPolicy.policy_class && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy Class</label>
                    <p className="text-gray-900">{selectedPolicy.policy_class}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <p className="text-gray-900">{format(new Date(selectedPolicy.start_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <p className="text-gray-900">{format(new Date(selectedPolicy.end_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Premium</label>
                  <p className="text-gray-900 font-semibold text-lg">
                    {selectedPolicy.premium_amount.toLocaleString()} SAR
                  </p>
                </div>
                {selectedPolicy.coverage_limit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Limit</label>
                    <p className="text-gray-900">{selectedPolicy.coverage_limit.toLocaleString()} SAR</p>
                  </div>
                )}
              </div>

              {selectedPolicy.policy_type === 'health' && (
                <>
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">CCHI Compliance</h3>
                    <div className="grid grid-cols-2 gap-6">
                      {selectedPolicy.cchi_approval_code ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CCHI Approval Code</label>
                          <p className="text-gray-900 font-mono bg-green-50 px-3 py-2 rounded border border-green-200">
                            {selectedPolicy.cchi_approval_code}
                          </p>
                        </div>
                      ) : (
                        <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-yellow-900">CCHI Approval Required</p>
                              <p className="text-sm text-yellow-800 mt-1">
                                This health insurance policy requires a valid CCHI approval code to comply with Saudi regulations.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedPolicy.network_type && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Network Type</label>
                          <p className="text-gray-900 capitalize">{selectedPolicy.network_type}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Details</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Included Benefits</label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            {selectedPolicy.emergency_covered ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-900">Emergency Care</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedPolicy.maternity_covered ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-900">Maternity Coverage</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedPolicy.dental_covered ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-900">Dental Care</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedPolicy.optical_covered ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-900">Optical Care</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {selectedPolicy.copay_percentage !== null && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Co-payment</label>
                            <p className="text-gray-900">{selectedPolicy.copay_percentage}%</p>
                          </div>
                        )}
                        {selectedPolicy.deductible !== null && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Deductible</label>
                            <p className="text-gray-900">{selectedPolicy.deductible.toLocaleString()} SAR</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Summary</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employees Covered</label>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedPolicy.covered_employees_count || 0}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dependents Covered</label>
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedPolicy.covered_dependents_count || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Created: {format(new Date(selectedPolicy.created_at), 'dd MMM yyyy HH:mm')}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                    Edit Policy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBeneficiariesModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Policy Beneficiaries</h2>
                  <p className="text-gray-600 mt-1">{selectedPolicy.policy_number}</p>
                </div>
                <button
                  onClick={() => setShowBeneficiariesModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Beneficiary List ({beneficiaries.filter(b => b.policy_id === selectedPolicy.id).length})
                </h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                  <Plus className="h-4 w-4" />
                  <span>Add Beneficiary</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">National ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Share %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {beneficiaries.filter(b => b.policy_id === selectedPolicy.id).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <User className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-lg font-medium">No beneficiaries added</p>
                          <p className="text-sm mt-1">Add beneficiaries to this policy</p>
                        </td>
                      </tr>
                    ) : (
                      beneficiaries
                        .filter(b => b.policy_id === selectedPolicy.id)
                        .map((beneficiary) => (
                          <tr key={beneficiary.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {beneficiary.beneficiary_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                              {beneficiary.relationship}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                              {beneficiary.national_id || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {beneficiary.date_of_birth
                                ? format(new Date(beneficiary.date_of_birth), 'dd MMM yyyy')
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {beneficiary.percentage_share}%
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                beneficiary.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {beneficiary.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center space-x-2">
                                <button className="text-gray-600 hover:text-gray-800">
                                  <Edit className="h-4 w-4" />
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

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowBeneficiariesModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Add New Insurance Policy</h2>
                    <p className="text-gray-600 mt-1">Create a new insurance policy for your company</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.policy_number}
                      onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.policy_type}
                      onChange={(e) => setFormData({ ...formData, policy_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="health">Health Insurance</option>
                      <option value="vehicle">Vehicle Insurance</option>
                      <option value="workmen_compensation">Workmen Compensation</option>
                      <option value="life">Life Insurance</option>
                      <option value="property">Property Insurance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance Provider <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Bupa, MedGulf, Tawuniya"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Class
                    </label>
                    <input
                      type="text"
                      value={formData.policy_class}
                      onChange={(e) => setFormData({ ...formData, policy_class: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Class A, Premium, Standard"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coverage Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.coverage_type}
                      onChange={(e) => setFormData({ ...formData, coverage_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="individual">Individual</option>
                      <option value="family">Family</option>
                      <option value="group">Group</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CCHI Approval Code
                    </label>
                    <input
                      type="text"
                      value={formData.cchi_approval_code}
                      onChange={(e) => setFormData({ ...formData, cchi_approval_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="CCHI approval code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Premium Amount (SAR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.premium_amount}
                      onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Network Type
                    </label>
                    <select
                      value={formData.network_type}
                      onChange={(e) => setFormData({ ...formData, network_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="nationwide">Nationwide</option>
                      <option value="regional">Regional</option>
                      <option value="local">Local</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coverage Limit (SAR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.coverage_limit}
                      onChange={(e) => setFormData({ ...formData, coverage_limit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deductible (SAR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.deductible}
                      onChange={(e) => setFormData({ ...formData, deductible: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Co-pay Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.copay_percentage}
                      onChange={(e) => setFormData({ ...formData, copay_percentage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Covered Employees Count
                    </label>
                    <input
                      type="number"
                      value={formData.covered_employees_count}
                      onChange={(e) => setFormData({ ...formData, covered_employees_count: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Covered Dependents Count
                    </label>
                    <input
                      type="number"
                      value={formData.covered_dependents_count}
                      onChange={(e) => setFormData({ ...formData, covered_dependents_count: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Coverage Options</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.maternity_covered}
                        onChange={(e) => setFormData({ ...formData, maternity_covered: e.target.checked })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Maternity</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.dental_covered}
                        onChange={(e) => setFormData({ ...formData, dental_covered: e.target.checked })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Dental</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.optical_covered}
                        onChange={(e) => setFormData({ ...formData, optical_covered: e.target.checked })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Optical</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.emergency_covered}
                        onChange={(e) => setFormData({ ...formData, emergency_covered: e.target.checked })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Emergency</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Create Policy'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
