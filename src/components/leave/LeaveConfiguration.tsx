import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import {
  Settings,
  Calendar,
  DollarSign,
  Clock,
  Ban,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Save,
  X as XIcon
} from 'lucide-react';

interface LeaveType {
  id: string;
  name_en: string;
  name_ar: string;
  max_days_per_year: number;
  leave_category: string;
}

interface AccrualRule {
  id: string;
  leave_type_id: string;
  accrual_frequency: string;
  accrual_rate: number;
  prorate_on_join: boolean;
  active: boolean;
}

interface CarryoverRule {
  id: string;
  leave_type_id: string;
  allow_carryover: boolean;
  max_carryover_days: number | null;
  carryover_percentage: number;
  carryover_expiry_months: number | null;
  active: boolean;
}

interface EncashmentRule {
  id: string;
  leave_type_id: string;
  allow_encashment: boolean;
  min_encashable_days: number;
  max_encashable_days: number | null;
  encashment_percentage: number;
  encashment_timing: string;
  min_retention_days: number;
  active: boolean;
}

interface ProbationRule {
  id: string;
  leave_type_id: string;
  allow_during_probation: boolean;
  probation_entitlement: number | null;
  notes: string | null;
}

interface BlackoutDate {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  allow_emergency_override: boolean;
}

