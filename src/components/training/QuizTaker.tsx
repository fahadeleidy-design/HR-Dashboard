import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Trophy,
  RotateCcw
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
  quiz_status?: string;
  requires_retake?: boolean;
  attempts_used?: number;
  has_passed?: boolean;
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

interface QuizAttempt {
  id: string;
  attempt_number: number;
  score: number | null;
  max_score: number;
  percentage: number | null;
  passed: boolean;
  started_at: string;
  completed_at: string | null;
}

interface QuizTakerProps {
  programId: string;
  companyId: string;
  employeeId: string;
}

export default function QuizTaker({ programId, companyId, employeeId }: QuizTakerProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language } = useLanguage();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const { logError } = useErrorHandler();

  useEffect(() => {
    loadQuizzes();
  }, [programId]);

  useEffect(() => {
    if (selectedQuiz) {
      loadQuestions(selectedQuiz.id);
      loadAttempts(selectedQuiz.id);
    }
  }, [selectedQuiz]);

  useEffect(() => {
    if (quizStarted && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quizStarted, timeRemaining]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);

      // Load only assigned quizzes using the view
      const { data: assignedQuizzes, error: assignmentError } = await supabase
        .from('employee_available_quizzes')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('training_program_id', programId)
        .order('enabled_at', { ascending: false });

      if (assignmentError) throw assignmentError;

      // Convert the view results to Quiz objects
      const quizList: Quiz[] = (assignedQuizzes || []).map(aq => ({
        id: aq.quiz_id,
        title_en: aq.quiz_title_en,
        title_ar: aq.quiz_title_ar,
        description: aq.quiz_description,
        passing_score: aq.passing_score,
        max_attempts: aq.max_attempts,
        time_limit_minutes: aq.time_limit_minutes,
        is_mandatory: aq.quiz_is_mandatory,
        show_correct_answers: true,
        randomize_questions: false,
        randomize_options: false,
        quiz_status: aq.quiz_status,
        requires_retake: aq.requires_retake,
        attempts_used: aq.attempts_used,
        has_passed: aq.has_passed
      }));

      setQuizzes(quizList);
      if (quizList.length > 0) {
        setSelectedQuiz(quizList[0]);
      }
    } catch (error: any) {
      logError(error, 'medium', { component: 'QuizTaker', action: 'loadQuizzes' });
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

      let loadedQuestions = data || [];
      if (selectedQuiz?.randomize_questions) {
        loadedQuestions = [...loadedQuestions].sort(() => Math.random() - 0.5);
      }
      if (selectedQuiz?.randomize_options) {
        loadedQuestions = loadedQuestions.map(q => ({
          ...q,
          options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : []
        }));
      }

      setQuestions(loadedQuestions);
    } catch (error: any) {
      logError(error, 'medium', { component: 'QuizTaker', action: 'loadQuestions' });
      showToast(error.message, 'error');
    }
  };

  const loadAttempts = async (quizId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('employee_id', employeeId)
        .order('attempt_number', { ascending: false });

      if (error) throw error;
      setAttempts(data || []);
    } catch (error: any) {
      logError(error, 'medium', { component: 'QuizTaker', action: 'loadAttempts' });
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedQuiz || !user) return;

    const attemptNumber = attempts.length + 1;
    if (attemptNumber > selectedQuiz.max_attempts) {
      showToast(
        language === 'ar'
          ? 'لقد استنفدت جميع المحاولات المتاحة'
          : 'You have used all available attempts',
        'error'
      );
      return;
    }

    try {
      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert([{
          company_id: companyId,
          quiz_id: selectedQuiz.id,
          employee_id: employeeId,
          user_id: user.id,
          attempt_number: attemptNumber,
          max_score: maxScore,
          started_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentAttempt(data);
      setQuizStarted(true);
      setAnswers({});
      setShowResults(false);

      if (selectedQuiz.time_limit_minutes) {
        setTimeRemaining(selectedQuiz.time_limit_minutes * 60);
      }

      showToast(
        language === 'ar' ? 'بدء الاختبار' : 'Quiz started',
        'success'
      );
    } catch (error: any) {
      logError(error, 'medium', { component: 'QuizTaker', action: 'startQuiz' });
      showToast(error.message, 'error');
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (!currentAttempt || !selectedQuiz) return;

    try {
      setSubmitting(true);

      let totalScore = 0;
      const answerRecords = [];

      for (const question of questions) {
        const userAnswer = answers[question.id];
        let isCorrect = false;
        let pointsEarned = 0;
        let selectedOptionId = null;

        if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
          const correctOption = question.options?.find(opt => opt.is_correct);
          if (correctOption && userAnswer === correctOption.id) {
            isCorrect = true;
            pointsEarned = question.points;
            totalScore += pointsEarned;
          }
          selectedOptionId = userAnswer || null;
        }

        answerRecords.push({
          attempt_id: currentAttempt.id,
          question_id: question.id,
          selected_option_id: selectedOptionId,
          answer_text: userAnswer || null,
          is_correct: isCorrect,
          points_earned: pointsEarned
        });
      }

      const { error: answersError } = await supabase
        .from('quiz_answers')
        .insert(answerRecords);

      if (answersError) throw answersError;

      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = percentage >= selectedQuiz.passing_score;

      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          score: totalScore,
          percentage,
          passed,
          completed_at: new Date().toISOString(),
          time_taken_minutes: selectedQuiz.time_limit_minutes
            ? selectedQuiz.time_limit_minutes - (timeRemaining ? Math.floor(timeRemaining / 60) : 0)
            : null
        })
        .eq('id', currentAttempt.id);

      if (updateError) throw updateError;

      setQuizStarted(false);
      setShowResults(true);
      await loadAttempts(selectedQuiz.id);

      showToast(
        passed
          ? (language === 'ar' ? 'تهانينا! لقد نجحت في الاختبار' : 'Congratulations! You passed the quiz')
          : (language === 'ar' ? 'لم تنجح في الاختبار. حاول مرة أخرى' : 'You did not pass. Try again'),
        passed ? 'success' : 'error'
      );
    } catch (error: any) {
      logError(error, 'medium', { component: 'QuizTaker', action: 'submitQuiz' });
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {language === 'ar' ? 'لا توجد اختبارات متاحة' : 'No quizzes available'}
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">
              {selectedQuiz && (language === 'ar' && selectedQuiz.title_ar ? selectedQuiz.title_ar : selectedQuiz?.title_en)}
            </h3>
            {selectedQuiz?.description && (
              <p className="text-gray-600 mt-2">{selectedQuiz.description}</p>
            )}
          </div>
          {quizStarted && timeRemaining !== null && (
            <div className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg ${
              timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>
              <Clock className="h-5 w-5" />
              <span className="font-mono text-lg font-bold">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>

        {selectedQuiz && selectedQuiz.requires_retake && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-red-400 mt-0.5 mr-3 rtl:mr-0 rtl:ml-3" />
              <div>
                <h4 className="text-red-800 font-semibold">
                  {language === 'ar' ? 'يجب إعادة التدريب' : 'Training Retake Required'}
                </h4>
                <p className="text-red-700 mt-1">
                  {language === 'ar'
                    ? 'لقد استنفذت جميع المحاولات المتاحة. يجب عليك إعادة البرنامج التدريبي قبل أن تتمكن من إعادة الاختبار.'
                    : 'You have exhausted all available attempts. You must retake the training program before you can retry this quiz.'}
                </p>
                <p className="text-red-700 mt-2 text-sm font-medium">
                  {language === 'ar'
                    ? 'يرجى التواصل مع قسم الموارد البشرية لإعادة تفعيل الاختبار.'
                    : 'Please contact HR to re-enable this quiz after completing the training.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedQuiz && selectedQuiz.has_passed && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex items-start">
              <Trophy className="h-6 w-6 text-green-400 mt-0.5 mr-3 rtl:mr-0 rtl:ml-3" />
              <div>
                <h4 className="text-green-800 font-semibold">
                  {language === 'ar' ? 'تهانينا!' : 'Congratulations!'}
                </h4>
                <p className="text-green-700 mt-1">
                  {language === 'ar'
                    ? 'لقد نجحت في هذا الاختبار.'
                    : 'You have successfully passed this quiz.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedQuiz && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600">{language === 'ar' ? 'درجة النجاح' : 'Passing Score'}</p>
              <p className="text-lg font-bold text-gray-900">{selectedQuiz.passing_score}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600">{language === 'ar' ? 'الأسئلة' : 'Questions'}</p>
              <p className="text-lg font-bold text-gray-900">{questions.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600">{language === 'ar' ? 'المحاولات المتبقية' : 'Attempts Remaining'}</p>
              <p className={`text-lg font-bold ${
                selectedQuiz.max_attempts - (selectedQuiz.attempts_used || 0) <= 1
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}>
                {Math.max(0, selectedQuiz.max_attempts - (selectedQuiz.attempts_used || 0))} / {selectedQuiz.max_attempts}
              </p>
            </div>
            {selectedQuiz.time_limit_minutes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">{language === 'ar' ? 'الوقت' : 'Time Limit'}</p>
                <p className="text-lg font-bold text-gray-900">
                  {selectedQuiz.time_limit_minutes} {language === 'ar' ? 'دقيقة' : 'min'}
                </p>
              </div>
            )}
          </div>
        )}

        {!quizStarted && attempts.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {language === 'ar' ? 'المحاولات السابقة' : 'Previous Attempts'}
            </h4>
            <div className="space-y-2">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    attempt.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    {attempt.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {language === 'ar' ? 'المحاولة' : 'Attempt'} {attempt.attempt_number}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(attempt.started_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {attempt.percentage?.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {attempt.score} / {attempt.max_score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!quizStarted && !showResults && (
          <div className="mt-6 flex flex-col items-center">
            <button
              onClick={handleStartQuiz}
              disabled={
                selectedQuiz && (
                  selectedQuiz.requires_retake ||
                  selectedQuiz.has_passed ||
                  (selectedQuiz.attempts_used || 0) >= selectedQuiz.max_attempts
                )
              }
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {attempts.length > 0 ? (
                <>
                  <RotateCcw className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'محاولة مرة أخرى' : 'Try Again'}
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'بدء الاختبار' : 'Start Quiz'}
                </>
              )}
            </button>
            {selectedQuiz && selectedQuiz.requires_retake && (
              <p className="mt-2 text-sm text-red-600">
                {language === 'ar' ? 'الاختبار معطل - يجب إعادة التدريب' : 'Quiz disabled - training retake required'}
              </p>
            )}
            {selectedQuiz && selectedQuiz.has_passed && (
              <p className="mt-2 text-sm text-green-600">
                {language === 'ar' ? 'لقد نجحت بالفعل في هذا الاختبار' : 'You have already passed this quiz'}
              </p>
            )}
          </div>
        )}
      </div>

      {quizStarted && (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start space-x-3 rtl:space-x-reverse mb-4">
                <span className="flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-lg font-medium text-gray-900">{question.question_text}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {question.points} {language === 'ar' ? 'نقطة' : 'point(s)'}
                  </p>
                </div>
              </div>

              {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && question.options && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        answers[question.id] === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={answers[question.id] === option.id}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 rtl:ml-0 rtl:mr-3 text-gray-900">{option.option_text}</span>
                    </label>
                  ))}
                </div>
              )}

              {(question.question_type === 'short_answer' || question.question_type === 'essay') && (
                <textarea
                  rows={question.question_type === 'essay' ? 6 : 2}
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={language === 'ar' ? 'اكتب إجابتك هنا...' : 'Type your answer here...'}
                />
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 rtl:mr-0 rtl:ml-2"></div>
                  {language === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Trophy className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'إنهاء الاختبار' : 'Submit Quiz'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showResults && attempts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
              attempts[0].passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {attempts[0].passed ? (
                <Trophy className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${
              attempts[0].passed ? 'text-green-600' : 'text-red-600'
            }`}>
              {attempts[0].passed
                ? (language === 'ar' ? 'تهانينا!' : 'Congratulations!')
                : (language === 'ar' ? 'لم تنجح' : 'Not Passed')}
            </h3>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {attempts[0].percentage?.toFixed(1)}%
            </p>
            <p className="text-gray-600 mb-4">
              {attempts[0].score} / {attempts[0].max_score} {language === 'ar' ? 'نقطة' : 'points'}
            </p>
            {!attempts[0].passed && selectedQuiz && attempts.length < selectedQuiz.max_attempts && (
              <button
                onClick={() => {
                  setShowResults(false);
                  handleStartQuiz();
                }}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RotateCcw className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'محاولة مرة أخرى' : 'Try Again'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
