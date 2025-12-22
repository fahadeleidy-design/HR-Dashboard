import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Clock, MapPin, Users, Video, Save, X } from 'lucide-react';

interface Application {
  id: string;
  candidate: {
    first_name: string;
    last_name: string;
  };
  job_posting: {
    job_title: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

interface InterviewScheduleFormProps {
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InterviewScheduleForm({ companyId, onSuccess, onCancel }: InterviewScheduleFormProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    application_id: '',
    interview_type: 'technical',
    interview_round: 1,
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    location: '',
    meeting_link: '',
    interviewer_ids: [] as string[],
    notes: ''
  });

  useEffect(() => {
    fetchApplications();
    fetchEmployees();
  }, [companyId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          candidate:candidates(first_name, last_name),
          job_posting:job_postings(job_title)
        `)
        .eq('company_id', companyId)
        .in('status', ['under_review', 'interview_scheduled', 'second_interview'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setApplications(data as any);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('company_id', companyId)
        .eq('employment_status', 'active')
        .order('full_name');

      if (!error && data) {
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduledDateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);

      const { error } = await supabase
        .from('interviews')
        .insert({
          company_id: companyId,
          application_id: formData.application_id,
          interview_type: formData.interview_type,
          interview_round: formData.interview_round,
          scheduled_date: scheduledDateTime.toISOString(),
          duration_minutes: formData.duration_minutes,
          location: formData.location || null,
          meeting_link: formData.meeting_link || null,
          interviewer_ids: formData.interviewer_ids,
          notes: formData.notes || null,
          status: 'scheduled'
        });

      if (error) throw error;

      showToast('Interview scheduled successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      showToast(error.message || 'Failed to schedule interview', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInterviewerToggle = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      interviewer_ids: prev.interviewer_ids.includes(employeeId)
        ? prev.interviewer_ids.filter(id => id !== employeeId)
        : [...prev.interviewer_ids, employeeId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="inline h-4 w-4 mr-1" />
            Candidate Application
          </label>
          <select
            required
            value={formData.application_id}
            onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select candidate application...</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.candidate?.first_name} {app.candidate?.last_name} - {app.job_posting?.job_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interview Type
          </label>
          <select
            required
            value={formData.interview_type}
            onChange={(e) => setFormData({ ...formData, interview_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="hr_screening">HR Screening</option>
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="cultural_fit">Cultural Fit</option>
            <option value="panel">Panel Interview</option>
            <option value="practical">Practical/Assessment</option>
            <option value="final">Final Interview</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interview Round
          </label>
          <input
            type="number"
            required
            min="1"
            max="10"
            value={formData.interview_round}
            onChange={(e) => setFormData({ ...formData, interview_round: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Date
          </label>
          <input
            type="date"
            required
            value={formData.scheduled_date}
            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="inline h-4 w-4 mr-1" />
            Time
          </label>
          <input
            type="time"
            required
            value={formData.scheduled_time}
            onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (minutes)
          </label>
          <select
            required
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline h-4 w-4 mr-1" />
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Meeting room or office location"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Video className="inline h-4 w-4 mr-1" />
            Meeting Link (Optional)
          </label>
          <input
            type="url"
            value={formData.meeting_link}
            onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
            placeholder="https://meet.google.com/... or https://zoom.us/..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="inline h-4 w-4 mr-1" />
            Interviewers
          </label>
          <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
            {employees.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No employees available</p>
            ) : (
              employees.map((employee) => (
                <label key={employee.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.interviewer_ids.includes(employee.id)}
                    onChange={() => handleInterviewerToggle(employee.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{employee.full_name}</p>
                    <p className="text-xs text-gray-500">{employee.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Select one or more interviewers</p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Additional notes about the interview..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="inline h-4 w-4 mr-1" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !formData.application_id}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="inline h-4 w-4 mr-1" />
          {loading ? 'Scheduling...' : 'Schedule Interview'}
        </button>
      </div>
    </form>
  );
}
