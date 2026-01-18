import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Target, Search, Filter, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface GapAnalysis {
  id: string;
  employee_id: string;
  employee: any;
  skill_name: string;
  current_level: string;
  required_level: string;
  gap_size: number;
  priority: string;
  gap_status: string;
  analysis_date: string;
  target_close_date: string;
}

export default function SkillsGapAnalysis() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: gapsData } = await supabase
        .from('skill_gap_analysis')
        .select(`
          *,
          employee:employees(id, first_name_en, last_name_en, job_title_en, department_id)
        `)
        .eq('company_id', selectedCompany!.id)
        .order('priority', { ascending: false });

      setGaps(gapsData || []);

      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, first_name_en, last_name_en, job_title_en')
        .eq('company_id', selectedCompany!.id)
        .eq('status', 'active');

      setEmployees(employeesData || []);

      const { data: departmentsData } = await supabase
        .from('departments')
        .select('id, name_en')
        .eq('company_id', selectedCompany!.id);

      setDepartments(departmentsData || []);
    } catch (error) {
      console.error('Error loading gap analysis:', error);
      showToast('Failed to load gap analysis', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateGaps = async () => {
    try {
      const { data: requirements } = await supabase
        .from('role_skill_requirements')
        .select('*')
        .eq('company_id', selectedCompany!.id);

      const { data: employeeSkills } = await supabase
        .from('employee_skills')
        .select('*, employee:employees(job_title_en)')
        .eq('company_id', selectedCompany!.id);

      const gapsToInsert: any[] = [];

      requirements?.forEach((req) => {
        const matchingEmployees = employeeSkills?.filter(
          (es: any) => es.employee?.job_title_en === req.job_title
        );

        matchingEmployees?.forEach((es: any) => {
          const currentLevel = es.proficiency_level || 'none';
          const requiredLevel = req.required_proficiency;

          if (getProficiencyValue(currentLevel) < getProficiencyValue(requiredLevel)) {
            gapsToInsert.push({
              company_id: selectedCompany!.id,
              analysis_name: `Auto-generated ${new Date().toISOString().split('T')[0]}`,
              employee_id: es.employee_id,
              skill_name: req.skill_name,
              current_level: currentLevel,
              required_level: requiredLevel,
              gap_size: getProficiencyValue(requiredLevel) - getProficiencyValue(currentLevel),
              priority: req.is_mandatory ? 'high' : 'medium',
              gap_status: 'open',
            });
          }
        });
      });

      if (gapsToInsert.length > 0) {
        const { error } = await supabase.from('skill_gap_analysis').insert(gapsToInsert);

        if (error) throw error;

        showToast(`${gapsToInsert.length} gaps identified`, 'success');
        loadData();
      } else {
        showToast('No gaps found', 'info');
      }
    } catch (error: any) {
      console.error('Error calculating gaps:', error);
      showToast(error.message || 'Failed to calculate gaps', 'error');
    }
  };

  const getProficiencyValue = (level: string): number => {
    const levels: Record<string, number> = {
      none: 0,
      novice: 1,
      beginner: 2,
      intermediate: 3,
      advanced: 4,
      expert: 5,
      master: 6,
    };
    return levels[level.toLowerCase()] || 0;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredGaps = gaps.filter((gap) => {
    const matchesFilter = filter === 'all' || gap.gap_status === filter;
    const matchesDepartment =
      selectedDepartment === 'all' || gap.employee?.department_id === selectedDepartment;
    return matchesFilter && matchesDepartment;
  });

  const stats = {
    total: gaps.length,
    critical: gaps.filter((g) => g.priority === 'critical').length,
    open: gaps.filter((g) => g.gap_status === 'open').length,
    inProgress: gaps.filter((g) => g.gap_status === 'in_progress').length,
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
          <h2 className="text-2xl font-bold text-gray-900">Skills Gap Analysis</h2>
          <p className="text-gray-600 mt-1">Identify and close skill gaps</p>
        </div>
        <button
          onClick={calculateGaps}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Target className="h-4 w-4 mr-2" />
          Calculate Gaps
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Gaps</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open</p>
              <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
            </div>
            <Target className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'all', label: 'All Gaps' },
              { key: 'open', label: 'Open' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'closed', label: 'Closed' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name_en}
                </option>
              ))}
            </select>
          </div>

          {filteredGaps.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No skill gaps found</p>
              <button
                onClick={calculateGaps}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Run Gap Analysis
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Skill
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Current Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Required Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Gap Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGaps.map((gap) => (
                    <tr key={gap.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {gap.employee?.first_name_en} {gap.employee?.last_name_en}
                          </div>
                          <div className="text-sm text-gray-500">{gap.employee?.job_title_en}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{gap.skill_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                        {gap.current_level || 'None'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                        {gap.required_level}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">{gap.gap_size}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${(gap.gap_size / 6) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(gap.priority)}`}>
                          {gap.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(gap.gap_status)}`}>
                          {gap.gap_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">Create Plan</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
