import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Users, Award } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface TrainingProgram {
  id: string;
  name_en: string;
  name_ar: string | null;
  description: string | null;
  duration_hours: number;
  start_date: string;
  end_date: string;
  max_participants: number | null;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  enrollments: { count: number }[];
}

export function Training() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) {
      fetchPrograms();
    }
  }, [currentCompany]);

  const fetchPrograms = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_programs')
        .select(`
          *,
          enrollments:training_enrollments(count)
        `)
        .eq('company_id', currentCompany.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching training programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const ongoingCount = programs.filter(p => p.status === 'ongoing').length;
  const completedCount = programs.filter(p => p.status === 'completed').length;
  const totalParticipants = programs.reduce((sum, p) => sum + (p.enrollments[0]?.count || 0), 0);
  const totalHours = programs.reduce((sum, p) => sum + p.duration_hours, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.training.trainingPrograms}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(programs.length, language)}</p>
            </div>
            <BookOpen className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.training.inProgress}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(ongoingCount, language)}</p>
            </div>
            <BookOpen className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.training.completed}</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{formatNumber(completedCount, language)}</p>
            </div>
            <Award className="h-12 w-12 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.totalParticipants}</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatNumber(totalParticipants, language)}</p>
            </div>
            <Users className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.common.programName}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.training.duration}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.common.startDate}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.common.endDate}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.common.participants}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.common.status}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {programs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {t.messages.noResults}
                  </td>
                </tr>
              ) : (
                programs.map((program) => (
                  <tr key={program.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{program.name_en}</div>
                      {program.description && (
                        <div className="text-sm text-gray-500 truncate max-w-md">{program.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(program.duration_hours, language)} {t.common.hours}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(program.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(program.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(program.enrollments[0]?.count || 0, language)}
                      {program.max_participants && ` / ${formatNumber(program.max_participants, language)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        program.status === 'ongoing'
                          ? 'bg-green-100 text-green-800'
                          : program.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : program.status === 'planned'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {program.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
