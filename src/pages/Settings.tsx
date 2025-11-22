import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Building2, Users, Plus } from 'lucide-react';

interface Department {
  id: string;
  name_en: string;
  name_ar: string | null;
  description: string | null;
  created_at: string;
}

export function Settings() {
  const { currentCompany, companies } = useCompany();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name_en: '',
    name_ar: '',
    description: '',
  });

  useEffect(() => {
    if (currentCompany) {
      fetchDepartments();
    }
  }, [currentCompany]);

  const fetchDepartments = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name_en');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const { error } = await supabase.from('departments').insert([{
        company_id: currentCompany.id,
        name_en: deptForm.name_en,
        name_ar: deptForm.name_ar || null,
        description: deptForm.description || null,
      }]);

      if (error) throw error;

      setShowDeptForm(false);
      setDeptForm({ name_en: '', name_ar: '', description: '' });
      fetchDepartments();
    } catch (error: any) {
      console.error('Error adding department:', error);
      alert(error.message || 'Failed to add department');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage company and system settings</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Building2 className="h-12 w-12 text-primary-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
            <p className="text-gray-600">Current company details</p>
          </div>
        </div>

        {currentCompany && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name (English)
              </label>
              <input
                type="text"
                value={currentCompany.name_en}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name (Arabic)
              </label>
              <input
                type="text"
                value={currentCompany.name_ar || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CR Number
              </label>
              <input
                type="text"
                value={currentCompany.cr_number || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Establishment Number
              </label>
              <input
                type="text"
                value={currentCompany.establishment_number || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nitaqat Entity Size
              </label>
              <input
                type="text"
                value={currentCompany.nitaqat_entity_size}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nitaqat Activity
              </label>
              <input
                type="text"
                value={currentCompany.nitaqat_activity}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-primary-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Departments</h2>
                <p className="text-gray-600">Manage company departments</p>
              </div>
            </div>
            <button
              onClick={() => setShowDeptForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department Name (EN)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department Name (AR)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No departments found. Click "Add Department" to create one.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dept.name_en}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" dir="rtl">
                      {dept.name_ar || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {dept.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(dept.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDeptForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add Department</h2>
            </div>

            <form onSubmit={handleAddDepartment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.name_en}
                  onChange={(e) => setDeptForm({...deptForm, name_en: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name (Arabic)
                </label>
                <input
                  type="text"
                  value={deptForm.name_ar}
                  onChange={(e) => setDeptForm({...deptForm, name_ar: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeptForm(false);
                    setDeptForm({ name_en: '', name_ar: '', description: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Add Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
