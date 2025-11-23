import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Receipt, Plus, AlertTriangle, Calculator } from 'lucide-react';

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
}

const VAT_RATE = 15;

const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals',
  'Fuel',
  'Accommodation',
  'Office Supplies',
  'Communication',
  'Training',
  'Marketing',
  'Entertainment',
  'Transportation',
  'Other'
];

export function Expenses() {
  const { currentCompany } = useCompany();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    expense_category: '',
    description: '',
    amount: '',
    vat_inclusive: true,
    receipt_number: '',
    vendor_name: '',
    vendor_vat_number: '',
    is_vat_reclaimable: false,
    expense_date: '',
    cost_center: '',
    project_code: '',
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

    const [expensesRes, employeesRes] = await Promise.all([
      supabase.from('expense_claims').select('*').eq('company_id', currentCompany.id),
      supabase
        .from('employees')
        .select('id, employee_number, first_name_en, last_name_en')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active')
        .order('first_name_en', { ascending: true })
    ]);

    setExpenses(expensesRes.data || []);
    setEmployees(employeesRes.data || []);
    setLoading(false);
  };

  const calculateVAT = () => {
    const amount = parseFloat(formData.amount) || 0;

    if (formData.vat_inclusive) {
      const amountExcludingVat = amount / (1 + VAT_RATE / 100);
      const vatAmount = amount - amountExcludingVat;
      return {
        amountExcludingVat: amountExcludingVat.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        totalAmount: amount.toFixed(2)
      };
    } else {
      const vatAmount = amount * (VAT_RATE / 100);
      const totalAmount = amount + vatAmount;
      return {
        amountExcludingVat: amount.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2)
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setSubmitting(true);

    try {
      const calculations = calculateVAT();
      const claimNumber = `EXP-${Date.now().toString().slice(-8)}`;

      const { error } = await supabase.from('expense_claims').insert({
        company_id: currentCompany.id,
        claim_number: claimNumber,
        employee_id: formData.employee_id,
        expense_category: formData.expense_category,
        description: formData.description,
        expense_date: formData.expense_date,
        amount: parseFloat(calculations.totalAmount),
        amount_excluding_vat: parseFloat(calculations.amountExcludingVat),
        vat_amount: parseFloat(calculations.vatAmount),
        vat_rate: VAT_RATE,
        receipt_number: formData.receipt_number || null,
        vendor_name: formData.vendor_name || null,
        vendor_vat_number: formData.vendor_vat_number || null,
        is_vat_reclaimable: formData.is_vat_reclaimable,
        cost_center: formData.cost_center || null,
        project_code: formData.project_code || null,
        status: 'pending',
        notes: formData.notes || null,
        net_reimbursement: parseFloat(calculations.totalAmount),
      });

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        employee_id: '',
        expense_category: '',
        description: '',
        amount: '',
        vat_inclusive: true,
        receipt_number: '',
        vendor_name: '',
        vendor_vat_number: '',
        is_vat_reclaimable: false,
        expense_date: '',
        cost_center: '',
        project_code: '',
        notes: '',
      });

      await fetchData();
    } catch (error) {
      console.error('Error creating expense claim:', error);
      alert('Failed to create expense claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expense Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          <span>New Expense</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Claims</p>
              <p className="text-2xl font-bold">{expenses.length}</p>
            </div>
            <Receipt className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Expense Claims</h2>
        <p className="text-gray-600">Expense list will be displayed here</p>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">New Expense Claim</h2>
                  <p className="text-gray-600 mt-1">Create a new expense claim with VAT tracking</p>
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
                    Expense Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.expense_category}
                    onChange={(e) => setFormData({ ...formData, expense_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Category</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat.toLowerCase()}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe the expense..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (SAR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VAT Treatment
                  </label>
                  <select
                    value={formData.vat_inclusive ? 'inclusive' : 'exclusive'}
                    onChange={(e) => setFormData({ ...formData, vat_inclusive: e.target.value === 'inclusive' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="inclusive">VAT Inclusive (15%)</option>
                    <option value="exclusive">VAT Exclusive (15%)</option>
                  </select>
                </div>

                {formData.amount && (
                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">VAT Calculation (15%)</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-blue-700">Amount Excl. VAT</p>
                            <p className="font-semibold text-blue-900">{calculateVAT().amountExcludingVat} SAR</p>
                          </div>
                          <div>
                            <p className="text-blue-700">VAT Amount</p>
                            <p className="font-semibold text-blue-900">{calculateVAT().vatAmount} SAR</p>
                          </div>
                          <div>
                            <p className="text-blue-700">Total Amount</p>
                            <p className="font-semibold text-blue-900">{calculateVAT().totalAmount} SAR</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Receipt #"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Vendor/Supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor VAT Number (ZATCA)
                  </label>
                  <input
                    type="text"
                    value={formData.vendor_vat_number}
                    onChange={(e) => setFormData({ ...formData, vendor_vat_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="3000000000000000"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 cursor-pointer mt-8">
                    <input
                      type="checkbox"
                      checked={formData.is_vat_reclaimable}
                      onChange={(e) => setFormData({ ...formData, is_vat_reclaimable: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">VAT Reclaimable from ZATCA</span>
                  </label>
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-yellow-900">ZATCA Compliance</h3>
                      <p className="text-sm text-yellow-800 mt-1">
                        For VAT reclaim, ensure the vendor VAT number is valid and the receipt meets ZATCA requirements (vendor details, date, items, VAT breakdown).
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
                    {submitting ? 'Creating...' : 'Create Expense Claim'}
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
