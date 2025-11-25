import { useState, useEffect } from 'react';
import { User, FileText, Calendar, Clock, Award, Target, TrendingUp, Bell, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmployeeSelfServiceProps {
  employeeId: string;
  companyId: string;
}

interface EmployeeProfile {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  email: string;
  mobile: string;
  position: string;
  hire_date: string;
  department?: { name_en: string };
  photo_url?: string;
}

interface QuickStats {
  pending_leaves: number;
  upcoming_reviews: number;
  active_goals: number;
  training_hours: number;
  documents_expiring: number;
}

export function EmployeeSelfService({ employeeId, companyId }: EmployeeSelfServiceProps) {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [stats, setStats] = useState<QuickStats>({
    pending_leaves: 0,
    upcoming_reviews: 0,
    active_goals: 0,
    training_hours: 0,
    documents_expiring: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'goals' | 'time'>('overview');

  useEffect(() => {
    fetchEmployeeData();
    fetchQuickStats();
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          first_name_en,
          last_name_en,
          email,
          mobile,
          position,
          hire_date,
          photo_url,
          department:departments(name_en)
        `)
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      setEmployee(data);
    } catch (error) {
      console.error('Error fetching employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuickStats = async () => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const [goalsData, trainingData, documentsData] = await Promise.all([
        supabase
          .from('employee_goals')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('status', 'active'),

        supabase
          .from('employee_training_records')
          .select('duration_hours')
          .eq('employee_id', employeeId)
          .eq('completion_status', 'completed'),

        supabase
          .from('employee_documents')
          .select('id')
          .eq('employee_id', employeeId)
          .not('expiry_date', 'is', null)
          .lte('expiry_date', thirtyDaysFromNow.toISOString())
      ]);

      const totalTrainingHours = trainingData.data?.reduce((sum, record) => sum + (record.duration_hours || 0), 0) || 0;

      setStats({
        pending_leaves: 0,
        upcoming_reviews: 0,
        active_goals: goalsData.data?.length || 0,
        training_hours: totalTrainingHours,
        documents_expiring: documentsData.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getTenure = (hireDate: string) => {
    const hire = new Date(hireDate);
    const now = new Date();
    const years = now.getFullYear() - hire.getFullYear();
    const months = now.getMonth() - hire.getMonth();

    if (years === 0) {
      return `${months} months`;
    } else if (months < 0) {
      return `${years - 1}y ${12 + months}m`;
    } else {
      return `${years}y ${months}m`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900">Employee Not Found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    alt={`${employee.first_name_en} ${employee.last_name_en}`}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full border-4 border-white bg-white flex items-center justify-center">
                    <span className="text-3xl font-bold text-blue-600">
                      {getInitials(employee.first_name_en, employee.last_name_en)}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 h-6 w-6 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-1">
                  {employee.first_name_en} {employee.last_name_en}
                </h1>
                <p className="text-lg opacity-90 mb-2">{employee.position}</p>
                <div className="flex items-center gap-4 text-sm opacity-80">
                  <span>{employee.employee_number}</span>
                  <span>•</span>
                  <span>{employee.department?.name_en}</span>
                  <span>•</span>
                  <span>{getTenure(employee.hire_date)} tenure</span>
                </div>
              </div>
            </div>
            <button className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-medium transition-colors">
              <Settings className="h-5 w-5 inline mr-2" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Active Goals</p>
              <p className="text-2xl font-bold text-blue-600">{stats.active_goals}</p>
            </div>
            <Target className="h-8 w-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Training Hours</p>
              <p className="text-2xl font-bold text-green-600">{stats.training_hours}h</p>
            </div>
            <Award className="h-8 w-8 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Pending Leaves</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_leaves}</p>
            </div>
            <Calendar className="h-8 w-8 text-yellow-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Reviews Due</p>
              <p className="text-2xl font-bold text-purple-600">{stats.upcoming_reviews}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Docs Expiring</p>
              <p className="text-2xl font-bold text-red-600">{stats.documents_expiring}</p>
            </div>
            <FileText className="h-8 w-8 text-red-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'documents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              My Documents
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'goals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Target className="h-4 w-4 inline mr-2" />
              Goals & Development
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'time'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Time & Attendance
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-sm font-medium text-gray-900">{employee.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Mobile</p>
                      <p className="text-sm font-medium text-gray-900">{employee.mobile}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Hire Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(employee.hire_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Request Leave
                    </button>
                    <button className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Clock In/Out
                    </button>
                    <button className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      View Payslip
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">No recent activities</p>
                      <p className="text-xs text-gray-500">Your activities will appear here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Document management will be displayed here</p>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Goals and development plans will be displayed here</p>
            </div>
          )}

          {activeTab === 'time' && (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Time and attendance records will be displayed here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
