import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Receipt, Plus, AlertTriangle, Calculator } from 'lucide-react';

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
}

const VAT_RATE = 15;

const EXPENSE_CATEGORIES = {
  'Travel': ['Flight', 'Train', 'Bus', 'Taxi', 'Parking', 'Toll Fees', 'Other'],
  'Meals': ['Breakfast', 'Lunch', 'Dinner', 'Team Meal', 'Client Entertainment', 'Other'],
  'Fuel': ['Petrol', 'Diesel', 'Vehicle Maintenance', 'Car Wash', 'Other'],
  'Accommodation': ['Hotel', 'Serviced Apartment', 'Guest House', 'Other'],
  'Office Supplies': ['Stationery', 'Printing', 'Equipment', 'Furniture', 'Other'],
  'Communication': ['Mobile', 'Internet', 'Postage', 'Courier', 'Other'],
  'Training': ['Course Fees', 'Materials', 'Certification', 'Conference', 'Other'],
  'Marketing': ['Advertising', 'Promotional Materials', 'Events', 'Sponsorship', 'Other'],
  'Entertainment': ['Client Meeting', 'Team Event', 'Gift', 'Other'],
  'Transportation': ['Car Rental', 'Driver', 'Public Transport', 'Other'],
  'Professional Services': ['Legal', 'Consulting', 'Audit', 'Other'],
  'IT & Software': ['Software License', 'Cloud Services', 'Hardware', 'Other'],
  'Other': ['Miscellaneous']
};

const PAYMENT_METHODS = [
  { value: 'personal_card', label: 'Personal Credit Card' },
  { value: 'company_card', label: 'Company Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' }
];

const REIMBURSEMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'salary', label: 'With Salary' },
  { value: 'cheque', label: 'Cheque' }
];

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'OMR', 'QAR'];

