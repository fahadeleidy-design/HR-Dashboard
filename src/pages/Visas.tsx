import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
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

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  nationality: string;
}

interface ProfessionCode {
  id: string;
  profession_code: string;
  profession_name_en: string;
  profession_name_ar: string;
  minimum_salary: number;
}

export function Visas() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'visas' | 'iqamas' | 'requests' | 'quotas'>('visas');

  const [workVisas, setWorkVisas] = useState<WorkVisa[]>([]);
  const [residencePermits, setResidencePermits] = useState<ResidencePermit[]>([]);
  const [visaRequests, setVisaRequests] = useState<VisaRequest[]>([]);
  const [quotas, setQuotas] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [professionCodes, setProfessionCodes] = useState<ProfessionCode[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    request_type: 'new_visa',
    employee_id: '',
    employee_name: '',
    nationality: '',
    passport_number: '',
    passport_expiry: '',
    job_title: '',
    profession_code: '',
    education: '',
    experience_years: '',
    proposed_salary: '',
    priority: 'normal',
    expected_arrival_date: '',
    sponsor_name: '',
    visa_type: 'employment',
    notes: '',
  });

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const [visasRes, iqamasRes, requestsRes, quotasRes, employeesRes, professionsRes] = await Promise.all([
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
        .eq('quota_year', new Date().getFullYear()),

      supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en, nationality')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('first_name_en', { ascending: true }),

      supabase
        .from('profession_codes')
        .select('id, profession_code, profession_name_en, profession_name_ar, minimum_salary')
        .eq('is_active', true)
        .order('profession_name_en', { ascending: true })
    ]);

    setWorkVisas(visasRes.data || []);
    setResidencePermits(iqamasRes.data || []);
    setVisaRequests(requestsRes.data || []);
    setQuotas(quotasRes.data || []);
    setEmployees(employeesRes.data || []);
    setProfessionCodes(professionsRes.data || []);
    setLoading(false);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setFormData({
        ...formData,
        employee_id: employeeId,
        employee_name: `${employee.first_name_en} ${employee.last_name_en}`,
        nationality: employee.nationality || '',
      });
    }
  };

  const handleProfessionChange = (professionId: string) => {
    const profession = professionCodes.find(p => p.id === professionId);
    if (profession) {
      setFormData({
        ...formData,
        profession_code: profession.profession_code,
        job_title: profession.profession_name_en,
        proposed_salary: profession.minimum_salary?.toString() || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setSubmitting(true);

    try {
      const requestNumber = `VR-${Date.now().toString().slice(-8)}`;

      const { error } = await supabase.from('visa_requests').insert({
        company_id: currentCompany.id,
        request_number: requestNumber,
        request_type: formData.request_type,
        employee_name: formData.employee_name,
        nationality: formData.nationality,
        passport_number: formData.passport_number || null,
        passport_expiry_date: formData.passport_expiry || null,
        job_title: formData.job_title,
        profession_code: formData.profession_code || null,
        education_level: formData.education || null,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        proposed_salary: formData.proposed_salary ? parseFloat(formData.proposed_salary) : null,
        priority: formData.priority,
        expected_arrival_date: formData.expected_arrival_date || null,
        sponsor_company_name: formData.sponsor_name || currentCompany.company_name_en,
        visa_type: formData.visa_type,
        processing_status: 'pending',
        workflow_step: 'initial_request',
        request_date: new Date().toISOString().split('T')[0],
        notes: formData.notes || null,
      });

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        request_type: 'new_visa',
        employee_id: '',
        employee_name: '',
        nationality: '',
        passport_number: '',
        passport_expiry: '',
        job_title: '',
        profession_code: '',
        education: '',
        experience_years: '',
        proposed_salary: '',
        priority: 'normal',
        expected_arrival_date: '',
        sponsor_name: '',
        visa_type: 'employment',
        notes: '',
      });

      await fetchData();
    } catch (error) {
      console.error('Error creating visa request:', error);
      alert('Failed to create visa request. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
        <h1 className="text-3xl font-bold">{t.visas.title}</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t.visas.newRequest}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.visas.activeWorkVisas}</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(activeVisas, language)}</p>
              <p className="text-xs text-gray-500 mt-1">{t.visas.used}: {formatNumber(usedVisas, language)} | {t.visas.expired}: {formatNumber(expiredVisas, language)}</p>
            </div>
            <CreditCard className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.visas.activeIqamas}</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(activeIqamas, language)}</p>
              <p className="text-xs text-red-600 mt-1">{t.common.expiringSoon}: {formatNumber(expiringIqamas, language)}</p>
            </div>
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.visas.pendingRequests}</p>
              <p className="text-2xl font-bold text-yellow-600">{formatNumber(pendingRequests, language)}</p>
              <p className="text-xs text-gray-500 mt-1">{t.visas.inProgress}: {formatNumber(inProgressRequests, language)}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.visas.visaQuota} {new Date().getFullYear()}</p>
              <p className="text-2xl font-bold text-purple-600">{formatNumber(availableQuota, language)}/{formatNumber(totalQuota, language)}</p>
              <p className="text-xs text-gray-500 mt-1">{t.visas.available}</p>
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
                placeholder={t.common.search}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t.visas.newRequestTitle}</h2>
                  <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.visas.newRequestDescription}</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 max-h-[calc(100vh-240px)] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Request Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.request_type}
                      onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="new_visa">New Work Visa</option>
                      <option value="iqama_issuance">Iqama Issuance</option>
                      <option value="iqama_renewal">Iqama Renewal</option>
                      <option value="iqama_transfer">Iqama Transfer</option>
                      <option value="profession_change">Profession Change</option>
                      <option value="dependent_visa">Dependent Visa</option>
                    </select>
                  </div>

                  {formData.request_type === 'iqama_renewal' || formData.request_type === 'profession_change' ? (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Employee <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.employee_id}
                        onChange={(e) => handleEmployeeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.employee_number} - {emp.first_name_en} {emp.last_name_en}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee/Candidate Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.employee_name}
                        onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Full name as per passport"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nationality <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., India, Pakistan, Egypt"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passport Number
                    </label>
                    <input
                      type="text"
                      value={formData.passport_number}
                      onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passport Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.passport_expiry}
                      onChange={(e) => setFormData({ ...formData, passport_expiry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saudi MOL Profession Code <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      onChange={(e) => handleProfessionChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Profession</option>
                      {professionCodes.map((prof) => (
                        <option key={prof.id} value={prof.id}>
                          {prof.profession_code} - {prof.profession_name_en} ({prof.profession_name_ar})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select official MOL profession code for visa/iqama
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proposed Salary (SAR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.proposed_salary}
                      onChange={(e) => setFormData({ ...formData, proposed_salary: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Minimum as per MOL requirements"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Education Level
                    </label>
                    <select
                      value={formData.education}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select</option>
                      <option value="high_school">High School</option>
                      <option value="diploma">Diploma</option>
                      <option value="bachelor">Bachelor's Degree</option>
                      <option value="master">Master's Degree</option>
                      <option value="phd">PhD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      value={formData.experience_years}
                      onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Years of experience"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visa Type
                    </label>
                    <select
                      value={formData.visa_type}
                      onChange={(e) => setFormData({ ...formData, visa_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="employment">Employment Visa</option>
                      <option value="business">Business Visa</option>
                      <option value="dependent">Dependent Visa</option>
                      <option value="visit">Visit Visa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Arrival Date
                    </label>
                    <input
                      type="date"
                      value={formData.expected_arrival_date}
                      onChange={(e) => setFormData({ ...formData, expected_arrival_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsor Name
                    </label>
                    <input
                      type="text"
                      value={formData.sponsor_name}
                      onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={currentCompany?.company_name_en || 'Company name'}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold text-blue-900">MOL & Quota Information</h3>
                        <p className="text-sm text-blue-800 mt-1">
                          Ensure the profession code matches MOL requirements and check available quota before submission.
                          Visa processing typically takes 3-5 business days after MOL approval.
                        </p>
                        <p className="text-sm text-blue-800 mt-2">
                          <strong>Available Quota:</strong> {availableQuota} positions
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Visa Request'}
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
