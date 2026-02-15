import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import {
  Mail, Send, CheckCircle, AlertCircle, RefreshCw,
  Eye, EyeOff, Loader2
} from 'lucide-react';

interface SmtpConfig {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass_encrypted: string;
  default_from_email: string;
  default_from_name: string;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
}

interface QueueStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  cancelled: number;
  total: number;
}

export function EmailSettings() {
  const { currentCompany } = useCompany();
  const { isRTL } = useLanguage();
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [form, setForm] = useState({
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_secure: true,
    smtp_user: '',
    smtp_pass_encrypted: '',
    default_from_email: '',
    default_from_name: '',
    is_active: false,
  });
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (currentCompany) {
      fetchConfig();
      fetchQueueStats();
    }
  }, [currentCompany]);

  const fetchConfig = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_smtp_config')
        .select('*')
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
        setForm({
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_secure: data.smtp_secure,
          smtp_user: data.smtp_user,
          smtp_pass_encrypted: data.smtp_pass_encrypted,
          default_from_email: data.default_from_email,
          default_from_name: data.default_from_name,
          is_active: data.is_active,
        });
      }
    } catch (error) {
      logError(error, 'medium', { component: 'EmailSettings', action: 'fetchSMTPConfig' });
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    if (!currentCompany) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_queue_stats',
          company_id: currentCompany.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setQueueStats(result.stats);
      }
    } catch (error) {
      logError(error, 'medium', { component: 'EmailSettings', action: 'fetchQueueStats' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setSaving(true);
    setTestResult(null);
    try {
      const configData = {
        company_id: currentCompany.id,
        ...form,
      };

      if (config) {
        const { error } = await supabase
          .from('email_smtp_config')
          .update(configData)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_smtp_config')
          .insert([configData]);
        if (error) throw error;
      }

      await fetchConfig();
      setTestResult({ success: true, message: 'Configuration saved successfully.' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!currentCompany) return;

    setTesting(true);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTestResult({ success: false, message: 'Please log in first.' });
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_smtp',
          company_id: currentCompany.id,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setTestResult({ success: true, message: 'Test email sent successfully! Check your inbox.' });
      } else {
        setTestResult({ success: false, message: result.error || 'Test failed.' });
      }

      await fetchConfig();
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Failed to test connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleProcessQueue = async () => {
    if (!currentCompany) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_queue',
          batch_size: 20,
        }),
      });

      await fetchQueueStats();
    } catch (error) {
      logError(error, 'medium', { component: 'EmailSettings', action: 'processQueue' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className={`flex items-center gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="p-3 bg-teal-50 rounded-lg">
            <Mail className="h-8 w-8 text-teal-600" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-xl font-bold text-gray-900">Email Configuration</h2>
            <p className="text-gray-600 text-sm">Configure SMTP settings for sending emails from the system</p>
          </div>
        </div>

        {config?.last_tested_at && (
          <div className={`mb-6 p-4 rounded-lg border ${
            config.last_test_result === 'success'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {config.last_test_result === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  config.last_test_result === 'success' ? 'text-emerald-900' : 'text-red-900'
                }`}>
                  Last test: {config.last_test_result === 'success' ? 'Successful' : 'Failed'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(config.last_tested_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host *</label>
              <input
                type="text"
                required
                value={form.smtp_host}
                onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                placeholder="smtp.office365.com"
              />
              <p className="text-xs text-gray-500 mt-1">Office365 default: smtp.office365.com</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port *</label>
              <input
                type="number"
                required
                value={form.smtp_port}
                onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value) || 587 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">SSL: 465, TLS: 587</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username *</label>
              <input
                type="text"
                required
                value={form.smtp_user}
                onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                placeholder="hr@yourdomain.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.smtp_pass_encrypted}
                  onChange={(e) => setForm({ ...form, smtp_pass_encrypted: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default From Email *</label>
              <input
                type="email"
                required
                value={form.default_from_email}
                onChange={(e) => setForm({ ...form, default_from_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                placeholder="hr@yourdomain.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default From Name</label>
              <input
                type="text"
                value={form.default_from_name}
                onChange={(e) => setForm({ ...form, default_from_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                placeholder="HR Department"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.smtp_secure}
                  onChange={(e) => setForm({ ...form, smtp_secure: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">Use SSL/TLS</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable email sending</span>
              </label>
            </div>
          </div>

          <div className={`mt-6 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {config && (
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !config.is_active}
                className="px-5 py-2.5 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
            </button>
          </div>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
                <p className={`text-sm font-medium ${
                  testResult.success ? 'text-emerald-800' : 'text-red-800'
                }`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </form>
      </div>

      {queueStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">Email Queue</h3>
              <span className="text-sm text-gray-500">({queueStats.total} total)</span>
            </div>
            <button
              onClick={handleProcessQueue}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Process Queue
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-center">
              <div className="text-2xl font-bold text-amber-700">{queueStats.pending}</div>
              <div className="text-xs font-medium text-amber-600 mt-1">Pending</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
              <div className="text-2xl font-bold text-blue-700">{queueStats.sending}</div>
              <div className="text-xs font-medium text-blue-600 mt-1">Sending</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
              <div className="text-2xl font-bold text-emerald-700">{queueStats.sent}</div>
              <div className="text-xs font-medium text-emerald-600 mt-1">Sent</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
              <div className="text-2xl font-bold text-red-700">{queueStats.failed}</div>
              <div className="text-xs font-medium text-red-600 mt-1">Failed</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-gray-700">{queueStats.cancelled}</div>
              <div className="text-xs font-medium text-gray-600 mt-1">Cancelled</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
