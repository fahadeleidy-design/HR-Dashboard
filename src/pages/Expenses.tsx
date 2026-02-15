import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Receipt, Plus, Download, FileText, BarChart3, Settings,
  Clock, CheckCircle, XCircle, AlertTriangle, DollarSign,
  Eye, Edit, Trash2, Filter, Upload, Paperclip
} from 'lucide-react';
import { ScrollableTable } from '@/components/ScrollableTable';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import { ExpenseDashboard } from '@/components/expenses/ExpenseDashboard';
import { ExpenseReports } from '@/components/expenses/ExpenseReports';
import { ExpenseAnalytics } from '@/components/expenses/ExpenseAnalytics';
import { ExpenseSettings } from '@/components/expenses/ExpenseSettings';
import * as XLSX from 'xlsx';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface ExpenseClaim {
  id: string;
  claim_number: string;
  employee_id: string;
  expense_category: string;
  subcategory: string;
  description: string;
  amount: number;
  amount_in_sar: number;
  vat_amount: number;
  currency: string;
  expense_date: string;
  approval_status: string;
  policy_compliant: boolean;
  receipt_attached: boolean;
  employee: {
    first_name_en: string;
    last_name_en: string;
    employee_number: string;
  };
}

type TabType = 'dashboard' | 'claims' | 'reports' | 'analytics' | 'settings';
type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const EXPENSE_CATEGORIES = {
  'Travel': ['Flight', 'Train', 'Bus', 'Taxi', 'Parking', 'Toll Fees', 'Other'],
  'Meals': ['Breakfast', 'Lunch', 'Dinner', 'Team Meal', 'Client Entertainment', 'Other'],
  'Fuel': ['Petrol', 'Diesel', 'Vehicle Maintenance', 'Car Wash', 'Other'],
  'Accommodation': ['Hotel', 'Serviced Apartment', 'Guest House', 'Other'],
  'Office Supplies': ['Stationery', 'Printing', 'Equipment', 'Furniture', 'Other'],
  'Communication': ['Mobile', 'Internet', 'Postage', 'Courier', 'Other'],
  'IT & Software': ['Software License', 'Cloud Services', 'Hardware', 'Other'],
  'Other': ['Miscellaneous']
};

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];
const VAT_RATE = 15;

