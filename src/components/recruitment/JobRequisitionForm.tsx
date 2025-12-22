import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { X, Save } from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
}

interface JobRequisitionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editingRequisition?: any;
}

export function JobRequisitionForm({ onClose, onSuccess, editingRequisition }: JobRequisitionFormProps) {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    job_title: '',
    department_id: '',
    employment_type: 'full_time',
    number_of_positions: 1,
    job_description: '',
    required_qualifications: '',
    preferred_qualifications: '',
    required_experience_years: 0,
    work_location: '',
    salary_range_min: 0,
    salary_range_max: 0,
    nationality_preference: 'no_preference',
    target_start_date: '',
    hiring_manager_id: '',
    priority: 5,
    notes: '',
    status: 'draft'
  });

  useEffect(() => {
    if (currentCompany) {
      fetchDepartments();
      fetchManagers();
    }
    if (editingRequisition) {
      setFormData({
        job_title: editingRequisition.job_title || '',
        department_id: editingRequisition.department_id || '',
        employment_type: editingRequisition.employment_type || 'full_time',
        number_of_positions: editingRequisition.number_of_positions || 1,
        job_description: editingRequisition.job_description || '',
        required_qualifications: editingRequisition.required_qualifications || '',
        preferred_qualifications: editingRequisition.preferred_qualifications || '',
        required_experience_years: editingRequisition.required_experience_years || 0,
        work_location: editingRequisition.work_location || '',
        salary_range_min: editingRequisition.salary_range_min || 0,
        salary_range_max: editingRequisition.salary_range_max || 0,
        nationality_preference: editingRequisition.nationality_preference || 'no_preference',
        target_start_date: editingRequisition.target_start_date || '',
        hiring_manager_id: editingRequisition.hiring_manager_id || '',
        priority: editingRequisition.priority || 5,
        notes: editingRequisition.notes || '',
        status: editingRequisition.status || 'draft'
      });
    }
  }, [currentCompany, editingRequisition]);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .eq('company_id', currentCompany?.id)
      .order('name');
    if (data) setDepartments(data);
  };

  const fetchManagers = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('company_id', currentCompany?.id)
      .order('full_name');
    if (data) setManagers(data);
  };

  const generateRequisitionNumber = async () => {
    const { data, error } = await supabase.rpc('generate_requisition_number', {
      p_company_id: currentCompany?.id
    });
    return data || `REQ-${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !user) return;

    setLoading(true);
    try {
      const reqData: any = {
        ...formData,
        company_id: currentCompany.id,
        requested_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (editingRequisition) {
        const { error } = await supabase
          .from('job_requisitions')
          .update(reqData)
          .eq('id', editingRequisition.id);

        if (error) throw error;
        showToast('Requisition updated successfully', 'success');
      } else {
        const reqNumber = await generateRequisitionNumber();
        reqData.requisition_number = reqNumber;
        reqData.requested_date = new Date().toISOString().split('T')[0];

        const { error } = await supabase
          .from('job_requisitions')
          .insert([reqData]);

        if (error) throw error;
        showToast('Requisition created successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to save requisition', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingRequisition ? 'Edit Job Requisition' : 'New Job Requisition'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Senior Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Positions <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="number_of_positions"
                value={formData.number_of_positions}
                onChange={handleChange}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Experience (Years)
              </label>
              <input
                type="number"
                name="required_experience_years"
                value={formData.required_experience_years}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hiring Manager</label>
              <select
                name="hiring_manager_id"
                value={formData.hiring_manager_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Manager</option>
                {managers.map(mgr => (
                  <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
              <input
                type="text"
                name="work_location"
                value={formData.work_location}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Riyadh, Saudi Arabia"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Salary (SAR)
              </label>
              <input
                type="number"
                name="salary_range_min"
                value={formData.salary_range_min}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Salary (SAR)
              </label>
              <input
                type="number"
                name="salary_range_max"
                value={formData.salary_range_max}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nationality Preference
              </label>
              <select
                name="nationality_preference"
                value={formData.nationality_preference}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="no_preference">No Preference</option>
                <option value="saudi_only">Saudi Only</option>
                <option value="saudi_preferred">Saudi Preferred</option>
                <option value="non_saudi_only">Non-Saudi Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Start Date</label>
              <input
                type="date"
                name="target_start_date"
                value={formData.target_start_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority (1-10)
              </label>
              <input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                min="1"
                max="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                name="job_description"
                value={formData.job_description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the role and responsibilities..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Qualifications
              </label>
              <textarea
                name="required_qualifications"
                value={formData.required_qualifications}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="List required qualifications..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Qualifications
              </label>
              <textarea
                name="preferred_qualifications"
                value={formData.preferred_qualifications}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="List preferred qualifications..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : editingRequisition ? 'Update Requisition' : 'Create Requisition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
