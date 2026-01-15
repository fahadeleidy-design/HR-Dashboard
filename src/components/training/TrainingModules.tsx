import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Video,
  FileText,
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  CheckCircle
} from 'lucide-react';

interface TrainingModule {
  id: string;
  title_en: string;
  title_ar: string | null;
  content_type: 'slide' | 'video' | 'document' | 'interactive' | 'external_link';
  content: string | null;
  content_url: string | null;
  duration_minutes: number;
  sequence_order: number;
  is_mandatory: boolean;
  completed?: boolean;
}

interface TrainingModulesProps {
  programId: string;
  companyId: string;
  isReadOnly?: boolean;
}

export default function TrainingModules({ programId, companyId, isReadOnly = false }: TrainingModulesProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language } = useLanguage();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [formData, setFormData] = useState({
    title_en: '',
    title_ar: '',
    content_type: 'slide' as const,
    content: '',
    content_url: '',
    duration_minutes: 0,
    is_mandatory: true
  });

  useEffect(() => {
    loadModules();
  }, [programId]);

  const loadModules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .eq('training_program_id', programId)
        .order('sequence_order');

      if (error) throw error;
      setModules(data || []);
    } catch (error: any) {
      console.error('Error loading modules:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const moduleData = {
        training_program_id: programId,
        company_id: companyId,
        ...formData,
        sequence_order: editingModule ? editingModule.sequence_order : modules.length,
        created_by: user?.id
      };

      if (editingModule) {
        const { error } = await supabase
          .from('training_modules')
          .update(moduleData)
          .eq('id', editingModule.id);

        if (error) throw error;
        showToast(
          language === 'ar' ? 'تم تحديث الوحدة بنجاح' : 'Module updated successfully',
          'success'
        );
      } else {
        const { error } = await supabase
          .from('training_modules')
          .insert([moduleData]);

        if (error) throw error;
        showToast(
          language === 'ar' ? 'تم إضافة الوحدة بنجاح' : 'Module added successfully',
          'success'
        );
      }

      resetForm();
      await loadModules();
    } catch (error: any) {
      console.error('Error saving module:', error);
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (module: TrainingModule) => {
    setEditingModule(module);
    setFormData({
      title_en: module.title_en,
      title_ar: module.title_ar || '',
      content_type: module.content_type,
      content: module.content || '',
      content_url: module.content_url || '',
      duration_minutes: module.duration_minutes,
      is_mandatory: module.is_mandatory
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_modules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast(
        language === 'ar' ? 'تم حذف الوحدة بنجاح' : 'Module deleted successfully',
        'success'
      );
      await loadModules();
    } catch (error: any) {
      console.error('Error deleting module:', error);
      showToast(error.message, 'error');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = modules.findIndex(m => m.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === modules.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const reorderedModules = [...modules];
    [reorderedModules[currentIndex], reorderedModules[newIndex]] =
    [reorderedModules[newIndex], reorderedModules[currentIndex]];

    try {
      const updates = reorderedModules.map((module, index) => ({
        id: module.id,
        sequence_order: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('training_modules')
          .update({ sequence_order: update.sequence_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      await loadModules();
    } catch (error: any) {
      console.error('Error reordering modules:', error);
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title_en: '',
      title_ar: '',
      content_type: 'slide',
      content: '',
      content_url: '',
      duration_minutes: 0,
      is_mandatory: true
    });
    setEditingModule(null);
    setShowForm(false);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'external_link':
        return <LinkIcon className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
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
      {!isReadOnly && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {language === 'ar' ? 'الوحدات التدريبية' : 'Training Modules'}
          </h3>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {language === 'ar' ? 'إضافة وحدة' : 'Add Module'}
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {editingModule
              ? (language === 'ar' ? 'تعديل الوحدة' : 'Edit Module')
              : (language === 'ar' ? 'إضافة وحدة جديدة' : 'Add New Module')}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
                </label>
                <input
                  type="text"
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'نوع المحتوى' : 'Content Type'}
                </label>
                <select
                  value={formData.content_type}
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="slide">{language === 'ar' ? 'شريحة' : 'Slide'}</option>
                  <option value="video">{language === 'ar' ? 'فيديو' : 'Video'}</option>
                  <option value="document">{language === 'ar' ? 'مستند' : 'Document'}</option>
                  <option value="interactive">{language === 'ar' ? 'تفاعلي' : 'Interactive'}</option>
                  <option value="external_link">{language === 'ar' ? 'رابط خارجي' : 'External Link'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'المدة (دقائق)' : 'Duration (minutes)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formData.content_type !== 'external_link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'المحتوى' : 'Content'}
                </label>
                <textarea
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={language === 'ar' ? 'أدخل محتوى الوحدة...' : 'Enter module content...'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'رابط URL (اختياري)' : 'Content URL (optional)'}
              </label>
              <input
                type="url"
                value={formData.content_url}
                onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_mandatory"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_mandatory" className="ml-2 rtl:ml-0 rtl:mr-2 block text-sm text-gray-700">
                {language === 'ar' ? 'إلزامي' : 'Mandatory'}
              </label>
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <X className="h-4 w-4 inline mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="h-4 w-4 inline mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {modules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {language === 'ar' ? 'لا توجد وحدات' : 'No modules'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {language === 'ar' ? 'ابدأ بإضافة وحدة تدريبية' : 'Start by adding a training module'}
            </p>
          </div>
        ) : (
          modules.map((module, index) => (
            <div
              key={module.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 rtl:space-x-reverse flex-1">
                  <div className="flex-shrink-0 mt-1 text-blue-600">
                    {getContentTypeIcon(module.content_type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">
                      {language === 'ar' && module.title_ar ? module.title_ar : module.title_en}
                    </h4>
                    {module.content && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{module.content}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span>{module.duration_minutes} {language === 'ar' ? 'دقيقة' : 'minutes'}</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {module.content_type}
                      </span>
                      {module.is_mandatory && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {language === 'ar' ? 'إلزامي' : 'Mandatory'}
                        </span>
                      )}
                      {module.completed && (
                        <span className="inline-flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                          {language === 'ar' ? 'مكتمل' : 'Completed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse ml-4 rtl:ml-0 rtl:mr-4">
                    <button
                      onClick={() => handleReorder(module.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ArrowUp className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleReorder(module.id, 'down')}
                      disabled={index === modules.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ArrowDown className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(module)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(module.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
