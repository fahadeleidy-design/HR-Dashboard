import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Edit2, Trash2, Save, X, BookOpen, Info } from 'lucide-react';

interface TrainingProgram {
  id: string;
  program_name_en: string;
  program_name_ar: string | null;
  description: string | null;
  trainer_name: string | null;
  duration_hours: number;
  start_date: string;
  end_date: string;
  max_participants: number | null;
  cost: number | null;
}

interface TrainingProgramManagerProps {
  companyId: string;
  programs: TrainingProgram[];
  onProgramsChange: () => void;
}

export default function TrainingProgramManager({ companyId, programs, onProgramsChange }: TrainingProgramManagerProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [formData, setFormData] = useState({
    program_name_en: '',
    program_name_ar: '',
    description: '',
    trainer_name: '',
    duration_hours: 0,
    start_date: '',
    end_date: '',
    max_participants: 0,
    cost: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const programData = {
        company_id: companyId,
        program_name_en: formData.program_name_en,
        program_name_ar: formData.program_name_ar || null,
        description: formData.description || null,
        trainer_name: formData.trainer_name || null,
        duration_hours: formData.duration_hours,
        start_date: formData.start_date,
        end_date: formData.end_date,
        max_participants: formData.max_participants || null,
        cost: formData.cost || null
      };

      if (editingProgram) {
        const { error } = await supabase
          .from('training_programs')
          .update(programData)
          .eq('id', editingProgram.id);

        if (error) throw error;
        showToast(
          language === 'ar' ? 'تم تحديث البرنامج بنجاح' : 'Program updated successfully',
          'success'
        );
      } else {
        const { error } = await supabase
          .from('training_programs')
          .insert([programData]);

        if (error) throw error;
        showToast(
          language === 'ar'
            ? 'تم إضافة البرنامج بنجاح! الآن يمكنك إضافة الوحدات التدريبية من تبويب "الوحدات والشرائح"'
            : 'Program added successfully! Now you can add training modules from the "Modules & Slides" tab',
          'success'
        );
      }

      resetForm();
      onProgramsChange();
    } catch (error: any) {
      console.error('Error saving program:', error);
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (program: TrainingProgram) => {
    setEditingProgram(program);
    setFormData({
      program_name_en: program.program_name_en,
      program_name_ar: program.program_name_ar || '',
      description: program.description || '',
      trainer_name: program.trainer_name || '',
      duration_hours: program.duration_hours,
      start_date: program.start_date,
      end_date: program.end_date,
      max_participants: program.max_participants || 0,
      cost: program.cost || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟ سيتم حذف جميع الوحدات والاختبارات المرتبطة.' : 'Are you sure you want to delete? All associated modules and quizzes will be deleted.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_programs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast(
        language === 'ar' ? 'تم حذف البرنامج بنجاح' : 'Program deleted successfully',
        'success'
      );
      onProgramsChange();
    } catch (error: any) {
      console.error('Error deleting program:', error);
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      program_name_en: '',
      program_name_ar: '',
      description: '',
      trainer_name: '',
      duration_hours: 0,
      start_date: '',
      end_date: '',
      max_participants: 0,
      cost: 0
    });
    setEditingProgram(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {language === 'ar' ? 'البرامج التدريبية' : 'Training Programs'}
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {language === 'ar' ? 'إضافة برنامج' : 'Add Program'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {editingProgram
              ? (language === 'ar' ? 'تعديل البرنامج' : 'Edit Program')
              : (language === 'ar' ? 'برنامج تدريبي جديد' : 'New Training Program')}
          </h4>

          {!editingProgram && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-blue-900 mb-1">
                    {language === 'ar' ? 'كيفية إضافة المواد التدريبية' : 'How to Upload Training Materials'}
                  </h5>
                  <p className="text-sm text-blue-800">
                    {language === 'ar'
                      ? 'بعد إنشاء البرنامج، يمكنك إضافة الوحدات التدريبية ورفع الملفات (PDF، فيديو، صور) من خلال:'
                      : 'After creating the program, you can add training modules and upload files (PDFs, videos, images) by:'}
                  </p>
                  <ol className={`mt-2 text-sm text-blue-800 space-y-1 ${language === 'ar' ? 'list-arabic mr-5' : 'list-decimal ml-5'}`}>
                    <li>{language === 'ar' ? 'العودة للصفحة الرئيسية' : 'Going back to the main page'}</li>
                    <li>{language === 'ar' ? 'اختيار البرنامج من القائمة' : 'Selecting the program from the dropdown'}</li>
                    <li>{language === 'ar' ? 'النقر على تبويب "الوحدات والشرائح"' : 'Clicking on "Modules & Slides" tab'}</li>
                    <li>{language === 'ar' ? 'النقر على "إضافة وحدة" ورفع الملفات' : 'Clicking "Add Module" and uploading files'}</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'اسم البرنامج (إنجليزي)' : 'Program Name (English)'}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.program_name_en}
                  onChange={(e) => setFormData({ ...formData, program_name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'اسم البرنامج (عربي)' : 'Program Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={formData.program_name_ar}
                  onChange={(e) => setFormData({ ...formData, program_name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'المدرب' : 'Trainer Name'}
                </label>
                <input
                  type="text"
                  value={formData.trainer_name}
                  onChange={(e) => setFormData({ ...formData, trainer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'المدة (ساعات)' : 'Duration (hours)'}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'الحد الأقصى للمشاركين' : 'Max Participants'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'التكلفة' : 'Cost'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={language === 'ar' ? 'أدخل وصف البرنامج...' : 'Enter program description...'}
              />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map((program) => (
          <div
            key={program.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900">
                  {language === 'ar' && program.program_name_ar ? program.program_name_ar : program.program_name_en}
                </h4>
                {program.trainer_name && (
                  <p className="text-sm text-gray-600 mt-1">
                    {language === 'ar' ? 'المدرب:' : 'Trainer:'} {program.trainer_name}
                  </p>
                )}
              </div>
              <BookOpen className="h-8 w-8 text-blue-600 flex-shrink-0" />
            </div>

            {program.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{program.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{language === 'ar' ? 'المدة:' : 'Duration:'}</span>
                <span className="font-medium text-gray-900">{program.duration_hours} {language === 'ar' ? 'ساعة' : 'hours'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{language === 'ar' ? 'من:' : 'From:'}</span>
                <span className="font-medium text-gray-900">{new Date(program.start_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{language === 'ar' ? 'إلى:' : 'To:'}</span>
                <span className="font-medium text-gray-900">{new Date(program.end_date).toLocaleDateString()}</span>
              </div>
              {program.max_participants && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{language === 'ar' ? 'المشاركين:' : 'Max Participants:'}</span>
                  <span className="font-medium text-gray-900">{program.max_participants}</span>
                </div>
              )}
              {program.cost && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{language === 'ar' ? 'التكلفة:' : 'Cost:'}</span>
                  <span className="font-medium text-gray-900">{program.cost} {language === 'ar' ? 'ر.س' : 'SAR'}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-gray-200">
              <button
                onClick={() => handleEdit(program)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDelete(program.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
