import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Users, Award, FileQuestion, Edit2, UserPlus, Settings, Map, Shield, TrendingUp } from 'lucide-react';
import { formatInteger } from '@/lib/formatters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import TrainingModules from '@/components/training/TrainingModules';
import QuizBuilder from '@/components/training/QuizBuilder';
import QuizTaker from '@/components/training/QuizTaker';
import TrainingProgramManager from '@/components/training/TrainingProgramManager';
import TrainingAssignments from '@/components/training/TrainingAssignments';
import QuizManagement from '@/components/training/QuizManagement';
import CourseCatalog from '@/components/lms/CourseCatalog';
import LearningPaths from '@/components/lms/LearningPaths';
import ComplianceTracking from '@/components/lms/ComplianceTracking';
import LearningAnalytics from '@/components/lms/LearningAnalytics';

interface TrainingProgram {
  id: string;
  program_name_en: string;
  program_name_ar: string | null;
  description: string | null;
  duration_hours: number;
  start_date: string;
  end_date: string;
  max_participants: number | null;
  status?: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  enrollments?: { count: number }[];
}

interface UserRole {
  role: string;
  employee_id: string | null;
}

export function Training() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentCompany && user) {
      fetchPrograms();
      fetchUserRole();
    }
  }, [currentCompany, user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, employee_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserRole(data);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchPrograms = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
      if (data && data.length > 0 && !selectedProgram) {
        setSelectedProgram(data[0]);
      }
    } catch (error) {
      console.error('Error fetching training programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const isHROrAdmin = userRole?.role && ['hr', 'admin', 'super_admin'].includes(userRole.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (programs.length === 0 && !isHROrAdmin) {
    return (
      <div className="space-y-6">
        <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-3xl font-bold text-gray-900">{t.training.title}</h1>
            <p className="text-gray-600 mt-1">{t.training.subtitle}</p>
          </div>
        </div>
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {language === 'ar' ? 'لا توجد برامج تدريبية' : 'No training programs'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {language === 'ar' ? 'لا توجد برامج تدريبية متاحة حالياً' : 'No training programs available at this time'}
          </p>
        </div>
      </div>
    );
  }

  if (programs.length === 0 && isHROrAdmin) {
    return (
      <div className="space-y-6">
        <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-3xl font-bold text-gray-900">{t.training.title}</h1>
            <p className="text-gray-600 mt-1">{t.training.subtitle}</p>
          </div>
        </div>
        <TrainingProgramManager
          companyId={currentCompany!.id}
          programs={programs}
          onProgramsChange={fetchPrograms}
        />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">{t.training.title}</h1>
          <p className="text-gray-600 mt-1">{t.training.subtitle}</p>
        </div>
        {isHROrAdmin && activeTab !== 'programs' && (
          <button
            onClick={() => setActiveTab('programs')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <BookOpen className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {language === 'ar' ? 'إدارة البرامج' : 'Manage Programs'}
          </button>
        )}
      </div>

      {activeTab === 'programs' && isHROrAdmin ? (
        <div>
          <button
            onClick={() => setActiveTab('overview')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800"
          >
            ← {language === 'ar' ? 'عودة إلى البرامج' : 'Back to Programs'}
          </button>
          <TrainingProgramManager
            companyId={currentCompany!.id}
            programs={programs}
            onProgramsChange={fetchPrograms}
          />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'ar' ? 'اختر برنامج تدريبي' : 'Select Training Program'}
            </label>
            <select
              value={selectedProgram?.id || ''}
              onChange={(e) => {
                const program = programs.find(p => p.id === e.target.value);
                if (program) setSelectedProgram(program);
              }}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {language === 'ar' && program.program_name_ar ? program.program_name_ar : program.program_name_en}
                </option>
              ))}
            </select>
          </div>

      {selectedProgram && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{language === 'ar' ? 'المدة' : 'Duration'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatInteger(selectedProgram.duration_hours, language)}
                  </p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'ساعة' : 'hours'}</p>
                </div>
                <BookOpen className="h-10 w-10 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {new Date(selectedProgram.start_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {new Date(selectedProgram.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {selectedProgram.max_participants && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'الحد الأقصى' : 'Max Participants'}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatInteger(selectedProgram.max_participants, language)}
                    </p>
                  </div>
                  <Users className="h-10 w-10 text-green-600" />
                </div>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="overview">
                <BookOpen className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'نظرة عامة' : 'Overview'}
              </TabsTrigger>
              <TabsTrigger value="modules">
                <Edit2 className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'الوحدات والشرائح' : 'Modules & Slides'}
              </TabsTrigger>
              <TabsTrigger value="quizzes">
                <FileQuestion className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'الاختبارات' : 'Quizzes'}
              </TabsTrigger>
              {isHROrAdmin && (
                <>
                  <TabsTrigger value="quiz-management">
                    <Settings className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    {language === 'ar' ? 'إدارة الاختبارات' : 'Quiz Management'}
                  </TabsTrigger>
                  <TabsTrigger value="assignments">
                    <UserPlus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    {language === 'ar' ? 'التعيينات' : 'Assignments'}
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="catalog">
                <BookOpen className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'كتالوج الدورات' : 'Course Catalog'}
              </TabsTrigger>
              <TabsTrigger value="paths">
                <Map className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'مسارات التعلم' : 'Learning Paths'}
              </TabsTrigger>
              <TabsTrigger value="compliance">
                <Shield className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {language === 'ar' ? 'التدريب الإلزامي' : 'Compliance'}
              </TabsTrigger>
              {isHROrAdmin && (
                <TabsTrigger value="analytics">
                  <TrendingUp className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {language === 'ar' ? 'التحليلات' : 'Analytics'}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {language === 'ar' ? 'الوصف' : 'Description'}
                    </h3>
                    <p className="text-gray-600">
                      {selectedProgram.description || (language === 'ar' ? 'لا يوجد وصف' : 'No description available')}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modules">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {isHROrAdmin ? (
                  <TrainingModules
                    programId={selectedProgram.id}
                    companyId={currentCompany!.id}
                    isReadOnly={false}
                  />
                ) : (
                  <TrainingModules
                    programId={selectedProgram.id}
                    companyId={currentCompany!.id}
                    isReadOnly={true}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="quizzes">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {isHROrAdmin ? (
                  <QuizBuilder
                    programId={selectedProgram.id}
                    companyId={currentCompany!.id}
                  />
                ) : (
                  userRole?.employee_id ? (
                    <QuizTaker
                      programId={selectedProgram.id}
                      companyId={currentCompany!.id}
                      employeeId={userRole.employee_id}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {language === 'ar' ? 'لا يمكن الوصول إلى الاختبارات' : 'Cannot access quizzes'}
                      </p>
                    </div>
                  )
                )}
              </div>
            </TabsContent>

            {isHROrAdmin && (
              <>
                <TabsContent value="quiz-management">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <QuizManagement
                      programId={selectedProgram.id}
                      companyId={currentCompany!.id}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="assignments">
                  <TrainingAssignments
                    programId={selectedProgram.id}
                    companyId={currentCompany!.id}
                  />
                </TabsContent>
              </>
            )}

            <TabsContent value="catalog">
              <CourseCatalog />
            </TabsContent>

            <TabsContent value="paths">
              <LearningPaths />
            </TabsContent>

            <TabsContent value="compliance">
              <ComplianceTracking />
            </TabsContent>

            {isHROrAdmin && (
              <TabsContent value="analytics">
                <LearningAnalytics />
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
        </>
      )}
    </div>
  );
}
