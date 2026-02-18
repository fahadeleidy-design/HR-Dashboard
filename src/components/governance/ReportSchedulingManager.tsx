import { useState, useEffect } from 'react';
import { Calendar, Clock, Play, Pause, Edit2, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { format } from 'date-fns';

interface ReportSchedule {
  id: string;
  report_configuration_id: string;
  frequency: string;
  schedule_time: string;
  schedule_day: number | null;
  timezone: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  failure_count: number;
  report_configuration: {
    id: string;
    custom_name: string | null;
    report_definition: {
      name: string;
      category: string;
    };
  };
}

export default function ReportSchedulingManager() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    report_configuration_id: '',
    frequency: 'monthly' as 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    schedule_time: '08:00',
    schedule_day: 1,
    schedule_month: 1,
    timezone: 'Asia/Riyadh',
    is_active: true,
    notify_on_success: false,
    notify_on_failure: true,
  });

  const { showToast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useCompany();

  const frequencyOptions = [
    { value: 'daily', label: 'Daily', description: 'Run every day at specified time' },
    { value: 'weekly', label: 'Weekly', description: 'Run every week on specified day' },
    { value: 'monthly', label: 'Monthly', description: 'Run every month on specified day' },
    { value: 'quarterly', label: 'Quarterly', description: 'Run every quarter' },
    { value: 'yearly', label: 'Yearly', description: 'Run once per year' },
  ];

  const dayOfWeekOptions = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
  ];

  useEffect(() => {
    if (currentCompany?.id) {
      loadSchedules();
      loadConfigurations();
    }
  }, [currentCompany]);

  async function loadSchedules() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('report_schedules')
        .select(`
          *,
          report_configuration:report_configurations(
            id,
            custom_name,
            report_definition:report_definitions(name, category)
          )
        `)
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadConfigurations() {
    try {
      const { data, error } = await supabase
        .from('report_configurations')
        .select(`
          id,
          custom_name,
          report_definition:report_definitions(name, category)
        `)
        .eq('company_id', currentCompany!.id)
        .eq('is_enabled', true);

      if (error) throw error;
      setConfigurations(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleSaveSchedule() {
    try {
      const scheduleData = {
        company_id: currentCompany!.id,
        report_configuration_id: scheduleForm.report_configuration_id,
        frequency: scheduleForm.frequency,
        schedule_time: scheduleForm.schedule_time,
        schedule_day: ['weekly', 'monthly'].includes(scheduleForm.frequency)
          ? scheduleForm.schedule_day
          : null,
        schedule_month: scheduleForm.frequency === 'yearly' ? scheduleForm.schedule_month : null,
        timezone: scheduleForm.timezone,
        is_active: scheduleForm.is_active,
        notify_on_success: scheduleForm.notify_on_success,
        notify_on_failure: scheduleForm.notify_on_failure,
        start_date: new Date().toISOString().split('T')[0],
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('report_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        showToast('Schedule updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('report_schedules')
          .insert({
            ...scheduleData,
            created_by: user!.id,
          });

        if (error) throw error;
        showToast('Schedule created successfully', 'success');
      }

      setShowModal(false);
      setEditingSchedule(null);
      await loadSchedules();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleToggleSchedule(scheduleId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('report_schedules')
        .update({ is_active: !currentStatus })
        .eq('id', scheduleId);

      if (error) throw error;

      showToast(`Schedule ${!currentStatus ? 'activated' : 'paused'}`, 'success');
      await loadSchedules();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const { error } = await supabase
        .from('report_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      showToast('Schedule deleted successfully', 'success');
      await loadSchedules();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  function openNewScheduleModal() {
    setEditingSchedule(null);
    setScheduleForm({
      report_configuration_id: '',
      frequency: 'monthly',
      schedule_time: '08:00',
      schedule_day: 1,
      schedule_month: 1,
      timezone: 'Asia/Riyadh',
      is_active: true,
      notify_on_success: false,
      notify_on_failure: true,
    });
    setShowModal(true);
  }

  function openEditModal(schedule: ReportSchedule) {
    setEditingSchedule(schedule);
    setScheduleForm({
      report_configuration_id: schedule.report_configuration_id,
      frequency: schedule.frequency as any,
      schedule_time: schedule.schedule_time,
      schedule_day: schedule.schedule_day || 1,
      schedule_month: 1,
      timezone: schedule.timezone,
      is_active: schedule.is_active,
      notify_on_success: false,
      notify_on_failure: true,
    });
    setShowModal(true);
  }

  if (loading) {
    return <div className="text-center py-8">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Schedules</h2>
          <p className="text-sm text-gray-600 mt-1">
            Automate report generation and distribution
          </p>
        </div>
        <button
          onClick={openNewScheduleModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No report schedules configured</p>
          <button
            onClick={openNewScheduleModal}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first schedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map(schedule => {
            const reportName =
              schedule.report_configuration.custom_name ||
              schedule.report_configuration.report_definition.name;

            return (
              <div
                key={schedule.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  schedule.is_active ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{reportName}</h3>
                      {schedule.is_active ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          Paused
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {schedule.report_configuration.report_definition.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Frequency</div>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Calendar className="w-4 h-4" />
                          <span className="capitalize">{schedule.frequency}</span>
                          {schedule.schedule_day && (
                            <span className="text-gray-600">
                              (Day {schedule.schedule_day})
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600 mb-1">Schedule Time</div>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Clock className="w-4 h-4" />
                          {schedule.schedule_time} {schedule.timezone}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600 mb-1">Next Run</div>
                        <div className="text-gray-900">
                          {schedule.next_run_at
                            ? format(new Date(schedule.next_run_at), 'MMM dd, yyyy HH:mm')
                            : 'Not scheduled'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div>
                        <div className="text-sm text-gray-600">Total Runs</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {schedule.run_count}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600">Last Run</div>
                        <div className="text-sm text-gray-900">
                          {schedule.last_run_at
                            ? format(new Date(schedule.last_run_at), 'MMM dd, yyyy HH:mm')
                            : 'Never'}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600">Failures</div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-2xl font-bold ${
                              schedule.failure_count > 0
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}
                          >
                            {schedule.failure_count}
                          </span>
                          {schedule.failure_count > 0 && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() =>
                        handleToggleSchedule(schedule.id, schedule.is_active)
                      }
                      className={`p-2 rounded-lg ${
                        schedule.is_active
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={schedule.is_active ? 'Pause' : 'Activate'}
                    >
                      {schedule.is_active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(schedule)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold">
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report *
                </label>
                <select
                  value={scheduleForm.report_configuration_id}
                  onChange={e =>
                    setScheduleForm({
                      ...scheduleForm,
                      report_configuration_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a report...</option>
                  {configurations.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.custom_name || config.report_definition.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency *
                </label>
                <select
                  value={scheduleForm.frequency}
                  onChange={e =>
                    setScheduleForm({
                      ...scheduleForm,
                      frequency: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {frequencyOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.schedule_time}
                    onChange={e =>
                      setScheduleForm({
                        ...scheduleForm,
                        schedule_time: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {scheduleForm.frequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day of Week *
                    </label>
                    <select
                      value={scheduleForm.schedule_day}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          schedule_day: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {dayOfWeekOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scheduleForm.frequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day of Month *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={scheduleForm.schedule_day}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          schedule_day: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notifications
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={scheduleForm.notify_on_success}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          notify_on_success: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Notify on successful execution
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={scheduleForm.notify_on_failure}
                      onChange={e =>
                        setScheduleForm({
                          ...scheduleForm,
                          notify_on_failure: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Notify on execution failure
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scheduleForm.is_active}
                    onChange={e =>
                      setScheduleForm({
                        ...scheduleForm,
                        is_active: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Activate schedule immediately
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingSchedule(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={!scheduleForm.report_configuration_id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
