import { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, DollarSign, TrendingDown, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PayrollComponentConfigProps {
  companyId: string;
}

interface PayrollComponent {
  id: string;
  code: string;
  name_en: string;
  name_ar?: string;
  component_type: 'earning' | 'deduction' | 'benefit';
  calculation_method: 'fixed' | 'percentage' | 'formula' | 'hours' | 'days';
  default_value: number;
  is_recurring: boolean;
  is_taxable: boolean;
  affects_gosi: boolean;
  is_prorated: boolean;
  display_order: number;
  is_active: boolean;
  is_system: boolean;
  applies_to_saudi: boolean;
  applies_to_non_saudi: boolean;
  min_days_worked: number;
  max_absence_days: number;
}

export function PayrollComponentConfig({ companyId }: PayrollComponentConfigProps) {
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'earning' | 'deduction' | 'benefit'>('all');
  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ar: '',
    component_type: 'earning' as 'earning' | 'deduction' | 'benefit',
    calculation_method: 'fixed' as 'fixed' | 'percentage' | 'formula' | 'hours' | 'days',
    default_value: 0,
    is_recurring: true,
    is_taxable: true,
    affects_gosi: false,
    is_prorated: false,
    display_order: 0,
    is_active: true,
    applies_to_saudi: true,
    applies_to_non_saudi: true,
    min_days_worked: 0,
    max_absence_days: 30
  });

  useEffect(() => {
    fetchComponents();
  }, [companyId]);

  const fetchComponents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll_components')
        .select('*')
        .eq('company_id', companyId)
        .order('display_order');

      if (error) throw error;
      setComponents(data || []);
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveComponent = async () => {
    try {
      const dataToSave = {
        company_id: companyId,
        ...formData,
        is_system: false
      };

      if (editingId) {
        const { error } = await supabase
          .from('payroll_components')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;
        alert('Component updated successfully!');
      } else {
        const { error } = await supabase
          .from('payroll_components')
          .insert([dataToSave]);

        if (error) throw error;
        alert('Component created successfully!');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchComponents();
    } catch (error: any) {
      console.error('Error saving component:', error);
      alert('Failed to save component: ' + error.message);
    }
  };

  const deleteComponent = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      alert('Cannot delete system components');
      return;
    }

    if (!confirm('Are you sure you want to delete this component?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payroll_components')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Component deleted successfully!');
      fetchComponents();
    } catch (error: any) {
      console.error('Error deleting component:', error);
      alert('Failed to delete component: ' + error.message);
    }
  };

  const editComponent = (component: PayrollComponent) => {
    if (component.is_system) {
      alert('System components cannot be edited. You can create a custom component instead.');
      return;
    }

    setEditingId(component.id);
    setFormData({
      code: component.code,
      name_en: component.name_en,
      name_ar: component.name_ar || '',
      component_type: component.component_type,
      calculation_method: component.calculation_method,
      default_value: component.default_value,
      is_recurring: component.is_recurring,
      is_taxable: component.is_taxable,
      affects_gosi: component.affects_gosi,
      is_prorated: component.is_prorated,
      display_order: component.display_order,
      is_active: component.is_active,
      applies_to_saudi: component.applies_to_saudi,
      applies_to_non_saudi: component.applies_to_non_saudi,
      min_days_worked: component.min_days_worked,
      max_absence_days: component.max_absence_days
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name_en: '',
      name_ar: '',
      component_type: 'earning',
      calculation_method: 'fixed',
      default_value: 0,
      is_recurring: true,
      is_taxable: true,
      affects_gosi: false,
      is_prorated: false,
      display_order: 0,
      is_active: true,
      applies_to_saudi: true,
      applies_to_non_saudi: true,
      min_days_worked: 0,
      max_absence_days: 30
    });
  };

  const filteredComponents = filterType === 'all'
    ? components
    : components.filter(c => c.component_type === filterType);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earning': return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'deduction': return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'benefit': return <Gift className="h-5 w-5 text-blue-600" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earning': return 'bg-green-100 text-green-800';
      case 'deduction': return 'bg-red-100 text-red-800';
      case 'benefit': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const earningsCount = components.filter(c => c.component_type === 'earning').length;
  const deductionsCount = components.filter(c => c.component_type === 'deduction').length;
  const benefitsCount = components.filter(c => c.component_type === 'benefit').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payroll Components</h2>
          <p className="text-gray-600 mt-1">Configure earnings, deductions, and benefits</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Add Component
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Components</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{components.length}</p>
            </div>
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Earnings</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{earningsCount}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Deductions</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{deductionsCount}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Benefits</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{benefitsCount}</p>
            </div>
            <Gift className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({components.length})
        </button>
        <button
          onClick={() => setFilterType('earning')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'earning'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Earnings ({earningsCount})
        </button>
        <button
          onClick={() => setFilterType('deduction')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'deduction'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Deductions ({deductionsCount})
        </button>
        <button
          onClick={() => setFilterType('benefit')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'benefit'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Benefits ({benefitsCount})
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Component' : 'Add Component'}
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="OVERTIME"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.component_type}
                    onChange={(e) => setFormData({ ...formData, component_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                    <option value="benefit">Benefit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Overtime Pay"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name (Arabic)</label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أجر العمل الإضافي"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Calculation Method</label>
                  <select
                    value={formData.calculation_method}
                    onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                    <option value="formula">Formula</option>
                    <option value="hours">Hours Based</option>
                    <option value="days">Days Based</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Value</label>
                  <input
                    type="number"
                    value={formData.default_value}
                    onChange={(e) => setFormData({ ...formData, default_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Component Behavior</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Recurring (Monthly)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_taxable}
                      onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Taxable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.affects_gosi}
                      onChange={(e) => setFormData({ ...formData, affects_gosi: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Affects GOSI</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_prorated}
                      onChange={(e) => setFormData({ ...formData, is_prorated: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Prorated</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Applicability</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.applies_to_saudi}
                      onChange={(e) => setFormData({ ...formData, applies_to_saudi: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Applies to Saudi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.applies_to_non_saudi}
                      onChange={(e) => setFormData({ ...formData, applies_to_non_saudi: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Applies to Non-Saudi</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Conditions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Days Worked</label>
                    <input
                      type="number"
                      value={formData.min_days_worked}
                      onChange={(e) => setFormData({ ...formData, min_days_worked: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Absence Days</label>
                    <input
                      type="number"
                      value={formData.max_absence_days}
                      onChange={(e) => setFormData({ ...formData, max_absence_days: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveComponent}
                disabled={!formData.code || !formData.name_en}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Update' : 'Create'} Component
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calculation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredComponents.map((component) => (
                <tr key={component.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(component.component_type)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(component.component_type)}`}>
                        {component.component_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono font-medium text-gray-900">{component.code}</span>
                    {component.is_system && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">System</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">{component.name_en}</div>
                    {component.name_ar && (
                      <div className="text-xs text-gray-500" dir="rtl">{component.name_ar}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {component.calculation_method}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {component.default_value}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {component.is_recurring && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Recurring</span>
                      )}
                      {component.is_taxable && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">Taxable</span>
                      )}
                      {component.affects_gosi && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">GOSI</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      component.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {component.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editComponent(component)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                        disabled={component.is_system}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteComponent(component.id, component.is_system)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                        disabled={component.is_system}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
