import { useState, useEffect } from 'react';
import { Mail, Plus, Edit2, Eye, Trash2, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { emailTemplates, type EmailTemplate } from '../../lib/emailTemplates';

interface SavedTemplate extends EmailTemplate {
  id: string;
  is_active: boolean;
  created_at: string;
}

export default function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { showToast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useCompany();

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'leave', label: 'Leave Management' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'recruitment', label: 'Recruitment' },
    { value: 'performance', label: 'Performance' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'hr', label: 'HR / Lifecycle' },
    { value: 'system', label: 'System' },
  ];

  useEffect(() => {
    if (currentCompany?.id) {
      loadTemplates();
    }
  }, [currentCompany]);

  async function loadTemplates() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function seedDefaultTemplates() {
    if (!currentCompany?.id) return;

    try {
      setLoading(true);

      const templatesToInsert = emailTemplates.map(template => ({
        company_id: currentCompany.id,
        template_key: template.template_key,
        name: template.name,
        subject: template.subject,
        body_html: template.body_html,
        body_text: template.body_text,
        variables: template.variables,
        category: template.category,
        language: template.language,
        is_active: true,
      }));

      for (const template of templatesToInsert) {
        const { error } = await supabase
          .from('email_templates')
          .upsert(template, {
            onConflict: 'company_id,template_key,language'
          });

        if (error) throw error;
      }

      showToast(`Successfully loaded ${emailTemplates.length} email templates`, 'success');
      await loadTemplates();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleTemplateStatus(templateId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !currentStatus })
        .eq('id', templateId);

      if (error) throw error;

      showToast(`Template ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
      await loadTemplates();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      showToast('Template deleted successfully', 'success');
      await loadTemplates();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.template_key.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage notification templates for automated emails
          </p>
        </div>
        <button
          onClick={seedDefaultTemplates}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Load Default Templates
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No email templates found</p>
            <button
              onClick={seedDefaultTemplates}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Load Default Templates
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Key:</strong> {template.template_key}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Subject:</strong> {template.subject}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.variables.map((variable: string) => (
                        <span
                          key={variable}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreview(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        template.is_active
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {template.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{selectedTemplate.name}</h3>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedTemplate(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Line
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    {selectedTemplate.subject}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTML Preview
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <iframe
                      srcDoc={selectedTemplate.body_html}
                      className="w-full h-96 border-0"
                      title="Email Preview"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plain Text Version
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap font-mono">
                    {selectedTemplate.body_text}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
