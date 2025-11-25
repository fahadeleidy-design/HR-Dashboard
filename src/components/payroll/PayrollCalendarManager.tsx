import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Lock, Unlock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PayrollCalendarManagerProps {
  companyId: string;
}

interface PayrollCalendar {
  id: string;
  year: number;
  month: number;
  period_start: string;
  period_end: string;
  cutoff_date: string;
  payment_date: string;
  attendance_start: string;
  attendance_end: string;
  status: string;
  working_days: number;
  public_holidays: number;
  notes?: string;
}

export function PayrollCalendarManager({ companyId }: PayrollCalendarManagerProps) {
  const [calendars, setCalendars] = useState<PayrollCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    period_start: '',
    period_end: '',
    cutoff_date: '',
    payment_date: '',
    working_days: 30,
    public_holidays: 0,
    notes: ''
  });

  useEffect(() => {
    fetchCalendars();
  }, [companyId, selectedYear]);

  const fetchCalendars = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll_calendars')
        .select('*')
        .eq('company_id', companyId)
        .eq('year', selectedYear)
        .order('month');

      if (error) throw error;
      setCalendars(data || []);
    } catch (error) {
      console.error('Error fetching calendars:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendar = async () => {
    try {
      const calendarsToCreate = [];

      for (let month = 1; month <= 12; month++) {
        const periodStart = new Date(selectedYear, month - 1, 1);
        const periodEnd = new Date(selectedYear, month, 0);
        const cutoffDate = new Date(selectedYear, month - 1, 25);
        const paymentDate = new Date(selectedYear, month, 1);

        const daysInMonth = periodEnd.getDate();

        calendarsToCreate.push({
          company_id: companyId,
          year: selectedYear,
          month: month,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          cutoff_date: cutoffDate.toISOString().split('T')[0],
          payment_date: paymentDate.toISOString().split('T')[0],
          attendance_start: periodStart.toISOString().split('T')[0],
          attendance_end: periodEnd.toISOString().split('T')[0],
          status: 'upcoming',
          working_days: Math.floor(daysInMonth * (22/30)),
          public_holidays: 0
        });
      }

      const { error } = await supabase
        .from('payroll_calendars')
        .insert(calendarsToCreate);

      if (error) throw error;

      alert(`Successfully generated calendar for ${selectedYear}!`);
      fetchCalendars();
    } catch (error: any) {
      console.error('Error generating calendar:', error);
      alert('Failed to generate calendar: ' + error.message);
    }
  };

  const updateCalendarStatus = async (calendarId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('payroll_calendars')
        .update({ status: newStatus })
        .eq('id', calendarId);

      if (error) throw error;

      alert(`Calendar status updated to ${newStatus}`);
      fetchCalendars();
    } catch (error: any) {
      console.error('Error updating calendar:', error);
      alert('Failed to update calendar: ' + error.message);
    }
  };

  const saveCalendar = async () => {
    try {
      const { error } = await supabase
        .from('payroll_calendars')
        .insert([{
          company_id: companyId,
          ...formData,
          attendance_start: formData.period_start,
          attendance_end: formData.period_end,
          status: 'upcoming'
        }]);

      if (error) throw error;

      alert('Calendar period created successfully!');
      setShowForm(false);
      fetchCalendars();
    } catch (error: any) {
      console.error('Error saving calendar:', error);
      alert('Failed to save calendar: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'open': return 'bg-green-100 text-green-800';
      case 'locked': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
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
          <h2 className="text-2xl font-bold text-gray-900">Payroll Calendar</h2>
          <p className="text-gray-600 mt-1">Manage pay periods and processing schedules</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 1 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
          {calendars.length === 0 && (
            <button
              onClick={generateCalendar}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Generate Year
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Add Period
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Add Calendar Period</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period Start</label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period End</label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cutoff Date</label>
                  <input
                    type="date"
                    value={formData.cutoff_date}
                    onChange={(e) => setFormData({ ...formData, cutoff_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                  <input
                    type="number"
                    value={formData.working_days}
                    onChange={(e) => setFormData({ ...formData, working_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Public Holidays</label>
                  <input
                    type="number"
                    value={formData.public_holidays}
                    onChange={(e) => setFormData({ ...formData, public_holidays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCalendar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Period
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {calendars.map((calendar) => (
          <div key={calendar.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h3 className="text-2xl font-bold">{getMonthName(calendar.month)}</h3>
                  <p className="text-sm opacity-90">{calendar.year}</p>
                </div>
                <Calendar className="h-8 w-8 opacity-75" />
              </div>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Period:</span>
                <span className="font-medium text-gray-900">
                  {new Date(calendar.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(calendar.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Cutoff:</span>
                <span className="font-medium text-gray-900">
                  {new Date(calendar.cutoff_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Payment:</span>
                <span className="font-medium text-green-600">
                  {new Date(calendar.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Working Days:</span>
                <span className="font-medium text-gray-900">{calendar.working_days}</span>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(calendar.status)}`}>
                    {calendar.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex gap-2">
                  {calendar.status === 'upcoming' && (
                    <button
                      onClick={() => updateCalendarStatus(calendar.id, 'open')}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      <Unlock className="h-4 w-4" />
                      Open
                    </button>
                  )}
                  {calendar.status === 'open' && (
                    <button
                      onClick={() => updateCalendarStatus(calendar.id, 'locked')}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors"
                    >
                      <Lock className="h-4 w-4" />
                      Lock
                    </button>
                  )}
                  {calendar.status === 'locked' && (
                    <button
                      onClick={() => updateCalendarStatus(calendar.id, 'processed')}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Process
                    </button>
                  )}
                  {calendar.status === 'processed' && (
                    <button
                      onClick={() => updateCalendarStatus(calendar.id, 'closed')}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {calendars.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">No Calendar Periods</p>
          <p className="text-sm text-gray-600 mb-6">
            Generate a full year calendar or add individual periods
          </p>
          <button
            onClick={generateCalendar}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Generate {selectedYear} Calendar
          </button>
        </div>
      )}
    </div>
  );
}
