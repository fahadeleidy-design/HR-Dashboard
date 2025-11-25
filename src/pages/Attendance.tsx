import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Download, Users } from 'lucide-react';
import { ScrollableTable } from '@/components/ScrollableTable';
import { useSortableData, SortableTableHeader } from '@/components/SortableTable';
import { EmptyState } from '@/components/EmptyState';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import * as XLSX from 'xlsx';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
  };
}

export function Attendance() {
  const { currentCompany } = useCompany();
  const { t, isRTL, language } = useLanguage();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (currentCompany) {
      fetchAttendance();
    }
  }, [currentCompany, selectedMonth]);

  const fetchAttendance = async () => {
    if (!currentCompany) return;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = attendanceRecords.map((record) => ({
      'Employee Number': record.employee.employee_number,
      'Employee Name': `${record.employee.first_name_en} ${record.employee.last_name_en}`,
      Date: record.date,
      'Check In': record.check_in,
      'Check Out': record.check_out || 'N/A',
      'Total Hours': record.total_hours || 0,
      'Overtime Hours': record.overtime_hours || 0,
      Status: record.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${selectedMonth}.xlsx`);
  };

  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
  const totalOvertime = attendanceRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);

  const { sortedData, sortConfig, requestSort } = useSortableData(attendanceRecords);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div>
          <h1 className={`text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent ${isRTL ? 'text-right' : 'text-left'}`}>{t.attendance.title}</h1>
          <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.attendance.subtitle}</p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            <Calendar className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none`} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 hover:border-gray-300 bg-white`}
            />
          </div>
          <button
            onClick={handleExport}
            disabled={attendanceRecords.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium transition-all duration-200 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 hover:shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="h-4 w-4" />
            <span>{t.common.export}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t.attendance.present}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{presentCount}</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
              <Calendar className="h-7 w-7 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t.attendance.absent}</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{absentCount}</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
              <Calendar className="h-7 w-7 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t.attendance.late}</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{lateCount}</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
              <Clock className="h-7 w-7 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t.attendance.totalOvertime}</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{totalOvertime.toFixed(1)}h</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <Clock className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {attendanceRecords.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={t.attendance.noRecords || "No Attendance Records"}
          description={t.attendance.noRecordsDesc || "Attendance records for the selected month will appear here"}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
          <ScrollableTable maxHeight="calc(100vh - 350px)">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
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
                  label="Total Hours"
                  sortKey="total_hours"
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
                  label="Status"
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={requestSort}
                />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-150">
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
                      {record.check_in}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.check_out || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.overtime_hours ? `${record.overtime_hours.toFixed(1)}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
                        record.status === 'present'
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 hover:shadow-md'
                          : record.status === 'absent'
                          ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 hover:shadow-md'
                          : record.status === 'late'
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 hover:shadow-md'
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 hover:shadow-md'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ScrollableTable>
      </div>
      )}
    </div>
  );
}
