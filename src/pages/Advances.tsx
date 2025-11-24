import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Plus, DollarSign, Clock, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { SearchableSelect } from '@/components/SearchableSelect';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  remaining_amount: number;
  deduction_amount: number;
  request_date: string;
  approved_date?: string;
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

export function Advances() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    amount: 0,
    deduction_amount: 0,
    request_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const { sortedData, sortConfig, requestSort } = useSortableData(advances);

  useEffect(() => {
    if (currentCompany) {
      fetchAdvances();
      fetchEmployees();
    }
  }, [currentCompany]);

  const fetchAdvances = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('advances')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvances(data || []);
    } catch (error) {
      console.error('Error fetching advances:', error);
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
      const advanceData = {
        company_id: currentCompany.id,
        employee_id: formData.employee_id,
        amount: formData.amount,
        remaining_amount: formData.amount,
        deduction_amount: formData.deduction_amount,
        request_date: formData.request_date,
        status: 'pending',
        notes: formData.notes
      };

      if (editingAdvance) {
        const { error } = await supabase
          .from('advances')
          .update(advanceData)
          .eq('id', editingAdvance.id);

        if (error) throw error;
        alert('Advance updated successfully!');
      } else {
        const { error } = await supabase
          .from('advances')
          .insert([advanceData]);

        if (error) throw error;
        alert('Advance request created successfully!');
      }

      resetForm();
      fetchAdvances();
    } catch (error: any) {
      console.error('Error saving advance:', error);
      alert('Failed to save advance: ' + error.message);
    }
  };

  const handleEdit = (advance: Advance) => {
    setEditingAdvance(advance);
    setFormData({
      employee_id: advance.employee_id,
      amount: advance.amount,
      deduction_amount: advance.deduction_amount,
      request_date: advance.request_date,
      notes: advance.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advance?')) return;

    try {
      const { error } = await supabase
        .from('advances')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Advance deleted successfully!');
      fetchAdvances();
    } catch (error: any) {
      console.error('Error deleting advance:', error);
      alert('Failed to delete advance: ' + error.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('advances')
        .update({
          status: 'approved',
          approved_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;
      alert('Advance approved successfully!');
      fetchAdvances();
    } catch (error: any) {
      console.error('Error approving advance:', error);
      alert('Failed to approve advance: ' + error.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('advances')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      alert('Advance rejected!');
      fetchAdvances();
    } catch (error: any) {
      console.error('Error rejecting advance:', error);
      alert('Failed to reject advance: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      amount: 0,
      deduction_amount: 0,
      request_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingAdvance(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount || 0), 0);
  const totalRemaining = advances.reduce((sum, adv) => sum + Number(adv.remaining_amount || 0), 0);
  const pendingAdvances = advances.filter(a => a.status === 'pending').length;

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
          <h1 className="text-3xl font-bold text-gray-900">{t.advances.title}</h1>
          <p className="text-gray-600 mt-1">{t.advances.subtitle}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="h-4 w-4" />
          <span>{t.advances.newAdvance}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.advances.totalAdvances}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalAdvances, language)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.advances.totalRemaining}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalRemaining, language)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.advances.pendingRequests}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(pendingAdvances, language)}</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-600" />
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
                  label={t.advances.amount}
                  sortKey="amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.advances.remaining}
                  sortKey="remaining_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label={t.advances.monthlyDeduction}
                  sortKey="deduction_amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>
                  {t.advances.progress}
                </th>
                <SortableTableHeader
                  label={t.advances.requestDate}
                  sortKey="request_date"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
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
                    {t.messages.noResults}
                  </td>
                </tr>
              ) : (
                sortedData.map((advance) => {
                  const progress = ((advance.amount - advance.remaining_amount) / advance.amount) * 100;
                  return (
                    <tr key={advance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {advance.employee.first_name_en} {advance.employee.last_name_en}
                        </div>
                        <div className="text-sm text-gray-500">{advance.employee.employee_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {Number(advance.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        SAR {Number(advance.remaining_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {Number(advance.deduction_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% recovered</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(advance.request_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(advance.status)}`}>
                          {advance.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          {advance.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(advance.id)}
                                className="text-green-600 hover:text-green-800"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleReject(advance.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEdit(advance)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(advance.id)}
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
                {editingAdvance ? 'Edit Advance' : 'New Advance Request'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Advance Amount (SAR) *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Deduction (SAR) *
                  </label>
                  <input
                    type="number"
                    value={formData.deduction_amount}
                    onChange={(e) => setFormData({ ...formData, deduction_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Date *
                </label>
                <input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {formData.amount > 0 && formData.deduction_amount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Number of months to recover: {Math.ceil(formData.amount / formData.deduction_amount)}
                  </p>
                  <p className="text-sm text-blue-800">
                    Expected recovery completion: {new Date(new Date(formData.request_date).setMonth(
                      new Date(formData.request_date).getMonth() + Math.ceil(formData.amount / formData.deduction_amount)
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
                  {editingAdvance ? 'Update Advance' : 'Create Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
