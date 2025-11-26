import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, Users, Briefcase, BarChart3, AlertCircle } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface DashboardStats {
  totalGrades: number;
  totalPositions: number;
  totalEmployees: number;
  employeesWithSalary: number;
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
  medianSalary: number;
  salaryRangeSpread: number;
  activeReviewCycles: number;
  pendingProposals: number;
  budgetUtilization: number;
  marketAlignment: number;
  avgCompaRatio: number;
  positionCoverage: number;
}

export function SalaryScaleDashboard() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalGrades: 0,
    totalPositions: 0,
    totalEmployees: 0,
    employeesWithSalary: 0,
    avgSalary: 0,
    minSalary: 0,
    maxSalary: 0,
    medianSalary: 0,
    salaryRangeSpread: 0,
    activeReviewCycles: 0,
    pendingProposals: 0,
    budgetUtilization: 0,
    marketAlignment: 0,
    avgCompaRatio: 0,
    positionCoverage: 0
  });

  useEffect(() => {
    if (currentCompany) {
      fetchDashboardStats();
    }
  }, [currentCompany]);

  const fetchDashboardStats = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [
        gradesData,
        positionsData,
        allEmployeesData,
        companyStats,
        gradeStats,
        reviewCyclesData,
        proposalsData
      ] = await Promise.all([
        supabase.from('job_grades').select('id').eq('company_id', currentCompany.id).eq('is_active', true),
        supabase.from('job_positions').select('id').eq('company_id', currentCompany.id).eq('is_active', true),
        supabase.from('employees').select('id, basic_salary').eq('company_id', currentCompany.id).eq('status', 'active'),
        supabase.from('company_salary_statistics').select('*').eq('company_id', currentCompany.id).maybeSingle(),
        supabase.from('grade_salary_statistics').select('*').eq('company_id', currentCompany.id),
        supabase.from('salary_review_cycles').select('id, status').eq('company_id', currentCompany.id).in('status', ['open', 'review']),
        supabase.from('salary_proposals').select('id, status').in('status', ['draft', 'submitted', 'hr_review'])
      ]);

      const compStats = companyStats.data;
      const grades = gradeStats.data || [];
      const allEmployees = allEmployeesData.data || [];
      const employeesWithSalary = allEmployees.filter(e => e.basic_salary && e.basic_salary > 0).length;

      const totalPositionCoverage = grades.length > 0
        ? grades.reduce((sum, g) => sum + (g.position_coverage_pct || 0), 0) / grades.length
        : 0;

      setStats({
        totalGrades: gradesData.data?.length || 0,
        totalPositions: positionsData.data?.length || 0,
        totalEmployees: allEmployees.length,
        employeesWithSalary: employeesWithSalary,
        avgSalary: compStats?.avg_basic_salary || 0,
        minSalary: compStats?.min_basic_salary || 0,
        maxSalary: compStats?.max_basic_salary || 0,
        medianSalary: compStats?.median_basic_salary || 0,
        salaryRangeSpread: compStats?.salary_range_spread_pct || 0,
        activeReviewCycles: reviewCyclesData.data?.length || 0,
        pendingProposals: proposalsData.data?.length || 0,
        budgetUtilization: 0,
        marketAlignment: 100,
        avgCompaRatio: compStats?.avg_compa_ratio || 100,
        positionCoverage: totalPositionCoverage
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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
      {stats.totalEmployees > 0 && stats.employeesWithSalary === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">No Salary Data Assigned</h3>
              <p className="text-gray-700 text-sm mb-3">
                You have {stats.totalEmployees} active employees but none have been assigned salary data yet.
                To see salary statistics, you need to:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
                <li>Assign employees to job positions and grades</li>
                <li>Link employees to salary bands</li>
                <li>Set basic salary and allowances for each employee</li>
              </ol>
              <p className="text-gray-600 text-xs mt-3">
                Go to Employees → Select an employee → Assign compensation details
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Job Grades</p>
              <p className="text-3xl font-bold mt-2">{stats.totalGrades}</p>
              <p className="text-blue-100 text-xs mt-1">Active grade levels</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Briefcase className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Job Positions</p>
              <p className="text-3xl font-bold mt-2">{stats.totalPositions}</p>
              <p className="text-green-100 text-xs mt-1">Defined positions</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Average Salary</p>
              <p className="text-3xl font-bold mt-2">
                {stats.employeesWithSalary > 0 ? formatNumber(stats.avgSalary, 'en') : '0'} SAR
              </p>
              <p className="text-purple-100 text-xs mt-1">
                {stats.employeesWithSalary} of {stats.totalEmployees} employees
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Market Alignment</p>
              <p className="text-3xl font-bold mt-2">{stats.marketAlignment}%</p>
              <p className="text-orange-100 text-xs mt-1">Competitiveness index</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Salary Distribution
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Minimum Salary</span>
                <span className="text-lg font-bold text-gray-900">{formatNumber(stats.minSalary, 'en')} SAR</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '20%' }}></div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Average Salary</span>
                <span className="text-lg font-bold text-gray-900">{formatNumber(stats.avgSalary, 'en')} SAR</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '60%' }}></div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Median Salary</span>
                <span className="text-lg font-bold text-gray-900">{formatNumber(stats.medianSalary, 'en')} SAR</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: '50%' }}></div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Maximum Salary</span>
                <span className="text-lg font-bold text-gray-900">{formatNumber(stats.maxSalary, 'en')} SAR</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Action Items
          </h3>
          <div className="space-y-4">
            {stats.activeReviewCycles > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Active Review Cycles</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {stats.activeReviewCycles} salary review cycle{stats.activeReviewCycles !== 1 ? 's' : ''} in progress
                    </p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats.activeReviewCycles}</span>
                </div>
              </div>
            )}

            {stats.pendingProposals > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-600">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Pending Proposals</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {stats.pendingProposals} salary proposal{stats.pendingProposals !== 1 ? 's' : ''} awaiting review
                    </p>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">{stats.pendingProposals}</span>
                </div>
              </div>
            )}

            {stats.marketAlignment < 90 && (
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-600">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Below Market Average</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Salaries are {100 - stats.marketAlignment}% below market midpoint
                    </p>
                  </div>
                  <span className="text-lg font-bold text-red-600">{stats.marketAlignment}%</span>
                </div>
              </div>
            )}

            {stats.marketAlignment > 110 && (
              <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-600">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Above Market Average</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Salaries are {stats.marketAlignment - 100}% above market midpoint
                    </p>
                  </div>
                  <span className="text-lg font-bold text-orange-600">{stats.marketAlignment}%</span>
                </div>
              </div>
            )}

            {stats.activeReviewCycles === 0 && stats.pendingProposals === 0 &&
             stats.marketAlignment >= 90 && stats.marketAlignment <= 110 && (
              <div className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-gray-900 font-medium">All systems optimal!</p>
                <p className="text-gray-600 text-sm mt-1">Salary structure is well-aligned</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Salary Statistics from Employee Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">Salary Range Spread</p>
            <p className="text-2xl font-bold text-blue-900 mt-2">{stats.salaryRangeSpread.toFixed(1)}%</p>
            <p className="text-xs text-blue-700 mt-1">Min to Max variation</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-medium">Average Compa-Ratio</p>
            <p className="text-2xl font-bold text-green-900 mt-2">{stats.avgCompaRatio.toFixed(1)}%</p>
            <p className="text-xs text-green-700 mt-1">Market positioning</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800 font-medium">Position Coverage</p>
            <p className="text-2xl font-bold text-purple-900 mt-2">{stats.positionCoverage.toFixed(1)}%</p>
            <p className="text-xs text-purple-700 mt-1">Within salary bands</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800 font-medium">Active Employees</p>
            <p className="text-2xl font-bold text-orange-900 mt-2">{stats.employeesWithSalary}</p>
            <p className="text-xs text-orange-700 mt-1">
              With salary ({stats.totalEmployees} total)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
