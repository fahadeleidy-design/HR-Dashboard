import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/contexts/ToastContext';
import { DollarSign, Award, TrendingUp, AlertCircle } from 'lucide-react';

interface AssignCompensationFormProps {
  employeeId: string;
  onSuccess?: () => void;
}

interface JobGrade {
  id: string;
  grade_code: string;
  grade_name: string;
  grade_level: number;
}

interface SalaryBand {
  id: string;
  grade_id: string;
  minimum_salary: number;
  midpoint_salary: number;
  maximum_salary: number;
}

interface JobPosition {
  id: string;
  position_code: string;
  position_title: string;
  grade_id: string;
}

export function AssignCompensationForm({ employeeId, onSuccess }: AssignCompensationFormProps) {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [grades, setGrades] = useState<JobGrade[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [bands, setBands] = useState<SalaryBand[]>([]);
  const [selectedBand, setSelectedBand] = useState<SalaryBand | null>(null);

  const [formData, setFormData] = useState({
    job_grade_id: '',
    job_position_id: '',
    salary_band_id: '',
    basic_salary: 0,
    housing_allowance: 0,
    transport_allowance: 0,
    food_allowance: 0,
    mobile_allowance: 0,
    other_allowances: 0,
  });

  useEffect(() => {
    if (currentCompany) {
      fetchData();
      fetchCurrentCompensation();
    }
  }, [currentCompany, employeeId]);

  useEffect(() => {
    if (formData.salary_band_id) {
      const band = bands.find(b => b.id === formData.salary_band_id);
      setSelectedBand(band || null);
    } else {
      setSelectedBand(null);
    }
  }, [formData.salary_band_id, bands]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [gradesData, positionsData, bandsData] = await Promise.all([
        supabase
          .from('job_grades')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true)
          .order('grade_level'),
        supabase
          .from('job_positions')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true)
          .order('position_title'),
        supabase
          .from('salary_bands')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true)
          .order('minimum_salary'),
      ]);

      if (!gradesData.error) setGrades(gradesData.data || []);
      if (!positionsData.error) setPositions(positionsData.data || []);
      if (!bandsData.error) setBands(bandsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading compensation data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentCompensation = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('job_grade_id, job_position_id, salary_band_id, basic_salary, housing_allowance, transport_allowance, food_allowance, mobile_allowance, other_allowances')
        .eq('id', employeeId)
        .single();

      if (!error && data) {
        setFormData({
          job_grade_id: data.job_grade_id || '',
          job_position_id: data.job_position_id || '',
          salary_band_id: data.salary_band_id || '',
          basic_salary: data.basic_salary || 0,
          housing_allowance: data.housing_allowance || 0,
          transport_allowance: data.transport_allowance || 0,
          food_allowance: data.food_allowance || 0,
          mobile_allowance: data.mobile_allowance || 0,
          other_allowances: data.other_allowances || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching current compensation:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_grade_id || !formData.salary_band_id || !formData.basic_salary) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          job_grade_id: formData.job_grade_id || null,
          job_position_id: formData.job_position_id || null,
          salary_band_id: formData.salary_band_id || null,
          basic_salary: formData.basic_salary,
          housing_allowance: formData.housing_allowance,
          transport_allowance: formData.transport_allowance,
          food_allowance: formData.food_allowance,
          mobile_allowance: formData.mobile_allowance,
          other_allowances: formData.other_allowances,
        })
        .eq('id', employeeId);

      if (error) throw error;

      showToast('Compensation assigned successfully', 'success');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving compensation:', error);
      showToast(error.message || 'Error saving compensation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalCompensation =
    formData.basic_salary +
    formData.housing_allowance +
    formData.transport_allowance +
    formData.food_allowance +
    formData.mobile_allowance +
    formData.other_allowances;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {selectedBand && formData.basic_salary > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Salary Band Range</p>
              <p className="text-sm text-blue-700 mt-1">
                Min: {selectedBand.minimum_salary.toLocaleString()} SAR •
                Mid: {selectedBand.midpoint_salary.toLocaleString()} SAR •
                Max: {selectedBand.maximum_salary.toLocaleString()} SAR
              </p>
              {formData.basic_salary < selectedBand.minimum_salary && (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  ⚠️ Salary is below the minimum range
                </p>
              )}
              {formData.basic_salary > selectedBand.maximum_salary && (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  ⚠️ Salary is above the maximum range
                </p>
              )}
              {formData.basic_salary >= selectedBand.minimum_salary &&
               formData.basic_salary <= selectedBand.maximum_salary && (
                <p className="text-sm text-green-600 mt-1 font-medium">
                  ✓ Salary is within the band range
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Grade <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.job_grade_id}
            onChange={(e) => setFormData({ ...formData, job_grade_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a grade</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.grade_code} - {grade.grade_name} (Level {grade.grade_level})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Position
          </label>
          <select
            value={formData.job_position_id}
            onChange={(e) => setFormData({ ...formData, job_position_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a position (optional)</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.position_code} - {position.position_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Salary Band <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.salary_band_id}
            onChange={(e) => setFormData({ ...formData, salary_band_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a salary band</option>
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.minimum_salary.toLocaleString()} - {band.maximum_salary.toLocaleString()} SAR
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Basic Salary (SAR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.basic_salary}
            onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Housing Allowance (SAR)
          </label>
          <input
            type="number"
            value={formData.housing_allowance}
            onChange={(e) => setFormData({ ...formData, housing_allowance: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transport Allowance (SAR)
          </label>
          <input
            type="number"
            value={formData.transport_allowance}
            onChange={(e) => setFormData({ ...formData, transport_allowance: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Food Allowance (SAR)
          </label>
          <input
            type="number"
            value={formData.food_allowance}
            onChange={(e) => setFormData({ ...formData, food_allowance: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Allowance (SAR)
          </label>
          <input
            type="number"
            value={formData.mobile_allowance}
            onChange={(e) => setFormData({ ...formData, mobile_allowance: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Other Allowances (SAR)
          </label>
          <input
            type="number"
            value={formData.other_allowances}
            onChange={(e) => setFormData({ ...formData, other_allowances: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">Total Compensation Package</p>
            <p className="text-3xl font-bold text-green-900 mt-1">
              {totalCompensation.toLocaleString()} SAR
            </p>
          </div>
          <DollarSign className="h-12 w-12 text-green-600" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4" />
              Save Compensation
            </>
          )}
        </button>
      </div>
    </form>
  );
}
