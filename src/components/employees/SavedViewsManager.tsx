import { useState, useEffect } from 'react';
import { Save, Bookmark, Star, Share2, Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

interface SavedView {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_shared: boolean;
  filter_config: any;
  column_config: any;
  sort_config: any;
}

interface SavedViewsManagerProps {
  currentFilters: any;
  currentColumns: any;
  currentSort: any;
  onLoadView: (view: SavedView) => void;
  onClose: () => void;
}

export function SavedViewsManager({
  currentFilters,
  currentColumns,
  currentSort,
  onLoadView,
  onClose
}: SavedViewsManagerProps) {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [editingView, setEditingView] = useState<SavedView | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false,
    is_shared: false
  });

  useEffect(() => {
    if (currentCompany && user) {
      fetchViews();
    }
  }, [currentCompany, user]);

  const fetchViews = async () => {
    if (!currentCompany || !user) return;

    try {
      const { data, error } = await supabase
        .from('employee_views')
        .select('*')
        .eq('company_id', currentCompany.id)
        .or(`user_id.eq.${user.id},is_shared.eq.true`)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setViews(data || []);
    } catch (error) {
      console.error('Error fetching views:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveView = async () => {
    if (!currentCompany || !user || !formData.name.trim()) return;

    try {
      const trimmedName = formData.name.trim();

      const existingView = views.find(
        v => v.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!editingView || v.id !== editingView.id)
      );

      if (existingView) {
        alert('A view with this name already exists. Please choose a different name.');
        return;
      }

      const viewData = {
        company_id: currentCompany.id,
        user_id: user.id,
        name: trimmedName,
        description: formData.description.trim() || null,
        is_default: formData.is_default,
        is_shared: formData.is_shared,
        filter_config: currentFilters,
        column_config: currentColumns,
        sort_config: currentSort
      };

      if (editingView) {
        const { error } = await supabase
          .from('employee_views')
          .update(viewData)
          .eq('id', editingView.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_views')
          .insert([viewData]);

        if (error) throw error;
      }

      await fetchViews();
      setShowSaveForm(false);
      setEditingView(null);
      setFormData({ name: '', description: '', is_default: false, is_shared: false });
    } catch (error: any) {
      console.error('Error saving view:', error);

      const errorCode = error?.code || error?.error?.code;
      const errorMessage = error?.message || error?.error?.message || 'Unknown error';

      if (errorCode === '23505' || errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        alert('A view with this name already exists. Please choose a different name.');
      } else if (errorCode === '23503' || errorMessage.includes('foreign key')) {
        alert('You do not have permission to save views. Please contact your administrator.');
      } else if (errorMessage.includes('policy')) {
        alert('You do not have permission to save views. Please contact your administrator.');
      } else {
        alert(`Failed to save view: ${errorMessage}`);
      }
    }
  };

  const handleDeleteView = async (id: string) => {
    if (!confirm('Are you sure you want to delete this view?')) return;

    try {
      const { error } = await supabase
        .from('employee_views')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchViews();
    } catch (error) {
      console.error('Error deleting view:', error);
      alert('Failed to delete view');
    }
  };

  const handleSetDefault = async (view: SavedView) => {
    if (!user) return;

    try {
      await supabase
        .from('employee_views')
        .update({ is_default: false })
        .eq('company_id', currentCompany?.id)
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('employee_views')
        .update({ is_default: true })
        .eq('id', view.id);

      if (error) throw error;
      await fetchViews();
    } catch (error) {
      console.error('Error setting default view:', error);
      alert('Failed to set default view');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Saved Views</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your custom filter and column configurations</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showSaveForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowSaveForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all text-gray-600 hover:text-primary-600 font-medium"
              >
                <Plus className="h-5 w-5" />
                <span>Save Current View</span>
              </button>
            </div>
          )}

          {showSaveForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">
                {editingView ? 'Edit View' : 'Save New View'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    View Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Active Saudi Employees"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description for this view"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Set as default view</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_shared}
                      onChange={(e) => setFormData({ ...formData, is_shared: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Share with team</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveView}
                    disabled={!formData.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    <span>{editingView ? 'Update' : 'Save'} View</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveForm(false);
                      setEditingView(null);
                      setFormData({ name: '', description: '', is_default: false, is_shared: false });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : views.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No saved views yet</p>
              <p className="text-sm text-gray-400 mt-1">Save your first view to quickly access your favorite filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {views.map((view) => (
                <div
                  key={view.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{view.name}</h3>
                        {view.is_default && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                            <Star className="h-3 w-3 fill-current" />
                            Default
                          </span>
                        )}
                        {view.is_shared && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            <Share2 className="h-3 w-3" />
                            Shared
                          </span>
                        )}
                      </div>
                      {view.description && (
                        <p className="text-sm text-gray-600 mt-1">{view.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => onLoadView(view)}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                      >
                        Load
                      </button>
                      {!view.is_default && (
                        <button
                          onClick={() => handleSetDefault(view)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Set as default"
                        >
                          <Star className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingView(view);
                          setFormData({
                            name: view.name,
                            description: view.description || '',
                            is_default: view.is_default,
                            is_shared: view.is_shared
                          });
                          setShowSaveForm(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit view"
                      >
                        <Edit2 className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteView(view.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete view"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
