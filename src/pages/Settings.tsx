import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Building2, Users, Plus, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { UserRoleManagement } from '@/components/UserRoleManagement';

interface Department {
  id: string;
  name_en: string;
  name_ar: string | null;
  description: string | null;
  created_at: string;
}

interface GOSIConfig {
  id: string;
  establishment_number: string | null;
  client_id: string | null;
  client_secret: string | null;
  private_key: string | null;
  x_apikey: string | null;
  environment: 'sandbox' | 'production';
  last_sync_date: string | null;
  sync_enabled: boolean;
}

interface NitaqatSector {
  id: string;
  name_en: string;
  name_ar: string | null;
  code: string;
}

interface Company {
  id: string;
  name_en: string;
  name_ar: string | null;
  cr_number: string | null;
  establishment_number: string | null;
  nitaqat_entity_size: string;
  nitaqat_activity: string;
  nitaqat_sector_id: string | null;
  establishment_date: string | null;
  nitaqat_calculation_method: 'average_26_weeks' | 'immediate';
}

export function Settings() {
  const { currentCompany, companies } = useCompany();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [gosiConfig, setGosiConfig] = useState<GOSIConfig | null>(null);
  const [gosiLoading, setGosiLoading] = useState(false);
  const [gosiTesting, setGosiTesting] = useState(false);
  const [gosiTestResult, setGosiTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [gosiForm, setGosiForm] = useState({
    establishment_number: '',
    client_id: '',
    client_secret: '',
    private_key: '',
    x_apikey: 'L6LK4GEAAIVrQbVo4AOVrQk781kvIT3X',
    environment: 'sandbox' as 'sandbox' | 'production',
    sync_enabled: false,
  });
  const [nitaqatSectors, setNitaqatSectors] = useState<NitaqatSector[]>([]);
  const [companyForm, setCompanyForm] = useState({
    nitaqat_sector_id: '',
    establishment_date: '',
    nitaqat_calculation_method: 'average_26_weeks' as 'average_26_weeks' | 'immediate',
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name_en: '',
    name_ar: '',
    description: '',
  });

  useEffect(() => {
    if (currentCompany) {
      fetchDepartments();
      fetchGOSIConfig();
      fetchNitaqatSectors();
      setCompanyForm({
        nitaqat_sector_id: currentCompany.nitaqat_sector_id || '',
        establishment_date: currentCompany.establishment_date || '',
        nitaqat_calculation_method: currentCompany.nitaqat_calculation_method || 'average_26_weeks',
      });
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

  const fetchNitaqatSectors = async () => {
    try {
      const { data, error } = await supabase
        .from('nitaqat_sectors')
        .select('*')
        .order('name_en');

      if (error) throw error;
      setNitaqatSectors(data || []);
    } catch (error) {
      console.error('Error fetching Nitaqat sectors:', error);
    }
  };

  const fetchGOSIConfig = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('gosi_api_config')
        .select('*')
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGosiConfig(data);
        setGosiForm({
          establishment_number: data.establishment_number || '',
          client_id: data.client_id || '',
          client_secret: data.client_secret || '',
          private_key: data.private_key || '',
          x_apikey: data.x_apikey || 'L6LK4GEAAIVrQbVo4AOVrQk781kvIT3X',
          environment: data.environment,
          sync_enabled: data.sync_enabled,
        });
      }
    } catch (error) {
      console.error('Error fetching GOSI config:', error);
    }
  };

  const handleTestGOSIConnection = async () => {
    if (!currentCompany || !gosiConfig) {
      alert('Please save your GOSI configuration first');
      return;
    }

    setGosiTesting(true);
    setGosiTestResult(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gosi-api`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Please log in to test GOSI connection');
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_connection',
          company_id: currentCompany.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setGosiTestResult({
          success: true,
          message: result.message || 'Connection successful!'
        });
      } else {
        setGosiTestResult({
          success: false,
          message: result.error || 'Connection failed'
        });
      }
    } catch (error: any) {
      console.error('GOSI test error:', error);
      setGosiTestResult({
        success: false,
        message: error.message || 'Failed to test connection'
      });
    } finally {
      setGosiTesting(false);
    }
  };

  const handleSaveGOSIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setGosiLoading(true);
    setGosiTestResult(null);
    try {
      const configData = {
        company_id: currentCompany.id,
        establishment_number: gosiForm.establishment_number || null,
        client_id: gosiForm.client_id || null,
        client_secret: gosiForm.client_secret || null,
        private_key: gosiForm.private_key || null,
        x_apikey: gosiForm.x_apikey || null,
        environment: gosiForm.environment,
        sync_enabled: gosiForm.sync_enabled,
        updated_at: new Date().toISOString(),
      };

      if (gosiConfig) {
        const { error } = await supabase
          .from('gosi_api_config')
          .update(configData)
          .eq('id', gosiConfig.id);
        if (error) throw error;
        alert('GOSI configuration updated successfully!');
      } else {
        const { error } = await supabase
          .from('gosi_api_config')
          .insert([configData]);
        if (error) throw error;
        alert('GOSI configuration saved successfully!');
      }

      fetchGOSIConfig();
    } catch (error: any) {
      console.error('Error saving GOSI config:', error);
      alert(error.message || 'Failed to save GOSI configuration');
    } finally {
      setGosiLoading(false);
    }
  };

  const handleUpdateCompanyNitaqat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setCompanyLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          nitaqat_sector_id: companyForm.nitaqat_sector_id || null,
          establishment_date: companyForm.establishment_date || null,
          nitaqat_calculation_method: companyForm.nitaqat_calculation_method,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentCompany.id);

      if (error) throw error;
      alert('Nitaqat configuration updated successfully!');
    } catch (error: any) {
      console.error('Error updating company:', error);
      alert(error.message || 'Failed to update Nitaqat configuration');
    } finally {
      setCompanyLoading(false);
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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Building2 className="h-12 w-12 text-green-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nitaqat Configuration</h2>
            <p className="text-gray-600">Configure sector and calculation method for Nitaqat tracking</p>
          </div>
        </div>

        <form onSubmit={handleUpdateCompanyNitaqat}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nitaqat Sector *
              </label>
              <select
                required
                value={companyForm.nitaqat_sector_id}
                onChange={(e) => setCompanyForm({ ...companyForm, nitaqat_sector_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a sector...</option>
                {nitaqatSectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name_en} {sector.name_ar ? `(${sector.name_ar})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select your company's primary economic sector as registered with HRSD
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Establishment Date
              </label>
              <input
                type="date"
                value={companyForm.establishment_date}
                onChange={(e) => setCompanyForm({ ...companyForm, establishment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to determine if entity is newly established (&lt; 13 weeks)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculation Method
              </label>
              <select
                value={companyForm.nitaqat_calculation_method}
                onChange={(e) => setCompanyForm({ ...companyForm, nitaqat_calculation_method: e.target.value as 'average_26_weeks' | 'immediate' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="average_26_weeks">Traditional (26-Week Average)</option>
                <option value="immediate">Immediate (1-Week Calculation)</option>
              </select>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-900 font-medium mb-1">About Calculation Methods:</p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>Traditional (26-Week Average):</strong> Default method for most establishments. Calculates based on 26-week average to reduce risk of quick band changes.</li>
                  <li><strong>Immediate (1-Week):</strong> Only applies if: (a) Entity in Low Green+ for 13 consecutive weeks, (b) Newly established (&lt; 13 weeks), or (c) Small-A entity (≤ 5 employees).</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={companyLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {companyLoading ? 'Updating...' : 'Update Configuration'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Shield className="h-12 w-12 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">GOSI API Integration</h2>
            <p className="text-gray-600">Configure GOSI (General Organization for Social Insurance) API connection</p>
          </div>
        </div>

        {gosiConfig && gosiConfig.last_sync_date && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Last Sync Successful</p>
              <p className="text-sm text-green-700">
                {new Date(gosiConfig.last_sync_date).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Important Security Notice</p>
            <p className="text-sm text-yellow-700">
              Your GOSI API credentials are encrypted and stored securely. Never share your API key with anyone.
              Use sandbox environment for testing before switching to production.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveGOSIConfig}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GOSI Establishment Number *
              </label>
              <input
                type="text"
                required
                value={gosiForm.establishment_number}
                onChange={(e) => setGosiForm({ ...gosiForm, establishment_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your GOSI establishment number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID *
              </label>
              <input
                type="text"
                required
                value={gosiForm.client_id}
                onChange={(e) => setGosiForm({ ...gosiForm, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your GOSI Client ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret *
              </label>
              <input
                type="password"
                required
                value={gosiForm.client_secret}
                onChange={(e) => setGosiForm({ ...gosiForm, client_secret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your GOSI Client Secret"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Private Key *
              </label>
              <textarea
                rows={6}
                required
                value={gosiForm.private_key}
                onChange={(e) => setGosiForm({ ...gosiForm, private_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Paste your GOSI Private Key here (RSA or PEM format)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste the entire private key including BEGIN and END markers. This key is used to generate DPoP tokens.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                x-apikey
              </label>
              <input
                type="text"
                value={gosiForm.x_apikey}
                onChange={(e) => setGosiForm({ ...gosiForm, x_apikey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="L6LK4GEAAIVrQbVo4AOVrQk781kvIT3X"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default x-apikey is pre-filled. Same for both Sandbox and Production environments.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Environment
              </label>
              <select
                value={gosiForm.environment}
                onChange={(e) => setGosiForm({ ...gosiForm, environment: e.target.value as 'sandbox' | 'production' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gosiForm.sync_enabled}
                  onChange={(e) => setGosiForm({ ...gosiForm, sync_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable Automatic Sync</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div>
              {gosiConfig && (
                <button
                  type="button"
                  onClick={handleTestGOSIConnection}
                  disabled={gosiTesting}
                  className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {gosiTesting ? 'Testing...' : 'Test Connection'}
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={gosiLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {gosiLoading ? 'Saving...' : gosiConfig ? 'Update Configuration' : 'Save Configuration'}
            </button>
          </div>

          {gosiTestResult && (
            <div className={`mt-4 p-4 rounded-md ${
              gosiTestResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                {gosiTestResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    gosiTestResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {gosiTestResult.success ? 'Connection Successful!' : 'Connection Failed'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    gosiTestResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {gosiTestResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
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

      <div className="mt-6">
        <UserRoleManagement />
      </div>
    </div>
  );
}
