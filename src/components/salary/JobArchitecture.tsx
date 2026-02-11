import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Layers, Award, Briefcase, X } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useToast } from '@/contexts/ToastContext';

interface JobFamily {
  id: string;
  family_code: string;
  family_name: string;
  description: string;
  icon: string;
  color_code: string;
  is_active: boolean;
}

interface JobGrade {
  id: string;
  grade_code: string;
  grade_level: number;
  grade_name: string;
  description: string;
  minimum_years_experience: number;
  is_leadership: boolean;
  is_active: boolean;
}

interface JobPosition {
  id: string;
  position_code: string;
  position_title: string;
  position_title_ar: string;
  grade: { grade_code: string; grade_name: string };
  family: { family_name: string; color_code: string };
  is_active: boolean;
}

export function JobArchitecture() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<'families' | 'grades' | 'positions'>('grades');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { logError } = useErrorHandler();

  const [families, setFamilies] = useState<JobFamily[]>([]);
  const [grades, setGrades] = useState<JobGrade[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);

  const [formData, setFormData] = useState({
    family_code: '',
    family_name: '',
    description: '',
    icon: '💼',
    color_code: '#3B82F6',
    grade_code: '',
    grade_level: 1,
    grade_name: '',
    minimum_years_experience: 0,
    is_leadership: false,
    position_code: '',
    position_title: '',
    position_title_ar: '',
    grade_id: '',
    job_family_id: ''
  });

  useEffect(() => {
    if (currentCompany) {
      fetchData();
      if (activeView === 'positions') {
        fetchFamiliesAndGrades();
      }
    }
  }, [currentCompany, activeView]);

  const fetchFamiliesAndGrades = async () => {
    if (!currentCompany) return;

    try {
      const [familiesData, gradesData] = await Promise.all([
        supabase
          .from('job_families')
          .select('*')
          .eq('company_id', currentCompany.id)
          .order('family_code'),
        supabase
          .from('job_grades')
          .select('*')
          .eq('company_id', currentCompany.id)
          .order('grade_level')
      ]);

      if (familiesData.data) setFamilies(familiesData.data);
      if (gradesData.data) setGrades(gradesData.data);
    } catch (error) {
      logError(error, 'medium', { component: 'JobArchitecture', action: 'fetchFamiliesAndGrades' });
    }
  };

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      if (activeView === 'families') {
        const { data, error } = await supabase
          .from('job_families')
          .select('*')
          .eq('company_id', currentCompany.id)
          .order('family_code');
        if (!error) setFamilies(data || []);
      } else if (activeView === 'grades') {
        const { data, error } = await supabase
          .from('job_grades')
          .select('*')
          .eq('company_id', currentCompany.id)
          .order('grade_level');
        if (!error) setGrades(data || []);
      } else {
        const { data, error } = await supabase
          .from('job_positions')
          .select(`
            *,
            grade:job_grades(grade_code, grade_name),
            family:job_families(family_name, color_code)
          `)
          .eq('company_id', currentCompany.id)
          .order('position_code');
        if (!error) setPositions(data || []);
      }
    } catch (error) {
      logError(error, 'medium', { component: 'JobArchitecture', action: 'fetchData' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      family_code: '',
      family_name: '',
      description: '',
      icon: '💼',
      color_code: '#3B82F6',
      grade_code: '',
      grade_level: 1,
      grade_name: '',
      minimum_years_experience: 0,
      is_leadership: false,
      position_code: '',
      position_title: '',
      position_title_ar: '',
      grade_id: '',
      job_family_id: ''
    });
  };

  const handleSubmit = async () => {
    if (!currentCompany) return;

    setSubmitting(true);
    try {
      if (activeView === 'families') {
        const { error } = await supabase
          .from('job_families')
          .insert({
            company_id: currentCompany.id,
            family_code: formData.family_code,
            family_name: formData.family_name,
            description: formData.description,
            icon: formData.icon,
            color_code: formData.color_code,
            is_active: true
          });

        if (error) throw error;
        showToast('Job family created successfully', 'success');
      } else if (activeView === 'grades') {
        const { error } = await supabase
          .from('job_grades')
          .insert({
            company_id: currentCompany.id,
            grade_code: formData.grade_code,
            grade_level: formData.grade_level,
            grade_name: formData.grade_name,
            description: formData.description,
            minimum_years_experience: formData.minimum_years_experience,
            is_leadership: formData.is_leadership,
            is_active: true
          });

        if (error) throw error;
        showToast('Job grade created successfully', 'success');
      } else {
        const { error } = await supabase
          .from('job_positions')
          .insert({
            company_id: currentCompany.id,
            position_code: formData.position_code,
            position_title: formData.position_title,
            position_title_ar: formData.position_title_ar,
            description: formData.description,
            grade_id: formData.grade_id,
            job_family_id: formData.job_family_id || null,
            is_active: true
          });

        if (error) throw error;
        showToast('Job position created successfully', 'success');
      }

      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      logError(error, 'medium', { component: 'JobArchitecture', action: 'handleSubmit' });
      showToast(error.message || 'Error saving data', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveView('families')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'families'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Layers className="h-4 w-4" />
          Job Families ({families.length || 8})
        </button>
        <button
          onClick={() => setActiveView('grades')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'grades'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Award className="h-4 w-4" />
          Job Grades ({grades.length || 15})
        </button>
        <button
          onClick={() => setActiveView('positions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'positions'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Job Positions ({positions.length})
        </button>
      </div>

      {activeView === 'families' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Job Families</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Family
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {families.map((family) => (
                <div
                  key={family.id}
                  className="p-4 rounded-lg border-2 hover:shadow-lg transition-shadow"
                  style={{ borderColor: family.color_code }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: family.color_code + '20' }}
                    >
                      <span className="text-2xl">{family.icon}</span>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1 text-gray-400 hover:text-blue-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{family.family_name}</h4>
                  <p className="text-xs text-gray-600 mb-2">{family.family_code}</p>
                  <p className="text-sm text-gray-700">{family.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        family.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {family.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView === 'grades' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Job Grades (15-Level Structure)</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Grade
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min. Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">
                        {grade.grade_level}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {grade.grade_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{grade.grade_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{grade.description}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{grade.minimum_years_experience} years</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          grade.is_leadership
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {grade.is_leadership ? 'Leadership' : 'Individual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          grade.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {grade.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'positions' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Job Positions</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Position
            </button>
          </div>
          {positions.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No positions defined yet</p>
              <p className="text-gray-500 text-sm mt-1">Create your first job position to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Arabic Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Family
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {positions.map((position) => (
                    <tr key={position.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {position.position_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{position.position_title}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{position.position_title_ar || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {position.family && (
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: position.family.color_code + '20',
                              color: position.family.color_code
                            }}
                          >
                            {position.family.family_name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {position.grade && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {position.grade.grade_code} - {position.grade.grade_name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            position.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {position.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {activeView === 'families' && 'Add Job Family'}
                {activeView === 'grades' && 'Add Job Grade'}
                {activeView === 'positions' && 'Add Job Position'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {activeView === 'families' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Family Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.family_code}
                      onChange={(e) => setFormData({ ...formData, family_code: e.target.value })}
                      placeholder="e.g., IT, HR, FIN"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Family Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.family_name}
                      onChange={(e) => setFormData({ ...formData, family_name: e.target.value })}
                      placeholder="e.g., Information Technology"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this job family"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Icon (Emoji)
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="💼"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color Code
                      </label>
                      <input
                        type="color"
                        value={formData.color_code}
                        onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                        className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'grades' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.grade_code}
                        onChange={(e) => setFormData({ ...formData, grade_code: e.target.value })}
                        placeholder="e.g., GRD-01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade Level <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.grade_level}
                        onChange={(e) => setFormData({ ...formData, grade_level: parseInt(e.target.value) })}
                        min="1"
                        max="20"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.grade_name}
                      onChange={(e) => setFormData({ ...formData, grade_name: e.target.value })}
                      placeholder="e.g., Junior Professional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this grade level"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Years of Experience
                    </label>
                    <input
                      type="number"
                      value={formData.minimum_years_experience}
                      onChange={(e) => setFormData({ ...formData, minimum_years_experience: parseInt(e.target.value) })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_leadership}
                        onChange={(e) => setFormData({ ...formData, is_leadership: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Leadership Role</span>
                    </label>
                  </div>
                </div>
              )}

              {activeView === 'positions' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.position_code}
                      onChange={(e) => setFormData({ ...formData, position_code: e.target.value })}
                      placeholder="e.g., POS-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position Title (English) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.position_title}
                        onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                        placeholder="e.g., Software Engineer"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position Title (Arabic)
                      </label>
                      <input
                        type="text"
                        value={formData.position_title_ar}
                        onChange={(e) => setFormData({ ...formData, position_title_ar: e.target.value })}
                        placeholder="e.g., مهندس برمجيات"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.grade_id}
                      onChange={(e) => setFormData({ ...formData, grade_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Family (Optional)
                    </label>
                    <select
                      value={formData.job_family_id}
                      onChange={(e) => setFormData({ ...formData, job_family_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a family (optional)</option>
                      {families.map((family) => (
                        <option key={family.id} value={family.id}>
                          {family.family_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this position"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create {activeView === 'families' ? 'Family' : activeView === 'grades' ? 'Grade' : 'Position'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
