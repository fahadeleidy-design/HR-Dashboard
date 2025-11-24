import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Star, TrendingUp, Plus } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface PerformanceReview {
  id: string;
  employee_id: string;
  review_period_start: string;
  review_period_end: string;
  overall_rating: number;
  strengths: string;
  areas_for_improvement: string;
  goals: string;
  reviewed_at: string;
  employee: {
    employee_number: string;
    first_name_en: string;
    last_name_en: string;
  };
}

export function Performance() {
  const { currentCompany } = useCompany();
  const { t, language, isRTL } = useLanguage();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) {
      fetchReviews();
    }
  }, [currentCompany]);

  const fetchReviews = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          employee:employees(employee_number, first_name_en, last_name_en)
        `)
        .eq('company_id', currentCompany.id)
        .order('reviewed_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching performance reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const excellentCount = reviews.filter(r => r.overall_rating >= 4.5).length;
  const goodCount = reviews.filter(r => r.overall_rating >= 3.5 && r.overall_rating < 4.5).length;
  const needsImprovementCount = reviews.filter(r => r.overall_rating < 3.5).length;

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
          <h1 className="text-3xl font-bold text-gray-900">{t.performance.title}</h1>
          <p className="text-gray-600 mt-1">{t.performance.subtitle}</p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Plus className="h-4 w-4" />
          <span>{t.performance.createReview}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.averageRating}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(parseFloat(averageRating), language)} / {formatNumber(5.0, language)}</p>
            </div>
            <Star className="h-12 w-12 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.excellent}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(excellentCount, language)}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.good}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatNumber(goodCount, language)}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t.common.needsImprovement}</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatNumber(needsImprovementCount, language)}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.common.employee}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.performance.reviewPeriod}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.performance.rating}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t.common.reviewDate}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    {t.messages.noResults}
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {review.employee.first_name_en} {review.employee.last_name_en}
                      </div>
                      <div className="text-sm text-gray-500">{review.employee.employee_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(review.review_period_start).toLocaleDateString()} - {new Date(review.review_period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-500 mr-1" />
                        <span className="text-sm font-bold text-gray-900">{formatNumber(review.overall_rating, language)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(review.reviewed_at).toLocaleDateString()}
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
