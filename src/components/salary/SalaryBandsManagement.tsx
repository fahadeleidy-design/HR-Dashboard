import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface SalaryBand {
  id: string;
  grade: { grade_code: string; grade_name: string; grade_level: number } | null;
  minimum_salary: number;
  midpoint_salary: number;
  maximum_salary: number;
  currency: string;
  is_active: boolean;
  effective_date: string;
}

export function SalaryBandsManagement() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [bands, setBands] = useState<SalaryBand[]>([]);

  useEffect(() => {
    if (currentCompany) {
      fetchSalaryBands();
    }
  }, [currentCompany]);

  const fetchSalaryBands = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salary_bands')
        .select(`
          *,
          grade:job_grades(grade_code, grade_name, grade_level)
        `)
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('grade(grade_level)');

      if (!error && data) {
        setBands(data);
      }
    } catch (error) {
      console.error('Error fetching salary bands:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSpread = (min: number, max: number) => {
    if (min === 0) return 0;
    return ((max - min) / min) * 100;
  };

  const getSpreadColor = (spread: number) => {
    if (spread < 30) return 'text-yellow-600';
    if (spread > 50) return 'text-orange-600';
    return 'text-green-600';
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
          <h2 className="text-2xl font-bold text-gray-900">Salary Bands Management</h2>
          <p className="text-gray-600 mt-1">Define salary ranges for each job grade</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
          <Plus className="h-5 w-5" />
          Create Salary Band
        </button>
      </div>

      {bands.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
          <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Salary Bands Defined</h3>
          <p className="text-gray-600 mb-6">Create salary bands to define compensation ranges for job grades</p>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md mx-auto">
            <Plus className="h-5 w-5" />
            Create First Band
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Minimum
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Midpoint
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Maximum
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Spread %
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Range
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bands.map((band, index) => {
                    const spread = calculateSpread(band.minimum_salary, band.maximum_salary);
                    const range = band.maximum_salary - band.minimum_salary;

                    return (
                      <tr key={band.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          {band.grade && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">
                                {band.grade.grade_level}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{band.grade.grade_name}</p>
                                <p className="text-xs text-gray-500 font-mono">{band.grade.grade_code}</p>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-gray-900">
                              {formatNumber(band.minimum_salary, 'en')}
                            </p>
                            <p className="text-xs text-gray-500">{band.currency}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex flex-col items-end px-3 py-2 bg-green-50 rounded-lg">
                            <p className="text-lg font-bold text-green-700">
                              {formatNumber(band.midpoint_salary, 'en')}
                            </p>
                            <p className="text-xs text-green-600 font-medium">Target</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-gray-900">
                              {formatNumber(band.maximum_salary, 'en')}
                            </p>
                            <p className="text-xs text-gray-500">{band.currency}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xl font-bold ${getSpreadColor(spread)}`}>
                            {spread.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-purple-500"
                                style={{ width: '100%' }}
                              ></div>
                            </div>
                            <p className="text-xs text-center text-gray-600 font-medium">
                              {formatNumber(range, 'en')} {band.currency} range
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Salary Spread</h3>
              </div>
              <p className="text-sm text-gray-700">
                The percentage difference between minimum and maximum salary in a band. Typical ranges are 30-50%.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Midpoint</h3>
              </div>
              <p className="text-sm text-gray-700">
                The target salary for a fully competent performer in the role. Usually market competitive rate.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Overlaps</h3>
              </div>
              <p className="text-sm text-gray-700">
                Adjacent grades should have 10-20% overlap to allow for progression and market adjustments.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
