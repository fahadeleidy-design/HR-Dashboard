import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import {
  Plane, Plus, Eye, Edit, AlertTriangle, CheckCircle, Clock,
  XCircle, Search, Filter, Download, RefreshCw, MapPin, Calendar,
  DollarSign, FileText, User, CheckSquare, XSquare
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface TravelRequest {
  id: string;
  request_number: string;
  employee_id: string;
  destination: string;
  destination_country: string;
  purpose: string;
  departure_date: string;
  return_date: string;
  duration_days: number;
  estimated_cost: number;
  per_diem_rate: number | null;
  per_diem_total: number | null;
  requires_exit_reentry: boolean;
  exit_reentry_obtained: boolean;
  visa_required: boolean;
  visa_obtained: boolean;
  project_code: string | null;
  cost_center: string | null;
  manager_approval: string;
  manager_approved_at: string | null;
  hr_approval: string;
  hr_approved_at: string | null;
  finance_approval: string;
  finance_approved_at: string | null;
  status: string;
  settlement_status: string | null;
  actual_cost: number | null;
  notes: string | null;
  created_at: string;
  employees?: { first_name_en: string; last_name_en: string; employee_number: string };
}

interface PerDiemRate {
  id: string;
  destination_country: string;
  destination_city: string | null;
  daily_rate_sar: number;
  accommodation_rate_sar: number | null;
  effective_from: string;
  effective_to: string | null;
}

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  is_saudi: boolean;
}

