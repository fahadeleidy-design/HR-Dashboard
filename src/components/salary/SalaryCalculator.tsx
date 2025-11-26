import { useState } from 'react';
import { Calculator, DollarSign, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

export function SalaryCalculator() {
  const [basicSalary, setBasicSalary] = useState(10000);
  const [housing, setHousing] = useState(25);
  const [transport, setTransport] = useState(500);
  const [food, setFood] = useState(300);

  const housingAmount = (basicSalary * housing) / 100;
  const totalAllowances = housingAmount + transport + food;
  const grossSalary = basicSalary + totalAllowances;
  const gosiEmployee = basicSalary * 0.10;
  const netSalary = grossSalary - gosiEmployee;
  const gosiEmployer = basicSalary * 0.12;
  const totalCost = grossSalary + gosiEmployer;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Salary Calculator</h2>
        <p className="text-gray-600 mt-1">Calculate total compensation and cost to company</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Salary Components
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Basic Salary (SAR)
              </label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Housing Allowance (% of Basic)
              </label>
              <input
                type="number"
                value={housing}
                onChange={(e) => setHousing(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-600 mt-1">
                = {formatNumber(housingAmount, 'en')} SAR
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transport Allowance (SAR)
              </label>
              <input
                type="number"
                value={transport}
                onChange={(e) => setTransport(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Food Allowance (SAR)
              </label>
              <input
                type="number"
                value={food}
                onChange={(e) => setFood(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-green-100 text-sm">Gross Salary</p>
                <p className="text-3xl font-bold">{formatNumber(grossSalary, 'en')} SAR</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-green-100 text-xs">Basic Salary</p>
                <p className="font-bold text-lg">{formatNumber(basicSalary, 'en')}</p>
              </div>
              <div>
                <p className="text-green-100 text-xs">Allowances</p>
                <p className="font-bold text-lg">{formatNumber(totalAllowances, 'en')}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-blue-100 text-sm">Net Salary (Take Home)</p>
                <p className="text-3xl font-bold">{formatNumber(netSalary, 'en')} SAR</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between">
                <p className="text-blue-100 text-xs">GOSI Deduction (10%)</p>
                <p className="font-bold">-{formatNumber(gosiEmployee, 'en')} SAR</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-purple-100 text-sm">Total Cost to Company</p>
                <p className="text-3xl font-bold">{formatNumber(totalCost, 'en')} SAR</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-xs">Gross Salary</p>
                <p className="font-bold">{formatNumber(grossSalary, 'en')}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-purple-100 text-xs">Employer GOSI (12%)</p>
                <p className="font-bold">+{formatNumber(gosiEmployer, 'en')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Salary Breakdown
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="font-medium text-gray-900">Basic Salary</span>
            <span className="font-bold text-blue-700">{formatNumber(basicSalary, 'en')} SAR</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="font-medium text-gray-900">Housing Allowance ({housing}%)</span>
            <span className="font-bold text-green-700">{formatNumber(housingAmount, 'en')} SAR</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="font-medium text-gray-900">Transport Allowance</span>
            <span className="font-bold text-green-700">{formatNumber(transport, 'en')} SAR</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="font-medium text-gray-900">Food Allowance</span>
            <span className="font-bold text-green-700">{formatNumber(food, 'en')} SAR</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-t-2 border-gray-200">
            <span className="font-bold text-gray-900">Gross Salary</span>
            <span className="font-bold text-gray-900 text-lg">{formatNumber(grossSalary, 'en')} SAR</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <span className="font-medium text-gray-900">GOSI Employee (10%)</span>
            <span className="font-bold text-red-700">-{formatNumber(gosiEmployee, 'en')} SAR</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg border-2 border-blue-500">
            <span className="font-bold text-gray-900 text-lg">Net Salary (Take Home)</span>
            <span className="font-bold text-blue-700 text-xl">{formatNumber(netSalary, 'en')} SAR</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Salary Calculator Notes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>GOSI employee contribution is 10% of basic salary only</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>GOSI employer contribution is 12% of basic salary</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Housing allowance is typically 25-30% of basic salary</span>
            </li>
          </ul>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Total cost to company includes employer GOSI contributions</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Allowances are not subject to GOSI deductions</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>This calculator uses standard Saudi Arabia GOSI rates</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
