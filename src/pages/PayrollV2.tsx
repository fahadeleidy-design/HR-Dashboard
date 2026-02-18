import { useState, useEffect } from 'react';
import { DollarSign, FileText, Settings, BarChart3, Download, Shield, Save, Loader } from 'lucide-react';
import ComprehensivePayrollDashboard from '../components/payroll/ComprehensivePayrollDashboard';
import WPSFileGenerator from '../components/payroll/WPSFileGenerator';
import { PayrollComponentConfig } from '../components/payroll/PayrollComponentConfig';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface PayrollSettingsData {
  saudi_employee_gosi_rate: number;
  saudi_employer_gosi_rate: number;
  non_saudi_gosi_rate: number;
  gosi_max_base: number;
  payroll_frequency: string;
  payment_day: number;
  attendance_cutoff_day: number;
  calculation_lead_days: number;
  income_tax_threshold: number;
  zakat_rate: number;
  auto_deduct_zakat: boolean;
  ramadan_adjust_hours: boolean;
  ramadan_working_hours: number;
}

const DEFAULT_SETTINGS: PayrollSettingsData = {
  saudi_employee_gosi_rate: 9.75,
  saudi_employer_gosi_rate: 12.0,
  non_saudi_gosi_rate: 2.0,
  gosi_max_base: 45000,
  payroll_frequency: 'monthly',
  payment_day: 1,
  attendance_cutoff_day: 25,
  calculation_lead_days: 5,
  income_tax_threshold: 0,
  zakat_rate: 2.5,
  auto_deduct_zakat: true,
  ramadan_adjust_hours: true,
  ramadan_working_hours: 6,
};

function PayrollReports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payroll Reports</h2>
        <p className="text-sm text-gray-600 mt-1">
          Comprehensive payroll analytics and statutory reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Payroll Register', description: 'Detailed payroll breakdown by employee', icon: FileText },
          { name: 'GOSI Report', description: 'Monthly GOSI contributions report', icon: Shield },
          { name: 'Tax Report', description: 'Income tax withholding summary', icon: FileText },
          { name: 'Cost Center Report', description: 'Payroll costs by cost center', icon: BarChart3 },
          { name: 'Bank Transfer File', description: 'Bank file for salary transfers', icon: Download },
          { name: 'Payroll Summary', description: 'Executive payroll summary', icon: DollarSign },
        ].map((report, index) => {
          const Icon = report.icon;
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                  <button className="text-sm text-green-600 hover:text-green-700 font-medium mt-2">
                    Generate →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PayrollSettingsPanel({ companyId }: { companyId: string }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PayrollSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [companyId]);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll_settings')
        .select('id, setting_key, setting_value')
        .eq('company_id', companyId)
        .eq('setting_key', 'payroll_config')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        const val = data.setting_value as Partial<PayrollSettingsData>;
        setSettings({ ...DEFAULT_SETTINGS, ...val });
      }
    } catch {
      // use defaults if table not found
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      let error;
      if (settingsId) {
        const result = await supabase
          .from('payroll_settings')
          .update({ setting_value: settings })
          .eq('id', settingsId);
        error = result.error;
      } else {
        const result = await supabase
          .from('payroll_settings')
          .insert({ company_id: companyId, setting_key: 'payroll_config', setting_value: settings })
          .select('id')
          .maybeSingle();
        error = result.error;
        if (!error && result.data) setSettingsId(result.data.id);
      }

      if (error) throw error;
      showToast({ type: 'success', title: 'Settings saved successfully' });
    } catch {
      showToast({ type: 'error', title: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof PayrollSettingsData>(key: K, value: PayrollSettingsData[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payroll Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure payroll components, calendars, and calculation rules
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">GOSI Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saudi Employee Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.saudi_employee_gosi_rate}
                onChange={e => update('saudi_employee_gosi_rate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">9% pension + 0.75% unemployment</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saudi Employer Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.saudi_employer_gosi_rate}
                onChange={e => update('saudi_employer_gosi_rate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Non-Saudi Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.non_saudi_gosi_rate}
                onChange={e => update('non_saudi_gosi_rate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Occupational hazards only</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Contribution Base (SAR)
              </label>
              <input
                type="number"
                value={settings.gosi_max_base}
                onChange={e => update('gosi_max_base', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">SAR per month (2024 limit)</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payroll Calendar</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payroll Frequency
              </label>
              <select
                value={settings.payroll_frequency}
                onChange={e => update('payroll_frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="monthly">Monthly</option>
                <option value="semi_monthly">Semi-Monthly</option>
                <option value="bi_weekly">Bi-Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Day
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={settings.payment_day}
                onChange={e => update('payment_day', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Day of month for salary payment</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attendance Cutoff Day
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={settings.attendance_cutoff_day}
                onChange={e => update('attendance_cutoff_day', parseInt(e.target.value) || 25)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Last day to include attendance</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calculation Lead Days
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={settings.calculation_lead_days}
                onChange={e => update('calculation_lead_days', parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Days before payment for processing</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax & Zakat</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Income Tax Threshold (SAR)
              </label>
              <input
                type="number"
                value={settings.income_tax_threshold}
                onChange={e => update('income_tax_threshold', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Monthly income threshold for tax</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zakat Rate - Saudi Nationals (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.zakat_rate}
                onChange={e => update('zakat_rate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Percentage of zakatable income</p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_deduct_zakat}
                  onChange={e => update('auto_deduct_zakat', e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Auto-deduct Zakat</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ramadan Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ramadan_adjust_hours}
                  onChange={e => update('ramadan_adjust_hours', e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  Adjust working hours during Ramadan
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Automatically reduce working hours by 2 hours per Saudi labor law
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ramadan Working Hours
              </label>
              <input
                type="number"
                value={settings.ramadan_working_hours}
                onChange={e => update('ramadan_working_hours', parseInt(e.target.value) || 6)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Hours per day during Ramadan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollV2() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'components' | 'wps' | 'reports' | 'settings'>('dashboard');

  const companyId = profile?.company_id || '';

  const tabs = [
    { id: 'dashboard' as const, label: 'Payroll Dashboard', icon: DollarSign },
    { id: 'components' as const, label: 'Components', icon: Settings },
    { id: 'wps' as const, label: 'WPS Files', icon: Shield },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Comprehensive Payroll System</h1>
        </div>
        <p className="text-green-100">
          Complete payroll processing with GOSI, WPS, tax calculations, and Saudi compliance
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && <ComprehensivePayrollDashboard />}
          {activeTab === 'components' && companyId && <PayrollComponentConfig companyId={companyId} />}
          {activeTab === 'wps' && <WPSFileGenerator />}
          {activeTab === 'reports' && <PayrollReports />}
          {activeTab === 'settings' && companyId && <PayrollSettingsPanel companyId={companyId} />}
        </div>
      </div>
    </div>
  );
}
