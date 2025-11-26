import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plus, Award, Trophy, Star, DollarSign, ThumbsUp, TrendingUp } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/formatters';

interface Recognition {
  id: string;
  employee: { first_name: string; last_name: string; job_title: string; department: { name: string } | null } | null;
  recognition_type: string;
  recognition_title: string;
  description: string;
  recognition_date: string;
  given_by_name: string;
  monetary_value: number;
  is_public: boolean;
}

export function RecognitionCenter() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState({
    totalRecognitions: 0,
    thisMonth: 0,
    totalValue: 0,
    topRecognized: ''
  });

  useEffect(() => {
    if (currentCompany) {
      fetchRecognitions();
    }
  }, [currentCompany, filterType]);

  const fetchRecognitions = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      let query = supabase
        .from('employee_recognitions')
        .select(`
          *,
          employee:employees(first_name, last_name, job_title, department:departments(name))
        `)
        .eq('company_id', currentCompany.id)
        .order('recognition_date', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('recognition_type', filterType);
      }

      const { data, error } = await query;
      if (!error && data) {
        setRecognitions(data);

        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const thisMonthCount = data.filter(r =>
          new Date(r.recognition_date) >= thisMonthStart
        ).length;

        const totalValue = data.reduce((sum, r) => sum + (r.monetary_value || 0), 0);

        setStats({
          totalRecognitions: data.length,
          thisMonth: thisMonthCount,
          totalValue: totalValue,
          topRecognized: ''
        });
      }
    } catch (error) {
      console.error('Error fetching recognitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      award: Award,
      bonus: DollarSign,
      achievement: Trophy,
      appreciation: ThumbsUp,
      excellence: Star,
      milestone: TrendingUp
    };
    return icons[type] || Award;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      award: 'border-yellow-500 bg-yellow-50',
      bonus: 'border-green-500 bg-green-50',
      achievement: 'border-blue-500 bg-blue-50',
      appreciation: 'border-purple-500 bg-purple-50',
      excellence: 'border-orange-500 bg-orange-50',
      milestone: 'border-pink-500 bg-pink-50'
    };
    return colors[type] || colors.award;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      award: 'Award',
      bonus: 'Bonus',
      achievement: 'Achievement',
      appreciation: 'Appreciation',
      excellence: 'Excellence',
      milestone: 'Milestone'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recognition & Rewards</h2>
          <p className="text-gray-600 mt-1">Celebrate outstanding performance and contributions</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="award">Awards</option>
            <option value="bonus">Bonuses</option>
            <option value="achievement">Achievements</option>
            <option value="appreciation">Appreciation</option>
            <option value="excellence">Excellence</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
            <Plus className="h-5 w-5" />
            New Recognition
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Total Recognitions</p>
              <p className="text-3xl font-bold mt-2">{stats.totalRecognitions}</p>
              <p className="text-yellow-100 text-xs mt-1">All time</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Award className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">This Month</p>
              <p className="text-3xl font-bold mt-2">{stats.thisMonth}</p>
              <p className="text-green-100 text-xs mt-1">Recent recognitions</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Trophy className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Value</p>
              <p className="text-3xl font-bold mt-2">{formatNumber(stats.totalValue, 'en')}</p>
              <p className="text-blue-100 text-xs mt-1">SAR rewards</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Public Recognition</p>
              <p className="text-3xl font-bold mt-2">
                {recognitions.filter(r => r.is_public).length}
              </p>
              <p className="text-purple-100 text-xs mt-1">Shared achievements</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Star className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {recognitions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
          <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Recognitions Yet</h3>
          <p className="text-gray-600 mb-6">Start recognizing outstanding employee contributions</p>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md mx-auto">
            <Plus className="h-5 w-5" />
            Create Recognition
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recognitions.map((recognition) => {
            const TypeIcon = getTypeIcon(recognition.recognition_type);
            return (
              <div
                key={recognition.id}
                className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${getTypeColor(recognition.recognition_type)} hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${recognition.recognition_type === 'award' ? 'bg-yellow-100' : recognition.recognition_type === 'bonus' ? 'bg-green-100' : recognition.recognition_type === 'achievement' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                    <TypeIcon className={`h-6 w-6 ${recognition.recognition_type === 'award' ? 'text-yellow-600' : recognition.recognition_type === 'bonus' ? 'text-green-600' : recognition.recognition_type === 'achievement' ? 'text-blue-600' : 'text-purple-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {getTypeLabel(recognition.recognition_type)}
                      </span>
                      {recognition.is_public && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          PUBLIC
                        </span>
                      )}
                      {recognition.monetary_value > 0 && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {formatNumber(recognition.monetary_value, 'en')} SAR
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {recognition.recognition_title}
                    </h3>
                    {recognition.employee && (
                      <p className="text-sm text-gray-600">
                        {recognition.employee.first_name} {recognition.employee.last_name} - {recognition.employee.job_title}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                  {recognition.description}
                </p>

                <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-3">
                  <div>
                    <p className="text-gray-500">Given by</p>
                    <p className="font-medium text-gray-900">{recognition.given_by_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(recognition.recognition_date, 'en')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Award className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Awards</h3>
          </div>
          <p className="text-sm text-gray-700">
            Formal recognition for exceptional achievements and contributions to the organization
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Bonuses</h3>
          </div>
          <p className="text-sm text-gray-700">
            Monetary rewards for outstanding performance, goal achievement, or special contributions
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <ThumbsUp className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Appreciation</h3>
          </div>
          <p className="text-sm text-gray-700">
            Informal thank you and appreciation for day-to-day contributions and teamwork
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-orange-600" />
          Recognition Best Practices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Recognize achievements promptly and specifically</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Make recognition public when appropriate to inspire others</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Align recognition with company values and goals</span>
            </li>
          </ul>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Vary recognition types to keep them meaningful</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Encourage peer-to-peer recognition for team culture</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Track recognition to ensure equitable distribution</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
