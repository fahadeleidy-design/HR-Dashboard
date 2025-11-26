import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AttendanceRecord {
  date: string;
  status: string;
  working_hours: number;
  overtime_hours: number;
  late_minutes: number;
}

interface AttendanceAnalyticsProps {
  records: AttendanceRecord[];
}

export function AttendanceAnalytics({ records }: AttendanceAnalyticsProps) {
  const analytics = useMemo(() => {
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const halfDay = records.filter(r => r.status === 'half_day').length;

    const totalWorkingHours = records.reduce((sum, r) => sum + (r.working_hours || 0), 0);
    const totalOvertimeHours = records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
    const avgLateMinutes = records.length > 0
      ? records.reduce((sum, r) => sum + (r.late_minutes || 0), 0) / records.length
      : 0;

    const attendanceRate = records.length > 0 ? ((present + late + halfDay) / records.length) * 100 : 0;
    const punctualityRate = records.length > 0 ? (present / records.length) * 100 : 0;

    return {
      present,
      absent,
      late,
      halfDay,
      totalWorkingHours,
      totalOvertimeHours,
      avgLateMinutes,
      attendanceRate,
      punctualityRate,
    };
  }, [records]);

  const statusData = [
    { name: 'Present', value: analytics.present, color: '#10B981' },
    { name: 'Late', value: analytics.late, color: '#F59E0B' },
    { name: 'Absent', value: analytics.absent, color: '#EF4444' },
    { name: 'Half Day', value: analytics.halfDay, color: '#8B5CF6' },
  ];

  const dailyTrend = useMemo(() => {
    const grouped = records.reduce((acc, record) => {
      const date = new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[date]) {
        acc[date] = { date, hours: 0, overtime: 0, count: 0 };
      }
      acc[date].hours += record.working_hours || 0;
      acc[date].overtime += record.overtime_hours || 0;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).slice(-14);
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Attendance Rate</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{analytics.attendanceRate.toFixed(1)}%</p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>On track</span>
              </div>
            </div>
            <div className="h-14 w-14 bg-green-200 rounded-full flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Punctuality Rate</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{analytics.punctualityRate.toFixed(1)}%</p>
              <div className="flex items-center mt-2 text-sm text-blue-600">
                <Clock className="h-4 w-4 mr-1" />
                <span>{analytics.late} late arrivals</span>
              </div>
            </div>
            <div className="h-14 w-14 bg-blue-200 rounded-full flex items-center justify-center">
              <Calendar className="h-7 w-7 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-6 border border-violet-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-700">Total Hours</p>
              <p className="text-3xl font-bold text-violet-900 mt-2">{analytics.totalWorkingHours.toFixed(1)}h</p>
              <div className="flex items-center mt-2 text-sm text-violet-600">
                <Clock className="h-4 w-4 mr-1" />
                <span>+{analytics.totalOvertimeHours.toFixed(1)}h OT</span>
              </div>
            </div>
            <div className="h-14 w-14 bg-violet-200 rounded-full flex items-center justify-center">
              <Clock className="h-7 w-7 text-violet-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Avg Late Time</p>
              <p className="text-3xl font-bold text-amber-900 mt-2">{analytics.avgLateMinutes.toFixed(0)} min</p>
              <div className="flex items-center mt-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Per late arrival</span>
              </div>
            </div>
            <div className="h-14 w-14 bg-amber-200 rounded-full flex items-center justify-center">
              <TrendingDown className="h-7 w-7 text-amber-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Hours Trend (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#3B82F6" name="Working Hours" strokeWidth={2} />
              <Line type="monotone" dataKey="overtime" stroke="#8B5CF6" name="Overtime" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