export function LeaveConfiguration() {
  const { currentCompany } = useCompany();
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'accrual' | 'carryover' | 'encashment' | 'probation' | 'blackout'>('accrual');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [accrualRules, setAccrualRules] = useState<AccrualRule[]>([]);
  const [carryoverRules, setCarryoverRules] = useState<CarryoverRule[]>([]);
  const [encashmentRules, setEncashmentRules] = useState<EncashmentRule[]>([]);
  const [probationRules, setProbationRules] = useState<ProbationRule[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlackoutForm, setShowBlackoutForm] = useState(false);
  const [blackoutForm, setBlackoutForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    allow_emergency_override: false,
  });

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [typesRes, accrualRes, carryoverRes, encashmentRes, probationRes, blackoutRes] = await Promise.all([
        supabase.from('leave_types').select('id, name_en, name_ar, max_days_per_year, leave_category').eq('company_id', currentCompany.id).order('name_en'),
        supabase.from('leave_accrual_rules').select('*').eq('company_id', currentCompany.id),
        supabase.from('leave_carryover_rules').select('*').eq('company_id', currentCompany.id),
        supabase.from('leave_encashment_rules').select('*').eq('company_id', currentCompany.id),
        supabase.from('leave_probation_rules').select('*').eq('company_id', currentCompany.id),
        supabase.from('leave_blackout_dates').select('*').eq('company_id', currentCompany.id).order('start_date', { ascending: false }),
      ]);

      if (typesRes.data) setLeaveTypes(typesRes.data);
      if (accrualRes.data) setAccrualRules(accrualRes.data);
      if (carryoverRes.data) setCarryoverRules(carryoverRes.data);
      if (encashmentRes.data) setEncashmentRules(encashmentRes.data);
      if (probationRes.data) setProbationRules(probationRes.data);
      if (blackoutRes.data) setBlackoutDates(blackoutRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAccrualRule = async (leaveTypeId: string, updates: Partial<AccrualRule>) => {
    try {
      const { error } = await supabase
        .from('leave_accrual_rules')
        .update(updates)
        .eq('leave_type_id', leaveTypeId);

      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error updating accrual rule: ' + error.message);
    }
  };

  const updateCarryoverRule = async (leaveTypeId: string, updates: Partial<CarryoverRule>) => {
    try {
      const { error } = await supabase
        .from('leave_carryover_rules')
        .update(updates)
        .eq('leave_type_id', leaveTypeId);

      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error updating carryover rule: ' + error.message);
    }
  };

  const updateEncashmentRule = async (leaveTypeId: string, updates: Partial<EncashmentRule>) => {
    try {
      const { error } = await supabase
        .from('leave_encashment_rules')
        .update(updates)
        .eq('leave_type_id', leaveTypeId);

      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error updating encashment rule: ' + error.message);
    }
  };

  const updateProbationRule = async (leaveTypeId: string, updates: Partial<ProbationRule>) => {
    try {
      const { error } = await supabase
        .from('leave_probation_rules')
        .update(updates)
        .eq('leave_type_id', leaveTypeId);

      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error updating probation rule: ' + error.message);
    }
  };

  const handleBlackoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      const { error } = await supabase.from('leave_blackout_dates').insert([{
        company_id: currentCompany.id,
        ...blackoutForm,
      }]);

      if (error) throw error;

      setShowBlackoutForm(false);
      setBlackoutForm({ start_date: '', end_date: '', reason: '', allow_emergency_override: false });
      await fetchData();
    } catch (error: any) {
      alert('Error creating blackout date: ' + error.message);
    }
  };

  const deleteBlackoutDate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blackout date?')) return;

    try {
      const { error } = await supabase.from('leave_blackout_dates').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      alert('Error deleting blackout date: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'accrual', label: 'Accrual Rules', icon: Clock },
    { id: 'carryover', label: 'Carryover Rules', icon: Calendar },
    { id: 'encashment', label: 'Encashment Rules', icon: DollarSign },
    { id: 'probation', label: 'Probation Rules', icon: UserCheck },
    { id: 'blackout', label: 'Blackout Dates', icon: Ban },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Configuration</h1>
          <p className="text-gray-600 mt-1">Configure leave policies and rules</p>
        </div>
        <Settings className="h-8 w-8 text-gray-400" />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex space-x-4 p-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'accrual' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Accrual Rules</h3>
                <p className="text-sm text-blue-700">Define how leave days are accrued over time for each leave type.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate (Days)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prorate on Join</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveTypes.map((type) => {
                      const rule = accrualRules.find(r => r.leave_type_id === type.id);
                      if (!rule) return null;

                      return (
                        <tr key={type.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{type.name_en}</td>
                          <td className="px-4 py-3">
                            <select
                              value={rule.accrual_frequency}
                              onChange={(e) => updateAccrualRule(type.id, { accrual_frequency: e.target.value })}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="yearly">Yearly</option>
                              <option value="monthly">Monthly</option>
                              <option value="per_pay_period">Per Pay Period</option>
                              <option value="on_join_date">On Join Date</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rule.accrual_rate}
                              onChange={(e) => updateAccrualRule(type.id, { accrual_rate: parseFloat(e.target.value) })}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                              step="0.5"
                              min="0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={rule.prorate_on_join}
                              onChange={(e) => updateAccrualRule(type.id, { prorate_on_join: e.target.checked })}
                              className="h-4 w-4 text-primary-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={rule.active}
                              onChange={(e) => updateAccrualRule(type.id, { active: e.target.checked })}
                              className="h-4 w-4 text-primary-600 rounded"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'carryover' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Carryover Rules</h3>
                <p className="text-sm text-blue-700">Define how unused leave days are carried forward to the next year.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allow Carryover</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Days</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry (Months)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveTypes.map((type) => {
                      const rule = carryoverRules.find(r => r.leave_type_id === type.id);
                      if (!rule) return null;

                      return (
                        <tr key={type.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{type.name_en}</td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={rule.allow_carryover}
                              onChange={(e) => updateCarryoverRule(type.id, { allow_carryover: e.target.checked })}
                              className="h-4 w-4 text-primary-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rule.max_carryover_days || ''}
                              onChange={(e) => updateCarryoverRule(type.id, { max_carryover_days: e.target.value ? parseFloat(e.target.value) : null })}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                              step="0.5"
                              min="0"
                              placeholder="Unlimited"
                              disabled={!rule.allow_carryover}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rule.carryover_percentage}
                              onChange={(e) => updateCarryoverRule(type.id, { carryover_percentage: parseFloat(e.target.value) })}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                              min="0"
                              max="100"
                              disabled={!rule.allow_carryover}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rule.carryover_expiry_months || ''}
                              onChange={(e) => updateCarryoverRule(type.id, { carryover_expiry_months: e.target.value ? parseInt(e.target.value) : null })}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                              min="1"
                              placeholder="Never"
                              disabled={!rule.allow_carryover}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'encashment' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Encashment Rules</h3>
                <p className="text-sm text-blue-700">Define rules for converting unused leave to cash payment.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allow Encashment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Days</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Days</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timing</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveTypes.map((type) => {
                      const rule = encashmentRules.find(r => r.leave_type_id === type.id);
                      if (!rule) return null;

                      return (
                        <tr key={type.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{type.name_en}</td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={rule.allow_encashment}
                              onChange={(e) => updateEncashmentRule(type.id, { allow_encashment: e.target.checked })}
                              className="h-4 w-4 text-primary-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rule.min_encashable_days}
                              onChange={(e) => updateEncashmentRule(type.id, { min_encashable_days: parseFloat(e.target.value) })}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                              step="0.5"
                              min="0"
                              disabled={!rule.allow_encashment}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rule.max_encashable_days || ''}
                              onChange={(e) => updateEncashmentRule(type.id, { max_encashable_days: e.target.value ? parseFloat(e.target.value) : null })}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                              step="0.5"
                              min="0"
                              placeholder="No limit"
                              disabled={!rule.allow_encashment}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rule.encashment_percentage}
                              onChange={(e) => updateEncashmentRule(type.id, { encashment_percentage: parseFloat(e.target.value) })}
                              className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                              min="0"
                              max="100"
                              disabled={!rule.allow_encashment}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={rule.encashment_timing}
                              onChange={(e) => updateEncashmentRule(type.id, { encashment_timing: e.target.value })}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                              disabled={!rule.allow_encashment}
                            >
                              <option value="year_end">Year End</option>
                              <option value="resignation">On Resignation</option>
                              <option value="on_request">On Request</option>
                              <option value="both">Both</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'probation' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Probation Rules</h3>
                <p className="text-sm text-blue-700">Define leave restrictions during employee probation period.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allow During Probation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custom Entitlement</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveTypes.map((type) => {
                      const rule = probationRules.find(r => r.leave_type_id === type.id);
                      if (!rule) return null;

                      return (
                        <tr key={type.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{type.name_en}</td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={rule.allow_during_probation}
                              onChange={(e) => updateProbationRule(type.id, { allow_during_probation: e.target.checked })}
                              className="h-4 w-4 text-primary-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={rule.probation_entitlement || ''}
                              onChange={(e) => updateProbationRule(type.id, { probation_entitlement: e.target.value ? parseFloat(e.target.value) : null })}
                              className="w-24 text-sm border border-gray-300 rounded px-2 py-1"
                              step="0.5"
                              min="0"
                              placeholder="Same as regular"
                              disabled={!rule.allow_during_probation}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={rule.notes || ''}
                              onChange={(e) => updateProbationRule(type.id, { notes: e.target.value })}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                              placeholder="Add notes..."
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'blackout' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1 mr-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Blackout Dates</h3>
                  <p className="text-sm text-blue-700">Define company-wide dates when leave cannot be taken.</p>
                </div>
                <button
                  onClick={() => setShowBlackoutForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Blackout Date</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blackoutDates.map((blackout) => (
                  <div key={blackout.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Ban className="h-5 w-5 text-red-500" />
                          <h4 className="font-semibold text-gray-900">{blackout.reason}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">From:</span> {new Date(blackout.start_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">To:</span> {new Date(blackout.end_date).toLocaleDateString()}
                        </p>
                        {blackout.allow_emergency_override && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Emergency Override Allowed
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteBlackoutDate(blackout.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}

                {blackoutDates.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    No blackout dates configured
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showBlackoutForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add Blackout Date</h2>
            </div>

            <form onSubmit={handleBlackoutSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <input
                  type="text"
                  required
                  value={blackoutForm.reason}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Year-End Closing, Company Event"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={blackoutForm.start_date}
                    onChange={(e) => setBlackoutForm({ ...blackoutForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={blackoutForm.end_date}
                    onChange={(e) => setBlackoutForm({ ...blackoutForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="emergency-override"
                  checked={blackoutForm.allow_emergency_override}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, allow_emergency_override: e.target.checked })}
                  className="h-4 w-4 text-primary-600 rounded"
                />
                <label htmlFor="emergency-override" className="text-sm text-gray-700">
                  Allow emergency override
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowBlackoutForm(false);
                    setBlackoutForm({ start_date: '', end_date: '', reason: '', allow_emergency_override: false });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add Blackout Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
