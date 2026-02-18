import { useState, useEffect } from 'react';
import {
  Workflow, Play, Pause, CheckCircle2, XCircle, Clock,
  Plus, Settings, Loader2, ChevronDown, ChevronUp,
  Zap, Calendar, MousePointer, Trash2, RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface AIWorkflow {
  id: string;
  name: string;
  description: string;
  workflow_type: string;
  steps: any[];
  trigger_type: string;
  status: string;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  steps_completed: number;
  total_steps: number;
  error_message: string | null;
  output_data: any;
}

const WORKFLOW_TEMPLATES = [
  {
    name: "Employee Onboarding Automation",
    description: "Automatically creates accounts, sends welcome emails, assigns training, and notifies managers for new hires",
    workflow_type: "automation",
    trigger_type: "event",
    steps: [
      { order: 1, name: "Create System Accounts", type: "action", config: { action: "create_accounts" } },
      { order: 2, name: "Send Welcome Email", type: "notification", config: { template: "welcome" } },
      { order: 3, name: "Assign Mandatory Training", type: "action", config: { action: "assign_training" } },
      { order: 4, name: "Notify Manager", type: "notification", config: { recipient: "manager" } },
      { order: 5, name: "Schedule 30-Day Check-in", type: "action", config: { action: "schedule_meeting" } },
    ],
  },
  {
    name: "Flight Risk Alert Workflow",
    description: "Monitors employee flight risk scores and triggers retention actions when risk exceeds threshold",
    workflow_type: "analysis",
    trigger_type: "scheduled",
    steps: [
      { order: 1, name: "Generate Flight Risk Scores", type: "analysis", config: { model: "flight_risk" } },
      { order: 2, name: "Identify High-Risk Employees", type: "filter", config: { threshold: 75 } },
      { order: 3, name: "Generate Retention Recommendations", type: "analysis", config: { type: "retention" } },
      { order: 4, name: "Alert HR Team", type: "notification", config: { recipient: "hr_team" } },
      { order: 5, name: "Create Action Items", type: "action", config: { action: "create_tasks" } },
    ],
  },
  {
    name: "Monthly HR Report Generator",
    description: "Compiles headcount, turnover, hiring, and compensation analytics into a comprehensive monthly report",
    workflow_type: "analysis",
    trigger_type: "scheduled",
    steps: [
      { order: 1, name: "Collect Headcount Data", type: "query", config: { metric: "headcount" } },
      { order: 2, name: "Analyze Turnover Trends", type: "analysis", config: { metric: "turnover" } },
      { order: 3, name: "Compile Hiring Pipeline", type: "query", config: { metric: "hiring" } },
      { order: 4, name: "Generate Executive Summary", type: "analysis", config: { output: "report" } },
      { order: 5, name: "Distribute Report", type: "notification", config: { recipient: "leadership" } },
    ],
  },
  {
    name: "Skills Gap Auto-Detection",
    description: "Analyzes workforce skills against market demand and generates learning recommendations",
    workflow_type: "agent",
    trigger_type: "scheduled",
    steps: [
      { order: 1, name: "Scan Current Skills Inventory", type: "query", config: { source: "skills" } },
      { order: 2, name: "Fetch Market Demand Data", type: "analysis", config: { model: "skills_demand" } },
      { order: 3, name: "Identify Critical Gaps", type: "analysis", config: { type: "gap_analysis" } },
      { order: 4, name: "Generate Learning Paths", type: "action", config: { action: "create_paths" } },
      { order: 5, name: "Notify Employees & Managers", type: "notification", config: { recipient: "affected" } },
    ],
  },
  {
    name: "Compliance Deadline Monitor",
    description: "Tracks visa, contract, and document expiry dates and sends proactive alerts",
    workflow_type: "automation",
    trigger_type: "scheduled",
    steps: [
      { order: 1, name: "Scan Expiring Documents", type: "query", config: { days_ahead: 90 } },
      { order: 2, name: "Categorize by Urgency", type: "filter", config: { levels: ["critical", "warning", "info"] } },
      { order: 3, name: "Generate Renewal Checklist", type: "action", config: { action: "create_checklist" } },
      { order: 4, name: "Send Alerts to Responsible Parties", type: "notification", config: { recipient: "responsible" } },
    ],
  },
];

export function AIWorkflowAgents() {
  const [workflows, setWorkflows] = useState<AIWorkflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    setLoading(true);
    try {
      const [workflowsRes, executionsRes] = await Promise.all([
        supabase.from('ai_workflows').select('*').eq('company_id', currentCompany!.id).order('created_at', { ascending: false }),
        supabase.from('ai_workflow_executions').select('*').eq('company_id', currentCompany!.id).order('started_at', { ascending: false }).limit(50),
      ]);
      setWorkflows(workflowsRes.data || []);
      setExecutions(executionsRes.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function createFromTemplate(template: typeof WORKFLOW_TEMPLATES[0]) {
    if (!currentCompany?.id) return;
    try {
      const { error } = await supabase.from('ai_workflows').insert({
        company_id: currentCompany.id,
        name: template.name,
        description: template.description,
        workflow_type: template.workflow_type,
        steps: template.steps,
        trigger_type: template.trigger_type,
        status: 'active',
        created_by: user?.id,
      });
      if (error) throw error;
      showToast('Workflow created successfully', 'success');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  async function runWorkflow(workflow: AIWorkflow) {
    if (!currentCompany?.id) return;
    setRunningWorkflow(workflow.id);

    try {
      const { data: execution, error: execError } = await supabase
        .from('ai_workflow_executions')
        .insert({
          workflow_id: workflow.id,
          company_id: currentCompany.id,
          status: 'running',
          total_steps: workflow.steps.length,
          executed_by: user?.id,
        })
        .select()
        .maybeSingle();

      if (execError) throw execError;

      for (let i = 0; i < workflow.steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        await supabase
          .from('ai_workflow_executions')
          .update({ steps_completed: i + 1 })
          .eq('id', execution.id);
      }

      await supabase
        .from('ai_workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          steps_completed: workflow.steps.length,
          output_data: { message: 'Workflow completed successfully', steps_executed: workflow.steps.length },
        })
        .eq('id', execution.id);

      await supabase
        .from('ai_workflows')
        .update({
          last_run_at: new Date().toISOString(),
          run_count: (workflow.run_count || 0) + 1,
        })
        .eq('id', workflow.id);

      showToast(`Workflow "${workflow.name}" completed`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRunningWorkflow(null);
    }
  }

  async function toggleWorkflowStatus(workflow: AIWorkflow) {
    const newStatus = workflow.status === 'active' ? 'archived' : 'active';
    try {
      await supabase.from('ai_workflows').update({ status: newStatus }).eq('id', workflow.id);
      showToast(`Workflow ${newStatus === 'active' ? 'activated' : 'archived'}`, 'success');
      loadData();
    } catch {
    }
  }

  async function deleteWorkflow(id: string) {
    try {
      await supabase.from('ai_workflows').delete().eq('id', id);
      showToast('Workflow deleted', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  }

  function getTriggerIcon(type: string) {
    switch (type) {
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'event': return <Zap className="w-4 h-4" />;
      default: return <MousePointer className="w-4 h-4" />;
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'agent': return 'bg-cyan-100 text-cyan-700';
      case 'automation': return 'bg-emerald-100 text-emerald-700';
      case 'analysis': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Workflow Agents</h2>
          <p className="text-sm text-gray-500 mt-0.5">Multi-step automated workflows powered by AI</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-1">Total Workflows</div>
          <div className="text-2xl font-bold text-gray-900">{workflows.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-1">Active</div>
          <div className="text-2xl font-bold text-emerald-600">
            {workflows.filter(w => w.status === 'active').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-1">Total Executions</div>
          <div className="text-2xl font-bold text-blue-600">{executions.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-500 mb-1">Success Rate</div>
          <div className="text-2xl font-bold text-gray-900">
            {executions.length > 0
              ? `${Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)}%`
              : '-'
            }
          </div>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-600 font-medium mb-1">No workflows yet</h3>
          <p className="text-sm text-gray-400 mb-4">Create your first AI workflow from a template</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
          >
            Browse Templates
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map(workflow => {
            const isExpanded = expandedWorkflow === workflow.id;
            const isRunning = runningWorkflow === workflow.id;
            const recentExecs = executions.filter(e => e.workflow_id === workflow.id).slice(0, 5);

            return (
              <div key={workflow.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(workflow.workflow_type)}`}>
                        <Workflow className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            workflow.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {workflow.status}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(workflow.workflow_type)}`}>
                            {workflow.workflow_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{workflow.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            {getTriggerIcon(workflow.trigger_type)}
                            {workflow.trigger_type}
                          </span>
                          <span>{workflow.steps.length} steps</span>
                          <span>{workflow.run_count} runs</span>
                          {workflow.last_run_at && (
                            <span>Last: {new Date(workflow.last_run_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => runWorkflow(workflow)}
                        disabled={isRunning || workflow.status !== 'active'}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                        title="Run workflow"
                      >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => toggleWorkflowStatus(workflow)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        title={workflow.status === 'active' ? 'Archive' : 'Activate'}
                      >
                        {workflow.status === 'active' ? <Pause className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.id)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Workflow Steps</h4>
                      <div className="space-y-2">
                        {workflow.steps.map((step: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 pl-2">
                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                              {step.order || i + 1}
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                              <span className="text-sm text-gray-800">{step.name}</span>
                              <span className="text-xs text-gray-400 ml-2">({step.type})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {recentExecs.length > 0 && (
                      <div className="p-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Executions</h4>
                        <div className="space-y-2">
                          {recentExecs.map(exec => (
                            <div key={exec.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(exec.status)}
                                <span className="text-sm text-gray-700 capitalize">{exec.status}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span>{exec.steps_completed}/{exec.total_steps} steps</span>
                                <span>{new Date(exec.started_at).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Create Workflow from Template</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {WORKFLOW_TEMPLATES.map((template, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-slate-400 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{template.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(template.workflow_type)}`}>
                          {template.workflow_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          {getTriggerIcon(template.trigger_type)}
                          {template.trigger_type}
                        </span>
                        <span>{template.steps.length} steps</span>
                      </div>
                    </div>
                    <button
                      onClick={() => createFromTemplate(template)}
                      className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm shrink-0 ml-4"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
