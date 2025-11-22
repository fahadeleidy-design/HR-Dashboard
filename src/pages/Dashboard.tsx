import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Users, UserCheck, UserX, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  saudiEmployees: number;
  nonSaudiEmployees: number;
  saudizationPercentage: number;
  nitaqatColor: string;
  pendingLeaveRequests: number;
  expiringDocuments: number;
}

export function Dashboard() {
  const { currentCompany } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    saudiEmployees: 0,
    nonSaudiEmployees: 0,
    saudizationPercentage: 0,
    nitaqatColor: 'green',
    pendingLeaveRequests: 0,
    expiringDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) {
      fetchDashboardStats();
    }
  }, [currentCompany]);

  const fetchDashboardStats = async () => {
    if (!currentCompany) return;

    setLoading(true);

    try {
      const [employeesResult, leaveRequestsResult, documentsResult] = await Promise.all([
        supabase
          .from('employees')
          .select('status, is_saudi')
          .eq('company_id', currentCompany.id),
        supabase
          .from('leave_requests')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('status', 'pending'),
        supabase
          .from('documents')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('status', 'active')
          .lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
          .gte('expiry_date', new Date().toISOString()),
      ]);

      const employees = employeesResult.data || [];
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(e => e.status === 'active').length;
      const saudiEmployees = employees.filter(e => e.is_saudi && e.status === 'active').length;
      const nonSaudiEmployees = activeEmployees - saudiEmployees;
      const saudizationPercentage = activeEmployees > 0
        ? Math.round((saudiEmployees / activeEmployees) * 100)
        : 0;

      let nitaqatColor = 'red';
      if (saudizationPercentage >= 40) nitaqatColor = 'platinum';
      else if (saudizationPercentage >= 30) nitaqatColor = 'green';
      else if (saudizationPercentage >= 20) nitaqatColor = 'yellow';

      setStats({
        totalEmployees,
        activeEmployees,
        saudiEmployees,
        nonSaudiEmployees,
        saudizationPercentage,
        nitaqatColor,
        pendingLeaveRequests: leaveRequestsResult.data?.length || 0,
        expiringDocuments: documentsResult.data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNitaqatColorClass = (color: string) => {
    switch (color) {
      case 'platinum':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to Saudi HR Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
            </div>
            <Users className="h-12 w-12 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeEmployees}</p>
            </div>
            <UserCheck className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saudi Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.saudiEmployees}</p>
            </div>
            <UserCheck className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Non-Saudi Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.nonSaudiEmployees}</p>
            </div>
            <UserX className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Nitaqat Compliance</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Saudization Rate</span>
                <span className="text-2xl font-bold text-gray-900">{stats.saudizationPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
                  style={{ width: `${stats.saudizationPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getNitaqatColorClass(
                  stats.nitaqatColor
                )}`}
              >
                {stats.nitaqatColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-yellow-600" />
                <span className="text-sm text-gray-700">Pending Leave Requests</span>
              </div>
              <span className="text-lg font-bold text-yellow-700">{stats.pendingLeaveRequests}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-gray-700">Expiring Documents (90 days)</span>
              </div>
              <span className="text-lg font-bold text-red-700">{stats.expiringDocuments}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
