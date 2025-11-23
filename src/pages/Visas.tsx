import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import {
  CreditCard, Plus, Eye, Edit, CheckCircle, XCircle, Clock,
  AlertTriangle, Users, FileText, Calendar, DollarSign, Search,
  Filter, Download, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface WorkVisa {
  id: string;
  visa_number: string;
  visa_type: string;
  nationality: string;
  job_title: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  cost: number;
  used_for_employee_id: string | null;
}

interface ResidencePermit {
  id: string;
  employee_id: string;
  iqama_number: string;
  iqama_profession: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  dependents_count: number;
  employees?: { first_name_en: string; last_name_en: string; employee_number: string };
}

interface VisaRequest {
  id: string;
  request_type: string;
  employee_name: string;
  nationality: string;
  job_title: string;
  request_date: string;
  processing_status: string;
  cost: number;
  priority: string;
}

export function Visas() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visas' | 'iqamas' | 'requests' | 'quotas'>('visas');

  const [workVisas, setWorkVisas] = useState<WorkVisa[]>([]);
  const [residencePermits, setResidencePermits] = useState<ResidencePermit[]>([]);
  const [visaRequests, setVisaRequests] = useState<VisaRequest[]>([]);
  const [quotas, setQuotas] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const [visasRes, iqamasRes, requestsRes, quotasRes] = await Promise.all([
      supabase
        .from('work_visas')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('residence_permits')
        .select('*, employees(first_name_en, last_name_en, employee_number)')
        .eq('company_id', currentCompany.id)
        .order('expiry_date', { ascending: true }),

      supabase
        .from('visa_requests')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('request_date', { ascending: false }),

      supabase
        .from('visa_quotas')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('quota_year', new Date().getFullYear())
    ]);

    setWorkVisas(visasRes.data || []);
    setResidencePermits(iqamasRes.data || []);
    setVisaRequests(requestsRes.data || []);
    setQuotas(quotasRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const activeVisas = workVisas.filter(v => v.status === 'active').length;
  const usedVisas = workVisas.filter(v => v.status === 'used').length;
  const expiredVisas = workVisas.filter(v => v.status === 'expired').length;

  const activeIqamas = residencePermits.filter(i => i.status === 'active').length;
  const expiringIqamas = residencePermits.filter(i => {
    const daysUntilExpiry = Math.floor((new Date(i.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 60;
  }).length;

  const pendingRequests = visaRequests.filter(r => r.processing_status === 'pending').length;
  const inProgressRequests = visaRequests.filter(r => r.processing_status === 'in_progress').length;

  const totalQuota = quotas.reduce((sum, q) => sum + q.total_quota, 0);
  const usedQuota = quotas.reduce((sum, q) => sum + q.quota_used, 0);
  const availableQuota = totalQuota - usedQuota;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      used: 'bg-blue-100 text-blue-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      under_renewal: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'text-red-600',
      high: 'text-orange-600',
      normal: 'text-blue-600',
      low: 'text-gray-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Visa & Work Permit Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Work Visas</p>
              <p className="text-2xl font-bold text-green-600">{activeVisas}</p>
              <p className="text-xs text-gray-500 mt-1">Used: {usedVisas} | Expired: {expiredVisas}</p>
            </div>
            <CreditCard className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Iqamas</p>
              <p className="text-2xl font-bold text-blue-600">{activeIqamas}</p>
              <p className="text-xs text-red-600 mt-1">Expiring Soon: {expiringIqamas}</p>
            </div>
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingRequests}</p>
              <p className="text-xs text-gray-500 mt-1">In Progress: {inProgressRequests}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Visa Quota {new Date().getFullYear()}</p>
              <p className="text-2xl font-bold text-purple-600">{availableQuota}/{totalQuota}</p>
              <p className="text-xs text-gray-500 mt-1">Available</p>
            </div>
            <Users className="h-12 w-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['visas', 'iqamas', 'requests', 'quotas'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 capitalize ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'iqamas' ? 'Residence Permits (Iqama)' : tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="under_renewal">Under Renewal</option>
            </select>
            <button
              onClick={fetchData}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Work Visas Tab */}
          {activeTab === 'visas' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visa Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nationality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workVisas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        No work visas found. Click "New Request" to add one.
                      </td>
                    </tr>
                  ) : (
                    workVisas
                      .filter(v => filterStatus === 'all' || v.status === filterStatus)
                      .filter(v =>
                        searchTerm === '' ||
                        v.visa_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        v.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        v.nationality.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((visa) => (
                        <tr key={visa.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {visa.visa_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {visa.visa_type.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{visa.job_title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{visa.nationality}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(visa.issue_date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(visa.expiry_date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(visa.status)}`}>
                              {visa.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {visa.cost?.toLocaleString('en-SA')} SAR
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button className="text-blue-600 hover:text-blue-800" title="View Details">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-800" title="Edit">
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
          )}

          {/* Residence Permits Tab */}
          {activeTab === 'iqamas' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Iqama Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profession</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dependents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {residencePermits.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        No residence permits (iqamas) found.
                      </td>
                    </tr>
                  ) : (
                    residencePermits
                      .filter(i => filterStatus === 'all' || i.status === filterStatus)
                      .filter(i =>
                        searchTerm === '' ||
                        i.iqama_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        i.iqama_profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (i.employees && `${i.employees.first_name_en} ${i.employees.last_name_en}`.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map((iqama) => {
                        const daysLeft = Math.floor((new Date(iqama.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        const isExpiring = daysLeft > 0 && daysLeft <= 60;
                        const isExpired = daysLeft <= 0;

                        return (
                          <tr key={iqama.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {iqama.employees ? `${iqama.employees.first_name_en} ${iqama.employees.last_name_en}` : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {iqama.employees?.employee_number}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {iqama.iqama_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{iqama.iqama_profession}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(iqama.issue_date), 'dd MMM yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(iqama.expiry_date), 'dd MMM yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`font-medium ${
                                isExpired ? 'text-red-600' :
                                isExpiring ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {isExpired ? 'EXPIRED' : `${daysLeft} days`}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                              {iqama.dependents_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(iqama.status)}`}>
                                {iqama.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button className="text-blue-600 hover:text-blue-800" title="View Details">
                                  <Eye className="h-4 w-4" />
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
          )}

          {/* Visa Requests Tab */}
          {activeTab === 'requests' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nationality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visaRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        No visa requests found.
                      </td>
                    </tr>
                  ) : (
                    visaRequests
                      .filter(r => filterStatus === 'all' || r.processing_status === filterStatus)
                      .filter(r =>
                        searchTerm === '' ||
                        r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.nationality.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {request.request_type.replace(/_/g, ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.employee_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.job_title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.nationality}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(request.request_date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${getPriorityColor(request.priority)} capitalize`}>
                              {request.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.processing_status)}`}>
                              {request.processing_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.cost?.toLocaleString('en-SA')} SAR
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button className="text-blue-600 hover:text-blue-800" title="View Details">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-800" title="Edit">
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
          )}

          {/* Quotas Tab */}
          {activeTab === 'quotas' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Visa Quota Summary {new Date().getFullYear()}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Allocated</p>
                    <p className="text-2xl font-bold text-blue-900">{totalQuota}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Used</p>
                    <p className="text-2xl font-bold text-orange-600">{usedQuota}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Available</p>
                    <p className="text-2xl font-bold text-green-600">{availableQuota}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quota Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profession</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nationality</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Quota</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No quota information available for {new Date().getFullYear()}.
                        </td>
                      </tr>
                    ) : (
                      quotas.map((quota) => (
                        <tr key={quota.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {quota.quota_type.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {quota.profession_name || 'General'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {quota.nationality || 'All'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {quota.total_quota}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                            {quota.quota_used}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {quota.quota_available}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(quota.status)}`}>
                              {quota.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">New Visa Request</h2>
                  <p className="text-gray-600 mt-1">Create a new visa or iqama request</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">Form Coming Soon</h3>
                    <p className="text-sm text-blue-800 mt-1">
                      The visa/iqama request creation form with MOL integration and quota management is under development. For now, please use the direct database interface or contact your system administrator to create new visa requests.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
