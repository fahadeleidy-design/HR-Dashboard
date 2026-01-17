import React, { useState, useEffect } from 'react';
import { Globe, Users, DollarSign, TrendingUp, MapPin, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { Line, Bar } from 'recharts';
import { LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GlobalStats {
  totalCountries: number;
  totalEmployees: number;
  totalPayroll: number;
  expatriates: number;
  expiring_permits: number;
}

interface CountryBreakdown {
  country_code: string;
  country_name: string;
  employee_count: number;
  total_payroll: number;
  currency: string;
}

export default function GlobalHR() {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats>({
    totalCountries: 0,
    totalEmployees: 0,
    totalPayroll: 0,
    expatriates: 0,
    expiring_permits: 0,
  });
  const [countryBreakdown, setCountryBreakdown] = useState<CountryBreakdown[]>([]);
  const [expiringPermits, setExpiringPermits] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'countries' | 'expatriates' | 'compliance'>('overview');

  useEffect(() => {
    if (selectedCompany) {
      loadGlobalData();
    }
  }, [selectedCompany]);

  const loadGlobalData = async () => {
    try {
      setLoading(true);

      const { data: employees } = await supabase
        .from('employees')
        .select('*, employee_work_locations(*)')
        .eq('company_id', selectedCompany!.id)
        .eq('status', 'active');

      const countriesSet = new Set<string>();
      const countryMap = new Map<string, { count: number; payroll: number }>();

      employees?.forEach(emp => {
        if (emp.employee_work_locations && emp.employee_work_locations.length > 0) {
          emp.employee_work_locations.forEach((loc: any) => {
            if (loc.is_active) {
              countriesSet.add(loc.country_code);
              const current = countryMap.get(loc.country_code) || { count: 0, payroll: 0 };
              countryMap.set(loc.country_code, {
                count: current.count + 1,
                payroll: current.payroll + (emp.salary || 0),
              });
            }
          });
        }
      });

      const { data: countries } = await supabase
        .from('countries')
        .select('country_code, name, default_currency_code')
        .in('country_code', Array.from(countriesSet));

      const breakdown: CountryBreakdown[] = [];
      countries?.forEach(country => {
        const data = countryMap.get(country.country_code);
        if (data) {
          breakdown.push({
            country_code: country.country_code,
            country_name: country.name,
            employee_count: data.count,
            total_payroll: data.payroll,
            currency: country.default_currency_code,
          });
        }
      });

      setCountryBreakdown(breakdown);

      const { data: expatData } = await supabase
        .from('expatriates')
        .select('*, employee:employees(full_name)')
        .in('employee_id', employees?.map(e => e.id) || [])
        .eq('status', 'active');

      const { data: permits } = await supabase
        .from('work_permits')
        .select('*, employee:employees(full_name), country:countries(name)')
        .in('employee_id', employees?.map(e => e.id) || [])
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('expiry_date');

      setExpiringPermits(permits || []);

      const { data: assignments } = await supabase
        .from('expatriates')
        .select('*, employee:employees(full_name), home_country:countries!expatriates_home_country_code_fkey(name), host_country:countries!expatriates_host_country_code_fkey(name)')
        .in('employee_id', employees?.map(e => e.id) || [])
        .gte('assignment_start_date', new Date().toISOString().split('T')[0])
        .lte('assignment_start_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('assignment_start_date');

      setUpcomingAssignments(assignments || []);

      setStats({
        totalCountries: countriesSet.size,
        totalEmployees: employees?.length || 0,
        totalPayroll: breakdown.reduce((sum, c) => sum + c.total_payroll, 0),
        expatriates: expatData?.length || 0,
        expiring_permits: permits?.length || 0,
      });

    } catch (error) {
      console.error('Error loading global data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global HR Management</h1>
          <p className="text-gray-600 mt-1">Multi-country operations and compliance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCountries}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payroll</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(stats.totalPayroll)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expatriates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.expatriates}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <MapPin className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Permits</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.expiring_permits}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {['overview', 'countries', 'expatriates', 'compliance'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Workforce by Country</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country_code" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="employee_count" fill="#3b82f6" name="Employees" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedTab === 'countries' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Country Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Payroll</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {countryBreakdown.map((country) => (
                      <tr key={country.country_code} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{country.country_code === 'SA' ? '🇸🇦' : country.country_code === 'US' ? '🇺🇸' : country.country_code === 'GB' ? '🇬🇧' : country.country_code === 'AE' ? '🇦🇪' : '🌍'}</span>
                            <span className="font-medium text-gray-900">{country.country_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{country.employee_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: country.currency }).format(country.total_payroll)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{country.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedTab === 'expatriates' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Assignments</h3>
                {upcomingAssignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No upcoming assignments</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{assignment.employee?.full_name}</p>
                            <p className="text-sm text-gray-600">
                              {assignment.home_country?.name} → {assignment.host_country?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(assignment.assignment_start_date).toLocaleDateString()}
                            </p>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              {assignment.assignment_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'compliance' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expiring Work Permits (Next 90 Days)</h3>
              {expiringPermits.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No permits expiring soon</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expiringPermits.map((permit: any) => (
                    <div key={permit.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{permit.employee?.full_name}</p>
                          <p className="text-sm text-gray-600">{permit.country?.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{permit.permit_type} - {permit.permit_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            Expires: {new Date(permit.expiry_date).toLocaleDateString()}
                          </p>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            permit.status === 'approved' ? 'bg-green-100 text-green-800' :
                            permit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {permit.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
