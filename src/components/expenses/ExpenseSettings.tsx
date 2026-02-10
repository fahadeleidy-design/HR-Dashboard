import { useState } from 'react';
import { Settings, DollarSign, Shield, Clock, Save, RotateCcw } from 'lucide-react';

interface PolicyConfig {
  maxClaimAmount: number;
  requireReceiptAbove: number;
  autoApproveBelow: number;
  vatRate: number;
  receiptRequired: boolean;
  mileageRate: number;
  mealLimitPerDay: number;
  hotelLimitPerNight: number;
  flightClass: 'economy' | 'premium_economy' | 'business';
  duplicateCheckEnabled: boolean;
  duplicateWindowDays: number;
}

const DEFAULT_POLICY: PolicyConfig = {
  maxClaimAmount: 50000,
  requireReceiptAbove: 100,
  autoApproveBelow: 500,
  vatRate: 15,
  receiptRequired: true,
  mileageRate: 0.75,
  mealLimitPerDay: 300,
  hotelLimitPerNight: 1500,
  flightClass: 'economy',
  duplicateCheckEnabled: true,
  duplicateWindowDays: 30,
};

interface ExpenseSettingsProps {
  isAdmin: boolean;
}

export function ExpenseSettings({ isAdmin }: ExpenseSettingsProps) {
  const [policy, setPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [hasChanges, setHasChanges] = useState(false);

  const updatePolicy = (key: keyof PolicyConfig, value: number | boolean | string) => {
    setPolicy(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setPolicy(DEFAULT_POLICY);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Expense Policy Configuration</h3>
          <p className="text-sm text-gray-600 mt-1">Define spending limits, approval thresholds, and compliance rules</p>
        </div>
        {isAdmin && hasChanges && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Spending Limits</h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Claim Amount (SAR)</label>
              <input
                type="number"
                value={policy.maxClaimAmount}
                onChange={e => updatePolicy('maxClaimAmount', Number(e.target.value))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Single claim maximum before requiring additional approval</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Meal Limit (SAR)</label>
              <input
                type="number"
                value={policy.mealLimitPerDay}
                onChange={e => updatePolicy('mealLimitPerDay', Number(e.target.value))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Limit per Night (SAR)</label>
              <input
                type="number"
                value={policy.hotelLimitPerNight}
                onChange={e => updatePolicy('hotelLimitPerNight', Number(e.target.value))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mileage Rate (SAR/km)</label>
              <input
                type="number"
                step="0.01"
                value={policy.mileageRate}
                onChange={e => updatePolicy('mileageRate', Number(e.target.value))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Flight Class</label>
              <select
                value={policy.flightClass}
                onChange={e => updatePolicy('flightClass', e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-gray-900">Approval Thresholds</h4>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Approve Below (SAR)</label>
                <input
                  type="number"
                  value={policy.autoApproveBelow}
                  onChange={e => updatePolicy('autoApproveBelow', Number(e.target.value))}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Claims below this amount are auto-approved if compliant</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={policy.vatRate}
                  onChange={e => updatePolicy('vatRate', Number(e.target.value))}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Compliance Rules</h4>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Require Receipt</span>
                  <p className="text-xs text-gray-500">All claims must include a receipt/invoice</p>
                </div>
                <button
                  onClick={() => updatePolicy('receiptRequired', !policy.receiptRequired)}
                  disabled={!isAdmin}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    policy.receiptRequired ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    policy.receiptRequired ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Required Above (SAR)</label>
                <input
                  type="number"
                  value={policy.requireReceiptAbove}
                  onChange={e => updatePolicy('requireReceiptAbove', Number(e.target.value))}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Duplicate Detection</span>
                  <p className="text-xs text-gray-500">Flag potential duplicate submissions</p>
                </div>
                <button
                  onClick={() => updatePolicy('duplicateCheckEnabled', !policy.duplicateCheckEnabled)}
                  disabled={!isAdmin}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    policy.duplicateCheckEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    policy.duplicateCheckEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {policy.duplicateCheckEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duplicate Window (days)</label>
                  <input
                    type="number"
                    value={policy.duplicateWindowDays}
                    onChange={e => updatePolicy('duplicateWindowDays', Number(e.target.value))}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Contact your administrator to modify expense policies
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
