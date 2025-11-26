import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';
import { DollarSign, TrendingUp, Award, AlertCircle, Edit, History, Plus } from 'lucide-react';
import { formatNumber, formatDate } from '@/lib/formatters';

interface EmployeeCompensation {
  id: string;
  employee_number: string;
  full_name: string;
  job_title_en: string;
  job_family: string;
  family_color: string;
  grade_code: string;
  grade_name: string;
  grade_level: number;
  position_title: string;
  position_code: string;
  band_minimum: number;
  band_midpoint: number;
  band_maximum: number;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  food_allowance: number;
  mobile_allowance: number;
  other_allowances: number;
  total_compensation: number;
  salary_currency: string;
  salary_effective_date: string;
  last_salary_review_date: string;
  next_salary_review_date: string;
  compa_ratio: number;
  range_penetration: number;
}

interface EmployeeCompensationProps {
  employeeId?: string;
}

export function EmployeeCompensation({ employeeId }: EmployeeCompensationProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeCompensation[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeCompensation | null>(null);

  useEffect(() => {
    if (currentCompany) {
      fetchEmployeeCompensation();
    }
  }, [currentCompany, employeeId]);

  const fetchEmployeeCompensation = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      let query = supabase
        .from('employee_compensation_view')
        .select('*')
        .eq('company_id', currentCompany.id);

      if (employeeId) {
        query = query.eq('id', employeeId);
      }

      const { data, error } = await query.order('full_name');

      if (!error && data) {
        setEmployees(data);
        if (employeeId && data.length > 0) {
          setSelectedEmployee(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching employee compensation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompaRatioColor = (ratio: number) => {
    if (ratio < 80) return 'text-red-600 bg-red-50';
    if (ratio < 90) return 'text-orange-600 bg-orange-50';
    if (ratio <= 110) return 'text-green-600 bg-green-50';
    if (ratio <= 120) return 'text-blue-600 bg-blue-50';
    return 'text-purple-600 bg-purple-50';
  };

  const getCompaRatioLabel = (ratio: number) => {
    if (ratio < 80) return 'Well Below Market';
    if (ratio < 90) return 'Below Market';
    if (ratio <= 110) return 'At Market';
    if (ratio <= 120) return 'Above Market';
    return 'Well Above Market';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (employeeId && selectedEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compensation Details</h2>
            <p className="text-gray-600 mt-1">{selectedEmployee.full_name}</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Edit className="h-4 w-4" />
              Adjust Salary
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <History className="h-4 w-4" />
              View History
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-green-100 text-sm">Basic Salary</p>
                <p className="text-3xl font-bold">{formatNumber(selectedEmployee.basic_salary, 'en')}</p>
                <p className="text-green-100 text-xs">{selectedEmployee.salary_currency}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-blue-100 text-sm">Total Compensation</p>
                <p className="text-3xl font-bold">{formatNumber(selectedEmployee.total_compensation, 'en')}</p>
                <p className="text-blue-100 text-xs">{selectedEmployee.salary_currency}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-purple-100 text-sm">Compa-Ratio</p>
                <p className="text-3xl font-bold">{selectedEmployee.compa_ratio}%</p>
                <p className="text-purple-100 text-xs">{getCompaRatioLabel(selectedEmployee.compa_ratio)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Job Architecture</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Job Family</span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: selectedEmployee.family_color + '20',
                    color: selectedEmployee.family_color
                  }}
                >
                  {selectedEmployee.job_family}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Job Grade</span>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{selectedEmployee.grade_name}</p>
                  <p className="text-xs text-gray-500">{selectedEmployee.grade_code} - Level {selectedEmployee.grade_level}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Position</span>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{selectedEmployee.position_title}</p>
                  <p className="text-xs text-gray-500">{selectedEmployee.position_code}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Salary Band Position</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Minimum</span>
                <span className="font-semibold">{formatNumber(selectedEmployee.band_minimum, 'en')}</span>
              </div>
              <div className="relative">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-purple-500"
                    style={{ width: `${selectedEmployee.range_penetration}%` }}
                  ></div>
                </div>
                <div
                  className="absolute top-0 left-1/2 transform -translate-x-1/2"
                  style={{ height: '16px' }}
                >
                  <div className="w-0.5 h-full bg-yellow-500"></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Midpoint</span>
                <span className="font-semibold text-yellow-600">{formatNumber(selectedEmployee.band_midpoint, 'en')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Maximum</span>
                <span className="font-semibold">{formatNumber(selectedEmployee.band_maximum, 'en')}</span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Range Penetration</span>
                  <span className="text-lg font-bold text-blue-600">{selectedEmployee.range_penetration}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Compensation Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-gray-900">Basic Salary</span>
              <span className="font-bold text-blue-700">{formatNumber(selectedEmployee.basic_salary, 'en')} {selectedEmployee.salary_currency}</span>
            </div>
            {selectedEmployee.housing_allowance > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-900">Housing Allowance</span>
                <span className="font-bold text-green-700">{formatNumber(selectedEmployee.housing_allowance, 'en')} {selectedEmployee.salary_currency}</span>
              </div>
            )}
            {selectedEmployee.transport_allowance > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-900">Transport Allowance</span>
                <span className="font-bold text-green-700">{formatNumber(selectedEmployee.transport_allowance, 'en')} {selectedEmployee.salary_currency}</span>
              </div>
            )}
            {selectedEmployee.food_allowance > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-900">Food Allowance</span>
                <span className="font-bold text-green-700">{formatNumber(selectedEmployee.food_allowance, 'en')} {selectedEmployee.salary_currency}</span>
              </div>
            )}
            {selectedEmployee.mobile_allowance > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-900">Mobile Allowance</span>
                <span className="font-bold text-green-700">{formatNumber(selectedEmployee.mobile_allowance, 'en')} {selectedEmployee.salary_currency}</span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg border-2 border-blue-500">
              <span className="font-bold text-gray-900 text-lg">Total Compensation</span>
              <span className="font-bold text-blue-700 text-xl">{formatNumber(selectedEmployee.total_compensation, 'en')} {selectedEmployee.salary_currency}</span>
            </div>
          </div>
        </div>

        {(selectedEmployee.salary_effective_date || selectedEmployee.last_salary_review_date || selectedEmployee.next_salary_review_date) && (
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Salary Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedEmployee.salary_effective_date && (
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Effective Date</p>
                  <p className="font-bold text-gray-900">{formatDate(selectedEmployee.salary_effective_date, 'en')}</p>
                </div>
              )}
              {selectedEmployee.last_salary_review_date && (
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Last Review</p>
                  <p className="font-bold text-gray-900">{formatDate(selectedEmployee.last_salary_review_date, 'en')}</p>
                </div>
              )}
              {selectedEmployee.next_salary_review_date && (
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Next Review</p>
                  <p className="font-bold text-gray-900">{formatDate(selectedEmployee.next_salary_review_date, 'en')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Compensation</h2>
          <p className="text-gray-600 mt-1">Manage employee salaries and job assignments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
          <Plus className="h-5 w-5" />
          Assign Compensation
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
          <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Compensation Data</h3>
          <p className="text-gray-600">Assign job positions and salaries to employees to see compensation data</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Position</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Grade</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Basic Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Total Comp</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Compa-Ratio</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{emp.full_name}</p>
                        <p className="text-xs text-gray-500">{emp.employee_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{emp.position_title}</p>
                      <p className="text-xs text-gray-500">{emp.job_title_en}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {emp.grade_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900">{formatNumber(emp.basic_salary, 'en')}</p>
                      <p className="text-xs text-gray-500">{emp.salary_currency}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-blue-700">{formatNumber(emp.total_compensation, 'en')}</p>
                      <p className="text-xs text-gray-500">{emp.salary_currency}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCompaRatioColor(emp.compa_ratio)}`}>
                        {emp.compa_ratio}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
