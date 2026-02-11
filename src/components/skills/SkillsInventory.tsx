import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Award, TrendingUp, Users, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Skill {
  id: string;
  skill_code: string;
  skill_name: string;
  description: string;
  category: any;
  skill_type: string;
  is_core_skill: boolean;
  total_employees: number;
  average_proficiency: number;
}

export default function SkillsInventory() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    skill_code: '',
    description: '',
    category_id: '',
    skill_type: 'technical',
    is_core_skill: false,
  });
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (selectedCompany) {
      loadData();
    }
  }, [selectedCompany]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: categoriesData } = await supabase
        .from('skill_categories')
        .select('*')
        .order('display_order');

      setCategories(categoriesData || []);

      const { data: skillsData } = await supabase
        .from('skills_catalog')
        .select('*, category:skill_categories(name, color)')
        .or(`company_id.eq.${selectedCompany!.id},company_id.is.null`)
        .order('skill_name');

      setSkills(skillsData || []);
    } catch (error) {
      logError(error, 'medium', { component: 'SkillsInventory', action: 'loadSkills' });
      showToast('Failed to load skills', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async () => {
    try {
      const { error } = await supabase.from('skills_catalog').insert([
        {
          ...newSkill,
          company_id: selectedCompany!.id,
        },
      ]);

      if (error) throw error;

      showToast('Skill added successfully', 'success');
      setShowAddModal(false);
      setNewSkill({
        skill_name: '',
        skill_code: '',
        description: '',
        category_id: '',
        skill_type: 'technical',
        is_core_skill: false,
      });
      loadData();
    } catch (error: any) {
      logError(error, 'medium', { component: 'SkillsInventory', action: 'addSkill' });
      showToast(error.message || 'Failed to add skill', 'error');
    }
  };

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.skill_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || skill.category?.name === selectedCategory;
    const matchesType = selectedType === 'all' || skill.skill_type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const stats = {
    total: skills.length,
    coreSkills: skills.filter((s) => s.is_core_skill).length,
    avgProficiency:
      skills.reduce((acc, s) => acc + (s.average_proficiency || 0), 0) / skills.length || 0,
    totalEmployees: skills.reduce((acc, s) => acc + (s.total_employees || 0), 0),
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
          <h2 className="text-2xl font-bold text-gray-900">Skills Inventory</h2>
          <p className="text-gray-600 mt-1">Manage organizational skills catalog</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Skills</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Award className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Core Skills</p>
              <p className="text-2xl font-bold text-gray-900">{stats.coreSkills}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Proficiency</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgProficiency.toFixed(1)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
            </div>
            <Users className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="technical">Technical</option>
              <option value="soft_skill">Soft Skill</option>
              <option value="language">Language</option>
              <option value="certification">Certification</option>
              <option value="domain_knowledge">Domain Knowledge</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Core</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSkills.map((skill) => (
                <tr key={skill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{skill.skill_name}</div>
                      <div className="text-sm text-gray-500">{skill.skill_code}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {skill.category && (
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: skill.category.color + '20',
                          color: skill.category.color,
                        }}
                      >
                        {skill.category.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                    {skill.skill_type.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{skill.total_employees || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {skill.average_proficiency ? skill.average_proficiency.toFixed(1) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {skill.is_core_skill && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        Core
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <Edit2 className="h-4 w-4" />
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Skill</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
                <input
                  type="text"
                  value={newSkill.skill_name}
                  onChange={(e) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Code</label>
                <input
                  type="text"
                  value={newSkill.skill_code}
                  onChange={(e) => setNewSkill({ ...newSkill, skill_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newSkill.category_id}
                  onChange={(e) => setNewSkill({ ...newSkill, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Type</label>
                <select
                  value={newSkill.skill_type}
                  onChange={(e) => setNewSkill({ ...newSkill, skill_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="technical">Technical</option>
                  <option value="soft_skill">Soft Skill</option>
                  <option value="language">Language</option>
                  <option value="certification">Certification</option>
                  <option value="domain_knowledge">Domain Knowledge</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSkill.is_core_skill}
                  onChange={(e) => setNewSkill({ ...newSkill, is_core_skill: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Core Skill</label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSkill}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Skill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
