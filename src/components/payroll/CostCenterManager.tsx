import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, DollarSign, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CostCenterManagerProps {
  companyId: string;
}

interface CostCenter {
  id: string;
  code: string;
  name_en: string;
  name_ar?: string;
  parent_id?: string;
  monthly_budget: number;
  annual_budget: number;
  is_active: boolean;
  manager_id?: string;
  manager?: {
    first_name_en: string;
    last_name_en: string;
  };
}

export function CostCenterManager({ companyId }: CostCenterManagerProps) {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ar: '',
    parent_id: '',
    monthly_budget: 0,
    annual_budget: 0,
    manager_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchCostCenters();
    fetchEmployees();
  }, [companyId]);

  const fetchCostCenters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select(`
          *,
          manager:employees(first_name_en, last_name_en)
        `)
        .eq('company_id', companyId)
        .order('code');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name_en, last_name_en, employee_number')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('employee_number');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const saveCostCenter = async () => {
    try {
      const dataToSave = {
        company_id: companyId,
        ...formData,
        parent_id: formData.parent_id || null,
        manager_id: formData.manager_id || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('cost_centers')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;
        alert('Cost center updated successfully!');
      } else {
        const { error } = await supabase
          .from('cost_centers')
          .insert([dataToSave]);

        if (error) throw error;
        alert('Cost center created successfully!');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchCostCenters();
    } catch (error: any) {
      console.error('Error saving cost center:', error);
      alert('Failed to save cost center: ' + error.message);
    }
  };

  const deleteCostCenter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cost center?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Cost center deleted successfully!');
      fetchCostCenters();
    } catch (error: any) {
      console.error('Error deleting cost center:', error);
      alert('Failed to delete cost center: ' + error.message);
    }
  };

  const editCostCenter = (costCenter: CostCenter) => {
    setEditingId(costCenter.id);
    setFormData({
      code: costCenter.code,
      name_en: costCenter.name_en,
      name_ar: costCenter.name_ar || '',
      parent_id: costCenter.parent_id || '',
      monthly_budget: costCenter.monthly_budget,
      annual_budget: costCenter.annual_budget,
      manager_id: costCenter.manager_id || '',
      is_active: costCenter.is_active
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name_en: '',
      name_ar: '',
      parent_id: '',
      monthly_budget: 0,
      annual_budget: 0,
      manager_id: '',
      is_active: true
    });
  };

  const totalBudget = costCenters.reduce((sum, cc) => sum + Number(cc.annual_budget || 0), 0);
  const activeCenters = costCenters.filter(cc => cc.is_active).length;

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
          <h2 className="text-2xl font-bold text-gray-900">Cost Centers</h2>
          <p className="text-gray-600 mt-1">Manage departments and cost allocation</p>
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
          Add Cost Center
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost Centers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{costCenters.length}</p>
              <p className="text-xs text-gray-500 mt-1">{activeCenters} active</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Annual Budget</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                SAR {totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total allocated</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Budget</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                SAR {activeCenters > 0 ? (totalBudget / activeCenters).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per center</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Cost Center' : 'Add Cost Center'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CC-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent Cost Center</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None (Top Level)</option>
                    {costCenters.filter(cc => cc.id !== editingId).map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.code} - {cc.name_en}</option>
                    ))}
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
                    placeholder="Marketing Department"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name (Arabic)</label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="قسم التسويق"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Budget (SAR)</label>
                  <input
                    type="number"
                    value={formData.monthly_budget}
                    onChange={(e) => setFormData({ ...formData, monthly_budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Annual Budget (SAR)</label>
                  <input
                    type="number"
                    value={formData.annual_budget}
                    onChange={(e) => setFormData({ ...formData, annual_budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="600000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Manager Assigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_number} - {emp.first_name_en} {emp.last_name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
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
                onClick={saveCostCenter}
                disabled={!formData.code || !formData.name_en}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Update' : 'Create'} Cost Center
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {costCenters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No cost centers found. Click "Add Cost Center" to create one.
                  </td>
                </tr>
              ) : (
                costCenters.map((costCenter) => {
                  const parent = costCenters.find(cc => cc.id === costCenter.parent_id);
                  return (
                    <tr key={costCenter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {costCenter.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{costCenter.name_en}</div>
                        {costCenter.name_ar && (
                          <div className="text-xs text-gray-500" dir="rtl">{costCenter.name_ar}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parent ? `${parent.code} - ${parent.name_en}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {costCenter.manager ? `${costCenter.manager.first_name_en} ${costCenter.manager.last_name_en}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        SAR {Number(costCenter.monthly_budget || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        SAR {Number(costCenter.annual_budget || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          costCenter.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {costCenter.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => editCostCenter(costCenter)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteCostCenter(costCenter.id)}
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
    </div>
  );
}
