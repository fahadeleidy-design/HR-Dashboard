import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface DashboardStats {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayOnTime: number;
  totalEmployees: number;
  checkedIn: number;
  notCheckedIn: number;
  exceptions: number;
  averageCheckInTime: string;
  overtimeToday: number;
}

interface AttendanceDashboardProps {
  stats: DashboardStats;
  onRefresh: () => void;
}

export function AttendanceDashboard({ stats, onRefresh }: AttendanceDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const attendancePercentage = stats.totalEmployees > 0
    ? ((stats.checkedIn / stats.totalEmployees) * 100).toFixed(1)
    : '0.0';

  const punctualityPercentage = stats.checkedIn > 0
    ? ((stats.todayOnTime / stats.checkedIn) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Today's Attendance</h2>
            <p className="text-blue-100 mt-2">{currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p className="text-5xl font-bold mt-4">{currentTime.toLocaleTimeString()}</p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
              <p className="text-blue-100 text-sm">Checked In</p>
              <p className="text-4xl font-bold">{stats.checkedIn}/{stats.totalEmployees}</p>
              <p className="text-blue-100 text-sm mt-1">{attendancePercentage}% Present</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">On Time</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.todayOnTime}</p>
              <p className="text-sm text-gray-500 mt-1">{punctualityPercentage}% punctual</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.todayLate}</p>
              <p className="text-sm text-gray-500 mt-1">Avg: {stats.averageCheckInTime}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Not Checked In</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.notCheckedIn}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.todayAbsent > 0 && `${stats.todayAbsent} absent`}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Exceptions</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.exceptions}</p>
              <p className="text-sm text-gray-500 mt-1">Require attention</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-6 border border-violet-200">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-violet-200 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-violet-700">Total Employees</p>
              <p className="text-2xl font-bold text-violet-900">{stats.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-200 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Overtime Today</p>
              <p className="text-2xl font-bold text-blue-900">{stats.overtimeToday.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-green-200 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Attendance Rate</p>
              <p className="text-2xl font-bold text-green-900">{attendancePercentage}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
