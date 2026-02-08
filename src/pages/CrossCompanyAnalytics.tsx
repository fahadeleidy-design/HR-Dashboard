import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2, Users, TrendingUp, FileText, Calendar, BarChart3,
  Download, Filter, RefreshCcw
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TenantGroup {
  id: string;
  name: string;
  status: string;
}

interface CrossCompanyData {
  tenant_group_id: string;
  holding_company_name: string;
  total_companies: number;
  active_companies: number;
  total_employees_all_companies: number;
  active_employees_all_companies: number;
  saudi_employees_all_companies: number;
  total_leave_requests: number;
  pending_leave_requests: number;
  total_users: number;
}

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04'];

export default function CrossCompanyAnalytics() {
  const [tenantGroups, setTenantGroups] = useState<TenantGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<CrossCompanyData | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTenantGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadAnalyticsData(selectedGroup);
    }
  }, [selectedGroup]);

  const loadTenantGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_groups')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        setTenantGroups(data);
        setSelectedGroup(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tenant groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async (groupId: string) => {
    setRefreshing(true);
    try {
      const [analyticsRes, companiesRes] = await Promise.all([
        supabase
          .from('v_cross_company_analytics')
          .select('*')
          .eq('tenant_group_id', groupId)
          .maybeSingle(),
        supabase
          .from('companies')
          .select('id, name_en, tenant_status')
          .eq('tenant_group_id', groupId)
      ]);

      if (analyticsRes.data) setAnalyticsData(analyticsRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const exportReport = async () => {
    if (!analyticsData) return;

    try {
      const { data, error } = await supabase.rpc('get_holding_company_report', {
        p_tenant_group_id: selectedGroup
      });

      if (error) throw error;

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `holding-company-report-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (tenantGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Holding Companies</h3>
        <p className="mt-1 text-sm text-gray-500">
          Create a holding company to view cross-company analytics
        </p>
      </div>
    );
  }

  const companyDistribution = companies.map((company) => ({
    name: company.name_en,
    value: 1
  }));

  const employeeData = [
    {
      name: 'Total Employees',
      value: analyticsData?.total_employees_all_companies || 0,
      color: '#2563eb'
    },
    {
      name: 'Active',
      value: analyticsData?.active_employees_all_companies || 0,
      color: '#10b981'
    },
    {
      name: 'Saudi',
      value: analyticsData?.saudi_employees_all_companies || 0,
      color: '#f59e0b'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cross-Company Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Consolidated reporting across all subsidiaries and business units
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => selectedGroup && loadAnalyticsData(selectedGroup)}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCcw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedGroup || ''}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {tenantGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {analyticsData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Companies</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {analyticsData.total_companies}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {analyticsData.active_companies} active
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {analyticsData.total_employees_all_companies.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {analyticsData.active_employees_all_companies} active
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Saudi Employees</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {analyticsData.saudi_employees_all_companies.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {analyticsData.total_employees_all_companies > 0
                      ? Math.round((analyticsData.saudi_employees_all_companies / analyticsData.total_employees_all_companies) * 100)
                      : 0}% Saudization
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Leave Requests</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {analyticsData.total_leave_requests}
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    {analyticsData.pending_leave_requests} pending
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={companyDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {companyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Subsidiary Companies</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{company.name_en}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          company.tenant_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {company.tenant_status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