export function Expenses() {
  const { currentCompany } = useCompany();
  const { t, isRTL } = useLanguage();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const { logError, logActivity } = useErrorHandler();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    employee_id: userRole?.employee_id || '',
    expense_category: '',
    subcategory: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    currency: 'SAR',
    payment_method: 'personal_card',
  });

  useEffect(() => {
    if (currentCompany) {
      fetchClaims();
      fetchEmployees();
      subscribeToChanges();
    }
  }, [currentCompany, dateFilter]);

  useEffect(() => {
    if (userRole?.employee_id) {
      setFormData(prev => ({ ...prev, employee_id: userRole.employee_id || '' }));
    }
  }, [userRole]);

  const fetchClaims = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expense_claims')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .gte('expense_date', dateFilter.start)
        .lte('expense_date', dateFilter.end)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Expenses', action: 'fetchClaims' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('first_name_en', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'Expenses', action: 'fetchEmployees' });
    }
  };

  const subscribeToChanges = () => {
    if (!currentCompany) return;

    const channel = supabase
      .channel('expense-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_claims',
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => {
          fetchClaims();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expense_claims')
        .update({
          approval_status: 'approved',
          approved_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id);

      if (error) throw error;
      showToast({ type: 'success', title: 'Expense claim approved successfully' });
      logActivity('info', 'expenses', 'approveClaim', `Approved expense claim ${id}`);
      fetchClaims();
    } catch (error) {
      logError(error, 'medium', { component: 'Expenses', action: 'handleApprove' });
      showToast({ type: 'error', title: 'Failed to approve claim', message: error instanceof Error ? error.message : 'An unexpected error occurred' });
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('expense_claims')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
          approved_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id);

      if (error) throw error;
      showToast({ type: 'success', title: 'Expense claim rejected' });
      logActivity('info', 'expenses', 'rejectClaim', `Rejected expense claim ${id}`);
      fetchClaims();
    } catch (error) {
      logError(error, 'medium', { component: 'Expenses', action: 'handleReject' });
      showToast({ type: 'error', title: 'Failed to reject claim', message: error instanceof Error ? error.message : 'An unexpected error occurred' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase
        .from('expense_claims')
        .delete()
        .eq('id', deleteConfirm);

      if (error) throw error;
      showToast({ type: 'success', title: 'Expense claim deleted successfully' });
      logActivity('info', 'expenses', 'deleteClaim', `Deleted expense claim ${deleteConfirm}`);
      fetchClaims();
    } catch (error) {
      logError(error, 'medium', { component: 'Expenses', action: 'handleDeleteConfirm' });
      showToast({ type: 'error', title: 'Failed to delete claim', message: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleCloseModal = () => {
    setShowNewClaimModal(false);
    setInvoiceFile(null);
    setFormData({
      employee_id: userRole?.employee_id || '',
      expense_category: '',
      subcategory: '',
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      currency: 'SAR',
      payment_method: 'personal_card',
    });
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    if (!invoiceFile) {
      showToast({ type: 'warning', title: t.expenses.pleaseUploadReceipt });
      return;
    }

    setSubmitting(true);
    try {
      const amount = parseFloat(formData.amount);
      const vatAmount = amount * (VAT_RATE / 100);
      const totalAmount = amount + vatAmount;
      const claimNumber = `EXP-${Date.now().toString().slice(-8)}`;

      const { data: claimData, error: claimError } = await supabase.from('expense_claims').insert({
        company_id: currentCompany.id,
        claim_number: claimNumber,
        employee_id: formData.employee_id,
        expense_category: formData.expense_category,
        subcategory: formData.subcategory || null,
        description: formData.description,
        expense_date: formData.expense_date,
        claim_date: new Date().toISOString().split('T')[0],
        amount: totalAmount,
        amount_excluding_vat: amount,
        vat_amount: vatAmount,
        vat_rate: VAT_RATE,
        currency: formData.currency,
        exchange_rate: formData.currency === 'SAR' ? 1 : 1,
        amount_in_sar: totalAmount,
        payment_method: formData.payment_method,
        approval_status: 'pending',
        policy_compliant: true,
        receipt_attached: true,
        net_reimbursement: totalAmount,
      }).select().single();

      if (claimError) throw claimError;

      const fileExt = invoiceFile.name.split('.').pop();
      const fileName = `${currentCompany.id}/${claimData.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, invoiceFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: receiptError } = await supabase.from('expense_receipts').insert({
        company_id: currentCompany.id,
        expense_claim_id: claimData.id,
        file_name: invoiceFile.name,
        file_url: publicUrl,
        file_type: invoiceFile.type,
        file_size: invoiceFile.size,
      });

      if (receiptError) throw receiptError;

      showToast({ type: 'success', title: 'Expense claim submitted successfully' });
      logActivity('info', 'expenses', 'submitClaim', `Submitted expense claim`);
      handleCloseModal();
      fetchClaims();
    } catch (error) {
      logError(error, 'medium', { component: 'Expenses', action: 'handleSubmitClaim' });
      showToast({ type: 'error', title: t.expenses.failedToCreate, message: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const exportData = filteredClaims.map((claim) => ({
      'Claim Number': claim.claim_number,
      'Employee': `${claim.employee.first_name_en} ${claim.employee.last_name_en}`,
      'Employee Number': claim.employee.employee_number,
      'Date': claim.expense_date,
      'Category': claim.expense_category,
      'Subcategory': claim.subcategory || '',
      'Description': claim.description,
      'Amount': claim.amount,
      'Currency': claim.currency,
      'Amount (SAR)': claim.amount_in_sar,
      'VAT': claim.vat_amount,
      'Status': claim.approval_status,
      'Policy Compliant': claim.policy_compliant ? 'Yes' : 'No',
      'Receipt': claim.receipt_attached ? 'Yes' : 'No',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expense Claims');
    XLSX.writeFile(wb, `expense_claims_${dateFilter.start}_${dateFilter.end}.xlsx`);
  };

  const filteredClaims = claims.filter(claim => {
    if (filter === 'all') return true;
    return claim.approval_status === filter;
  });

  const { sortedData, sortConfig, requestSort } = useSortableData(filteredClaims);
  const pagination = usePagination(sortedData, { initialPageSize: 25 });

  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.approval_status === 'pending').length,
    approved: claims.filter(c => c.approval_status === 'approved').length,
    rejected: claims.filter(c => c.approval_status === 'rejected').length,
    totalAmount: claims.reduce((sum, c) => sum + (c.amount_in_sar || 0), 0),
    violations: claims.filter(c => !c.policy_compliant).length,
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'claims', label: 'Claims', icon: Receipt, badge: stats.pending },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Expense Management</h1>
          <p className="text-gray-600 mt-1">Track, approve, and analyze company expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={claims.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowNewClaimModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Claim</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Claims</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Receipt className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Amount</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {stats.totalAmount.toLocaleString('en-SA', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500">SAR</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Violations</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.violations}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <ExpenseDashboard claims={claims} period="month" />
          )}

          {activeTab === 'claims' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <input
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {filteredClaims.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No Expense Claims"
                  description="Expense claims will appear here once they are submitted"
                />
              ) : (
                <>
                <ScrollableTable maxHeight="calc(100vh - 450px)">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <SortableTableHeader
                          label="Claim #"
                          sortKey="claim_number"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Employee"
                          sortKey="employee.first_name_en"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Date"
                          sortKey="expense_date"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Category"
                          sortKey="expense_category"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Amount (SAR)"
                          sortKey="amount_in_sar"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Status"
                          sortKey="approval_status"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compliance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pagination.paginatedData.map((claim) => (
                        <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {claim.claim_number || `#${claim.id.slice(0, 8)}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {claim.employee.first_name_en} {claim.employee.last_name_en}
                            </div>
                            <div className="text-sm text-gray-500">{claim.employee.employee_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(claim.expense_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{claim.expense_category}</div>
                            {claim.subcategory && (
                              <div className="text-xs text-gray-500">{claim.subcategory}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {(claim.amount_in_sar || 0).toLocaleString('en-SA', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(claim.approval_status)}`}>
                              {getStatusIcon(claim.approval_status)}
                              {claim.approval_status.charAt(0).toUpperCase() + claim.approval_status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {claim.policy_compliant ? (
                              <span className="text-green-600 text-sm flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Compliant
                              </span>
                            ) : (
                              <span className="text-red-600 text-sm flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" />
                                Violation
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedClaim(claim);
                                  setShowDetailsModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {claim.approval_status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(claim.id)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(claim.id, 'Rejected by manager')}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>

                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  startIndex={pagination.startIndex}
                  endIndex={pagination.endIndex}
                  pageSize={pagination.pageSize}
                  pageSizeOptions={pagination.pageSizeOptions}
                  onPageChange={pagination.setPage}
                  onPageSizeChange={pagination.setPageSize}
                  onNext={pagination.nextPage}
                  onPrev={pagination.prevPage}
                  onFirst={pagination.goToFirst}
                  onLast={pagination.goToLast}
                  isRTL={isRTL}
                />
                </>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <ExpenseReports claims={claims} />
          )}

          {activeTab === 'analytics' && (
            <ExpenseAnalytics claims={claims} />
          )}

          {activeTab === 'settings' && (
            <ExpenseSettings isAdmin={['super_admin', 'admin', 'finance'].includes(userRole?.role || '')} />
          )}
        </div>
      </div>

      {showNewClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-200">
              <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <h2 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{t.expenses.newExpenseClaim}</h2>
                  <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.expenses.submitExpenseDesc}</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitClaim}>
              <div className="p-6 max-h-[calc(100vh-240px)] overflow-y-auto space-y-4">
                {userRole?.role !== 'employee' && (
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.expenses.employee} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t.expenses.selectEmployee}</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employee_number} - {emp.first_name_en} {emp.last_name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.expenses.expenseCategory} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.expense_category}
                      onChange={(e) => setFormData({ ...formData, expense_category: e.target.value, subcategory: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t.expenses.selectCategory}</option>
                      {Object.keys(EXPENSE_CATEGORIES).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.expense_category && (
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t.expenses.subcategory} <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t.expenses.selectSubcategory}</option>
                        {EXPENSE_CATEGORIES[formData.expense_category as keyof typeof EXPENSE_CATEGORIES]?.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.expenses.description} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.expenses.descriptionPlaceholder}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.expenses.amountExclVat} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.amount && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t.expenses.vat} (15%): {(parseFloat(formData.amount) * 0.15).toFixed(2)} |
                        {t.expenses.total}: {(parseFloat(formData.amount) * 1.15).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.expenses.currency} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CURRENCIES.map((curr) => (
                        <option key={curr} value={curr}>
                          {curr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.expenses.date} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.expenses.paymentMethod} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="personal_card">{t.expenses.personalCreditCard}</option>
                    <option value="company_card">{t.expenses.companyCreditCard}</option>
                    <option value="cash">{t.expenses.cash}</option>
                    <option value="bank_transfer">{t.expenses.bankTransfer}</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.expenses.invoiceReceipt} <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                    <div className="space-y-1 text-center">
                      {invoiceFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <Paperclip className="h-8 w-8 text-green-500" />
                          <div className="text-sm text-gray-600">
                            <p className="font-medium">{invoiceFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {(invoiceFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInvoiceFile(null)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="invoice-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>{t.expenses.uploadFile}</span>
                              <input
                                id="invoice-upload"
                                name="invoice-upload"
                                type="file"
                                required
                                className="sr-only"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 10485760) {
                                      showToast({ type: 'warning', title: t.expenses.fileSizeError });
                                      e.target.value = '';
                                      return;
                                    }
                                    setInvoiceFile(file);
                                  }
                                }}
                              />
                            </label>
                            <p className={`${isRTL ? 'pr-1' : 'pl-1'}`}>{t.expenses.orDragDrop}</p>
                          </div>
                          <p className="text-xs text-gray-500">{t.expenses.fileTypesExpense}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-6 border-t border-gray-200 flex justify-end gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  {t.expenses.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? t.expenses.submitting : t.expenses.submitClaim}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirm !== null}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Claim"
        message="Are you sure you want to delete this expense claim? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
