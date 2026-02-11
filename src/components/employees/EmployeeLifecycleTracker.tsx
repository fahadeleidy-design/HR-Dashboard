import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, XCircle, Plus, X, User, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface LifecycleEvent {
  id: string;
  employee_id: string;
  event_type: string;
  event_date: string;
  due_date: string | null;
  status: string;
  priority: string;
  notes: string | null;
  employee?: {
    first_name_en: string;
    last_name_en: string;
    employee_number: string;
  };
}

interface EmployeeLifecycleTrackerProps {
  employeeId?: string;
  onClose: () => void;
}

export function EmployeeLifecycleTracker({ employeeId, onClose }: EmployeeLifecycleTrackerProps) {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const { logError } = useErrorHandler();
  const [formData, setFormData] = useState({
    event_type: 'onboarding',
    event_date: new Date().toISOString().split('T')[0],
    due_date: '',
    priority: 'normal',
    notes: ''
  });

  useEffect(() => {
    if (currentCompany) {
      fetchEvents();
    }
  }, [currentCompany, employeeId, filter]);

  const fetchEvents = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      let query = supabase
        .from('employee_lifecycle_events')
        .select(`
          *,
          employee:employees(first_name_en, last_name_en, employee_number)
        `)
        .eq('company_id', currentCompany.id);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      query = query.order('due_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeLifecycleTracker', action: 'fetchLifecycleEvents' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!currentCompany || !employeeId) return;

    try {
      const { error } = await supabase.from('employee_lifecycle_events').insert([
        {
          company_id: currentCompany.id,
          employee_id: employeeId,
          ...formData,
          created_by: user?.id
        }
      ]);

      if (error) throw error;
      await fetchEvents();
      setShowAddForm(false);
      setFormData({
        event_type: 'onboarding',
        event_date: new Date().toISOString().split('T')[0],
        due_date: '',
        priority: 'normal',
        notes: ''
      });
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeLifecycleTracker', action: 'addLifecycleEvent' });
      alert('Failed to add lifecycle event');
    }
  };

  const handleUpdateStatus = async (eventId: string, status: string) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.id;
      }

      const { error } = await supabase
        .from('employee_lifecycle_events')
        .update(updateData)
        .eq('id', eventId);

      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeLifecycleTracker', action: 'updateStatus' });
      alert('Failed to update status');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('employee_lifecycle_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      logError(error, 'medium', { component: 'EmployeeLifecycleTracker', action: 'deleteEvent' });
      alert('Failed to delete event');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const stats = {
    total: events.length,
    pending: events.filter(e => e.status === 'pending').length,
    overdue: events.filter(e => e.status === 'overdue').length,
    completed: events.filter(e => e.status === 'completed').length
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Employee Lifecycle Events</h2>
            <p className="text-sm text-gray-600 mt-1">Track onboarding, probation, and career milestones</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Events</span>
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-600">Pending</span>
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-900 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">Overdue</span>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-900 mt-2">{stats.overdue}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600">Completed</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900 mt-2">{stats.completed}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('overdue')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'overdue'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Overdue
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'completed'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Completed
              </button>
            </div>
            {employeeId && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Event</span>
              </button>
            )}
          </div>
        </div>

        {showAddForm && (
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-4">Add Lifecycle Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="probation_start">Probation Start</option>
                  <option value="probation_end">Probation End</option>
                  <option value="contract_renewal">Contract Renewal</option>
                  <option value="promotion">Promotion</option>
                  <option value="transfer">Transfer</option>
                  <option value="warning">Warning</option>
                  <option value="termination_notice">Termination Notice</option>
                  <option value="exit">Exit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Date</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add Event
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No lifecycle events found</p>
              <p className="text-sm text-gray-400 mt-1">Events will appear here as they are created</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`bg-white border-2 rounded-lg p-4 hover:shadow-md transition-all ${getStatusColor(event.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {formatEventType(event.event_type)}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(event.priority)}`}>
                            {event.priority}
                          </span>
                        </div>
                        {!employeeId && event.employee && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <User className="h-4 w-4" />
                            <span>{event.employee.first_name_en} {event.employee.last_name_en}</span>
                            <span className="text-gray-400">({event.employee.employee_number})</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Event: {new Date(event.event_date).toLocaleDateString()}</span>
                          </div>
                          {event.due_date && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>Due: {new Date(event.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        {event.notes && (
                          <p className="text-sm text-gray-600 mt-2">{event.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {event.status !== 'completed' && (
                        <button
                          onClick={() => handleUpdateStatus(event.id, 'completed')}
                          className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
                          title="Mark as completed"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
