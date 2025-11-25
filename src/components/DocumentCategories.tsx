import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Folder, Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface Category {
  id: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  color: string;
  icon: string;
  parent_id?: string;
  subcategories?: Category[];
}

interface DocumentCategoriesProps {
  companyId: string;
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
}

export function DocumentCategories({ companyId, onCategorySelect, selectedCategoryId }: DocumentCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description: '',
    color: '#6B7280',
    icon: 'folder',
    parent_id: ''
  });

  useEffect(() => {
    fetchCategories();
  }, [companyId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order');

    if (data && !error) {
      const organized = organizeCategories(data);
      setCategories(organized);
    }
  };

  const organizeCategories = (flat: any[]): Category[] => {
    const map = new Map();
    const roots: Category[] = [];

    flat.forEach(cat => {
      map.set(cat.id, { ...cat, subcategories: [] });
    });

    flat.forEach(cat => {
      const category = map.get(cat.id);
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id).subcategories.push(category);
      } else {
        roots.push(category);
      }
    });

    return roots;
  };

  const handleSave = async () => {
    const categoryData = {
      ...formData,
      company_id: companyId,
      parent_id: formData.parent_id || null
    };

    if (editingCategory) {
      await supabase
        .from('document_categories')
        .update(categoryData)
        .eq('id', editingCategory.id);
    } else {
      await supabase
        .from('document_categories')
        .insert([categoryData]);
    }

    setShowAddModal(false);
    setEditingCategory(null);
    setFormData({ name_en: '', name_ar: '', description: '', color: '#6B7280', icon: 'folder', parent_id: '' });
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this category? Subcategories will also be deleted.')) {
      await supabase
        .from('document_categories')
        .update({ is_active: false })
        .eq('id', id);
      fetchCategories();
    }
  };

  const renderCategory = (category: Category, level = 0) => (
    <div key={category.id} className={`${level > 0 ? 'ml-6' : ''}`}>
      <div
        onClick={() => onCategorySelect?.(category.id)}
        className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-all ${
          selectedCategoryId === category.id
            ? 'bg-blue-100 border-2 border-blue-500'
            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: category.color + '20' }}
          >
            <Folder className="h-4 w-4" style={{ color: category.color }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{category.name_en}</p>
            {category.name_ar && <p className="text-xs text-gray-600" dir="rtl">{category.name_ar}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingCategory(category);
              setFormData({
                name_en: category.name_en,
                name_ar: category.name_ar || '',
                description: category.description || '',
                color: category.color,
                icon: category.icon,
                parent_id: category.parent_id || ''
              });
              setShowAddModal(true);
            }}
            className="p-1 hover:bg-white rounded"
          >
            <Edit2 className="h-3 w-3 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(category.id);
            }}
            className="p-1 hover:bg-white rounded"
          >
            <Trash2 className="h-3 w-3 text-red-600" />
          </button>
        </div>
      </div>
      {category.subcategories && category.subcategories.length > 0 && (
        <div>
          {category.subcategories.map(sub => renderCategory(sub, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Categories</h3>
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name_en: '', name_ar: '', description: '', color: '#6B7280', icon: 'folder', parent_id: '' });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <button
        onClick={() => onCategorySelect?.(null)}
        className={`w-full flex items-center gap-3 p-3 rounded-lg mb-3 transition-all ${
          selectedCategoryId === null
            ? 'bg-blue-100 border-2 border-blue-500'
            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
        }`}
      >
        <Folder className="h-5 w-5 text-gray-600" />
        <span className="text-sm font-medium">All Documents</span>
      </button>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {categories.map(cat => renderCategory(cat))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Arabic)</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
