import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, AlertCircle, CheckCircle, Clock, FileText, Download, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../contexts/CompanyContext';
import { format } from 'date-fns';

interface PayrollCycle {
  id: string;
  cycle_name: string;
  period_start: string;
  period_end: string;
  payment_date: string;
  status: string;
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  has_errors: boolean;
  error_count: number;
}

interface PayrollStats {
  active_cycles: number;
  pending_approvals: number;
  total_payroll_ytd: number;
  employees_paid_this_month: number;
}

export default function ComprehensivePayrollDashboard() {
  const [cycles, setCycles] = useState<PayrollCycle[]>([]);
  const [stats, setStats] = useState<PayrollStats>({
    active_cycles: 0,
    pending_approvals: 0,
    total_payroll_ytd: 0,
    employees_paid_this_month: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState({
    cycle_name: '',
    period_start: '',
    period_end: '',
    payment_date: '',
  });

  const { showToast } = useToast();
  const { currentCompany } = useCompany();

  useEffect(() => {
    if (currentCompany?.id) {
      loadPayrollData();
    }
  }, [currentCompany]);

  async function loadPayrollData() {
    try {
      setLoading(true);

      // Load recent cycles
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('payroll_cycles_v2')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (cyclesError) throw cyclesError;
      setCycles(cyclesData || []);

      // Calculate stats
      const activeCycles = (cyclesData || []).filter(
        c => c.status === 'draft' || c.status === 'calculating' || c.status === 'pending_approval'
      ).length;

      const { data: approvalsData } = await supabase
        .from('payroll_approvals_v2')
        .select('id')
        .eq('company_id', currentCompany!.id)
        .eq('status', 'pending');

      const ytdTotal = (cyclesData || [])
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.total_net || 0), 0);

      setStats({
        active_cycles: activeCycles,
        pending_approvals: approvalsData?.length || 0,
        total_payroll_ytd: ytdTotal,
        employees_paid_this_month: 0,
      });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCycle() {
    try {
      const { error } = await supabase
        .from('payroll_cycles_v2')
        .insert({
          company_id: currentCompany!.id,
          cycle_name: newCycleForm.cycle_name,
          cycle_type: 'regular',
          period_start: newCycleForm.period_start,
          period_end: newCycleForm.period_end,
          payment_date: newCycleForm.payment_date,
          status: 'draft',
        });

      if (error) throw error;

      showToast('Payroll cycle created successfully', 'success');
      setShowNewCycleModal(false);
      setNewCycleForm({
        cycle_name: '',
        period_start: '',
        period_end: '',
        payment_date: '',
      });
      await loadPayrollData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleCalculateCycle(cycleId: string) {
    try {
      const { data, error } = await supabase.rpc('calculate_payroll_cycle', {
        p_cycle_id: cycleId,
      });

      if (error) throw error;

      if (data?.success) {
        showToast(data.message || 'Payroll calculated successfully', 'success');
        await loadPayrollData();
      } else {
        showToast(data?.error || 'Calculation failed', 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  async function handleValidateCycle(cycleId: string) {
    try {
      const { data, error } = await supabase.rpc('validate_payroll_cycle', {
        p_cycle_id: cycleId,
      });

      if (error) throw error;

      if (data?.success) {
        showToast(
          `Validation complete: ${data.errors} errors, ${data.warnings} warnings`,
          data.errors > 0 ? 'error' : 'success'
        );
        await loadPayrollData();
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'calculating':
        return 'bg-blue-100 text-blue-800';
      case 'calculated':
        return 'bg-green-100 text-green-800';
      case 'pending_approval':
        return 'bg-amber-100 text-amber-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading payroll data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payroll Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive payroll processing with Saudi compliance
          </p>
        </div>
        <button
          onClick={() => setShowNewCycleModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Calendar className="w-4 h-4" />
          New Payroll Cycle
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Active Cycles</div>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.active_cycles}</div>
          <div className="text-xs text-gray-500 mt-1">In progress</div>
        </div>

        <div className="bg-white rounded-lg border border-amber-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Pending Approvals</div>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-600">{stats.pending_approvals}</div>
          <div className="text-xs text-gray-500 mt-1">Awaiting review</div>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Total Payroll YTD</div>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {stats.total_payroll_ytd.toLocaleString()} SAR
          </div>
          <div className="text-xs text-gray-500 mt-1">Year to date</div>
        </div>

        <div className="bg-white rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Employees Paid</div>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {stats.employees_paid_this_month}
          </div>
          <div className="text-xs text-gray-500 mt-1">This month</div>
        </div>
      </div>

      {/* Payroll Cycles */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payroll Cycles</h3>
        </div>

        {cycles.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No payroll cycles created yet</p>
            <button
              onClick={() => setShowNewCycleModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first payroll cycle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cycle Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Net
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cycles.map(cycle => (
                  <tr key={cycle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{cycle.cycle_name}</div>
                      {cycle.has_errors && (
                        <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {cycle.error_count} errors
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(cycle.period_start), 'MMM dd')} -{' '}
                      {format(new Date(cycle.period_end), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(cycle.payment_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          cycle.status
                        )}`}
                      >
                        {cycle.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {cycle.total_employees || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {cycle.total_net ? `${cycle.total_net.toLocaleString()} SAR` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {cycle.status === 'draft' && (
                          <button
                            onClick={() => handleCalculateCycle(cycle.id)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Calculate
                          </button>
                        )}
                        {cycle.status === 'calculated' && (
                          <button
                            onClick={() => handleValidateCycle(cycle.id)}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Validate
                          </button>
                        )}
                        {(cycle.status === 'approved' || cycle.status === 'paid') && (
                          <button className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Cycle Modal */}
      {showNewCycleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Create New Payroll Cycle</h3>
                <button
                  onClick={() => setShowNewCycleModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cycle Name *
                </label>
                <input
                  type="text"
                  value={newCycleForm.cycle_name}
                  onChange={e =>
                    setNewCycleForm({ ...newCycleForm, cycle_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., January 2024 Payroll"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period Start *
                  </label>
                  <input
                    type="date"
                    value={newCycleForm.period_start}
                    onChange={e =>
                      setNewCycleForm({ ...newCycleForm, period_start: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period End *
                  </label>
                  <input
                    type="date"
                    value={newCycleForm.period_end}
                    onChange={e =>
                      setNewCycleForm({ ...newCycleForm, period_end: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={newCycleForm.payment_date}
                  onChange={e =>
                    setNewCycleForm({ ...newCycleForm, payment_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewCycleModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCycle}
                disabled={
                  !newCycleForm.cycle_name ||
                  !newCycleForm.period_start ||
                  !newCycleForm.period_end ||
                  !newCycleForm.payment_date
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Create Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
