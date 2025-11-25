import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { ContractUpload } from '@/components/ContractUpload';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Sparkles,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Upload,
  Users,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeContract {
  id: string;
  employee_id: string;
  contract_number: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  salary: number;
  currency: string;
  position: string;
  department: string | null;
  extraction_status: string;
  extraction_confidence: number;
  is_active: boolean;
  created_at: string;
  employee: {
    first_name_en: string;
    last_name_en: string;
    employee_number: string;
  };
}

export function EmployeeContracts() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<EmployeeContract[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  useEffect(() => {
    applyFilters();
  }, [contracts, searchTerm, filterStatus]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const [contractsRes, employeesRes] = await Promise.all([
      supabase
        .from('employee_contracts')
        .select(`
          *,
          employee:employees(first_name_en, last_name_en, employee_number)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('employees')
        .select('id, first_name_en, last_name_en, employee_number')
        .eq('company_id', currentCompany.id)
        .order('first_name_en')
    ]);

    if (contractsRes.data) {
      setContracts(contractsRes.data);
    }

    if (employeesRes.data) {
      setEmployees(employeesRes.data);
    }

    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...contracts];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contract =>
        contract.contract_number.toLowerCase().includes(term) ||
        contract.employee?.first_name_en?.toLowerCase().includes(term) ||
        contract.employee?.last_name_en?.toLowerCase().includes(term) ||
        contract.position.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(contract => contract.extraction_status === filterStatus);
    }

    setFilteredContracts(filtered);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Completed' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, label: 'Processing' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle, label: 'Pending' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Failed' }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const stats = {
    total: contracts.length,
    completed: contracts.filter(c => c.extraction_status === 'completed').length,
    pending: contracts.filter(c => c.extraction_status === 'pending').length,
    avgConfidence: contracts.length > 0
      ? contracts.reduce((sum, c) => sum + c.extraction_confidence, 0) / contracts.length
      : 0
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-400 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white shadow-lg">
              <FileText className="h-7 w-7" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Employee Contracts
            </h1>
            <p className="text-gray-600 mt-1">AI-powered contract management and extraction</p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-200 hover:shadow-xl hover:scale-105"
        >
          <Sparkles className="h-5 w-5" />
          <span>Upload Contract</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contracts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Extracted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgConfidence.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contracts..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contract #</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Position</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Salary</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Start Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Confidence</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">{contract.contract_number}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {contract.employee?.first_name_en} {contract.employee?.last_name_en}
                      </p>
                      <p className="text-sm text-gray-600">{contract.employee?.employee_number}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-900">{contract.position}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">
                      {contract.salary.toLocaleString()} {contract.currency}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-900">{format(new Date(contract.start_date), 'MMM dd, yyyy')}</span>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(contract.extraction_status)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                          style={{ width: `${contract.extraction_confidence}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {contract.extraction_confidence.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      className="p-2 hover:bg-primary-50 rounded-lg transition-colors group"
                      title="View Contract"
                    >
                      <Eye className="h-5 w-5 text-gray-600 group-hover:text-primary-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredContracts.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">No contracts found</p>
              <p className="text-sm text-gray-500 mt-2">Upload your first contract to get started</p>
            </div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Upload Employee Contract</h2>
              <p className="text-gray-600 mt-1">Select an employee and upload their contract PDF</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name_en} {emp.last_name_en} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployeeId && (
                <ContractUpload
                  employeeId={selectedEmployeeId}
                  companyId={currentCompany!.id}
                  onSuccess={() => {
                    setShowUploadModal(false);
                    setSelectedEmployeeId('');
                    fetchData();
                  }}
                  onCancel={() => {
                    setShowUploadModal(false);
                    setSelectedEmployeeId('');
                  }}
                />
              )}

              {!selectedEmployeeId && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p>Please select an employee to continue</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
