import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, DollarSign, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function ExpatriateManagement() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [expatriates, setExpatriates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    home_country_code: '',
    host_country_code: '',
    assignment_type: 'short_term',
    assignment_start_date: '',
    assignment_end_date: '',
    base_salary_amount: '',
    base_salary_currency: '',
    housing_allowance: '',
    transportation_allowance: '',
    education_allowance: '',
    tax_equalization: false,
    international_health_insurance: true,
    assignment_reason: '',
  });
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (currentCompany) {
      loadData();
    }
  }, [currentCompany]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: expatData } = await supabase
        .from('expatriates')
        .select(`
          *,
          employee:employees(full_name),
          home_country:countries!expatriates_home_country_code_fkey(name, country_code),
          host_country:countries!expatriates_host_country_code_fkey(name, country_code)
        `)
        .eq('status', 'active');

      setExpatriates(expatData || []);

      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('company_id', currentCompany!.id)
        .eq('status', 'active')
        .order('full_name');

      setEmployees(employeesData || []);

      const { data: countriesData } = await supabase
        .from('countries')
        .select('country_code, name, default_currency_code')
        .eq('is_active', true)
        .order('name');

      setCountries(countriesData || []);
    } catch (error) {
      logError(error, 'medium', { component: 'ExpatriateManagement', action: 'loadData' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('expatriates').insert({
        ...formData,
        base_salary_amount: parseFloat(formData.base_salary_amount),
        housing_allowance: parseFloat(formData.housing_allowance) || 0,
        transportation_allowance: parseFloat(formData.transportation_allowance) || 0,
        education_allowance: parseFloat(formData.education_allowance) || 0,
        status: 'active',
      });

      if (error) throw error;

      showToast('Expatriate assignment created successfully', 'success');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to create assignment', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      home_country_code: '',
      host_country_code: '',
      assignment_type: 'short_term',
      assignment_start_date: '',
      assignment_end_date: '',
      base_salary_amount: '',
      base_salary_currency: '',
      housing_allowance: '',
      transportation_allowance: '',
      education_allowance: '',
      tax_equalization: false,
      international_health_insurance: true,
      assignment_reason: '',
    });
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'short_term':
        return 'bg-blue-100 text-blue-800';
      case 'long_term':
        return 'bg-green-100 text-green-800';
      case 'permanent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expatriate Management</h2>
          <p className="text-gray-600 mt-1">Manage international assignments and benefits</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Assignment</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Expatriate Assignment</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Type</label>
                <select
                  value={formData.assignment_type}
                  onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="short_term">Short Term (&lt; 1 year)</option>
                  <option value="long_term">Long Term (&gt; 1 year)</option>
                  <option value="permanent">Permanent</option>
                  <option value="commuter">Cross-Border Commuter</option>
                  <option value="remote">Remote Worker</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Home Country</label>
                <select
                  value={formData.home_country_code}
                  onChange={(e) => setFormData({ ...formData, home_country_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select country...</option>
                  {countries.map((country) => (
                    <option key={country.country_code} value={country.country_code}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Host Country</label>
                <select
                  value={formData.host_country_code}
                  onChange={(e) => setFormData({ ...formData, host_country_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select country...</option>
                  {countries.map((country) => (
                    <option key={country.country_code} value={country.country_code}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.assignment_start_date}
                  onChange={(e) => setFormData({ ...formData, assignment_start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.assignment_end_date}
                  onChange={(e) => setFormData({ ...formData, assignment_end_date: e.target.value })}
                  min={formData.assignment_start_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_salary_amount}
                  onChange={(e) => setFormData({ ...formData, base_salary_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={formData.base_salary_currency}
                  onChange={(e) => setFormData({ ...formData, base_salary_currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select currency...</option>
                  {countries.map((country) => (
                    <option key={country.country_code} value={country.default_currency_code}>
                      {country.default_currency_code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Housing Allowance</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.housing_allowance}
                  onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportation Allowance</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.transportation_allowance}
                  onChange={(e) => setFormData({ ...formData, transportation_allowance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Education Allowance</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.education_allowance}
                  onChange={(e) => setFormData({ ...formData, education_allowance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.tax_equalization}
                  onChange={(e) => setFormData({ ...formData, tax_equalization: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Tax Equalization</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.international_health_insurance}
                  onChange={(e) => setFormData({ ...formData, international_health_insurance: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">International Health Insurance</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Reason</label>
              <textarea
                value={formData.assignment_reason}
                onChange={(e) => setFormData({ ...formData, assignment_reason: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compensation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expatriates.map((expat: any) => (
                <tr key={expat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{expat.employee?.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>{expat.home_country?.country_code}</span>
                      <span>→</span>
                      <span>{expat.host_country?.country_code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(expat.assignment_type)}`}>
                      {expat.assignment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(expat.assignment_start_date).toLocaleDateString()} -{' '}
                    {expat.assignment_end_date ? new Date(expat.assignment_end_date).toLocaleDateString() : 'Ongoing'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: expat.base_salary_currency,
                    }).format(expat.base_salary_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {expatriates.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No expatriate assignments found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
