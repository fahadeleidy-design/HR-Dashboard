import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { X, DollarSign, TrendingUp, Calendar, AlertCircle, Save } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface SalaryAdjustmentModalProps {
  employeeId: string;
  employeeName: string;
  currentSalary: number;
  currentAllowances: {
    housing: number;
    transport: number;
    food: number;
    mobile: number;
    other: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function SalaryAdjustmentModal({
  employeeId,
  employeeName,
  currentSalary,
  currentAllowances,
  onClose,
  onSuccess
}: SalaryAdjustmentModalProps) {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'amount' | 'percentage'>('percentage');

  const [newBasicSalary, setNewBasicSalary] = useState(currentSalary);
  const [increasePercentage, setIncreasePercentage] = useState(0);
  const [increaseAmount, setIncreaseAmount] = useState(0);

  const [newHousing, setNewHousing] = useState(currentAllowances.housing);
  const [newTransport, setNewTransport] = useState(currentAllowances.transport);
  const [newFood, setNewFood] = useState(currentAllowances.food);
  const [newMobile, setNewMobile] = useState(currentAllowances.mobile);
  const [newOther, setNewOther] = useState(currentAllowances.other);

  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (adjustmentType === 'percentage' && increasePercentage !== 0) {
      const calculated = currentSalary * (1 + increasePercentage / 100);
      setNewBasicSalary(Math.round(calculated));
      setIncreaseAmount(Math.round(calculated - currentSalary));
    } else if (adjustmentType === 'amount' && increaseAmount !== 0) {
      setNewBasicSalary(currentSalary + increaseAmount);
      const percentage = ((increaseAmount / currentSalary) * 100);
      setIncreasePercentage(Math.round(percentage * 100) / 100);
    }
  }, [adjustmentType, increasePercentage, increaseAmount, currentSalary]);

  const currentTotal = currentSalary + currentAllowances.housing + currentAllowances.transport +
                       currentAllowances.food + currentAllowances.mobile + currentAllowances.other;
  const newTotal = newBasicSalary + newHousing + newTransport + newFood + newMobile + newOther;
  const totalIncrease = newTotal - currentTotal;
  const totalIncreasePercentage = ((totalIncrease / currentTotal) * 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !user) return;

    setLoading(true);
    try {
      const { error: historyError } = await supabase
        .from('salary_history')
        .insert({
          employee_id: employeeId,
          company_id: currentCompany.id,
          old_basic_salary: currentSalary,
          new_basic_salary: newBasicSalary,
          old_allowances: currentAllowances,
          new_allowances: {
            housing: newHousing,
            transport: newTransport,
            food: newFood,
            mobile: newMobile,
            other: newOther
          },
          effective_date: effectiveDate,
          change_reason: reason,
          changed_by: user.id
        });

      if (historyError) throw historyError;

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          basic_salary: newBasicSalary,
          housing_allowance: newHousing,
          transport_allowance: newTransport,
          food_allowance: newFood,
          mobile_allowance: newMobile,
          other_allowances: newOther,
          salary_effective_date: effectiveDate,
          last_salary_review_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', employeeId);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adjusting salary:', error);
      alert('Failed to adjust salary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold">Salary Adjustment</h2>
            <p className="text-blue-100 mt-1">{employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
                Current Compensation
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Basic Salary</span>
                  <span className="font-bold">{formatNumber(currentSalary, 'en')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Housing</span>
                  <span>{formatNumber(currentAllowances.housing, 'en')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transport</span>
                  <span>{formatNumber(currentAllowances.transport, 'en')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Food</span>
                  <span>{formatNumber(currentAllowances.food, 'en')}</span>
                </div>
                <div className="pt-3 border-t border-gray-300">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-lg">{formatNumber(currentTotal, 'en')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                New Compensation
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Basic Salary</span>
                  <span className="font-bold text-blue-700">{formatNumber(newBasicSalary, 'en')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Housing</span>
                  <span className="text-blue-700">{formatNumber(newHousing, 'en')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transport</span>
                  <span className="text-blue-700">{formatNumber(newTransport, 'en')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Food</span>
                  <span className="text-blue-700">{formatNumber(newFood, 'en')}</span>
                </div>
                <div className="pt-3 border-t border-blue-300">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-blue-700 text-lg">{formatNumber(newTotal, 'en')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Salary Increase</p>
                <p className="text-2xl font-bold text-green-700">
                  +{formatNumber(newBasicSalary - currentSalary, 'en')}
                </p>
                <p className="text-xs text-gray-600">SAR</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Increase</p>
                <p className="text-2xl font-bold text-green-700">
                  +{formatNumber(totalIncrease, 'en')}
                </p>
                <p className="text-xs text-gray-600">SAR</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Percentage</p>
                <p className="text-2xl font-bold text-green-700">
                  +{totalIncreasePercentage}%
                </p>
                <p className="text-xs text-gray-600">Increase</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Method
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={adjustmentType === 'percentage'}
                    onChange={() => setAdjustmentType('percentage')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>By Percentage</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={adjustmentType === 'amount'}
                    onChange={() => setAdjustmentType('amount')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>By Amount</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adjustmentType === 'percentage' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Increase Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={increasePercentage}
                    onChange={(e) => setIncreasePercentage(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Increase Amount (SAR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={increaseAmount}
                    onChange={(e) => setIncreaseAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effective Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Housing Allowance (SAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newHousing}
                  onChange={(e) => setNewHousing(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Allowance (SAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransport}
                  onChange={(e) => setNewTransport(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Food Allowance (SAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newFood}
                  onChange={(e) => setNewFood(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Allowance (SAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newMobile}
                  onChange={(e) => setNewMobile(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Allowances (SAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newOther}
                  onChange={(e) => setNewOther(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Adjustment
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Annual merit increase, Market adjustment, Promotion"
                required
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>This adjustment will be logged in the salary history</li>
                  <li>The effective date determines when the new salary becomes active</li>
                  <li>All allowance changes will be tracked separately</li>
                  <li>Payroll will automatically use the new amounts from the effective date</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || newBasicSalary === currentSalary}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
