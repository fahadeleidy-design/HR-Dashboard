import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Users, Plus, X, Save, Trash2 } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  job_title: string;
}

interface PanelMember {
  employee_id: string;
  role: string;
}

interface PanelCreationFormProps {
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PanelCreationForm({ companyId, onSuccess, onCancel }: PanelCreationFormProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<PanelMember[]>([
    { employee_id: '', role: 'interviewer' }
  ]);

  const [formData, setFormData] = useState({
    panel_name: '',
    description: '',
    is_active: true
  });
  const { logError } = useErrorHandler();

  useEffect(() => {
    fetchEmployees();
  }, [companyId]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, job_title')
        .eq('company_id', companyId)
        .eq('employment_status', 'active')
        .order('full_name');

      if (!error && data) {
        setEmployees(data);
      }
    } catch (error) {
      logError(error, 'medium', { component: 'PanelCreationForm', action: 'fetchEmployees' });
    }
  };

  const handleAddMember = () => {
    setSelectedMembers([...selectedMembers, { employee_id: '', role: 'interviewer' }]);
  };

  const handleRemoveMember = (index: number) => {
    setSelectedMembers(selectedMembers.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof PanelMember, value: string) => {
    const updated = [...selectedMembers];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validMembers = selectedMembers.filter(m => m.employee_id);

      if (validMembers.length === 0) {
        showToast('Please add at least one panel member', 'error');
        setLoading(false);
        return;
      }

      const panelMembersData = validMembers.map(member => {
        const employee = employees.find(e => e.id === member.employee_id);
        return {
          employee_id: member.employee_id,
          employee_name: employee?.full_name || '',
          role: member.role
        };
      });

      const { error } = await supabase
        .from('interview_panels')
        .insert({
          company_id: companyId,
          panel_name: formData.panel_name,
          description: formData.description || null,
          panel_members: panelMembersData,
          is_active: formData.is_active
        });

      if (error) throw error;

      showToast('Interview panel created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      logError(error, 'medium', { component: 'PanelCreationForm', action: 'createPanel' });
      showToast(error.message || 'Failed to create interview panel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableEmployees = (currentIndex: number) => {
    const selectedIds = selectedMembers
      .map((m, i) => i !== currentIndex ? m.employee_id : null)
      .filter(Boolean);
    return employees.filter(e => !selectedIds.includes(e.id));
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Panel Name
          </label>
          <input
            type="text"
            required
            value={formData.panel_name}
            onChange={(e) => setFormData({ ...formData, panel_name: e.target.value })}
            placeholder="e.g., Senior Technical Interview Panel"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Describe the purpose and composition of this panel..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              <Users className="inline h-4 w-4 mr-1" />
              Panel Members
            </label>
            <button
              type="button"
              onClick={handleAddMember}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Member
            </button>
          </div>

          <div className="space-y-3">
            {selectedMembers.map((member, index) => (
              <div key={index} className="flex gap-3 items-start p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-1 space-y-2">
                  <select
                    required
                    value={member.employee_id}
                    onChange={(e) => handleMemberChange(index, 'employee_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  >
                    <option value="">Select employee...</option>
                    {getAvailableEmployees(index).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} - {emp.job_title}
                      </option>
                    ))}
                  </select>

                  <select
                    required
                    value={member.role}
                    onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  >
                    <option value="lead">Lead Interviewer</option>
                    <option value="interviewer">Interviewer</option>
                    <option value="observer">Observer</option>
                    <option value="technical_expert">Technical Expert</option>
                    <option value="hr_representative">HR Representative</option>
                  </select>
                </div>

                {selectedMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {selectedMembers.filter(m => m.employee_id).length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              Please add at least one panel member
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active (Panel is available for scheduling)
          </label>
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
          disabled={loading || !formData.panel_name || selectedMembers.filter(m => m.employee_id).length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="inline h-4 w-4 mr-1" />
          {loading ? 'Creating...' : 'Create Panel'}
        </button>
      </div>
    </form>
  );
}