export function Travel() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'completed' | 'all'>('pending');

  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);
  const [perDiemRates, setPerDiemRates] = useState<PerDiemRate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    destination: '',
    destination_country: '',
    destination_city: '',
    purpose: '',
    travel_type: 'business',
    departure_date: '',
    return_date: '',
    estimated_cost: '',
    per_diem_rate: '',
    accommodation_needed: true,
    transportation_method: 'flight',
    requires_exit_reentry: false,
    visa_required: false,
    booking_status: 'not_booked',
    flight_details: '',
    hotel_details: '',
    rental_car_needed: false,
    rental_car_details: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_coverage: '',
    project_code: '',
    cost_center: '',
    advance_amount: '',
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

    const [requestsRes, ratesRes, employeesRes] = await Promise.all([
      supabase
        .from('business_travel')
        .select('*, employees(first_name_en, last_name_en, employee_number)')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('travel_per_diem_rates')
        .select('*')
        .order('destination_country', { ascending: true }),

      supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en, is_saudi')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('first_name_en', { ascending: true })
    ]);

    setTravelRequests(requestsRes.data || []);
    setPerDiemRates(ratesRes.data || []);
    setEmployees(employeesRes.data || []);
    setLoading(false);
  };

  const getApprovalStatus = (managerApproval: string, hrApproval: string, financeApproval: string) => {
    if (managerApproval === 'rejected' || hrApproval === 'rejected' || financeApproval === 'rejected') {
      return 'rejected';
    }
    if (managerApproval === 'approved' && hrApproval === 'approved' && financeApproval === 'approved') {
      return 'approved';
    }
    return 'pending';
  };

  const getStatusBadge = (request: TravelRequest) => {
    const approvalStatus = getApprovalStatus(request.manager_approval, request.hr_approval, request.finance_approval);

    if (approvalStatus === 'rejected') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Rejected</span>;
    }
    if (request.status === 'completed') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Completed</span>;
    }
    if (request.status === 'cancelled') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Cancelled</span>;
    }
    if (approvalStatus === 'approved') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Approved</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending Approval</span>;
  };

  const getApprovalIcon = (approval: string) => {
    if (approval === 'approved') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (approval === 'rejected') {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setSubmitting(true);

    try {
      const selectedEmployee = employees.find(emp => emp.id === formData.employee_id);
      const departureDate = new Date(formData.departure_date);
      const returnDate = new Date(formData.return_date);
      const durationDays = differenceInDays(returnDate, departureDate) + 1;

      const perDiemRate = formData.per_diem_rate ? parseFloat(formData.per_diem_rate) : null;
      const perDiemTotal = perDiemRate ? perDiemRate * durationDays : null;

      const requestNumber = `TR-${Date.now().toString().slice(-8)}`;

      const { error } = await supabase.from('business_travel').insert({
        company_id: currentCompany.id,
        request_number: requestNumber,
        employee_id: formData.employee_id,
        trip_purpose: formData.purpose,
        destination_city: formData.destination_city || formData.destination,
        destination_country: formData.destination_country,
        departure_date: formData.departure_date,
        return_date: formData.return_date,
        travel_days: durationDays,
        travel_type: formData.destination_country.toLowerCase() === 'saudi arabia' ? 'domestic' : 'international',
        transportation_method: formData.transportation_method,
        accommodation_needed: formData.accommodation_needed,
        estimated_cost: parseFloat(formData.estimated_cost) || 0,
        advance_amount: formData.advance_amount ? parseFloat(formData.advance_amount) : null,
        advance_paid: false,
        per_diem_rate: perDiemRate,
        total_per_diem: perDiemTotal,
        exit_reentry_required: selectedEmployee?.is_saudi ? false : formData.requires_exit_reentry,
        exit_reentry_obtained: false,
        visa_required: formData.visa_required,
        visa_status: formData.visa_required ? 'pending' : null,
        booking_status: formData.booking_status,
        flight_details: formData.flight_details || null,
        hotel_details: formData.hotel_details || null,
        rental_car_details: formData.rental_car_details || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        insurance_coverage: formData.insurance_coverage || null,
        project_code: formData.project_code || null,
        cost_center: formData.cost_center || null,
        approval_status: 'pending',
        manager_approval_id: null,
        hr_approval_id: null,
        finance_approval_id: null,
        receipts_submitted: false,
        settlement_status: 'pending',
        notes: formData.notes || null,
      });

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        employee_id: '',
        destination: '',
        destination_country: '',
        destination_city: '',
        purpose: '',
        travel_type: 'business',
        departure_date: '',
        return_date: '',
        estimated_cost: '',
        per_diem_rate: '',
        accommodation_needed: true,
        transportation_method: 'flight',
        requires_exit_reentry: false,
        visa_required: false,
        booking_status: 'not_booked',
        flight_details: '',
        hotel_details: '',
        rental_car_needed: false,
        rental_car_details: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        insurance_coverage: '',
        project_code: '',
        cost_center: '',
        advance_amount: '',
        notes: '',
      });

      await fetchData();
    } catch (error) {
      console.error('Error creating travel request:', error);
      alert('Failed to create travel request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filterRequests = () => {
    let filtered = travelRequests;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.employees &&
          `${r.employees.first_name_en} ${r.employees.last_name_en}`.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    switch (activeTab) {
      case 'pending':
        return filtered.filter(r => {
          const approvalStatus = getApprovalStatus(r.manager_approval, r.hr_approval, r.finance_approval);
          return approvalStatus === 'pending' && r.status !== 'completed' && r.status !== 'cancelled';
        });
      case 'approved':
        return filtered.filter(r => {
          const approvalStatus = getApprovalStatus(r.manager_approval, r.hr_approval, r.finance_approval);
          return approvalStatus === 'approved' && r.status !== 'completed';
        });
      case 'completed':
        return filtered.filter(r => r.status === 'completed');
      case 'all':
      default:
        return filtered;
    }
  };

  const filteredRequests = filterRequests();

  const pendingRequests = travelRequests.filter(r => {
    const approvalStatus = getApprovalStatus(r.manager_approval, r.hr_approval, r.finance_approval);
    return approvalStatus === 'pending' && r.status !== 'completed' && r.status !== 'cancelled';
  }).length;

  const approvedRequests = travelRequests.filter(r => {
    const approvalStatus = getApprovalStatus(r.manager_approval, r.hr_approval, r.finance_approval);
    return approvalStatus === 'approved' && r.status !== 'completed';
  }).length;

  const completedRequests = travelRequests.filter(r => r.status === 'completed').length;

  const totalEstimatedCost = travelRequests
    .filter(r => r.status === 'approved' || r.status === 'completed')
    .reduce((sum, r) => sum + r.estimated_cost, 0);

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
          <h1 className="text-3xl font-bold text-gray-900">{t.travel.title}</h1>
          <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.travel.subtitle}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          <span>{t.travel.newRequest}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.travel.pendingApproval}</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{formatNumber(pendingRequests, language)}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.travel.approvedTrips}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(approvedRequests, language)}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.completed}</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{formatNumber(completedRequests, language)}</p>
            </div>
            <CheckSquare className="h-12 w-12 text-gray-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.travel.totalBudget}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(totalEstimatedCost, language)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Exit-Reentry Permit Reminder</h3>
            <p className="text-sm text-blue-800 mt-1">
              Non-Saudi employees traveling internationally require exit-reentry permits. Ensure permits are obtained before departure to avoid travel complications.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex justify-between items-center p-4">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'pending'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending Approval ({pendingRequests})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'approved'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved ({approvedRequests})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'completed'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Completed ({completedRequests})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({travelRequests.length})
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
                  placeholder={t.travel.searchPlaceholder}
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
                <option value="all">{t.common.all} {t.common.statuses}</option>
                <option value="draft">{t.travel.draft}</option>
                <option value="submitted">{t.travel.submitted}</option>
                <option value="approved">{t.common.approved}</option>
                <option value="completed">{t.common.completed}</option>
                <option value="cancelled">{t.travel.cancelled}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Travel Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approvals</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <Plane className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg font-medium">No travel requests found</p>
                    <p className="text-sm mt-1">Create your first travel request to get started</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Plane className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">{request.request_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {request.employees
                          ? `${request.employees.first_name_en} ${request.employees.last_name_en}`
                          : 'N/A'}
                      </div>
                      {request.employees && (
                        <div className="text-xs text-gray-500">#{request.employees.employee_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900 font-medium">{request.destination}</div>
                          <div className="text-xs text-gray-500">{request.destination_country}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(request.departure_date), 'dd MMM yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {format(new Date(request.return_date), 'dd MMM yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.duration_days} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.estimated_cost.toLocaleString()} SAR
                      </div>
                      {request.per_diem_total && (
                        <div className="text-xs text-gray-500">
                          Per diem: {request.per_diem_total.toLocaleString()} SAR
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <div title="Manager Approval">
                          {getApprovalIcon(request.manager_approval)}
                        </div>
                        <div title="HR Approval">
                          {getApprovalIcon(request.hr_approval)}
                        </div>
                        <div title="Finance Approval">
                          {getApprovalIcon(request.finance_approval)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        M / HR / F
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request)}
                      {request.requires_exit_reentry && (
                        <div className="flex items-center text-xs mt-1">
                          {request.exit_reentry_obtained ? (
                            <span className="text-green-600 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Exit permit
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Exit permit req.
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
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
      </div>

      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.request_number}</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedRequest.employees
                      ? `${selectedRequest.employees.first_name_en} ${selectedRequest.employees.last_name_en}`
                      : 'N/A'}
                  </p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <p className="text-gray-900 font-semibold">{selectedRequest.destination}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.destination_country}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <p className="text-gray-900">{selectedRequest.purpose}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
                  <p className="text-gray-900">{format(new Date(selectedRequest.departure_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                  <p className="text-gray-900">{format(new Date(selectedRequest.return_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <p className="text-gray-900">{selectedRequest.duration_days} days</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p>{getStatusBadge(selectedRequest)}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedRequest.estimated_cost.toLocaleString()} SAR
                    </p>
                  </div>
                  {selectedRequest.actual_cost && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cost</label>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedRequest.actual_cost.toLocaleString()} SAR
                      </p>
                    </div>
                  )}
                  {selectedRequest.per_diem_rate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Per Diem Rate</label>
                      <p className="text-gray-900">{selectedRequest.per_diem_rate.toLocaleString()} SAR/day</p>
                    </div>
                  )}
                  {selectedRequest.per_diem_total && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Per Diem</label>
                      <p className="text-gray-900">{selectedRequest.per_diem_total.toLocaleString()} SAR</p>
                    </div>
                  )}
                </div>
              </div>

              {(selectedRequest.project_code || selectedRequest.cost_center) && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocation</h3>
                  <div className="grid grid-cols-2 gap-6">
                    {selectedRequest.project_code && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                        <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded">
                          {selectedRequest.project_code}
                        </p>
                      </div>
                    )}
                    {selectedRequest.cost_center && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost Center</label>
                        <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded">
                          {selectedRequest.cost_center}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Workflow</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getApprovalIcon(selectedRequest.manager_approval)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">Manager Approval</p>
                        {selectedRequest.manager_approved_at && (
                          <p className="text-xs text-gray-500">
                            {format(new Date(selectedRequest.manager_approved_at), 'dd MMM yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      selectedRequest.manager_approval === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedRequest.manager_approval === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedRequest.manager_approval}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getApprovalIcon(selectedRequest.hr_approval)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">HR Approval</p>
                        {selectedRequest.hr_approved_at && (
                          <p className="text-xs text-gray-500">
                            {format(new Date(selectedRequest.hr_approved_at), 'dd MMM yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      selectedRequest.hr_approval === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedRequest.hr_approval === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedRequest.hr_approval}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getApprovalIcon(selectedRequest.finance_approval)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">Finance Approval</p>
                        {selectedRequest.finance_approved_at && (
                          <p className="text-xs text-gray-500">
                            {format(new Date(selectedRequest.finance_approved_at), 'dd MMM yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      selectedRequest.finance_approval === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedRequest.finance_approval === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedRequest.finance_approval}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Requirements</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {selectedRequest.requires_exit_reentry ? (
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-900">Exit-Reentry Permit Required</span>
                    </div>
                    {selectedRequest.requires_exit_reentry && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedRequest.exit_reentry_obtained
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedRequest.exit_reentry_obtained ? 'Obtained' : 'Pending'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {selectedRequest.visa_required ? (
                        <FileText className="h-5 w-5 text-blue-600" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-900">Visa Required</span>
                    </div>
                    {selectedRequest.visa_required && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedRequest.visa_obtained
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedRequest.visa_obtained ? 'Obtained' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedRequest.settlement_status && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900">
                      Settlement Status: <span className="capitalize">{selectedRequest.settlement_status}</span>
                    </p>
                  </div>
                </div>
              )}

              {selectedRequest.notes && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedRequest.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Created: {format(new Date(selectedRequest.created_at), 'dd MMM yyyy HH:mm')}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                    Edit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t.travel.newRequestTitle}</h2>
                  <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.travel.newRequestDescription}</p>
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
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Dubai, London"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.destination_country}
                    onChange={(e) => setFormData({ ...formData, destination_country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., United Arab Emirates"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Purpose of travel..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.departure_date}
                    onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.return_date}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Cost (SAR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Per Diem Rate (SAR/day)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.per_diem_rate}
                    onChange={(e) => setFormData({ ...formData, per_diem_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Code
                  </label>
                  <input
                    type="text"
                    value={formData.project_code}
                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost Center
                  </label>
                  <input
                    type="text"
                    value={formData.cost_center}
                    onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Details</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transportation Method
                  </label>
                  <select
                    value={formData.transportation_method}
                    onChange={(e) => setFormData({ ...formData, transportation_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="flight">Flight</option>
                    <option value="car">Car</option>
                    <option value="train">Train</option>
                    <option value="bus">Bus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Status
                  </label>
                  <select
                    value={formData.booking_status}
                    onChange={(e) => setFormData({ ...formData, booking_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="not_booked">Not Booked</option>
                    <option value="booked">Booked</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flight Details
                  </label>
                  <input
                    type="text"
                    value={formData.flight_details}
                    onChange={(e) => setFormData({ ...formData, flight_details: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Flight number, airline, departure time..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.accommodation_needed}
                      onChange={(e) => setFormData({ ...formData, accommodation_needed: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Accommodation Needed</span>
                  </label>

                  {formData.accommodation_needed && (
                    <input
                      type="text"
                      value={formData.hotel_details}
                      onChange={(e) => setFormData({ ...formData, hotel_details: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Hotel name, address, booking reference..."
                    />
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.rental_car_needed}
                      onChange={(e) => setFormData({ ...formData, rental_car_needed: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Rental Car Needed</span>
                  </label>

                  {formData.rental_car_needed && (
                    <input
                      type="text"
                      value={formData.rental_car_details}
                      onChange={(e) => setFormData({ ...formData, rental_car_details: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Rental company, car type, pickup location..."
                    />
                  )}
                </div>

                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial & Emergency Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advance Payment (SAR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.advance_amount}
                    onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Amount to be paid in advance</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Travel Insurance
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_coverage}
                    onChange={(e) => setFormData({ ...formData, insurance_coverage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Insurance policy number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+966 5X XXX XXXX"
                  />
                </div>

                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance & Permissions</h3>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-start space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requires_exit_reentry}
                        onChange={(e) => setFormData({ ...formData, requires_exit_reentry: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Requires Exit-Reentry Permit (Expats)</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.visa_required}
                        onChange={(e) => setFormData({ ...formData, visa_required: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Destination Visa Required</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Exit-reentry permits required for expat employees leaving Saudi Arabia
                  </p>
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
                    {submitting ? 'Creating...' : 'Create Travel Request'}
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
