import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Plus, DollarSign, TrendingDown, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { SearchableSelect } from '@/components/SearchableSelect';

interface Loan {
  id: string;
  employee_id: string;
  loan_type: string;
  loan_amount: number;
  remaining_amount: number;
  monthly_installment: number;
  number_of_installments: number;
  start_date: string;
  end_date?: string;
  status: string;
  notes?: string;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
  };
}

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
}

interface LoanEligibility {
  employee_id: string;
  max_loan_amount: number;
  outstanding_loans: number;
  available_loan_amount: number;
  is_eligible: boolean;
}

export function Loans() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { userRole } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loanEligibility, setLoanEligibility] = useState<LoanEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    loan_type: 'personal',
    loan_amount: 0,
    number_of_installments: 6,
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const { sortedData, sortConfig, requestSort } = useSortableData(loans);

  useEffect(() => {
    if (currentCompany) {
      fetchLoans();
      fetchEmployees();
    }
  }, [currentCompany]);

  useEffect(() => {
    if (formData.employee_id) {
      fetchLoanEligibility(formData.employee_id);
    } else {
      setLoanEligibility(null);
    }
  }, [formData.employee_id]);

  const fetchLoans = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!currentCompany) return;

    if (userRole?.role === 'employee' && userRole.employee_id) {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en')
        .eq('id', userRole.employee_id)
        .single();

      if (!error && data) {
        setEmployees([data]);
        setFormData(prev => ({ ...prev, employee_id: data.id }));
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('employee_number');

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      setEmployees(data || []);
    } catch (error: any) {
      console.error('Exception fetching employees:', error);
    }
  };

  const fetchLoanEligibility = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('loan_eligibility')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching loan eligibility:', error);
        return;
      }

      setLoanEligibility(data);
    } catch (error: any) {
      console.error('Exception fetching loan eligibility:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    if (!formData.employee_id) {
      alert('Please select an employee');
      return;
    }

    if (formData.number_of_installments > 6 || formData.number_of_installments < 1) {
      alert('Number of installments must be between 1 and 6 months');
      return;
    }

    if (loanEligibility && formData.loan_amount > loanEligibility.available_loan_amount) {
      alert(`Loan amount (${formatCurrency(formData.loan_amount, language)}) exceeds available loan amount (${formatCurrency(loanEligibility.available_loan_amount, language)})`);
      return;
    }

    try {
      const loanData = {
        company_id: currentCompany.id,
        employee_id: formData.employee_id,
        loan_type: formData.loan_type.toLowerCase(),
        loan_amount: formData.loan_amount,
        number_of_installments: formData.number_of_installments,
        start_date: formData.start_date,
        status: 'pending',
        notes: formData.notes
      };

      if (editingLoan) {
        const { error } = await supabase
          .from('loans')
          .update(loanData)
          .eq('id', editingLoan.id);

        if (error) throw error;
        alert('Loan updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('loans')
          .insert([loanData])
          .select();

        if (error) {
          throw error;
        }
        alert('Loan request created successfully!');
      }

      resetForm();
      fetchLoans();
    } catch (error: any) {
      console.error('Error saving loan:', error);
      alert('Failed to save loan: ' + error.message);
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      employee_id: loan.employee_id,
      loan_type: loan.loan_type,
      loan_amount: loan.loan_amount,
      number_of_installments: loan.number_of_installments || 6,
      start_date: loan.start_date,
      notes: loan.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) return;

    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Loan deleted successfully!');
      fetchLoans();
    } catch (error: any) {
      console.error('Error deleting loan:', error);
      alert('Failed to delete loan: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      alert(`Loan status updated to ${status}!`);
      fetchLoans();
    } catch (error: any) {
      console.error('Error updating loan status:', error);
      alert('Failed to update loan status: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      loan_type: 'personal',
      loan_amount: 0,
      number_of_installments: 6,
      start_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingLoan(null);
    setLoanEligibility(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalLoans = loans.reduce((sum, loan) => sum + Number(loan.loan_amount || 0), 0);
  const totalRemaining = loans.reduce((sum, loan) => sum + Number(loan.remaining_amount || 0), 0);
  const activeLoans = loans.filter(l => l.status === 'active').length;

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
          <h1 className="text-3xl font-bold text-gray-900">{t.loans.title}</h1>
          <p className="text-gray-600 mt-1">{t.loans.subtitle}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>{t.loans.newLoan}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.loans.totalLoans}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalLoans, language)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.loans.totalRemaining}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalRemaining, language)}
              </p>
            </div>
            <TrendingDown className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.loans.activeLoans}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(activeLoans, language)}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label={t.common.employee}
                  sortKey="employee.first_name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.loans.loanType}
                  sortKey="loan_type"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.loans.loanAmount}
                  sortKey="loan_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.loans.remaining}
                  sortKey="remaining_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.loans.monthlyInstallment}
                  sortKey="monthly_installment"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>
                  {t.loans.progress}
                </th>
                <SortableTableHeader
                  label={t.common.status}
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No loans found. Click "New Loan" to create one.
                  </td>
                </tr>
              ) : (
                sortedData.map((loan) => {
                  const progress = ((loan.loan_amount - loan.remaining_amount) / loan.loan_amount) * 100;
                  return (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {loan.employee.first_name_en} {loan.employee.last_name_en}
                        </div>
                        <div className="text-sm text-gray-500">{loan.employee.employee_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {loan.loan_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {Number(loan.loan_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        SAR {Number(loan.remaining_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          SAR {Number(loan.monthly_installment || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {loan.number_of_installments} months
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% paid</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                          {loan.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          {userRole?.role && ['hr', 'finance', 'super_admin'].includes(userRole.role) && (
                            <>
                              <button
                                onClick={() => handleEdit(loan)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {loan.status === 'active' && (
                                <button
                                  onClick={() => handleStatusChange(loan.id, 'completed')}
                                  className="text-green-600 hover:text-green-800"
                                  title="Mark as Completed"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {loan.status === 'pending' && (
                                <button
                                  onClick={() => handleStatusChange(loan.id, 'cancelled')}
                                  className="text-red-600 hover:text-red-800"
                                  title="Cancel"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                          {userRole?.role === 'super_admin' && (
                            <button
                              onClick={() => handleDelete(loan.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          {!userRole?.role || userRole.role === 'employee' ? (
                            <span className="text-xs text-gray-400 italic">View only</span>
                          ) : null}
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingLoan ? 'Edit Loan' : 'New Loan'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Loan Policy</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Maximum loan: 50% of End of Service benefits</li>
                  <li>• Maximum repayment period: 6 months</li>
                  <li>• Equal monthly installments</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                {employees.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-md text-sm text-yellow-800">
                    Loading employees...
                  </div>
                ) : userRole?.role === 'employee' ? (
                  <div>
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-sm text-gray-700">
                      {employees[0] && `${employees[0].employee_number} - ${employees[0].first_name_en} ${employees[0].last_name_en}`}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">You can only create loan requests for yourself</p>
                  </div>
                ) : (
                  <SearchableSelect
                    options={[
                      { value: '', label: 'Select Employee' },
                      ...employees.map(emp => ({
                        value: emp.id,
                        label: `${emp.employee_number} - ${emp.first_name_en} ${emp.last_name_en}`,
                        searchText: `${emp.employee_number} ${emp.first_name_en} ${emp.last_name_en}`
                      }))
                    ]}
                    value={formData.employee_id}
                    onChange={(value) => setFormData({ ...formData, employee_id: value })}
                    placeholder={t.employees.selectEmployee}
                  />
                )}
              </div>

              {loanEligibility && (
                <div className={`border rounded-lg p-4 ${
                  loanEligibility.is_eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    loanEligibility.is_eligible ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Loan Eligibility
                  </h3>
                  <div className={`text-sm space-y-1 ${
                    loanEligibility.is_eligible ? 'text-green-800' : 'text-red-800'
                  }`}>
                    <p>Max Loan Amount: {formatCurrency(loanEligibility.max_loan_amount, language)}</p>
                    <p>Outstanding Loans: {formatCurrency(loanEligibility.outstanding_loans, language)}</p>
                    <p className="font-semibold">Available: {formatCurrency(loanEligibility.available_loan_amount, language)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Type *
                  </label>
                  <select
                    value={formData.loan_type}
                    onChange={(e) => setFormData({ ...formData, loan_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="personal">Personal</option>
                    <option value="housing">Housing</option>
                    <option value="emergency">Emergency</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Amount (SAR) *
                  </label>
                  <input
                    type="number"
                    value={formData.loan_amount}
                    onChange={(e) => setFormData({ ...formData, loan_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    min="0"
                    step="0.01"
                    max={loanEligibility?.available_loan_amount || undefined}
                  />
                  {loanEligibility && formData.loan_amount > loanEligibility.available_loan_amount && (
                    <p className="text-xs text-red-600 mt-1">
                      Exceeds available amount
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Installments *
                  </label>
                  <select
                    value={formData.number_of_installments}
                    onChange={(e) => setFormData({ ...formData, number_of_installments: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value={1}>1 month</option>
                    <option value={2}>2 months</option>
                    <option value={3}>3 months</option>
                    <option value={4}>4 months</option>
                    <option value={5}>5 months</option>
                    <option value={6}>6 months</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Maximum 6 months</p>
                </div>
              </div>

              {formData.loan_amount > 0 && formData.number_of_installments > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800 font-semibold">
                    Monthly Installment: {formatCurrency(formData.loan_amount / formData.number_of_installments, language)}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Expected completion: {new Date(new Date(formData.start_date).setMonth(
                      new Date(formData.start_date).getMonth() + formData.number_of_installments
                    )).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={employees.length === 0 || !formData.employee_id}
                  className={`px-4 py-2 bg-primary-600 text-white rounded-md transition-colors ${
                    employees.length === 0 || !formData.employee_id
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary-700'
                  }`}
                >
                  {editingLoan ? 'Update Loan' : 'Create Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
