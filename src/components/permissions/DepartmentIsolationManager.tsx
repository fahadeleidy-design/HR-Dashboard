import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { Building2, Shield, Save, Plus, Edit2 } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  parent_id: string | null;
}

interface DepartmentIsolation {
  id?: string;
  department_id: string;
  isolation_level: string;
  allowed_departments: string[];
  allow_parent_access: boolean;
  allow_child_access: boolean;
  data_visibility_rules: {
    employee_data?: string;
    salary_data?: string;
    performance_data?: string;
  };
}

export default function DepartmentIsolationManager() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isolations, setIsolations] = useState<Record<string, DepartmentIsolation>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDept, setEditingDept] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  const loadData = async () => {
    if (!currentCompany) return;

    try {
      setLoading(true);

      const [deptsRes, isolationsRes] = await Promise.all([
        supabase
          .from('departments')
          .select('id, name, parent_id')
          .eq('company_id', currentCompany.id)
          .order('name'),
        supabase
          .from('department_data_isolation')
          .select('*')
          .eq('company_id', currentCompany.id),
      ]);

      if (deptsRes.error) throw deptsRes.error;
      if (isolationsRes.error) throw isolationsRes.error;

      setDepartments(deptsRes.data || []);

      const isolationMap: Record<string, DepartmentIsolation> = {};
      isolationsRes.data?.forEach(iso => {
        isolationMap[iso.department_id] = iso;
      });
      setIsolations(isolationMap);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateIsolation = (deptId: string, updates: Partial<DepartmentIsolation>) => {
    const current = isolations[deptId] || {
      department_id: deptId,
      isolation_level: 'strict',
      allowed_departments: [],
      allow_parent_access: false,
      allow_child_access: false,
      data_visibility_rules: {
        employee_data: 'own_department',
        salary_data: 'strict',
        performance_data: 'hierarchical',
      },
    };

    setIsolations({
      ...isolations,
      [deptId]: { ...current, ...updates },
    });
  };

  const saveIsolations = async () => {
    if (!currentCompany) return;

    try {
      setSaving(true);

      const isolationsToUpsert = Object.values(isolations).map(iso => ({
        id: iso.id,
        department_id: iso.department_id,
        company_id: currentCompany.id,
        isolation_level: iso.isolation_level,
        allowed_departments: iso.allowed_departments,
        allow_parent_access: iso.allow_parent_access,
        allow_child_access: iso.allow_child_access,
        data_visibility_rules: iso.data_visibility_rules,
        is_active: true,
      }));

      const { error } = await supabase
        .from('department_data_isolation')
        .upsert(isolationsToUpsert);

      if (error) throw error;

      showToast('Department isolation rules saved successfully', 'success');
      await loadData();
      setEditingDept(null);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAllowedDepartment = (deptId: string, allowedDeptId: string) => {
    const current = isolations[deptId] || {
      department_id: deptId,
      isolation_level: 'cross_department',
      allowed_departments: [],
      allow_parent_access: false,
      allow_child_access: false,
      data_visibility_rules: {},
    };

    const allowed = current.allowed_departments || [];
    const newAllowed = allowed.includes(allowedDeptId)
      ? allowed.filter(id => id !== allowedDeptId)
      : [...allowed, allowedDeptId];

    updateIsolation(deptId, { allowed_departments: newAllowed });
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading department isolation rules...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Department Data Isolation</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure how data is isolated and shared between departments
          </p>
        </div>

        <button
          onClick={saveIsolations}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      <div className="grid gap-6">
        {departments.map((dept) => {
          const isolation = isolations[dept.id] || {
            isolation_level: 'strict',
            allowed_departments: [],
            allow_parent_access: false,
            allow_child_access: false,
            data_visibility_rules: {
              employee_data: 'own_department',
              salary_data: 'strict',
              performance_data: 'hierarchical',
            },
          };

          const isEditing = editingDept === dept.id;

          return (
            <div
              key={dept.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isolation.isolation_level === 'strict'
                      ? 'bg-red-100 text-red-700'
                      : isolation.isolation_level === 'hierarchical'
                      ? 'bg-yellow-100 text-yellow-700'
                      : isolation.isolation_level === 'cross_department'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {isolation.isolation_level.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <button
                  onClick={() => setEditingDept(isEditing ? null : dept.id)}
                  className="text-blue-600 hover:text-blue-700 p-2"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              {isEditing && (
                <div className="p-6 space-y-4 bg-white">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Isolation Level
                    </label>
                    <select
                      value={isolation.isolation_level}
                      onChange={(e) => updateIsolation(dept.id, { isolation_level: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="strict">Strict - No cross-department access</option>
                      <option value="hierarchical">Hierarchical - Parent/child access</option>
                      <option value="cross_department">Cross-Department - Selective sharing</option>
                      <option value="company_wide">Company Wide - Full access</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {isolation.isolation_level === 'strict' && 'Users can only access data within their own department'}
                      {isolation.isolation_level === 'hierarchical' && 'Parent departments can access child department data'}
                      {isolation.isolation_level === 'cross_department' && 'Users can access data from selected departments'}
                      {isolation.isolation_level === 'company_wide' && 'Users can access data from all departments'}
                    </p>
                  </div>

                  {isolation.isolation_level === 'hierarchical' && (
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isolation.allow_parent_access}
                          onChange={(e) => updateIsolation(dept.id, { allow_parent_access: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Allow parent department access</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isolation.allow_child_access}
                          onChange={(e) => updateIsolation(dept.id, { allow_child_access: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Allow child department access</span>
                      </label>
                    </div>
                  )}

                  {isolation.isolation_level === 'cross_department' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed Departments
                      </label>
                      <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                        {departments.filter(d => d.id !== dept.id).map(d => (
                          <label key={d.id} className="flex items-center gap-2 py-2">
                            <input
                              type="checkbox"
                              checked={isolation.allowed_departments?.includes(d.id)}
                              onChange={() => toggleAllowedDepartment(dept.id, d.id)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">{d.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Visibility Rules
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Employee Data</label>
                        <select
                          value={isolation.data_visibility_rules?.employee_data || 'own_department'}
                          onChange={(e) => updateIsolation(dept.id, {
                            data_visibility_rules: {
                              ...isolation.data_visibility_rules,
                              employee_data: e.target.value,
                            },
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                        >
                          <option value="strict">Strict - Own department only</option>
                          <option value="own_department">Own Department</option>
                          <option value="hierarchical">Hierarchical</option>
                          <option value="company_wide">Company Wide</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Salary Data</label>
                        <select
                          value={isolation.data_visibility_rules?.salary_data || 'strict'}
                          onChange={(e) => updateIsolation(dept.id, {
                            data_visibility_rules: {
                              ...isolation.data_visibility_rules,
                              salary_data: e.target.value,
                            },
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                        >
                          <option value="strict">Strict - No access</option>
                          <option value="own_department">Own Department</option>
                          <option value="hierarchical">Hierarchical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Performance Data</label>
                        <select
                          value={isolation.data_visibility_rules?.performance_data || 'hierarchical'}
                          onChange={(e) => updateIsolation(dept.id, {
                            data_visibility_rules: {
                              ...isolation.data_visibility_rules,
                              performance_data: e.target.value,
                            },
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                        >
                          <option value="strict">Strict - Own department only</option>
                          <option value="own_department">Own Department</option>
                          <option value="hierarchical">Hierarchical</option>
                          <option value="company_wide">Company Wide</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No departments found</p>
          <p className="text-sm text-gray-400 mt-1">
            Create departments first to configure isolation rules
          </p>
        </div>
      )}
    </div>
  );
}
