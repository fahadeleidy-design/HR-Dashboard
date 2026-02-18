import { useState, useEffect } from 'react';
import { FileText, Plus, Settings, Users, Mail, Shield, Calendar, Eye, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

interface ReportDefinition {
  id: string;
  report_key: string;
  name: string;
  description: string;
  category: string;
  sensitivity: string;
  requires_approval: boolean;
  allowed_roles: string[];
}

interface ReportConfiguration {
  id: string;
  report_definition_id: string;
  custom_name: string | null;
  is_enabled: boolean;
  default_recipients: string[];
  recipient_roles: string[];
  email_subject: string | null;
  requires_approval_override: boolean | null;
  report_definition: ReportDefinition;
}

export default function ReportConfigurationManager() {
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [configurations, setConfigurations] = useState<ReportConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<ReportDefinition | null>(null);
  const [configForm, setConfigForm] = useState({
    custom_name: '',
    is_enabled: true,
    default_recipients: '',
    recipient_roles: [] as string[],
    email_subject: '',
    email_body: '',
    requires_approval_override: null as boolean | null,
  });

  const { showToast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useCompany();

  const categories = [
    { value: 'all', label: 'All Reports', icon: FileText },
    { value: 'payroll', label: 'Payroll', icon: FileText },
    { value: 'compliance', label: 'Compliance', icon: Shield },
    { value: 'hr', label: 'HR', icon: Users },
    { value: 'finance', label: 'Finance', icon: FileText },
  ];

  const roleOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'hr', label: 'HR' },
    { value: 'finance', label: 'Finance' },
    { value: 'manager', label: 'Manager' },
  ];

  useEffect(() => {
    if (currentCompany?.id) {
      loadReportDefinitions();
      loadConfigurations();
    }
  }, [currentCompany]);

  async function loadReportDefinitions() {
    try {
      const { data, error } = await supabase
        .from('report_definitions')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setDefinitions(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function loadConfigurations() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('report_configurations')
        .select(`
          *,
          report_definition:report_definitions(*)
        `)
        .eq('company_id', currentCompany!.id);

      if (error) throw error;
      setConfigurations(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableReport(definition: ReportDefinition) {
    try {
      const { error } = await supabase
        .from('report_configurations')
        .insert({
          company_id: currentCompany!.id,
          report_definition_id: definition.id,
          is_enabled: true,
          created_by: user!.id,
        });

      if (error) throw error;

      showToast(`${definition.name} enabled successfully`, 'success');
      await loadConfigurations();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleToggleConfig(configId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('report_configurations')
        .update({ is_enabled: !currentStatus })
        .eq('id', configId);

      if (error) throw error;

      showToast(`Report ${!currentStatus ? 'enabled' : 'disabled'}`, 'success');
      await loadConfigurations();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleSaveConfiguration() {
    if (!selectedDefinition) return;

    try {
      const existingConfig = configurations.find(
        c => c.report_definition_id === selectedDefinition.id
      );

      const configData = {
        company_id: currentCompany!.id,
        report_definition_id: selectedDefinition.id,
        custom_name: configForm.custom_name || null,
        is_enabled: configForm.is_enabled,
        default_recipients: configForm.default_recipients
          .split(',')
          .map(e => e.trim())
          .filter(e => e),
        recipient_roles: configForm.recipient_roles,
        email_subject: configForm.email_subject || null,
        email_body: configForm.email_body || null,
        requires_approval_override: configForm.requires_approval_override,
        updated_at: new Date().toISOString(),
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('report_configurations')
          .update(configData)
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_configurations')
          .insert({ ...configData, created_by: user!.id });

        if (error) throw error;
      }

      showToast('Configuration saved successfully', 'success');
      setShowConfigModal(false);
      setSelectedDefinition(null);
      await loadConfigurations();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  function openConfigModal(definition: ReportDefinition) {
    const existingConfig = configurations.find(
      c => c.report_definition_id === definition.id
    );

    setSelectedDefinition(definition);
    setConfigForm({
      custom_name: existingConfig?.custom_name || '',
      is_enabled: existingConfig?.is_enabled ?? true,
      default_recipients: existingConfig?.default_recipients?.join(', ') || '',
      recipient_roles: existingConfig?.recipient_roles || [],
      email_subject: existingConfig?.email_subject || '',
      email_body: '',
      requires_approval_override: existingConfig?.requires_approval_override ?? null,
    });
    setShowConfigModal(true);
  }

  const filteredDefinitions = definitions.filter(def =>
    selectedCategory === 'all' || def.category === selectedCategory
  );

  const configuredReportIds = new Set(
    configurations.map(c => c.report_definition_id)
  );

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Governance Reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure automated reporting with role-based distribution
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 border-b border-gray-200">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                selectedCategory === cat.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Report Definitions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDefinitions.map(definition => {
          const config = configurations.find(
            c => c.report_definition_id === definition.id
          );
          const isConfigured = !!config;
          const isEnabled = config?.is_enabled ?? false;

          return (
            <div
              key={definition.id}
              className={`bg-white rounded-lg border-2 p-6 ${
                isEnabled
                  ? 'border-green-200'
                  : isConfigured
                  ? 'border-gray-200'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {config?.custom_name || definition.name}
                    </h3>
                    {isEnabled && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {definition.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        definition.sensitivity === 'confidential' || definition.sensitivity === 'restricted'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <Shield className="w-3 h-3 inline mr-1" />
                      {definition.sensitivity}
                    </span>
                    {definition.requires_approval && (
                      <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">
                        Requires Approval
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                      {definition.category}
                    </span>
                  </div>
                </div>
              </div>

              {config && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm space-y-2">
                  {config.default_recipients.length > 0 && (
                    <div>
                      <span className="font-medium">Recipients: </span>
                      <span className="text-gray-600">
                        {config.default_recipients.join(', ')}
                      </span>
                    </div>
                  )}
                  {config.recipient_roles.length > 0 && (
                    <div>
                      <span className="font-medium">Roles: </span>
                      <span className="text-gray-600">
                        {config.recipient_roles.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {!isConfigured ? (
                  <button
                    onClick={() => handleEnableReport(definition)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Enable Report
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleConfig(config!.id, isEnabled)}
                      className={`px-4 py-2 rounded-lg ${
                        isEnabled
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {isEnabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openConfigModal(definition)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Settings className="w-4 h-4 inline mr-2" />
                      Configure
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedDefinition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Configure Report</h3>
                <button
                  onClick={() => {
                    setShowConfigModal(false);
                    setSelectedDefinition(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {selectedDefinition.name}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Name (Optional)
                </label>
                <input
                  type="text"
                  value={configForm.custom_name}
                  onChange={e =>
                    setConfigForm({ ...configForm, custom_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={selectedDefinition.name}
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={configForm.is_enabled}
                    onChange={e =>
                      setConfigForm({ ...configForm, is_enabled: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable this report
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Recipients (comma-separated emails)
                </label>
                <textarea
                  value={configForm.default_recipients}
                  onChange={e =>
                    setConfigForm({
                      ...configForm,
                      default_recipients: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email1@company.com, email2@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-include Roles
                </label>
                <div className="space-y-2">
                  {roleOptions.map(role => (
                    <label key={role.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={configForm.recipient_roles.includes(role.value)}
                        onChange={e => {
                          if (e.target.checked) {
                            setConfigForm({
                              ...configForm,
                              recipient_roles: [
                                ...configForm.recipient_roles,
                                role.value,
                              ],
                            });
                          } else {
                            setConfigForm({
                              ...configForm,
                              recipient_roles: configForm.recipient_roles.filter(
                                r => r !== role.value
                              ),
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject (Optional)
                </label>
                <input
                  type="text"
                  value={configForm.email_subject}
                  onChange={e =>
                    setConfigForm({ ...configForm, email_subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave empty for default subject"
                />
              </div>

              {selectedDefinition.requires_approval && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Override
                  </label>
                  <select
                    value={configForm.requires_approval_override?.toString() || 'null'}
                    onChange={e => {
                      const value =
                        e.target.value === 'null'
                          ? null
                          : e.target.value === 'true';
                      setConfigForm({
                        ...configForm,
                        requires_approval_override: value,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="null">Use default (requires approval)</option>
                    <option value="true">Always require approval</option>
                    <option value="false">Skip approval for this company</option>
                  </select>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setSelectedDefinition(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfiguration}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
