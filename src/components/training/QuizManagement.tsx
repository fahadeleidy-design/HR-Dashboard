import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface QuizAssignment {
  assignment_id: string;
  employee_id: string;
  quiz_id: string;
  quiz_title_en: string;
  quiz_title_ar: string | null;
  program_name_en: string;
  program_name_ar: string | null;
  employee_name_en: string;
  employee_name_ar: string | null;
  employee_number: string;
  is_enabled: boolean;
  requires_retake: boolean;
  attempts_used: number;
  max_attempts: number;
  failed_at: string | null;
  quiz_status: string;
  has_passed: boolean;
}

interface QuizManagementProps {
  programId: string;
  companyId: string;
}

export default function QuizManagement({ programId, companyId }: QuizManagementProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language } = useLanguage();
  const [assignments, setAssignments] = useState<QuizAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();
  const [reEnabling, setReEnabling] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, [programId, companyId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('employee_available_quizzes')
        .select(`
          assignment_id,
          employee_id,
          quiz_id,
          quiz_title_en,
          quiz_title_ar,
          program_name_en,
          program_name_ar,
          is_enabled,
          requires_retake,
          attempts_used,
          max_attempts,
          failed_at,
          quiz_status,
          has_passed
        `)
        .eq('training_program_id', programId)
        .order('failed_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Fetch employee details
      const employeeIds = data?.map(a => a.employee_id) || [];
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, first_name_en, last_name_en, first_name_ar, last_name_ar, employee_number')
        .in('id', employeeIds);

      if (empError) throw empError;

      const employeeMap = new Map(employees?.map(e => [e.id, e]));

      const assignmentsWithEmployees = (data || []).map(a => {
        const emp = employeeMap.get(a.employee_id);
        return {
          ...a,
          employee_name_en: emp ? `${emp.first_name_en} ${emp.last_name_en}` : 'Unknown',
          employee_name_ar: emp && emp.first_name_ar && emp.last_name_ar
            ? `${emp.first_name_ar} ${emp.last_name_ar}`
            : null,
          employee_number: emp?.employee_number || '-'
        };
      });

      setAssignments(assignmentsWithEmployees);
    } catch (error: any) {
      logError(error, 'medium', { component: 'QuizManagement', action: 'loadAssignments' });
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReEnableQuiz = async (assignmentId: string, resetAttempts: boolean = true) => {
    if (!window.confirm(
      language === 'ar'
        ? 'هل أنت متأكد من إعادة تفعيل هذا الاختبار؟'
        : 'Are you sure you want to re-enable this quiz?'
    )) {
      return;
    }

    try {
      setReEnabling(assignmentId);

      const { data, error } = await supabase.rpc('hr_reenable_quiz', {
        p_quiz_assignment_id: assignmentId,
        p_reset_attempts: resetAttempts
      });

      if (error) throw error;

      if (data?.success) {
        showToast(
          language === 'ar' ? 'تم إعادة تفعيل الاختبار بنجاح' : 'Quiz re-enabled successfully',
          'success'
        );
        await loadAssignments();
      } else {
        throw new Error(data?.message || 'Failed to re-enable quiz');
      }
    } catch (error: any) {
      logError(error, 'medium', { component: 'QuizManagement', action: 'reEnableQuiz' });
      showToast(error.message, 'error');
    } finally {
      setReEnabling(null);
    }
  };

  const getStatusBadge = (assignment: QuizAssignment) => {
    if (assignment.has_passed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />
          {language === 'ar' ? 'ناجح' : 'Passed'}
        </span>
      );
    }

    if (assignment.requires_retake) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />
          {language === 'ar' ? 'يتطلب إعادة التدريب' : 'Retake Required'}
        </span>
      );
    }

    if (!assignment.is_enabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="h-3 w-3 mr-1 rtl:mr-0 rtl:ml-1" />
          {language === 'ar' ? 'معطل' : 'Disabled'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {language === 'ar' ? 'نشط' : 'Active'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const failedAssignments = assignments.filter(a => a.requires_retake);
  const activeAssignments = assignments.filter(a => !a.requires_retake && !a.has_passed);
  const passedAssignments = assignments.filter(a => a.has_passed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {language === 'ar' ? 'إدارة اختبارات الموظفين' : 'Employee Quiz Management'}
        </h3>
        <button
          onClick={loadAssignments}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {language === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {failedAssignments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200">
            <h4 className="text-sm font-semibold text-red-900 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {language === 'ar' ? 'يتطلب إعادة التدريب' : 'Requiring Training Retake'}
              <span className="ml-2 rtl:ml-0 rtl:mr-2 px-2 py-0.5 bg-red-200 text-red-900 rounded-full text-xs">
                {failedAssignments.length}
              </span>
            </h4>
          </div>
          <div className="divide-y divide-gray-200">
            {failedAssignments.map((assignment) => (
              <div key={assignment.assignment_id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {language === 'ar' && assignment.employee_name_ar
                            ? assignment.employee_name_ar
                            : assignment.employee_name_en}
                        </p>
                        <p className="text-xs text-gray-500">{assignment.employee_number}</p>
                      </div>
                      {getStatusBadge(assignment)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {language === 'ar' ? 'الاختبار: ' : 'Quiz: '}
                      {language === 'ar' && assignment.quiz_title_ar
                        ? assignment.quiz_title_ar
                        : assignment.quiz_title_en}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {language === 'ar' ? 'المحاولات المستخدمة: ' : 'Attempts used: '}
                      {assignment.attempts_used} / {assignment.max_attempts}
                      {assignment.failed_at && (
                        <>
                          {' • '}
                          {language === 'ar' ? 'فشل في: ' : 'Failed at: '}
                          {new Date(assignment.failed_at).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReEnableQuiz(assignment.assignment_id, true)}
                    disabled={reEnabling === assignment.assignment_id}
                    className="ml-4 rtl:ml-0 rtl:mr-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {reEnabling === assignment.assignment_id ? (
                      <RefreshCw className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    )}
                    {language === 'ar' ? 'إعادة تفعيل' : 'Re-enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeAssignments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900">
              {language === 'ar' ? 'الاختبارات النشطة' : 'Active Quizzes'}
              <span className="ml-2 rtl:ml-0 rtl:mr-2 px-2 py-0.5 bg-blue-200 text-blue-900 rounded-full text-xs">
                {activeAssignments.length}
              </span>
            </h4>
          </div>
          <div className="divide-y divide-gray-200">
            {activeAssignments.map((assignment) => (
              <div key={assignment.assignment_id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {language === 'ar' && assignment.employee_name_ar
                            ? assignment.employee_name_ar
                            : assignment.employee_name_en}
                        </p>
                        <p className="text-xs text-gray-500">{assignment.employee_number}</p>
                      </div>
                      {getStatusBadge(assignment)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {language === 'ar' ? 'الاختبار: ' : 'Quiz: '}
                      {language === 'ar' && assignment.quiz_title_ar
                        ? assignment.quiz_title_ar
                        : assignment.quiz_title_en}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {language === 'ar' ? 'المحاولات المتبقية: ' : 'Attempts remaining: '}
                      {assignment.max_attempts - assignment.attempts_used} / {assignment.max_attempts}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {passedAssignments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-green-50 px-4 py-3 border-b border-green-200">
            <h4 className="text-sm font-semibold text-green-900">
              {language === 'ar' ? 'الاختبارات الناجحة' : 'Passed Quizzes'}
              <span className="ml-2 rtl:ml-0 rtl:mr-2 px-2 py-0.5 bg-green-200 text-green-900 rounded-full text-xs">
                {passedAssignments.length}
              </span>
            </h4>
          </div>
          <div className="divide-y divide-gray-200">
            {passedAssignments.map((assignment) => (
              <div key={assignment.assignment_id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {language === 'ar' && assignment.employee_name_ar
                            ? assignment.employee_name_ar
                            : assignment.employee_name_en}
                        </p>
                        <p className="text-xs text-gray-500">{assignment.employee_number}</p>
                      </div>
                      {getStatusBadge(assignment)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {language === 'ar' ? 'الاختبار: ' : 'Quiz: '}
                      {language === 'ar' && assignment.quiz_title_ar
                        ? assignment.quiz_title_ar
                        : assignment.quiz_title_en}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {language === 'ar' ? 'لا توجد اختبارات' : 'No quiz assignments'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {language === 'ar'
              ? 'سيتم تفعيل الاختبارات تلقائياً عند إكمال البرنامج التدريبي'
              : 'Quizzes will be automatically enabled when the training program is completed'}
          </p>
        </div>
      )}
    </div>
  );
}
