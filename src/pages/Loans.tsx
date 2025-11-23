import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plus, DollarSign, TrendingDown, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';

interface Loan {
  id: string;
  employee_id: string;
  loan_type: string;
  loan_amount: number;
  remaining_amount: number;
  monthly_installment: number;
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

export function Loans() {
  const { currentCompany } = useCompany();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    loan_type: 'personal',
    loan_amount: 0,
    monthly_installment: 0,
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
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('employee_number');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const numberOfMonths = Math.ceil(formData.loan_amount / formData.monthly_installment);
      const endDate = new Date(formData.start_date);
      endDate.setMonth(endDate.getMonth() + numberOfMonths);

      const loanData = {
        company_id: currentCompany.id,
        employee_id: formData.employee_id,
        loan_type: formData.loan_type,
        loan_amount: formData.loan_amount,
        remaining_amount: formData.loan_amount,
        monthly_installment: formData.monthly_installment,
        start_date: formData.start_date,
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
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
        const { error } = await supabase
          .from('loans')
          .insert([loanData]);

        if (error) throw error;
        alert('Loan created successfully!');
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
      monthly_installment: loan.monthly_installment,
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
      monthly_installment: 0,
      start_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingLoan(null);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Loans</h1>
          <p className="text-gray-600 mt-1">Manage employee loans and track repayments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Loan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Loans Issued</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                SAR {totalLoans.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Remaining</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                SAR {totalRemaining.toLocaleString()}
              </p>
            </div>
            <TrendingDown className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeLoans}</p>
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
                  label="Employee"
                  sortKey="employee.first_name_en"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Loan Type"
                  sortKey="loan_type"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Loan Amount"
                  sortKey="loan_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Remaining"
                  sortKey="remaining_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Monthly Installment"
                  sortKey="monthly_installment"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Progress
                </th>
                <SortableTableHeader
                  label="Status"
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {Number(loan.monthly_installment || 0).toLocaleString()}
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
                          <button
                            onClick={() => handleDelete(loan.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_number} - {emp.first_name_en} {emp.last_name_en}
                    </option>
                  ))}
                </select>
              </div>

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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Installment (SAR) *
                  </label>
                  <input
                    type="number"
                    value={formData.monthly_installment}
                    onChange={(e) => setFormData({ ...formData, monthly_installment: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {formData.loan_amount > 0 && formData.monthly_installment > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Number of months: {Math.ceil(formData.loan_amount / formData.monthly_installment)}
                  </p>
                  <p className="text-sm text-blue-800">
                    Expected completion: {new Date(new Date(formData.start_date).setMonth(
                      new Date(formData.start_date).getMonth() + Math.ceil(formData.loan_amount / formData.monthly_installment)
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
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
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
