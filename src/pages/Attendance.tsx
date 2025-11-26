import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Download, Users, BarChart3, FileText, Settings, AlertTriangle } from 'lucide-react';
import { ScrollableTable } from '@/components/ScrollableTable';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { EmptyState } from '@/components/EmptyState';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { AttendanceAnalytics } from '@/components/attendance/AttendanceAnalytics';
import { AttendanceRequests } from '@/components/attendance/AttendanceRequests';
import { AttendanceExceptions } from '@/components/attendance/AttendanceExceptions';
import * as XLSX from 'xlsx';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  working_hours: number | null;
  overtime_hours: number | null;
  late_minutes: number | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
  is_manual_entry: boolean;
  notes: string | null;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
  };
}

type TabType = 'dashboard' | 'records' | 'analytics' | 'requests' | 'exceptions' | 'settings';

export function Attendance() {
  const { currentCompany } = useCompany();
  const { t } = useLanguage();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceRequests, setAttendanceRequests] = useState<any[]>([]);
  const [attendanceExceptions, setAttendanceExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  useEffect(() => {
    if (currentCompany) {
      fetchAllData();
      subscribeToChanges();
    }
  }, [currentCompany, selectedMonth]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAttendance(),
      fetchRequests(),
      fetchExceptions(),
    ]);
    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!currentCompany) return;

    try {
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = new Date(selectedMonth + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      const endDate = endOfMonth.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .gte('date', startOfMonth)
        .lt('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchRequests = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('attendance_requests')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAttendanceRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchExceptions = async () => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('attendance_exceptions')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAttendanceExceptions(data || []);
    } catch (error) {
      console.error('Error fetching exceptions:', error);
    }
  };

  const subscribeToChanges = () => {
    if (!currentCompany) return;

    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleExport = () => {
    const exportData = attendanceRecords.map((record) => ({
      'Employee Number': record.employee.employee_number,
      'Employee Name': `${record.employee.first_name_en} ${record.employee.last_name_en}`,
      Date: record.date,
      'Check In': record.check_in,
      'Check Out': record.check_out || 'N/A',
      'Working Hours': record.working_hours || 0,
      'Overtime Hours': record.overtime_hours || 0,
      'Late Minutes': record.late_minutes || 0,
      Status: record.status,
      'Manual Entry': record.is_manual_entry ? 'Yes' : 'No',
      Notes: record.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${selectedMonth}.xlsx`);
  };

  const handleApproveRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance_requests')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleRejectRequest = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('attendance_requests')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approver_notes: notes,
        })
        .eq('id', id);

      if (error) throw error;
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleResolveException = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('attendance_exceptions')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', id);

      if (error) throw error;
      fetchExceptions();
    } catch (error) {
      console.error('Error resolving exception:', error);
    }
  };

  const calculateDashboardStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === today);

    return {
      todayPresent: todayRecords.filter(r => r.status === 'present').length,
      todayAbsent: todayRecords.filter(r => r.status === 'absent').length,
      todayLate: todayRecords.filter(r => r.status === 'late').length,
      todayOnTime: todayRecords.filter(r => r.status === 'present' && (r.late_minutes || 0) === 0).length,
      totalEmployees: 100,
      checkedIn: todayRecords.length,
      notCheckedIn: 100 - todayRecords.length,
      exceptions: attendanceExceptions.filter(e => !e.is_resolved).length,
      averageCheckInTime: '9:05 AM',
      overtimeToday: todayRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
    };
  };

  const { sortedData, sortConfig, requestSort } = useSortableData(attendanceRecords);

  if (loading) {
    return <PageSkeleton />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'requests', label: 'Requests', icon: Clock, badge: attendanceRequests.filter(r => r.status === 'pending').length },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle, badge: attendanceExceptions.filter(e => !e.is_resolved).length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Attendance System</h1>
          <p className="text-gray-600 mt-1">Comprehensive attendance tracking and management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={attendanceRecords.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <AttendanceDashboard stats={calculateDashboardStats()} onRefresh={fetchAllData} />
          )}

          {activeTab === 'records' && (
            <div className="space-y-4">
              {attendanceRecords.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No Attendance Records"
                  description="Attendance records for the selected month will appear here"
                />
              ) : (
                <ScrollableTable maxHeight="calc(100vh - 400px)">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <SortableTableHeader
                          label="Employee"
                          sortKey="employee.first_name_en"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Date"
                          sortKey="date"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Check In"
                          sortKey="check_in"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Check Out"
                          sortKey="check_out"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Working Hours"
                          sortKey="working_hours"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Overtime"
                          sortKey="overtime_hours"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Late (min)"
                          sortKey="late_minutes"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <SortableTableHeader
                          label="Status"
                          sortKey="status"
                          currentSort={sortConfig}
                          onSort={requestSort}
                        />
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {record.employee.first_name_en} {record.employee.last_name_en}
                            </div>
                            <div className="text-sm text-gray-500">{record.employee.employee_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.check_in).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.working_hours ? `${record.working_hours.toFixed(1)}h` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {record.overtime_hours ? (
                              <span className="text-blue-600 font-medium">{record.overtime_hours.toFixed(1)}h</span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {record.late_minutes && record.late_minutes > 0 ? (
                              <span className="text-red-600 font-medium">{record.late_minutes}</span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : record.status === 'late'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.is_manual_entry && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                Manual
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <AttendanceAnalytics records={attendanceRecords} />
          )}

          {activeTab === 'requests' && (
            <AttendanceRequests
              requests={attendanceRequests}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          )}

          {activeTab === 'exceptions' && (
            <AttendanceExceptions
              exceptions={attendanceExceptions}
              onResolve={handleResolveException}
            />
          )}

          {activeTab === 'settings' && (
            <div className="text-center py-12">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Attendance Settings</h3>
              <p className="text-gray-600">Configure policies, shifts, and attendance rules</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
