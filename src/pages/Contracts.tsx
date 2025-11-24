import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import {
  FileText, Plus, Eye, Edit, AlertTriangle, CheckCircle, Clock,
  XCircle, Search, Filter, Download, RefreshCw, Building2, Calendar,
  DollarSign, FileCheck, AlertCircle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Contract {
  id: string;
  contract_number: string;
  contract_type: string;
  vendor_client_name: string;
  vendor_client_cr: string | null;
  start_date: string;
  end_date: string | null;
  contract_value: number;
  currency: string;
  status: string;
  auto_renew: boolean;
  notice_period_days: number | null;
  payment_terms: string | null;
  description: string | null;
  vat_rate: number;
  vat_inclusive: boolean;
  penalty_clause: string | null;
  governing_law: string | null;
  created_at: string;
}

interface ContractRenewal {
  id: string;
  contract_id: string;
  renewal_date: string;
  new_start_date: string;
  new_end_date: string;
  new_value: number;
  changes_notes: string | null;
}

export function Contracts() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'expiring' | 'expired' | 'all'>('active');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [renewals, setRenewals] = useState<ContractRenewal[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const [contractsRes, renewalsRes] = await Promise.all([
      supabase
        .from('contracts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('contract_renewals')
        .select('*')
        .order('renewal_date', { ascending: false })
    ]);

    setContracts(contractsRes.data || []);
    setRenewals(renewalsRes.data || []);
    setLoading(false);
  };

  const getDaysUntilExpiry = (endDate: string | null) => {
    if (!endDate) return null;
    return differenceInDays(new Date(endDate), new Date());
  };

  const getStatusBadge = (status: string, daysUntilExpiry: number | null) => {
    if (status === 'terminated' || status === 'cancelled') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Terminated</span>;
    }
    if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Expired</span>;
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Expiring Soon</span>;
    }
    if (status === 'active') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Draft</span>;
  };

  const getContractIcon = (type: string) => {
    switch (type) {
      case 'vendor':
        return <Building2 className="h-5 w-5" />;
      case 'client':
        return <FileCheck className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const filterContracts = () => {
    let filtered = contracts;

    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.contract_type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.vendor_client_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (activeTab) {
      case 'active':
        return filtered.filter(c => {
          const days = getDaysUntilExpiry(c.end_date);
          return c.status === 'active' && (days === null || days > 30);
        });
      case 'expiring':
        return filtered.filter(c => {
          const days = getDaysUntilExpiry(c.end_date);
          return c.status === 'active' && days !== null && days <= 30 && days >= 0;
        });
      case 'expired':
        return filtered.filter(c => {
          const days = getDaysUntilExpiry(c.end_date);
          return days !== null && days < 0;
        });
      case 'all':
      default:
        return filtered;
    }
  };

  const filteredContracts = filterContracts();

  const activeContracts = contracts.filter(c => {
    const days = getDaysUntilExpiry(c.end_date);
    return c.status === 'active' && (days === null || days > 30);
  }).length;

  const expiringContracts = contracts.filter(c => {
    const days = getDaysUntilExpiry(c.end_date);
    return c.status === 'active' && days !== null && days <= 30 && days >= 0;
  }).length;

  const expiredContracts = contracts.filter(c => {
    const days = getDaysUntilExpiry(c.end_date);
    return days !== null && days < 0;
  }).length;

  const totalValue = contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + c.contract_value, 0);

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
          <h1 className="text-3xl font-bold text-gray-900">{t.contracts.title}</h1>
          <p className="text-gray-600 mt-1">{t.contracts.subtitle}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>{t.contracts.newContract}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.contracts.activeContracts}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(activeContracts, language)}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.expiringSoon}</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{formatNumber(expiringContracts, language)}</p>
              <p className="text-xs text-gray-500 mt-1">{t.contracts.within30Days}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.expired}</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{formatNumber(expiredContracts, language)}</p>
            </div>
            <XCircle className="h-12 w-12 text-gray-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.contracts.totalValue}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(totalValue, language)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t.contracts.activeContracts}</p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex justify-between items-center p-4">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'active'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Active ({activeContracts})
              </button>
              <button
                onClick={() => setActiveTab('expiring')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'expiring'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Expiring ({expiringContracts})
              </button>
              <button
                onClick={() => setActiveTab('expired')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'expired'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Expired ({expiredContracts})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({contracts.length})
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
                  placeholder="Search by contract number or vendor/client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="vendor">Vendor Contracts</option>
                <option value="client">Client Contracts</option>
                <option value="service">Service Agreements</option>
                <option value="lease">Lease Agreements</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor/Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg font-medium">No contracts found</p>
                    <p className="text-sm mt-1">Create your first contract to get started</p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const daysUntilExpiry = getDaysUntilExpiry(contract.end_date);
                  return (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getContractIcon(contract.contract_type)}
                          <span className="text-sm font-medium text-gray-900">{contract.contract_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">{contract.contract_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{contract.vendor_client_name}</div>
                        {contract.vendor_client_cr && (
                          <div className="text-xs text-gray-500">CR: {contract.vendor_client_cr}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(contract.start_date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {contract.end_date ? format(new Date(contract.end_date), 'dd MMM yyyy') : 'No end date'}
                        </div>
                        {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
                          <div className={`text-xs ${daysUntilExpiry <= 30 ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                            {daysUntilExpiry} days left
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {contract.contract_value.toLocaleString()} {contract.currency}
                        </div>
                        <div className="text-xs text-gray-500">
                          {contract.vat_inclusive ? 'VAT Inclusive' : `+ ${contract.vat_rate}% VAT`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(contract.status, daysUntilExpiry)}
                        {contract.auto_renew && (
                          <div className="flex items-center text-xs text-blue-600 mt-1">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Auto-renew
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800">
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

      {showDetailsModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedContract.contract_number}</h2>
                  <p className="text-gray-600 mt-1">{selectedContract.vendor_client_name}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                  <p className="text-gray-900 capitalize">{selectedContract.contract_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p>{getStatusBadge(selectedContract.status, getDaysUntilExpiry(selectedContract.end_date))}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <p className="text-gray-900">{format(new Date(selectedContract.start_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <p className="text-gray-900">
                    {selectedContract.end_date ? format(new Date(selectedContract.end_date), 'dd MMM yyyy') : 'No end date'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value</label>
                  <p className="text-gray-900 font-semibold">
                    {selectedContract.contract_value.toLocaleString()} {selectedContract.currency}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT</label>
                  <p className="text-gray-900">
                    {selectedContract.vat_rate}% {selectedContract.vat_inclusive ? '(Inclusive)' : '(Exclusive)'}
                  </p>
                </div>
                {selectedContract.vendor_client_cr && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CR Number</label>
                    <p className="text-gray-900">{selectedContract.vendor_client_cr}</p>
                  </div>
                )}
                {selectedContract.notice_period_days && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
                    <p className="text-gray-900">{selectedContract.notice_period_days} days</p>
                  </div>
                )}
              </div>

              {selectedContract.payment_terms && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <p className="text-gray-900">{selectedContract.payment_terms}</p>
                </div>
              )}

              {selectedContract.governing_law && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Governing Law</label>
                  <p className="text-gray-900">{selectedContract.governing_law}</p>
                </div>
              )}

              {selectedContract.penalty_clause && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Clauses</label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-gray-900">{selectedContract.penalty_clause}</p>
                  </div>
                </div>
              )}

              {selectedContract.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{selectedContract.description}</p>
                </div>
              )}

              <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
                {selectedContract.auto_renew && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Auto-renewal enabled
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  Created: {format(new Date(selectedContract.created_at), 'dd MMM yyyy HH:mm')}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                  Edit Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
