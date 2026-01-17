import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Trash2, Save, Search, Calendar } from 'lucide-react';

interface UserPermission {
  id?: string;
  user_id: string;
  module_id: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  scope: string;
  override_type: string;
  reason: string;
  expires_at: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_id: string;
}

interface PermissionModule {
  id: string;
  name: string;
  display_name: string;
}

export default function UserPermissionOverrides() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [overrides, setOverrides] = useState<UserPermission[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [newOverride, setNewOverride] = useState<Partial<UserPermission>>({
    module_id: '',
    can_read: false,
    can_write: false,
    can_delete: false,
    can_approve: false,
    can_export: false,
    scope: 'own',
    override_type: 'grant',
    reason: '',
    expires_at: null,
  });

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  useEffect(() => {
    if (selectedUser) {
      loadUserOverrides(selectedUser);
    }
  }, [selectedUser]);

  const loadData = async () => {
    if (!currentCompany) return;

    try {
      setLoading(true);

      const [employeesRes, modulesRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, first_name, last_name, email, user_id')
          .eq('company_id', currentCompany.id)
          .not('user_id', 'is', null)
          .order('first_name'),
        supabase
          .from('permission_modules')
          .select('id, name, display_name')
          .eq('is_active', true)
          .order('display_order'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (modulesRes.error) throw modulesRes.error;

      setEmployees(employeesRes.data || []);
      setModules(modulesRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserOverrides = async (userId: string) => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', currentCompany.id);

      if (error) throw error;
      setOverrides(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const addOverride = async () => {
    if (!currentCompany || !selectedUser || !newOverride.module_id) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_module_permissions')
        .insert({
          user_id: selectedUser,
          module_id: newOverride.module_id,
          company_id: currentCompany.id,
          can_read: newOverride.can_read,
          can_write: newOverride.can_write,
          can_delete: newOverride.can_delete,
          can_approve: newOverride.can_approve,
          can_export: newOverride.can_export,
          scope: newOverride.scope,
          override_type: newOverride.override_type,
          reason: newOverride.reason,
          expires_at: newOverride.expires_at,
          granted_by: userData.user?.id,
        });

      if (error) throw error;

      showToast('Permission override added successfully', 'success');
      setShowAddModal(false);
      setNewOverride({
        module_id: '',
        can_read: false,
        can_write: false,
        can_delete: false,
        can_approve: false,
        can_export: false,
        scope: 'own',
        override_type: 'grant',
        reason: '',
        expires_at: null,
      });
      await loadUserOverrides(selectedUser);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const deleteOverride = async (overrideId: string) => {
    if (!confirm('Are you sure you want to delete this permission override?')) return;

    try {
      const { error } = await supabase
        .from('user_module_permissions')
        .delete()
        .eq('id', overrideId);

      if (error) throw error;

      showToast('Permission override deleted successfully', 'success');
      await loadUserOverrides(selectedUser);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading user permissions...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="">Select a user...</option>
            {filteredEmployees.map(emp => (
              <option key={emp.id} value={emp.user_id}>
                {emp.first_name} {emp.last_name} - {emp.email}
              </option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Override
          </button>
        )}
      </div>

      {selectedUser && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Active Permission Overrides</h3>

          {overrides.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No permission overrides for this user</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first override
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {overrides.map((override) => {
                const module = modules.find(m => m.id === override.module_id);
                return (
                  <div
                    key={override.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">
                            {module?.display_name || 'Unknown Module'}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            override.override_type === 'grant'
                              ? 'bg-green-100 text-green-700'
                              : override.override_type === 'deny'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {override.override_type.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            Scope: {override.scope}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-3">
                          <PermissionBadge label="Read" enabled={override.can_read} />
                          <PermissionBadge label="Write" enabled={override.can_write} />
                          <PermissionBadge label="Delete" enabled={override.can_delete} />
                          <PermissionBadge label="Approve" enabled={override.can_approve} />
                          <PermissionBadge label="Export" enabled={override.can_export} />
                        </div>

                        {override.reason && (
                          <p className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Reason:</span> {override.reason}
                          </p>
                        )}

                        {override.expires_at && (
                          <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Expires: {new Date(override.expires_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => deleteOverride(override.id!)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Add Permission Override</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module
                </label>
                <select
                  value={newOverride.module_id}
                  onChange={(e) => setNewOverride({ ...newOverride, module_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select a module...</option>
                  {modules.map(mod => (
                    <option key={mod.id} value={mod.id}>{mod.display_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Override Type
                </label>
                <select
                  value={newOverride.override_type}
                  onChange={(e) => setNewOverride({ ...newOverride, override_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="grant">Grant (Add permissions)</option>
                  <option value="deny">Deny (Remove permissions)</option>
                  <option value="extend">Extend (Expand scope)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['can_read', 'can_write', 'can_delete', 'can_approve', 'can_export'] as const).map(perm => (
                    <label key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newOverride[perm]}
                        onChange={(e) => setNewOverride({ ...newOverride, [perm]: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        {perm.replace('can_', '').charAt(0).toUpperCase() + perm.replace('can_', '').slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scope
                </label>
                <select
                  value={newOverride.scope}
                  onChange={(e) => setNewOverride({ ...newOverride, scope: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="global">Global</option>
                  <option value="company">Company</option>
                  <option value="department">Department</option>
                  <option value="team">Team</option>
                  <option value="own">Own Data</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Required)
                </label>
                <textarea
                  value={newOverride.reason}
                  onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows={3}
                  placeholder="Explain why this override is necessary..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={newOverride.expires_at || ''}
                  onChange={(e) => setNewOverride({ ...newOverride, expires_at: e.target.value || null })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addOverride}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      enabled
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-400'
    }`}>
      {label}
    </span>
  );
}
