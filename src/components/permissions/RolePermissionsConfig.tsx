import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { Check, X, Save, Plus, Trash2, Filter } from 'lucide-react';

interface PermissionModule {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  route_path: string;
}

interface RolePermission {
  id: string;
  role_id: string;
  module_id: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  scope: string;
  department_id: string | null;
}

interface UserRole {
  id: string;
  role: string;
  company_id: string;
}

export default function RolePermissionsConfig() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Record<string, RolePermission>>({});
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  useEffect(() => {
    if (selectedRole) {
      loadPermissions(selectedRole);
    }
  }, [selectedRole]);

  const loadData = async () => {
    if (!currentCompany) return;

    try {
      setLoading(true);

      const [modulesRes, rolesRes] = await Promise.all([
        supabase
          .from('permission_modules')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('user_roles')
          .select('id, role, company_id')
          .eq('company_id', currentCompany.id)
          .order('role'),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setModules(modulesRes.data || []);

      const uniqueRoles = Array.from(
        new Map(rolesRes.data?.map(r => [r.id, r]) || []).values()
      );
      setRoles(uniqueRoles);

      if (uniqueRoles.length > 0 && !selectedRole) {
        setSelectedRole(uniqueRoles[0].id);
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async (roleId: string) => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('role_module_permissions')
        .select('*')
        .eq('role_id', roleId)
        .eq('company_id', currentCompany.id);

      if (error) throw error;

      const permMap: Record<string, RolePermission> = {};
      data?.forEach(perm => {
        permMap[`${perm.module_id}-${perm.department_id || 'global'}`] = perm;
      });

      setPermissions(permMap);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const togglePermission = (moduleId: string, permType: keyof Pick<RolePermission, 'can_read' | 'can_write' | 'can_delete' | 'can_approve' | 'can_export'>) => {
    const key = `${moduleId}-global`;
    const current = permissions[key] || {
      role_id: selectedRole,
      module_id: moduleId,
      can_read: false,
      can_write: false,
      can_delete: false,
      can_approve: false,
      can_export: false,
      scope: 'company',
      department_id: null,
    };

    setPermissions({
      ...permissions,
      [key]: {
        ...current,
        [permType]: !current[permType],
      },
    });
  };

  const setScope = (moduleId: string, scope: string) => {
    const key = `${moduleId}-global`;
    const current = permissions[key];

    if (current) {
      setPermissions({
        ...permissions,
        [key]: {
          ...current,
          scope,
        },
      });
    }
  };

  const savePermissions = async () => {
    if (!currentCompany || !selectedRole) return;

    try {
      setSaving(true);

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;

      const permissionsToUpsert = Object.values(permissions).map(perm => ({
        id: perm.id,
        role_id: selectedRole,
        module_id: perm.module_id,
        company_id: currentCompany.id,
        department_id: perm.department_id,
        can_read: perm.can_read,
        can_write: perm.can_write,
        can_delete: perm.can_delete,
        can_approve: perm.can_approve,
        can_export: perm.can_export,
        scope: perm.scope,
        is_active: true,
        granted_by: currentUserId,
      }));

      const { error } = await supabase
        .from('role_module_permissions')
        .upsert(permissionsToUpsert);

      if (error) throw error;

      showToast('Permissions saved successfully', 'success');
      await loadPermissions(selectedRole);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredModules = modules.filter(m =>
    m.display_name.toLowerCase().includes(filterText.toLowerCase()) ||
    m.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          >
            {roles.map(role => (
              <option key={role.id} value={role.id}>
                {role.role.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Filter modules..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            onClick={savePermissions}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                Module
              </th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                Read
              </th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                Write
              </th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                Delete
              </th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                Approve
              </th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                Export
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                Scope
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredModules.map((module) => {
              const key = `${module.id}-global`;
              const perm = permissions[key] || {
                can_read: false,
                can_write: false,
                can_delete: false,
                can_approve: false,
                can_export: false,
                scope: 'company',
              };

              return (
                <tr key={module.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {module.display_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {module.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePermission(module.id, 'can_read')}
                      className={`p-2 rounded-lg transition-colors ${
                        perm.can_read
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {perm.can_read ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePermission(module.id, 'can_write')}
                      className={`p-2 rounded-lg transition-colors ${
                        perm.can_write
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {perm.can_write ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePermission(module.id, 'can_delete')}
                      className={`p-2 rounded-lg transition-colors ${
                        perm.can_delete
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {perm.can_delete ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePermission(module.id, 'can_approve')}
                      className={`p-2 rounded-lg transition-colors ${
                        perm.can_approve
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {perm.can_approve ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePermission(module.id, 'can_export')}
                      className={`p-2 rounded-lg transition-colors ${
                        perm.can_export
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {perm.can_export ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={perm.scope}
                      onChange={(e) => setScope(module.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="global">Global</option>
                      <option value="company">Company</option>
                      <option value="department">Department</option>
                      <option value="team">Team</option>
                      <option value="own">Own Data</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No modules found matching your filter</p>
        </div>
      )}
    </div>
  );
}
