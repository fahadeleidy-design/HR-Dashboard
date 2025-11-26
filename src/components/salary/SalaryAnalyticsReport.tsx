import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';
import { BarChart3, TrendingUp, Users, DollarSign, Download, Filter } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface SalaryAnalytics {
  totalEmployees: number;
  avgBasicSalary: number;
  avgTotalComp: number;
  minSalary: number;
  maxSalary: number;
  medianSalary: number;
  totalPayroll: number;
  avgCompaRatio: number;
}

interface GradeAnalytics {
  grade_name: string;
  grade_code: string;
  employee_count: number;
  avg_salary: number;
  min_salary: number;
  max_salary: number;
  total_compensation: number;
}

interface DepartmentAnalytics {
  department_name: string;
  employee_count: number;
  avg_salary: number;
  total_compensation: number;
}

export function SalaryAnalyticsReport() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<SalaryAnalytics>({
    totalEmployees: 0,
    avgBasicSalary: 0,
    avgTotalComp: 0,
    minSalary: 0,
    maxSalary: 0,
    medianSalary: 0,
    totalPayroll: 0,
    avgCompaRatio: 0
  });
  const [gradeAnalytics, setGradeAnalytics] = useState<GradeAnalytics[]>([]);
  const [departmentAnalytics, setDepartmentAnalytics] = useState<DepartmentAnalytics[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'grade' | 'department'>('overview');

  useEffect(() => {
    if (currentCompany) {
      fetchAnalytics();
    }
  }, [currentCompany]);

  const fetchAnalytics = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data: employees, error } = await supabase
        .from('employee_compensation_view')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active');

      if (!error && employees && employees.length > 0) {
        const salaries = employees.map(e => e.basic_salary).sort((a, b) => a - b);
        const totalComps = employees.map(e => e.total_compensation);
        const compaRatios = employees.map(e => e.compa_ratio);

        const median = salaries.length % 2 === 0
          ? (salaries[salaries.length / 2 - 1] + salaries[salaries.length / 2]) / 2
          : salaries[Math.floor(salaries.length / 2)];

        setAnalytics({
          totalEmployees: employees.length,
          avgBasicSalary: salaries.reduce((a, b) => a + b, 0) / salaries.length,
          avgTotalComp: totalComps.reduce((a, b) => a + b, 0) / totalComps.length,
          minSalary: Math.min(...salaries),
          maxSalary: Math.max(...salaries),
          medianSalary: median,
          totalPayroll: totalComps.reduce((a, b) => a + b, 0),
          avgCompaRatio: compaRatios.reduce((a, b) => a + b, 0) / compaRatios.length
        });

        const gradeGroups = employees.reduce((acc, emp) => {
          const key = emp.grade_name || 'Unassigned';
          if (!acc[key]) {
            acc[key] = {
              grade_name: emp.grade_name,
              grade_code: emp.grade_code,
              employee_count: 0,
              avg_salary: 0,
              min_salary: Infinity,
              max_salary: 0,
              total_compensation: 0,
              salaries: []
            };
          }
          acc[key].employee_count++;
          acc[key].salaries.push(emp.basic_salary);
          acc[key].min_salary = Math.min(acc[key].min_salary, emp.basic_salary);
          acc[key].max_salary = Math.max(acc[key].max_salary, emp.basic_salary);
          acc[key].total_compensation += emp.total_compensation;
          return acc;
        }, {} as any);

        const gradeStats = Object.values(gradeGroups).map((g: any) => ({
          ...g,
          avg_salary: g.salaries.reduce((a: number, b: number) => a + b, 0) / g.salaries.length,
          salaries: undefined
        }));

        setGradeAnalytics(gradeStats as GradeAnalytics[]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Salary Analytics & Reports</h2>
          <p className="text-gray-600 mt-1">Comprehensive compensation insights and analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="overview">Overview</option>
            <option value="grade">By Grade</option>
            <option value="department">By Department</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
            <Download className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>

      {viewMode === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Total Employees</p>
                  <p className="text-3xl font-bold">{analytics.totalEmployees}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-green-100 text-sm">Avg Basic Salary</p>
                  <p className="text-3xl font-bold">{formatNumber(analytics.avgBasicSalary, 'en')}</p>
                  <p className="text-green-100 text-xs">SAR</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-purple-100 text-sm">Avg Total Comp</p>
                  <p className="text-3xl font-bold">{formatNumber(analytics.avgTotalComp, 'en')}</p>
                  <p className="text-purple-100 text-xs">SAR</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-orange-100 text-sm">Avg Compa-Ratio</p>
                  <p className="text-3xl font-bold">{analytics.avgCompaRatio.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Salary Distribution
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-gray-700">Minimum Salary</span>
                  <span className="font-bold text-blue-700">{formatNumber(analytics.minSalary, 'en')} SAR</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-gray-700">Median Salary</span>
                  <span className="font-bold text-green-700">{formatNumber(analytics.medianSalary, 'en')} SAR</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-gray-700">Average Salary</span>
                  <span className="font-bold text-purple-700">{formatNumber(analytics.avgBasicSalary, 'en')} SAR</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium text-gray-700">Maximum Salary</span>
                  <span className="font-bold text-orange-700">{formatNumber(analytics.maxSalary, 'en')} SAR</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Total Payroll
              </h3>
              <div className="space-y-4">
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <p className="text-sm text-gray-600 mb-2">Monthly Total Compensation</p>
                  <p className="text-4xl font-bold text-green-700">
                    {formatNumber(analytics.totalPayroll, 'en')}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">SAR per month</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600 mb-1">Annual Payroll</p>
                    <p className="text-xl font-bold text-blue-700">
                      {formatNumber(analytics.totalPayroll * 12, 'en')}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600 mb-1">Per Employee</p>
                    <p className="text-xl font-bold text-purple-700">
                      {formatNumber(analytics.avgTotalComp, 'en')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'grade' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Salary Analysis by Grade
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Grade</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Employees</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Avg Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Min Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Max Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Total Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gradeAnalytics.map((grade) => (
                  <tr key={grade.grade_code} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{grade.grade_name}</p>
                        <p className="text-xs text-gray-500">{grade.grade_code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {grade.employee_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900">{formatNumber(grade.avg_salary, 'en')}</p>
                      <p className="text-xs text-gray-500">SAR</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-gray-700">{formatNumber(grade.min_salary, 'en')}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-gray-700">{formatNumber(grade.max_salary, 'en')}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-green-700">{formatNumber(grade.total_compensation, 'en')}</p>
                      <p className="text-xs text-gray-500">SAR/month</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-orange-600" />
          Report Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2"></span>
              <span>Average compa-ratio of {analytics.avgCompaRatio.toFixed(1)}% indicates {analytics.avgCompaRatio > 100 ? 'above' : 'below'} market positioning</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2"></span>
              <span>Salary range spread of {((analytics.maxSalary - analytics.minSalary) / analytics.minSalary * 100).toFixed(0)}% shows compensation diversity</span>
            </li>
          </ul>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2"></span>
              <span>Monthly payroll burden: {formatNumber(analytics.totalPayroll, 'en')} SAR</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2"></span>
              <span>Annual compensation cost: {formatNumber(analytics.totalPayroll * 12, 'en')} SAR</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
