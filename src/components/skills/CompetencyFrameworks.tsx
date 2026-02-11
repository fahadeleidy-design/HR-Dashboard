import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Award, Users, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Framework {
  id: string;
  framework_code: string;
  framework_name: string;
  description: string;
  framework_type: string;
  is_published: boolean;
  competencies_count: number;
}

export default function CompetencyFrameworks() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [newFramework, setNewFramework] = useState({
    framework_name: '',
    framework_code: '',
    description: '',
    framework_type: 'technical',
  });
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (selectedCompany) {
      loadFrameworks();
    }
  }, [selectedCompany]);

  const loadFrameworks = async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from('competency_frameworks')
        .select(`
          *,
          competencies:competencies(count)
        `)
        .eq('company_id', selectedCompany!.id)
        .order('created_at', { ascending: false });

      const frameworksWithCounts = (data || []).map((fw: any) => ({
        ...fw,
        competencies_count: fw.competencies?.[0]?.count || 0,
      }));

      setFrameworks(frameworksWithCounts);
    } catch (error) {
      logError(error, 'medium', { component: 'CompetencyFrameworks', action: 'loadFrameworks' });
      showToast('Failed to load frameworks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFramework = async () => {
    try {
      const { error } = await supabase.from('competency_frameworks').insert([
        {
          ...newFramework,
          company_id: selectedCompany!.id,
        },
      ]);

      if (error) throw error;

      showToast('Framework created successfully', 'success');
      setShowAddModal(false);
      setNewFramework({
        framework_name: '',
        framework_code: '',
        description: '',
        framework_type: 'technical',
      });
      loadFrameworks();
    } catch (error: any) {
      logError(error, 'medium', { component: 'CompetencyFrameworks', action: 'addFramework' });
      showToast(error.message || 'Failed to create framework', 'error');
    }
  };

  const togglePublished = async (frameworkId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('competency_frameworks')
        .update({
          is_published: !currentStatus,
          published_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq('id', frameworkId);

      if (error) throw error;

      showToast(`Framework ${!currentStatus ? 'published' : 'unpublished'}`, 'success');
      loadFrameworks();
    } catch (error: any) {
      logError(error, 'medium', { component: 'CompetencyFrameworks', action: 'updateFramework' });
      showToast(error.message || 'Failed to update framework', 'error');
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Competency Frameworks</h2>
          <p className="text-gray-600 mt-1">Define and manage competency models</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Framework
        </button>
      </div>

      {frameworks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No frameworks yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first competency framework to define organizational capabilities
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Framework
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frameworks.map((framework) => (
            <div key={framework.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{framework.framework_name}</h3>
                    <p className="text-sm text-gray-500">{framework.framework_code}</p>
                  </div>
                  {framework.is_published && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{framework.description}</p>

                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full capitalize">
                    {framework.framework_type}
                  </span>
                  <span className="text-gray-500">{framework.competencies_count} competencies</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => togglePublished(framework.id, framework.is_published)}
                    className={`text-sm ${
                      framework.is_published
                        ? 'text-gray-600 hover:text-gray-900'
                        : 'text-blue-600 hover:text-blue-900'
                    }`}
                  >
                    {framework.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Competency Framework</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Framework Name</label>
                <input
                  type="text"
                  value={newFramework.framework_name}
                  onChange={(e) =>
                    setNewFramework({ ...newFramework, framework_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Technical Competency Framework"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Framework Code</label>
                <input
                  type="text"
                  value={newFramework.framework_code}
                  onChange={(e) =>
                    setNewFramework({ ...newFramework, framework_code: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., TCF-2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newFramework.description}
                  onChange={(e) => setNewFramework({ ...newFramework, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the framework..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Framework Type</label>
                <select
                  value={newFramework.framework_type}
                  onChange={(e) =>
                    setNewFramework({ ...newFramework, framework_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="technical">Technical</option>
                  <option value="leadership">Leadership</option>
                  <option value="functional">Functional</option>
                  <option value="behavioral">Behavioral</option>
                </select>
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
                onClick={handleAddFramework}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Framework
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
