import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, User, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Delegation {
  id: string;
  delegator_id: string;
  delegate_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_return: boolean;
  can_forward: boolean;
  reason: string;
  delegator: {
    full_name: string;
  };
  delegate: {
    full_name: string;
  };
  workflow_template?: {
    name: string;
  };
}

export default function WorkflowDelegation() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();

  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { logError } = useErrorHandler();

  const [formData, setFormData] = useState({
    delegate_id: '',
    workflow_template_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    can_approve: true,
    can_reject: true,
    can_return: false,
    can_forward: false,
    reason: '',
  });

  useEffect(() => {
    if (selectedCompany && user) {
      loadData();
    }
  }, [selectedCompany, user]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: delegationsData, error: delegationsError } = await supabase
        .from('workflow_delegations')
        .select(`
          *,
          workflow_template:workflow_templates(name)
        `)
        .eq('company_id', selectedCompany!.id)
        .or(`delegator_id.eq.${user!.id},delegate_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });

      if (delegationsError) throw delegationsError;

      const userIds = [
        ...new Set([
          ...(delegationsData?.map(d => d.delegator_id) || []),
          ...(delegationsData?.map(d => d.delegate_id) || []),
        ]),
      ];

      const { data: employeesData } = await supabase
        .from('employees')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const employeeMap = new Map(employeesData?.map(e => [e.user_id, e]) || []);

      const enrichedDelegations = delegationsData?.map(delegation => ({
        ...delegation,
        delegator: employeeMap.get(delegation.delegator_id) || { full_name: 'Unknown' },
        delegate: employeeMap.get(delegation.delegate_id) || { full_name: 'Unknown' },
      })) || [];

      setDelegations(enrichedDelegations as any);

      const { data: employeesListData } = await supabase
        .from('employees')
        .select('user_id, full_name, email, department:departments(name)')
        .eq('company_id', selectedCompany!.id)
        .eq('status', 'active')
        .order('full_name');

      setEmployees(employeesListData || []);

      const { data: workflowsData } = await supabase
        .from('workflow_templates')
        .select('id, name, category')
        .eq('company_id', selectedCompany!.id)
        .eq('is_active', true)
        .order('name');

      setWorkflows(workflowsData || []);
    } catch (error) {
      logError(error, 'medium', { component: 'WorkflowDelegation', action: 'loadDelegations' });
      showToast('Failed to load delegations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createDelegation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.delegate_id || !formData.start_date || !formData.end_date) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('workflow_delegations').insert({
        company_id: selectedCompany!.id,
        delegator_id: user!.id,
        delegate_id: formData.delegate_id,
        workflow_template_id: formData.workflow_template_id || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: true,
        can_approve: formData.can_approve,
        can_reject: formData.can_reject,
        can_return: formData.can_return,
        can_forward: formData.can_forward,
        reason: formData.reason,
        created_by: user!.id,
      });

      if (error) throw error;

      showToast('Delegation created successfully', 'success');
      setShowCreateForm(false);
      setFormData({
        delegate_id: '',
        workflow_template_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        can_approve: true,
        can_reject: true,
        can_return: false,
        can_forward: false,
        reason: '',
      });
      loadData();
    } catch (error: any) {
      logError(error, 'medium', { component: 'WorkflowDelegation', action: 'createDelegation' });
      showToast(error.message || 'Failed to create delegation', 'error');
    }
  };

  const toggleDelegation = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('workflow_delegations')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      showToast(`Delegation ${!isActive ? 'activated' : 'deactivated'}`, 'success');
      loadData();
    } catch (error: any) {
      logError(error, 'medium', { component: 'WorkflowDelegation', action: 'toggleDelegation' });
      showToast(error.message || 'Failed to update delegation', 'error');
    }
  };

  const deleteDelegation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delegation?')) return;

    try {
      const { error } = await supabase
        .from('workflow_delegations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Delegation deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      logError(error, 'medium', { component: 'WorkflowDelegation', action: 'deleteDelegation' });
      showToast(error.message || 'Failed to delete delegation', 'error');
    }
  };

  const isActive = (delegation: Delegation) => {
    const now = new Date();
    const start = new Date(delegation.start_date);
    const end = new Date(delegation.end_date);
    return delegation.is_active && now >= start && now <= end;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Delegations</h1>
          <p className="text-gray-600 mt-1">Manage approval delegations and temporary access</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Delegation</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Delegation</h2>
          <form onSubmit={createDelegation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delegate To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.delegate_id}
                  onChange={(e) => setFormData({ ...formData, delegate_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select employee...</option>
                  {employees
                    .filter(e => e.user_id !== user!.id)
                    .map((employee) => (
                      <option key={employee.user_id} value={employee.user_id}>
                        {employee.full_name} - {employee.department?.name || 'No Department'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow (Optional)
                </label>
                <select
                  value={formData.workflow_template_id}
                  onChange={(e) => setFormData({ ...formData, workflow_template_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Workflows</option>
                  {workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name} ({workflow.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_approve}
                    onChange={(e) => setFormData({ ...formData, can_approve: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Can Approve</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_reject}
                    onChange={(e) => setFormData({ ...formData, can_reject: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Can Reject</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_return}
                    onChange={(e) => setFormData({ ...formData, can_return: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Can Return</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_forward}
                    onChange={(e) => setFormData({ ...formData, can_forward: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Can Forward</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vacation, out of office, etc."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Delegation
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delegate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {delegations.map((delegation) => (
                <tr key={delegation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isActive(delegation) ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center space-x-1 w-fit">
                        <Check className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 flex items-center space-x-1 w-fit">
                        <X className="h-3 w-3" />
                        <span>Inactive</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {delegation.delegate.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {delegation.workflow_template?.name || 'All Workflows'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(delegation.start_date).toLocaleDateString()} -{' '}
                        {new Date(delegation.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {delegation.can_approve && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Approve
                        </span>
                      )}
                      {delegation.can_reject && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          Reject
                        </span>
                      )}
                      {delegation.can_return && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Return
                        </span>
                      )}
                      {delegation.can_forward && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Forward
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{delegation.reason || '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => toggleDelegation(delegation.id, delegation.is_active)}
                        className={`px-3 py-1 rounded ${
                          delegation.is_active
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {delegation.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {delegation.delegator_id === user!.id && (
                        <button
                          onClick={() => deleteDelegation(delegation.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {delegations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No delegations found</p>
              <p className="text-sm text-gray-400 mt-1">
                Create a delegation to temporarily assign your approval authority to someone else
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
