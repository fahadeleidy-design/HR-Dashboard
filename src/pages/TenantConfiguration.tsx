import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import {
  Settings, Palette, Shield, Zap, Bell, Mail, Globe,
  Save, AlertCircle, CheckCircle, Eye
} from 'lucide-react';

interface TenantConfig {
  id: string;
  company_id: string;
  feature_flags: Record<string, boolean>;
  business_rules: Record<string, any>;
  workflow_settings: Record<string, any>;
  compliance_settings: Record<string, boolean>;
  notification_settings: Record<string, boolean>;
}

interface TenantBranding {
  id: string;
  company_id: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme_config: Record<string, any>;
  custom_domain: string | null;
  email_templates: Record<string, any>;
  terminology: Record<string, string>;
}

export default function TenantConfiguration() {
  const { currentCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<'features' | 'branding' | 'workflow' | 'compliance'>('features');
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentCompany) {
      loadConfiguration();
    }
  }, [currentCompany]);

  const loadConfiguration = async () => {
    if (!currentCompany) return;

    try {
      const [configRes, brandingRes] = await Promise.all([
        supabase
          .from('tenant_configurations')
          .select('*')
          .eq('company_id', currentCompany.id)
          .maybeSingle(),
        supabase
          .from('tenant_branding')
          .select('*')
          .eq('company_id', currentCompany.id)
          .maybeSingle()
      ]);

      if (configRes.data) setConfig(configRes.data);
      if (brandingRes.data) setBranding(brandingRes.data);

      if (!configRes.data) {
        await createDefaultConfig();
      }
      if (!brandingRes.data) {
        await createDefaultBranding();
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultConfig = async () => {
    const { data } = await supabase
      .from('tenant_configurations')
      .insert([{ company_id: currentCompany?.id }])
      .select()
      .maybeSingle();
    if (data) setConfig(data);
  };

  const createDefaultBranding = async () => {
    const { data } = await supabase
      .from('tenant_branding')
      .insert([{ company_id: currentCompany?.id }])
      .select()
      .maybeSingle();
    if (data) setBranding(data);
  };

  const saveConfiguration = async () => {
    if (!currentCompany || !config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_configurations')
        .update({
          feature_flags: config.feature_flags,
          business_rules: config.business_rules,
          workflow_settings: config.workflow_settings,
          compliance_settings: config.compliance_settings,
          notification_settings: config.notification_settings
        })
        .eq('company_id', currentCompany.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Configuration saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const saveBranding = async () => {
    if (!currentCompany || !branding) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_branding')
        .update({
          logo_url: branding.logo_url,
          favicon_url: branding.favicon_url,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color,
          theme_config: branding.theme_config,
          custom_domain: branding.custom_domain,
          email_templates: branding.email_templates,
          terminology: branding.terminology
        })
        .eq('company_id', currentCompany.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Branding saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save branding' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updateFeatureFlag = (feature: string, enabled: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      feature_flags: {
        ...config.feature_flags,
        [feature]: enabled
      }
    });
  };

  const updateBrandingField = (field: string, value: any) => {
    if (!branding) return;
    setBranding({
      ...branding,
      [field]: value
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'features', label: 'Features & Modules', icon: Zap },
    { id: 'branding', label: 'White-labeling', icon: Palette },
    { id: 'workflow', label: 'Workflows & Rules', icon: Settings },
    { id: 'compliance', label: 'Compliance & Security', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tenant Configuration</h1>
          <p className="mt-1 text-sm text-gray-600">
            Customize features, branding, and settings for {currentCompany?.name_en}
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'features' && config && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(config.feature_flags).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{feature}</p>
                        <p className="text-sm text-gray-500">Enable {feature} module</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => updateFeatureFlag(feature, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={saveConfiguration}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'branding' && branding && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Brand Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.primary_color}
                        onChange={(e) => updateBrandingField('primary_color', e.target.value)}
                        className="h-10 w-20 rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={branding.primary_color}
                        onChange={(e) => updateBrandingField('primary_color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.secondary_color}
                        onChange={(e) => updateBrandingField('secondary_color', e.target.value)}
                        className="h-10 w-20 rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={branding.secondary_color}
                        onChange={(e) => updateBrandingField('secondary_color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accent Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.accent_color}
                        onChange={(e) => updateBrandingField('accent_color', e.target.value)}
                        className="h-10 w-20 rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={branding.accent_color}
                        onChange={(e) => updateBrandingField('accent_color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Branding Assets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo URL
                    </label>
                    <input
                      type="text"
                      value={branding.logo_url || ''}
                      onChange={(e) => updateBrandingField('logo_url', e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Favicon URL
                    </label>
                    <input
                      type="text"
                      value={branding.favicon_url || ''}
                      onChange={(e) => updateBrandingField('favicon_url', e.target.value)}
                      placeholder="https://example.com/favicon.ico"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Domain
                    </label>
                    <div className="flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={branding.custom_domain || ''}
                        onChange={(e) => updateBrandingField('custom_domain', e.target.value)}
                        placeholder="hr.yourcompany.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Terminology</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(branding.terminology).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                        {key}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          const newTerminology = { ...branding.terminology, [key]: e.target.value };
                          updateBrandingField('terminology', newTerminology);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={saveBranding}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? 'Saving...' : 'Save Branding'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && config && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Rules</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Probation Period (Days)
                    </label>
                    <input
                      type="number"
                      value={config.business_rules.probation_period_days}
                      onChange={(e) => {
                        const newRules = { ...config.business_rules, probation_period_days: parseInt(e.target.value) };
                        setConfig({ ...config, business_rules: newRules });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expense Approval Threshold (SAR)
                    </label>
                    <input
                      type="number"
                      value={config.business_rules.expense_approval_threshold}
                      onChange={(e) => {
                        const newRules = { ...config.business_rules, expense_approval_threshold: parseInt(e.target.value) };
                        setConfig({ ...config, business_rules: newRules });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loan Approval Levels
                    </label>
                    <input
                      type="number"
                      value={config.business_rules.loan_approval_levels}
                      onChange={(e) => {
                        const newRules = { ...config.business_rules, loan_approval_levels: parseInt(e.target.value) };
                        setConfig({ ...config, business_rules: newRules });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={saveConfiguration}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? 'Saving...' : 'Save Rules'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && config && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Settings</h3>
                <div className="space-y-4">
                  {Object.entries(config.compliance_settings).map(([setting, enabled]) => (
                    <div key={setting} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {setting.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-500">Enable {setting.replace(/_/g, ' ')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => {
                            const newSettings = { ...config.compliance_settings, [setting]: e.target.checked };
                            setConfig({ ...config, compliance_settings: newSettings });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                <div className="space-y-4">
                  {Object.entries(config.notification_settings).map(([setting, enabled]) => (
                    <div key={setting} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {setting.includes('email') && <Mail className="w-5 h-5 text-gray-400" />}
                        {setting.includes('push') && <Bell className="w-5 h-5 text-gray-400" />}
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {setting.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-gray-500">Enable {setting.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => {
                            const newSettings = { ...config.notification_settings, [setting]: e.target.checked };
                            setConfig({ ...config, notification_settings: newSettings });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={saveConfiguration}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
