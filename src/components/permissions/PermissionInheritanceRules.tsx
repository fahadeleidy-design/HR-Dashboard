import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { GitBranch, Plus, Trash2, Save, Edit2 } from 'lucide-react';

interface InheritanceRule {
  id?: string;
  rule_name: string;
  parent_role: string;
  child_role: string;
  inherit_mode: string;
  module_filters: string[];
  permission_filters: {
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
    can_approve: boolean;
    can_export: boolean;
  };
  scope_inheritance: string;
  is_active: boolean;
}

interface PermissionModule {
  id: string;
  name: string;
  display_name: string;
}

const AVAILABLE_ROLES = [
  'super_admin',
  'tenant_admin',
  'admin',
  'hr_manager',
  'manager',
  'employee',
];

export default function PermissionInheritanceRules() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [rules, setRules] = useState<InheritanceRule[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<InheritanceRule | null>(null);

  const [newRule, setNewRule] = useState<Partial<InheritanceRule>>({
    rule_name: '',
    parent_role: '',
    child_role: '',
    inherit_mode: 'partial',
    module_filters: [],
    permission_filters: {
      can_read: true,
      can_write: false,
      can_delete: false,
      can_approve: false,
      can_export: false,
    },
    scope_inheritance: 'inherit',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  const loadData = async () => {
    if (!currentCompany) return;

    try {
      setLoading(true);

      const [rulesRes, modulesRes] = await Promise.all([
        supabase
          .from('permission_inheritance_rules')
          .select('*')
          .eq('company_id', currentCompany.id)
          .order('priority', { ascending: false }),
        supabase
          .from('permission_modules')
          .select('id, name, display_name')
          .eq('is_active', true)
          .order('display_order'),
      ]);

      if (rulesRes.error) throw rulesRes.error;
      if (modulesRes.error) throw modulesRes.error;

      setRules(rulesRes.data || []);
      setModules(modulesRes.data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveRule = async () => {
    if (!currentCompany || !newRule.parent_role || !newRule.child_role || !newRule.rule_name) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const ruleData = {
        ...(editingRule?.id && { id: editingRule.id }),
        rule_name: newRule.rule_name,
        parent_role: newRule.parent_role,
        child_role: newRule.child_role,
        company_id: currentCompany.id,
        inherit_mode: newRule.inherit_mode,
        module_filters: newRule.module_filters,
        permission_filters: newRule.permission_filters,
        scope_inheritance: newRule.scope_inheritance,
        is_active: newRule.is_active,
      };

      const { error } = await supabase
        .from('permission_inheritance_rules')
        .upsert(ruleData);

      if (error) throw error;

      showToast(
        editingRule ? 'Inheritance rule updated successfully' : 'Inheritance rule created successfully',
        'success'
      );
      setShowAddModal(false);
      setEditingRule(null);
      setNewRule({
        rule_name: '',
        parent_role: '',
        child_role: '',
        inherit_mode: 'partial',
        module_filters: [],
        permission_filters: {
          can_read: true,
          can_write: false,
          can_delete: false,
          can_approve: false,
          can_export: false,
        },
        scope_inheritance: 'inherit',
        is_active: true,
      });
      await loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this inheritance rule?')) return;

    try {
      const { error } = await supabase
        .from('permission_inheritance_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      showToast('Inheritance rule deleted successfully', 'success');
      await loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const editRule = (rule: InheritanceRule) => {
    setEditingRule(rule);
    setNewRule(rule);
    setShowAddModal(true);
  };

  const toggleModule = (moduleName: string) => {
    const current = newRule.module_filters || [];
    const updated = current.includes(moduleName)
      ? current.filter(m => m !== moduleName)
      : [...current, moduleName];
    setNewRule({ ...newRule, module_filters: updated });
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading inheritance rules...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Permission Inheritance Rules</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define how permissions are inherited between roles
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRule(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No inheritance rules configured</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first rule
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900">{rule.rule_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rule.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {rule.inherit_mode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="font-medium text-gray-900">
                      {rule.parent_role.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span>→</span>
                    <span className="font-medium text-gray-900">
                      {rule.child_role.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {rule.permission_filters.can_read && (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Read</span>
                    )}
                    {rule.permission_filters.can_write && (
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">Write</span>
                    )}
                    {rule.permission_filters.can_delete && (
                      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Delete</span>
                    )}
                    {rule.permission_filters.can_approve && (
                      <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">Approve</span>
                    )}
                    {rule.permission_filters.can_export && (
                      <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">Export</span>
                    )}
                  </div>

                  {rule.module_filters && rule.module_filters.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Filtered to:</span> {rule.module_filters.length} module(s)
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Scope:</span> {rule.scope_inheritance.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editRule(rule)}
                    className="text-blue-600 hover:text-blue-700 p-2"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id!)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingRule ? 'Edit Inheritance Rule' : 'Create Inheritance Rule'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRule.rule_name}
                  onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="e.g., Manager inherits from HR Manager"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Role (Inherits From)
                  </label>
                  <select
                    value={newRule.parent_role}
                    onChange={(e) => setNewRule({ ...newRule, parent_role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Select parent role...</option>
                    {AVAILABLE_ROLES.map(role => (
                      <option key={role} value={role}>
                        {role.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Child Role (Inherits To)
                  </label>
                  <select
                    value={newRule.child_role}
                    onChange={(e) => setNewRule({ ...newRule, child_role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Select child role...</option>
                    {AVAILABLE_ROLES.map(role => (
                      <option key={role} value={role}>
                        {role.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inheritance Mode
                </label>
                <select
                  value={newRule.inherit_mode}
                  onChange={(e) => setNewRule({ ...newRule, inherit_mode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="full">Full - Inherit all permissions</option>
                  <option value="partial">Partial - Inherit selected permissions</option>
                  <option value="additive">Additive - Add to existing permissions</option>
                  <option value="restrictive">Restrictive - Limit inherited permissions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions to Inherit
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['can_read', 'can_write', 'can_delete', 'can_approve', 'can_export'] as const).map(perm => (
                    <label key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newRule.permission_filters?.[perm]}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          permission_filters: {
                            ...newRule.permission_filters!,
                            [perm]: e.target.checked,
                          },
                        })}
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
                  Scope Inheritance
                </label>
                <select
                  value={newRule.scope_inheritance}
                  onChange={(e) => setNewRule({ ...newRule, scope_inheritance: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="inherit">Inherit - Keep parent scope</option>
                  <option value="restrict_to_department">Restrict to Department</option>
                  <option value="restrict_to_team">Restrict to Team</option>
                  <option value="restrict_to_own">Restrict to Own Data</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module Filters (Optional)
                </label>
                <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-3">
                    Leave empty to apply to all modules, or select specific modules
                  </p>
                  {modules.map(mod => (
                    <label key={mod.id} className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        checked={newRule.module_filters?.includes(mod.name)}
                        onChange={() => toggleModule(mod.name)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{mod.display_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRule.is_active}
                    onChange={(e) => setNewRule({ ...newRule, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Rule is active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRule(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