export function Expenses() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    expense_category: '',
    subcategory: '',
    description: '',
    amount: '',
    vat_inclusive: true,
    receipt_number: '',
    vendor_name: '',
    vendor_vat_number: '',
    is_vat_reclaimable: false,
    expense_date: '',
    payment_method: 'personal_card',
    currency: 'SAR',
    exchange_rate: '1',
    cost_center: '',
    project_code: '',
    business_purpose: '',
    related_travel_id: '',
    billable_to_client: false,
    client_name: '',
    requires_receipt: true,
    receipt_attached: false,
    policy_compliant: true,
    policy_violation_reason: '',
    advance_deducted: '',
    reimbursement_method: 'bank_transfer',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
      setFormData({ ...formData, receipt_attached: true });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length <= 1) {
      setFormData({ ...formData, receipt_attached: false });
    }
  };

  const uploadFilesToStorage = async (claimNumber: string) => {
    if (uploadedFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${claimNumber}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `expense-receipts/${currentCompany?.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (error) {
          console.error('Error uploading file:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }
    } catch (error) {
      console.error('Error in file upload:', error);
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setSubmitting(true);

    try {
      const calculations = calculateVAT();
      const claimNumber = `EXP-${Date.now().toString().slice(-8)}`;

      const amountInSAR = formData.currency === 'SAR'
        ? parseFloat(calculations.totalAmount)
        : parseFloat(calculations.totalAmount) * parseFloat(formData.exchange_rate);

      const receiptUrls = await uploadFilesToStorage(claimNumber);

      const { error } = await supabase.from('expense_claims').insert({
        company_id: currentCompany.id,
        claim_number: claimNumber,
        employee_id: formData.employee_id,
        expense_category: formData.expense_category,
        subcategory: formData.subcategory || null,
        description: formData.description,
        expense_date: formData.expense_date,
        claim_date: new Date().toISOString().split('T')[0],
        amount: parseFloat(calculations.totalAmount),
        amount_excluding_vat: parseFloat(calculations.amountExcludingVat),
        vat_amount: parseFloat(calculations.vatAmount),
        vat_rate: VAT_RATE,
        currency: formData.currency,
        exchange_rate: formData.currency === 'SAR' ? 1 : parseFloat(formData.exchange_rate),
        amount_in_sar: amountInSAR,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number || null,
        vendor_name: formData.vendor_name || null,
        vendor_vat_number: formData.vendor_vat_number || null,
        is_vat_reclaimable: formData.is_vat_reclaimable,
        business_purpose: formData.business_purpose || null,
        related_travel_id: formData.related_travel_id || null,
        billable_to_client: formData.billable_to_client,
        client_name: formData.billable_to_client ? formData.client_name : null,
        cost_center: formData.cost_center || null,
        project_code: formData.project_code || null,
        policy_compliant: formData.policy_compliant,
        policy_violation_reason: !formData.policy_compliant ? formData.policy_violation_reason : null,
        advance_deducted: formData.advance_deducted ? parseFloat(formData.advance_deducted) : null,
        reimbursement_method: formData.reimbursement_method,
        approval_status: 'pending',
        manager_approval_id: null,
        finance_approval_id: null,
        receipt_attached: formData.receipt_attached,
        receipt_file_url: receiptUrls.length > 0 ? receiptUrls[0] : null,
        receipt_files: receiptUrls.length > 0 ? receiptUrls : null,
        notes: formData.notes || null,
        net_reimbursement: amountInSAR - (formData.advance_deducted ? parseFloat(formData.advance_deducted) : 0),
      });

      if (error) throw error;

      setShowAddModal(false);
      setUploadedFiles([]);
      setFormData({
        employee_id: '',
        expense_category: '',
        subcategory: '',
        description: '',
        amount: '',
        vat_inclusive: true,
        receipt_number: '',
        vendor_name: '',
        vendor_vat_number: '',
        is_vat_reclaimable: false,
        expense_date: '',
        payment_method: 'personal_card',
        currency: 'SAR',
        exchange_rate: '1',
        cost_center: '',
        project_code: '',
        business_purpose: '',
        related_travel_id: '',
        billable_to_client: false,
        client_name: '',
        requires_receipt: true,
        receipt_attached: false,
        policy_compliant: true,
        policy_violation_reason: '',
        advance_deducted: '',
        reimbursement_method: 'bank_transfer',
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
        <h1 className="text-3xl font-bold">{t.expenses.title}</h1>
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">New Expense Claim</h2>
                  <p className="text-gray-600 mt-1">Comprehensive expense claim with VAT, currency, and policy compliance</p>
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
                    onChange={(e) => setFormData({ ...formData, expense_category: e.target.value, subcategory: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Category</option>
                    {Object.keys(EXPENSE_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.expense_category && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Subcategory</option>
                      {EXPENSE_CATEGORIES[formData.expense_category as keyof typeof EXPENSE_CATEGORIES]?.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Brief description of the expense..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Purpose <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_purpose}
                    onChange={(e) => setFormData({ ...formData, business_purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Client meeting, Project materials, Team training"
                  />
                </div>

                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount & Payment Details</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount <span className="text-red-500">*</span>
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

                {formData.currency !== 'SAR' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exchange Rate to SAR <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step="0.0001"
                      value={formData.exchange_rate}
                      onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="1.0000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      1 {formData.currency} = {formData.exchange_rate} SAR
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
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

                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Billing & Reimbursement</h3>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.billable_to_client}
                      onChange={(e) => setFormData({ ...formData, billable_to_client: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">This expense is billable to client</span>
                  </label>
                </div>

                {formData.billable_to_client && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Client/Project name"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advance Amount Deducted (SAR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.advance_deducted}
                    onChange={(e) => setFormData({ ...formData, advance_deducted: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">If you received travel advance</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Reimbursement Method
                  </label>
                  <select
                    value={formData.reimbursement_method}
                    onChange={(e) => setFormData({ ...formData, reimbursement_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {REIMBURSEMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt & Policy Compliance</h3>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Receipt/Invoice {parseFloat(formData.amount) > 100 && <span className="text-red-500">*</span>}
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, PNG, JPG up to 10MB (Multiple files allowed)
                      </p>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Required for all expenses above SAR 100 and mandatory for VAT reclaim
                  </p>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Receipt className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.policy_compliant}
                      onChange={(e) => setFormData({ ...formData, policy_compliant: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">This expense is policy compliant</span>
                  </label>
                </div>

                {!formData.policy_compliant && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Violation Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={formData.policy_violation_reason}
                      onChange={(e) => setFormData({ ...formData, policy_violation_reason: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Explain why this expense exceeds policy limits or violates guidelines..."
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Any additional information..."
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
