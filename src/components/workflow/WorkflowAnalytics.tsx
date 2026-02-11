import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Users, CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface WorkflowMetrics {
  workflow_template_id: string;
  workflow_name: string;
  instances_started: number;
  instances_completed: number;
  instances_approved: number;
  instances_rejected: number;
  avg_completion_time: number;
  sla_compliance_rate: number;
  escalations_count: number;
}

interface TimeSeriesData {
  date: string;
  approved: number;
  rejected: number;
  pending: number;
}

export default function WorkflowAnalytics() {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metrics, setMetrics] = useState<WorkflowMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalWorkflows: 0,
    totalInstances: 0,
    avgCompletionTime: 0,
    avgSLACompliance: 0,
    approvalRate: 0,
  });
  const { logError } = useErrorHandler();

  useEffect(() => {
    if (selectedCompany) {
      loadAnalytics();
    }
  }, [selectedCompany, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: instances, error: instancesError } = await supabase
        .from('workflow_instances')
        .select(`
          id,
          workflow_template_id,
          status,
          requested_at,
          completed_at,
          sla_status,
          workflow_template:workflow_templates(name)
        `)
        .eq('company_id', selectedCompany!.id)
        .gte('requested_at', startDate.toISOString());

      if (instancesError) throw instancesError;

      const { data: escalations } = await supabase
        .from('workflow_escalations')
        .select('workflow_instance_id')
        .in('workflow_instance_id', instances?.map(i => i.id) || []);

      const escalationsByInstance = new Map();
      escalations?.forEach(e => {
        escalationsByInstance.set(e.workflow_instance_id, true);
      });

      const workflowMetricsMap = new Map<string, any>();

      instances?.forEach(instance => {
        const templateId = instance.workflow_template_id;
        if (!workflowMetricsMap.has(templateId)) {
          workflowMetricsMap.set(templateId, {
            workflow_template_id: templateId,
            workflow_name: instance.workflow_template?.name || 'Unknown',
            instances_started: 0,
            instances_completed: 0,
            instances_approved: 0,
            instances_rejected: 0,
            completion_times: [],
            sla_met: 0,
            sla_total: 0,
            escalations_count: 0,
          });
        }

        const metrics = workflowMetricsMap.get(templateId);
        metrics.instances_started++;

        if (instance.completed_at) {
          metrics.instances_completed++;
          const completionTime = (new Date(instance.completed_at).getTime() - new Date(instance.requested_at).getTime()) / (1000 * 60 * 60);
          metrics.completion_times.push(completionTime);
        }

        if (instance.status === 'approved') metrics.instances_approved++;
        if (instance.status === 'rejected') metrics.instances_rejected++;

        if (instance.sla_status) {
          metrics.sla_total++;
          if (instance.sla_status === 'on_track') metrics.sla_met++;
        }

        if (escalationsByInstance.has(instance.id)) {
          metrics.escalations_count++;
        }
      });

      const metricsArray: WorkflowMetrics[] = Array.from(workflowMetricsMap.values()).map(m => ({
        workflow_template_id: m.workflow_template_id,
        workflow_name: m.workflow_name,
        instances_started: m.instances_started,
        instances_completed: m.instances_completed,
        instances_approved: m.instances_approved,
        instances_rejected: m.instances_rejected,
        avg_completion_time: m.completion_times.length > 0
          ? Math.round(m.completion_times.reduce((a: number, b: number) => a + b, 0) / m.completion_times.length)
          : 0,
        sla_compliance_rate: m.sla_total > 0
          ? Math.round((m.sla_met / m.sla_total) * 100)
          : 0,
        escalations_count: m.escalations_count,
      }));

      setMetrics(metricsArray);

      const dateMap = new Map<string, { approved: number; rejected: number; pending: number }>();
      instances?.forEach(instance => {
        const date = new Date(instance.requested_at).toISOString().split('T')[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, { approved: 0, rejected: 0, pending: 0 });
        }
        const dayData = dateMap.get(date)!;
        if (instance.status === 'approved') dayData.approved++;
        else if (instance.status === 'rejected') dayData.rejected++;
        else dayData.pending++;
      });

      const timeSeriesArray: TimeSeriesData[] = Array.from(dateMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setTimeSeriesData(timeSeriesArray);

      const totalInstances = instances?.length || 0;
      const completedInstances = instances?.filter(i => i.completed_at) || [];
      const avgTime = completedInstances.length > 0
        ? completedInstances.reduce((sum, i) => {
            const time = (new Date(i.completed_at!).getTime() - new Date(i.requested_at).getTime()) / (1000 * 60 * 60);
            return sum + time;
          }, 0) / completedInstances.length
        : 0;

      const slaTotal = instances?.filter(i => i.sla_status).length || 0;
      const slaMet = instances?.filter(i => i.sla_status === 'on_track').length || 0;

      const approvedCount = instances?.filter(i => i.status === 'approved').length || 0;
      const totalCompleted = instances?.filter(i => i.status === 'approved' || i.status === 'rejected').length || 0;

      setOverallStats({
        totalWorkflows: workflowMetricsMap.size,
        totalInstances,
        avgCompletionTime: Math.round(avgTime),
        avgSLACompliance: slaTotal > 0 ? Math.round((slaMet / slaTotal) * 100) : 0,
        approvalRate: totalCompleted > 0 ? Math.round((approvedCount / totalCompleted) * 100) : 0,
      });

    } catch (error) {
      logError(error, 'medium', { component: 'WorkflowAnalytics', action: 'loadAnalytics' });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

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
          <h1 className="text-2xl font-bold text-gray-900">Workflow Analytics</h1>
          <p className="text-gray-600 mt-1">Performance metrics and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Workflows</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overallStats.totalWorkflows}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Instances</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overallStats.totalInstances}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Completion</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overallStats.avgCompletionTime}h</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">SLA Compliance</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{overallStats.avgSLACompliance}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approval Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{overallStats.approvalRate}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} name="Approved" />
              <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} name="Rejected" />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Completion Rate by Workflow</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="workflow_name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="instances_approved" fill="#10b981" name="Approved" />
              <Bar dataKey="instances_rejected" fill="#ef4444" name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Workflow Performance Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instances
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rejected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Escalations
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((metric) => (
                <tr key={metric.workflow_template_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{metric.workflow_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{metric.instances_started}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{metric.instances_completed}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-900">{metric.instances_approved}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-gray-900">{metric.instances_rejected}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{metric.avg_completion_time}h</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className={`text-sm font-medium ${
                        metric.sla_compliance_rate >= 90 ? 'text-green-600' :
                        metric.sla_compliance_rate >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {metric.sla_compliance_rate}%
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {metric.escalations_count > 0 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      <span className="text-sm text-gray-900">{metric.escalations_count}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {metrics.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No workflow data available for the selected period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
