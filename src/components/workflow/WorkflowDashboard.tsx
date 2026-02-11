import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, Users, BarChart3, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface WorkflowStats {
  total_active: number;
  pending: number;
  in_progress: number;
  approved: number;
  rejected: number;
  sla_breached: number;
  avg_completion_time: number;
}

interface WorkflowInstance {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  requested_by: string;
  requested_at: string;
  sla_deadline: string;
  sla_status: string;
  priority: number;
  workflow_template: {
    name: string;
    category: string;
  };
  requester: {
    full_name: string;
  };
}

export default function WorkflowDashboard() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [recentInstances, setRecentInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const { logError } = useErrorHandler();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (selectedCompany) {
      loadDashboardData();
    }
  }, [selectedCompany]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const { data: instances, error: instancesError } = await supabase
        .from('workflow_instances')
        .select(`
          id,
          entity_type,
          entity_id,
          status,
          requested_by,
          requested_at,
          sla_deadline,
          sla_status,
          priority,
          workflow_template:workflow_templates(name, category),
          requester:auth.users(id)
        `)
        .eq('company_id', selectedCompany!.id)
        .order('requested_at', { ascending: false })
        .limit(20);

      if (instancesError) throw instancesError;

      const userIds = [...new Set(instances?.map(i => i.requested_by) || [])];
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const employeeMap = new Map(employees?.map(e => [e.user_id, e.full_name]) || []);

      const enrichedInstances = instances?.map(instance => ({
        ...instance,
        requester: {
          full_name: employeeMap.get(instance.requested_by) || 'Unknown',
        },
      })) || [];

      setRecentInstances(enrichedInstances as any);

      const statsData: WorkflowStats = {
        total_active: instances?.length || 0,
        pending: instances?.filter(i => i.status === 'pending').length || 0,
        in_progress: instances?.filter(i => i.status === 'in_progress').length || 0,
        approved: instances?.filter(i => i.status === 'approved').length || 0,
        rejected: instances?.filter(i => i.status === 'rejected').length || 0,
        sla_breached: instances?.filter(i => i.sla_status === 'breached').length || 0,
        avg_completion_time: 0,
      };

      setStats(statsData);
    } catch (error) {
      logError(error, 'medium', { component: 'WorkflowDashboard', action: 'loadWorkflowDashboard' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSLAColor = (slaStatus: string) => {
    switch (slaStatus) {
      case 'on_track':
        return 'text-green-600';
      case 'at_risk':
        return 'text-yellow-600';
      case 'breached':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredInstances = filter === 'all'
    ? recentInstances
    : recentInstances.filter(i => i.status === filter);

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
        <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
        <button
          onClick={() => navigate('/workflow/builder')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Workflow</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Active</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.total_active || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.in_progress || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats?.approved || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">SLA Breached</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats?.sla_breached || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Workflow Instances</h2>
            <div className="flex items-center space-x-2">
              {(['all', 'pending', 'in_progress', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    filter === status
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInstances.map((instance) => (
                <tr
                  key={instance.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/workflow/instance/${instance.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {instance.workflow_template.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {instance.workflow_template.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{instance.requester.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(instance.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(instance.status)}`}>
                        {instance.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getSLAColor(instance.sla_status)}`}>
                      {instance.sla_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(instance.requested_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      instance.priority >= 8 ? 'bg-red-100 text-red-800' :
                      instance.priority >= 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      P{instance.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInstances.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No workflow instances found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
