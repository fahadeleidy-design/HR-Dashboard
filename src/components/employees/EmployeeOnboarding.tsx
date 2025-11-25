import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Users, FileText, Laptop, GraduationCap, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EmployeeOnboardingProps {
  employeeId: string;
  companyId: string;
}

interface OnboardingData {
  id: string;
  employee_id: string;
  start_date: string;
  expected_completion_date: string;
  actual_completion_date?: string;
  buddy?: {
    first_name_en: string;
    last_name_en: string;
  };
  hr_coordinator?: {
    first_name_en: string;
    last_name_en: string;
  };
  status: string;
  completion_percentage: number;
  documents_submitted: boolean;
  documents_verified: boolean;
  email_created: boolean;
  equipment_assigned: boolean;
  system_access_granted: boolean;
  orientation_completed: boolean;
  training_scheduled: boolean;
  notes?: string;
}

export function EmployeeOnboarding({ employeeId, companyId }: EmployeeOnboardingProps) {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOnboarding();
  }, [employeeId]);

  const fetchOnboarding = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_onboarding')
        .select(`
          *,
          buddy:employees!employee_onboarding_buddy_id_fkey(first_name_en, last_name_en),
          hr_coordinator:employees!employee_onboarding_hr_coordinator_id_fkey(first_name_en, last_name_en)
        `)
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setOnboarding(data);
      }
    } catch (error) {
      console.error('Error fetching onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistItem = async (field: string, value: boolean) => {
    if (!onboarding) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('employee_onboarding')
        .update({ [field]: value })
        .eq('id', onboarding.id);

      if (error) throw error;

      await fetchOnboarding();
      alert('Onboarding status updated!');
    } catch (error: any) {
      console.error('Error updating onboarding:', error);
      alert('Failed to update: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const checklistItems = onboarding ? [
    {
      label: 'Documents Submitted',
      field: 'documents_submitted',
      completed: onboarding.documents_submitted,
      icon: FileText,
      description: 'All required documents submitted by employee'
    },
    {
      label: 'Documents Verified',
      field: 'documents_verified',
      completed: onboarding.documents_verified,
      icon: CheckCircle,
      description: 'HR verified all submitted documents'
    },
    {
      label: 'Email Created',
      field: 'email_created',
      completed: onboarding.email_created,
      icon: FileText,
      description: 'Corporate email account created'
    },
    {
      label: 'Equipment Assigned',
      field: 'equipment_assigned',
      completed: onboarding.equipment_assigned,
      icon: Laptop,
      description: 'Laptop, phone, and other equipment assigned'
    },
    {
      label: 'System Access Granted',
      field: 'system_access_granted',
      completed: onboarding.system_access_granted,
      icon: CheckCircle,
      description: 'Access to all required systems and software'
    },
    {
      label: 'Orientation Completed',
      field: 'orientation_completed',
      completed: onboarding.orientation_completed,
      icon: GraduationCap,
      description: 'Company orientation and welcome session'
    },
    {
      label: 'Training Scheduled',
      field: 'training_scheduled',
      completed: onboarding.training_scheduled,
      icon: GraduationCap,
      description: 'Role-specific training sessions scheduled'
    }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">No Onboarding Record</p>
        <p className="text-sm text-gray-600 mb-6">
          This employee doesn't have an onboarding record yet
        </p>
      </div>
    );
  }

  const completedItems = checklistItems.filter(item => item.completed).length;
  const totalItems = checklistItems.length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold opacity-90">Onboarding Progress</h3>
            <p className="text-3xl font-bold mt-2">{onboarding.completion_percentage}%</p>
            <p className="text-sm opacity-90 mt-2">
              {completedItems} of {totalItems} tasks completed
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg ${getStatusColor(onboarding.status)}`}>
              <span className="text-sm font-medium">Status:</span>
              <span className="text-sm font-bold uppercase">{onboarding.status.replace('_', ' ')}</span>
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="bg-white bg-opacity-20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-500 ease-out"
              style={{ width: `${onboarding.completion_percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(onboarding.start_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Expected Completion</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(onboarding.expected_completion_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            {onboarding.actual_completion_date ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            )}
            <div>
              <p className="text-sm text-gray-600">Actual Completion</p>
              <p className="text-lg font-bold text-gray-900">
                {onboarding.actual_completion_date
                  ? new Date(onboarding.actual_completion_date).toLocaleDateString()
                  : 'In Progress'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {(onboarding.buddy || onboarding.hr_coordinator) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {onboarding.buddy && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Onboarding Buddy</p>
                  <p className="text-lg font-bold text-gray-900">
                    {onboarding.buddy.first_name_en} {onboarding.buddy.last_name_en}
                  </p>
                </div>
              </div>
            </div>
          )}

          {onboarding.hr_coordinator && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">HR Coordinator</p>
                  <p className="text-lg font-bold text-gray-900">
                    {onboarding.hr_coordinator.first_name_en} {onboarding.hr_coordinator.last_name_en}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Onboarding Checklist</h3>
        </div>
        <div className="p-6 space-y-4">
          {checklistItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                item.completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200 hover:border-blue-200'
              }`}
            >
              <button
                onClick={() => updateChecklistItem(item.field, !item.completed)}
                disabled={updating}
                className="flex-shrink-0 mt-1"
              >
                {item.completed ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-400 hover:text-blue-600 transition-colors" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <item.icon className={`h-5 w-5 ${item.completed ? 'text-green-600' : 'text-gray-400'}`} />
                  <h4 className={`font-medium ${item.completed ? 'text-green-900' : 'text-gray-900'}`}>
                    {item.label}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {onboarding.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{onboarding.notes}</p>
        </div>
      )}
    </div>
  );
}
