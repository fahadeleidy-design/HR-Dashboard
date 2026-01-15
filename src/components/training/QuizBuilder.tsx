import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  FileQuestion,
  CheckCircle,
  XCircle,
  ListOrdered
} from 'lucide-react';

interface Quiz {
  id: string;
  title_en: string;
  title_ar: string | null;
  description: string | null;
  passing_score: number;
  max_attempts: number;
  time_limit_minutes: number | null;
  is_mandatory: boolean;
  show_correct_answers: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
}

interface Question {
  id: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question_text: string;
  explanation: string | null;
  points: number;
  sequence_order: number;
  options?: QuizOption[];
}

interface QuizOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  sequence_order: number;
}

interface QuizBuilderProps {
  programId: string;
  companyId: string;
}

export default function QuizBuilder({ programId, companyId }: QuizBuilderProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language } = useLanguage();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [quizFormData, setQuizFormData] = useState({
    title_en: '',
    title_ar: '',
    description: '',
    passing_score: 70,
    max_attempts: 3,
    time_limit_minutes: 30,
    is_mandatory: true,
    show_correct_answers: true,
    randomize_questions: false,
    randomize_options: false
  });

  const [questionFormData, setQuestionFormData] = useState({
    question_type: 'multiple_choice' as const,
    question_text: '',
    explanation: '',
    points: 1,
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  });

  useEffect(() => {
    loadQuizzes();
  }, [programId]);

  useEffect(() => {
    if (selectedQuiz) {
      loadQuestions(selectedQuiz.id);
    }
  }, [selectedQuiz]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_quizzes')
        .select('*')
        .eq('training_program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
      if (data && data.length > 0 && !selectedQuiz) {
        setSelectedQuiz(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading quizzes:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (quizId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          options:quiz_options(*)
        `)
        .eq('quiz_id', quizId)
        .order('sequence_order');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error('Error loading questions:', error);
      showToast(error.message, 'error');
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const quizData = {
        training_program_id: programId,
        company_id: companyId,
        ...quizFormData,
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('training_quizzes')
        .insert([quizData])
        .select()
        .single();

      if (error) throw error;

      showToast(
        language === 'ar' ? 'تم إضافة الاختبار بنجاح' : 'Quiz added successfully',
        'success'
      );

      setShowQuizForm(false);
      setSelectedQuiz(data);
      await loadQuizzes();
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      showToast(error.message, 'error');
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedQuiz) return;

    try {
      const questionData = {
        quiz_id: selectedQuiz.id,
        question_type: questionFormData.question_type,
        question_text: questionFormData.question_text,
        explanation: questionFormData.explanation || null,
        points: questionFormData.points,
        sequence_order: editingQuestion ? editingQuestion.sequence_order : questions.length,
        is_required: true
      };

      let questionId: string;

      if (editingQuestion) {
        const { error } = await supabase
          .from('quiz_questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        questionId = editingQuestion.id;

        await supabase
          .from('quiz_options')
          .delete()
          .eq('question_id', editingQuestion.id);
      } else {
        const { data, error } = await supabase
          .from('quiz_questions')
          .insert([questionData])
          .select()
          .single();

        if (error) throw error;
        questionId = data.id;
      }

      if (questionFormData.question_type === 'multiple_choice' || questionFormData.question_type === 'true_false') {
        const options = questionFormData.options.map((opt, index) => ({
          question_id: questionId,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          sequence_order: index
        }));

        const { error: optionsError } = await supabase
          .from('quiz_options')
          .insert(options);

        if (optionsError) throw optionsError;
      }

      showToast(
        editingQuestion
          ? (language === 'ar' ? 'تم تحديث السؤال بنجاح' : 'Question updated successfully')
          : (language === 'ar' ? 'تم إضافة السؤال بنجاح' : 'Question added successfully'),
        'success'
      );

      resetQuestionForm();
      await loadQuestions(selectedQuiz.id);
    } catch (error: any) {
      console.error('Error saving question:', error);
      showToast(error.message, 'error');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast(
        language === 'ar' ? 'تم حذف السؤال بنجاح' : 'Question deleted successfully',
        'success'
      );

      if (selectedQuiz) {
        await loadQuestions(selectedQuiz.id);
      }
    } catch (error: any) {
      console.error('Error deleting question:', error);
      showToast(error.message, 'error');
    }
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      question_type: 'multiple_choice',
      question_text: '',
      explanation: '',
      points: 1,
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    });
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  const addOption = () => {
    setQuestionFormData({
      ...questionFormData,
      options: [...questionFormData.options, { option_text: '', is_correct: false }]
    });
  };

  const removeOption = (index: number) => {
    setQuestionFormData({
      ...questionFormData,
      options: questionFormData.options.filter((_, i) => i !== index)
    });
  };

  const updateOption = (index: number, field: 'option_text' | 'is_correct', value: string | boolean) => {
    const newOptions = [...questionFormData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setQuestionFormData({ ...questionFormData, options: newOptions });
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {language === 'ar' ? 'إدارة الاختبارات' : 'Quiz Management'}
        </h3>
        <button
          onClick={() => setShowQuizForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {language === 'ar' ? 'إنشاء اختبار' : 'Create Quiz'}
        </button>
      </div>

      {showQuizForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {language === 'ar' ? 'اختبار جديد' : 'New Quiz'}
          </h4>
          <form onSubmit={handleSaveQuiz} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
                </label>
                <input
                  type="text"
                  required
                  value={quizFormData.title_en}
                  onChange={(e) => setQuizFormData({ ...quizFormData, title_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
                </label>
                <input
                  type="text"
                  value={quizFormData.title_ar}
                  onChange={(e) => setQuizFormData({ ...quizFormData, title_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'درجة النجاح (%)' : 'Passing Score (%)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={quizFormData.passing_score}
                  onChange={(e) => setQuizFormData({ ...quizFormData, passing_score: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'الحد الأقصى للمحاولات' : 'Max Attempts'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={quizFormData.max_attempts}
                  onChange={(e) => setQuizFormData({ ...quizFormData, max_attempts: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'الوقت المحدد (دقائق)' : 'Time Limit (minutes)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={quizFormData.time_limit_minutes}
                  onChange={(e) => setQuizFormData({ ...quizFormData, time_limit_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </label>
              <textarea
                rows={3}
                value={quizFormData.description}
                onChange={(e) => setQuizFormData({ ...quizFormData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={quizFormData.is_mandatory}
                  onChange={(e) => setQuizFormData({ ...quizFormData, is_mandatory: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_mandatory" className="ml-2 rtl:ml-0 rtl:mr-2 text-sm text-gray-700">
                  {language === 'ar' ? 'إلزامي' : 'Mandatory'}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_correct_answers"
                  checked={quizFormData.show_correct_answers}
                  onChange={(e) => setQuizFormData({ ...quizFormData, show_correct_answers: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_correct_answers" className="ml-2 rtl:ml-0 rtl:mr-2 text-sm text-gray-700">
                  {language === 'ar' ? 'إظهار الإجابات الصحيحة' : 'Show Correct Answers'}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="randomize_questions"
                  checked={quizFormData.randomize_questions}
                  onChange={(e) => setQuizFormData({ ...quizFormData, randomize_questions: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="randomize_questions" className="ml-2 rtl:ml-0 rtl:mr-2 text-sm text-gray-700">
                  {language === 'ar' ? 'ترتيب عشوائي للأسئلة' : 'Randomize Questions'}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="randomize_options"
                  checked={quizFormData.randomize_options}
                  onChange={(e) => setQuizFormData({ ...quizFormData, randomize_options: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="randomize_options" className="ml-2 rtl:ml-0 rtl:mr-2 text-sm text-gray-700">
                  {language === 'ar' ? 'ترتيب عشوائي للخيارات' : 'Randomize Options'}
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse">
              <button
                type="button"
                onClick={() => setShowQuizForm(false)}
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

      {quizzes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileQuestion className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {language === 'ar' ? 'لا توجد اختبارات' : 'No quizzes'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {language === 'ar' ? 'ابدأ بإنشاء اختبار جديد' : 'Start by creating a new quiz'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                {language === 'ar' ? 'الاختبارات' : 'Quizzes'}
              </h4>
              <div className="space-y-2">
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    onClick={() => setSelectedQuiz(quiz)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedQuiz?.id === quiz.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {language === 'ar' && quiz.title_ar ? quiz.title_ar : quiz.title_en}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {language === 'ar' ? 'درجة النجاح' : 'Pass'}: {quiz.passing_score}%
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedQuiz && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {language === 'ar' && selectedQuiz.title_ar ? selectedQuiz.title_ar : selectedQuiz.title_en}
                      </h4>
                      {selectedQuiz.description && (
                        <p className="text-gray-600 mt-1">{selectedQuiz.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowQuestionForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                      {language === 'ar' ? 'إضافة سؤال' : 'Add Question'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">{language === 'ar' ? 'درجة النجاح:' : 'Passing Score:'}</span>
                      <span className="ml-2 rtl:ml-0 rtl:mr-2 font-medium">{selectedQuiz.passing_score}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">{language === 'ar' ? 'المحاولات:' : 'Attempts:'}</span>
                      <span className="ml-2 rtl:ml-0 rtl:mr-2 font-medium">{selectedQuiz.max_attempts}</span>
                    </div>
                    {selectedQuiz.time_limit_minutes && (
                      <div>
                        <span className="text-gray-600">{language === 'ar' ? 'الوقت:' : 'Time Limit:'}</span>
                        <span className="ml-2 rtl:ml-0 rtl:mr-2 font-medium">{selectedQuiz.time_limit_minutes} {language === 'ar' ? 'دقيقة' : 'min'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {showQuestionForm && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h5 className="text-lg font-semibold text-gray-900 mb-4">
                      {editingQuestion
                        ? (language === 'ar' ? 'تعديل السؤال' : 'Edit Question')
                        : (language === 'ar' ? 'سؤال جديد' : 'New Question')}
                    </h5>
                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === 'ar' ? 'نوع السؤال' : 'Question Type'}
                          </label>
                          <select
                            value={questionFormData.question_type}
                            onChange={(e) => setQuestionFormData({ ...questionFormData, question_type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="multiple_choice">{language === 'ar' ? 'اختيار من متعدد' : 'Multiple Choice'}</option>
                            <option value="true_false">{language === 'ar' ? 'صح أو خطأ' : 'True/False'}</option>
                            <option value="short_answer">{language === 'ar' ? 'إجابة قصيرة' : 'Short Answer'}</option>
                            <option value="essay">{language === 'ar' ? 'مقالي' : 'Essay'}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === 'ar' ? 'النقاط' : 'Points'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={questionFormData.points}
                            onChange={(e) => setQuestionFormData({ ...questionFormData, points: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'ar' ? 'نص السؤال' : 'Question Text'}
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={questionFormData.question_text}
                          onChange={(e) => setQuestionFormData({ ...questionFormData, question_text: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {(questionFormData.question_type === 'multiple_choice' || questionFormData.question_type === 'true_false') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {language === 'ar' ? 'الخيارات' : 'Options'}
                          </label>
                          <div className="space-y-2">
                            {questionFormData.options.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2 rtl:space-x-reverse">
                                <input
                                  type="checkbox"
                                  checked={option.is_correct}
                                  onChange={(e) => updateOption(index, 'is_correct', e.target.checked)}
                                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                />
                                <input
                                  type="text"
                                  required
                                  value={option.option_text}
                                  onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                                  placeholder={language === 'ar' ? `الخيار ${index + 1}` : `Option ${index + 1}`}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                {questionFormData.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(index)}
                                    className="p-2 text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={addOption}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                          >
                            + {language === 'ar' ? 'إضافة خيار' : 'Add Option'}
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'ar' ? 'التوضيح (اختياري)' : 'Explanation (optional)'}
                        </label>
                        <textarea
                          rows={2}
                          value={questionFormData.explanation}
                          onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                        <button
                          type="button"
                          onClick={resetQuestionForm}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          <X className="h-4 w-4 inline mr-2 rtl:mr-0 rtl:ml-2" />
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Save className="h-4 w-4 inline mr-2 rtl:mr-0 rtl:ml-2" />
                          {language === 'ar' ? 'حفظ' : 'Save'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="space-y-3">
                  {questions.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                      <ListOrdered className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">
                        {language === 'ar' ? 'لا توجد أسئلة. ابدأ بإضافة سؤال.' : 'No questions yet. Start by adding a question.'}
                      </p>
                    </div>
                  ) : (
                    questions.map((question, index) => (
                      <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-start space-x-2 rtl:space-x-reverse">
                              <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <p className="text-gray-900 font-medium">{question.question_text}</p>
                                {question.explanation && (
                                  <p className="text-sm text-gray-600 mt-1">{question.explanation}</p>
                                )}
                                <div className="mt-2 flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-500">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
                                    {question.question_type}
                                  </span>
                                  <span>{question.points} {language === 'ar' ? 'نقطة' : 'points'}</span>
                                </div>
                                {question.options && question.options.length > 0 && (
                                  <div className="mt-3 space-y-1">
                                    {question.options.map((option) => (
                                      <div key={option.id} className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
                                        {option.is_correct ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-gray-300" />
                                        )}
                                        <span className={option.is_correct ? 'text-green-600 font-medium' : 'text-gray-600'}>
                                          {option.option_text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse ml-4 rtl:ml-0 rtl:mr-4">
                            <button
                              onClick={() => {
                                setEditingQuestion(question);
                                setQuestionFormData({
                                  question_type: question.question_type,
                                  question_text: question.question_text,
                                  explanation: question.explanation || '',
                                  points: question.points,
                                  options: question.options?.map(opt => ({
                                    option_text: opt.option_text,
                                    is_correct: opt.is_correct
                                  })) || [
                                    { option_text: '', is_correct: false },
                                    { option_text: '', is_correct: false }
                                  ]
                                });
                                setShowQuestionForm(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
