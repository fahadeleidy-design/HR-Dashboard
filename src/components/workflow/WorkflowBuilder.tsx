import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Save, Play, Settings, Trash2, Copy, GitBranch, Clock, Users, Bell, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface WorkflowStep {
  id: string;
  step_key: string;
  step_type: 'start' | 'approval' | 'notification' | 'condition' | 'parallel' | 'merge' | 'automation' | 'delay' | 'end';
  name: string;
  description?: string;
  position_x: number;
  position_y: number;
  step_order: number;
  approval_type?: 'any_one' | 'all' | 'majority' | 'sequential' | 'weighted';
  sla_hours?: number;
  escalation_hours?: number;
  approvers?: WorkflowApprover[];
  conditions?: WorkflowCondition[];
}

interface WorkflowApprover {
  id?: string;
  approver_type: 'specific_user' | 'role' | 'department' | 'manager' | 'manager_chain' | 'budget_owner' | 'custom_field' | 'external';
  user_id?: string;
  role_name?: string;
  department_id?: string;
  manager_level?: number;
  external_email?: string;
  external_name?: string;
  vote_weight?: number;
}

interface WorkflowCondition {
  id?: string;
  field_name: string;
  operator: string;
  comparison_value: any;
  target_step_key: string;
}

interface WorkflowConnection {
  id: string;
  source_step_id: string;
  target_step_id: string;
  connection_type: 'sequence' | 'condition_true' | 'condition_false' | 'parallel';
  label?: string;
}

interface WorkflowTemplate {
  id?: string;
  name: string;
  description?: string;
  category: string;
  entity_type: string;
  is_active: boolean;
  default_sla_hours?: number;
  escalation_enabled: boolean;
}

export default function WorkflowBuilder() {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [template, setTemplate] = useState<WorkflowTemplate>({
    name: '',
    category: 'leave',
    entity_type: 'leave_requests',
    is_active: true,
    escalation_enabled: true,
  });

  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isDrawingConnection, setIsDrawingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [draggingStep, setDraggingStep] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showStepConfig, setShowStepConfig] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const { logError } = useErrorHandler();

  const stepTypes = [
    { type: 'start', icon: Play, label: 'Start', color: 'bg-green-500' },
    { type: 'approval', icon: CheckCircle, label: 'Approval', color: 'bg-blue-500' },
    { type: 'condition', icon: GitBranch, label: 'Condition', color: 'bg-yellow-500' },
    { type: 'parallel', icon: GitBranch, label: 'Parallel', color: 'bg-purple-500' },
    { type: 'notification', icon: Bell, label: 'Notification', color: 'bg-indigo-500' },
    { type: 'delay', icon: Clock, label: 'Delay', color: 'bg-orange-500' },
    { type: 'end', icon: CheckCircle, label: 'End', color: 'bg-red-500' },
  ];

  const addStep = (type: WorkflowStep['step_type']) => {
    const newStep: WorkflowStep = {
      id: `temp-${Date.now()}`,
      step_key: `step_${steps.length + 1}`,
      step_type: type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      position_x: 100,
      position_y: 100 + (steps.length * 150),
      step_order: steps.length + 1,
    };

    setSteps([...steps, newStep]);
    setSelectedStep(newStep);
    setShowStepConfig(true);
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
    if (selectedStep?.id === stepId) {
      setSelectedStep({ ...selectedStep, ...updates });
    }
  };

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
    setConnections(connections.filter(c => c.source_step_id !== stepId && c.target_step_id !== stepId));
    if (selectedStep?.id === stepId) {
      setSelectedStep(null);
      setShowStepConfig(false);
    }
  };

  const startConnection = (stepId: string) => {
    setIsDrawingConnection(true);
    setConnectionStart(stepId);
  };

  const completeConnection = (targetStepId: string) => {
    if (connectionStart && connectionStart !== targetStepId) {
      const newConnection: WorkflowConnection = {
        id: `temp-conn-${Date.now()}`,
        source_step_id: connectionStart,
        target_step_id: targetStepId,
        connection_type: 'sequence',
      };
      setConnections([...connections, newConnection]);
    }
    setIsDrawingConnection(false);
    setConnectionStart(null);
  };

  const deleteConnection = (connId: string) => {
    setConnections(connections.filter(c => c.id !== connId));
  };

  const handleMouseDown = (stepId: string, e: React.MouseEvent) => {
    if (e.button === 0) {
      const step = steps.find(s => s.id === stepId);
      if (step) {
        setDraggingStep(stepId);
        setDragOffset({
          x: e.clientX - step.position_x,
          y: e.clientY - step.position_y,
        });
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingStep) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      updateStep(draggingStep, { position_x: newX, position_y: newY });
    }
  }, [draggingStep, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggingStep(null);
  }, []);

  useEffect(() => {
    if (draggingStep) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingStep, handleMouseMove, handleMouseUp]);

  const saveWorkflow = async () => {
    if (!selectedCompany) {
      showToast('Please select a company', 'error');
      return;
    }

    if (!template.name || steps.length === 0) {
      showToast('Please provide a workflow name and add at least one step', 'error');
      return;
    }

    try {
      const { data: templateData, error: templateError } = await supabase
        .from('workflow_templates')
        .insert({
          company_id: selectedCompany.id,
          name: template.name,
          description: template.description,
          category: template.category,
          entity_type: template.entity_type,
          is_active: template.is_active,
          default_sla_hours: template.default_sla_hours,
          escalation_enabled: template.escalation_enabled,
          canvas_data: { steps, connections },
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      const stepsToInsert = steps.map((step, index) => ({
        workflow_template_id: templateData.id,
        step_key: step.step_key,
        step_type: step.step_type,
        name: step.name,
        description: step.description,
        step_order: index + 1,
        position_x: step.position_x,
        position_y: step.position_y,
        approval_type: step.approval_type,
        sla_hours: step.sla_hours,
        escalation_hours: step.escalation_hours,
      }));

      const { data: stepsData, error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(stepsToInsert)
        .select();

      if (stepsError) throw stepsError;

      const stepIdMap = new Map<string, string>();
      steps.forEach((tempStep, index) => {
        if (stepsData[index]) {
          stepIdMap.set(tempStep.id, stepsData[index].id);
        }
      });

      if (connections.length > 0) {
        const connectionsToInsert = connections.map(conn => ({
          workflow_template_id: templateData.id,
          source_step_id: stepIdMap.get(conn.source_step_id),
          target_step_id: stepIdMap.get(conn.target_step_id),
          connection_type: conn.connection_type,
          label: conn.label,
        }));

        const { error: connectionsError } = await supabase
          .from('workflow_connections')
          .insert(connectionsToInsert);

        if (connectionsError) throw connectionsError;
      }

      showToast('Workflow saved successfully!', 'success');
    } catch (error: any) {
      logError(error, 'medium', { component: 'WorkflowBuilder', action: 'saveWorkflow' });
      showToast(error.message || 'Failed to save workflow', 'error');
    }
  };

  const getStepIcon = (type: string) => {
    const stepType = stepTypes.find(st => st.type === type);
    return stepType ? stepType.icon : Play;
  };

  const getStepColor = (type: string) => {
    const stepType = stepTypes.find(st => st.type === type);
    return stepType ? stepType.color : 'bg-gray-500';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Workflow Name"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              className="text-2xl font-bold border-0 border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoom(Math.min(zoom + 0.1, 2))}
              className="px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Zoom In
            </button>
            <button
              onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
              className="px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Zoom Out
            </button>
            <button
              onClick={saveWorkflow}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Workflow</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={template.category}
              onChange={(e) => setTemplate({ ...template, category: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="leave">Leave</option>
              <option value="expense">Expense</option>
              <option value="loan">Loan</option>
              <option value="advance">Advance</option>
              <option value="purchase">Purchase</option>
              <option value="contract">Contract</option>
              <option value="recruitment">Recruitment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SLA (Hours)</label>
            <input
              type="number"
              value={template.default_sla_hours || ''}
              onChange={(e) => setTemplate({ ...template, default_sla_hours: parseInt(e.target.value) || undefined })}
              placeholder="48"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 mt-6">
            <input
              type="checkbox"
              id="escalation"
              checked={template.escalation_enabled}
              onChange={(e) => setTemplate({ ...template, escalation_enabled: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="escalation" className="text-sm text-gray-700">Enable Escalation</label>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Workflow Steps</h3>
          <div className="space-y-2">
            {stepTypes.map((stepType) => {
              const Icon = stepType.icon;
              return (
                <button
                  key={stepType.type}
                  onClick={() => addStep(stepType.type as any)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors ${stepType.color} bg-opacity-10`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{stepType.label}</span>
                </button>
              );
            })}
          </div>

          {steps.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-4">Steps in Workflow</h3>
              <div className="space-y-2">
                {steps.map((step) => {
                  const Icon = getStepIcon(step.step_type);
                  return (
                    <div
                      key={step.id}
                      onClick={() => {
                        setSelectedStep(step);
                        setShowStepConfig(true);
                      }}
                      className={`p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                        selectedStep?.id === step.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{step.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(step.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-gray-100"
          style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {connections.map((conn) => {
              const sourceStep = steps.find(s => s.id === conn.source_step_id);
              const targetStep = steps.find(s => s.id === conn.target_step_id);
              if (!sourceStep || !targetStep) return null;

              const x1 = sourceStep.position_x + 120;
              const y1 = sourceStep.position_y + 40;
              const x2 = targetStep.position_x + 120;
              const y2 = targetStep.position_y + 40;

              return (
                <g key={conn.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r="8"
                    fill="white"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    className="cursor-pointer pointer-events-auto"
                    onClick={() => deleteConnection(conn.id)}
                  />
                </g>
              );
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>
          </svg>

          <div className="relative" style={{ minWidth: '2000px', minHeight: '2000px' }}>
            {steps.map((step) => {
              const Icon = getStepIcon(step.step_type);
              const colorClass = getStepColor(step.step_type);

              return (
                <div
                  key={step.id}
                  style={{
                    position: 'absolute',
                    left: step.position_x,
                    top: step.position_y,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                  onMouseDown={(e) => handleMouseDown(step.id, e)}
                  onClick={() => {
                    setSelectedStep(step);
                    setShowStepConfig(true);
                  }}
                  className={`bg-white rounded-lg shadow-lg border-2 cursor-move w-60 ${
                    selectedStep?.id === step.id ? 'border-blue-500' : 'border-gray-300'
                  }`}
                >
                  <div className={`${colorClass} text-white p-3 rounded-t-lg flex items-center justify-between`}>
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5" />
                      <span className="font-semibold">{step.step_type.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-gray-900 mb-1">{step.name}</div>
                    {step.description && (
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                    )}
                    {step.sla_hours && (
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>SLA: {step.sla_hours}h</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 p-2 flex justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startConnection(step.id);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Connect →
                    </button>
                    {isDrawingConnection && connectionStart !== step.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeConnection(step.id);
                        }}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        → End Here
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showStepConfig && selectedStep && (
          <div className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Step Configuration</h3>
              <button
                onClick={() => setShowStepConfig(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Step Name</label>
                <input
                  type="text"
                  value={selectedStep.name}
                  onChange={(e) => updateStep(selectedStep.id, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={selectedStep.description || ''}
                  onChange={(e) => updateStep(selectedStep.id, { description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedStep.step_type === 'approval' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approval Type</label>
                    <select
                      value={selectedStep.approval_type || 'any_one'}
                      onChange={(e) => updateStep(selectedStep.id, { approval_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="any_one">Any One Approver</option>
                      <option value="all">All Approvers</option>
                      <option value="majority">Majority</option>
                      <option value="sequential">Sequential</option>
                      <option value="weighted">Weighted Voting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SLA (Hours)</label>
                    <input
                      type="number"
                      value={selectedStep.sla_hours || ''}
                      onChange={(e) => updateStep(selectedStep.id, { sla_hours: parseInt(e.target.value) || undefined })}
                      placeholder="24"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escalation After (Hours)</label>
                    <input
                      type="number"
                      value={selectedStep.escalation_hours || ''}
                      onChange={(e) => updateStep(selectedStep.id, { escalation_hours: parseInt(e.target.value) || undefined })}
                      placeholder="12"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {selectedStep.step_type === 'delay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delay Duration (Hours)</label>
                  <input
                    type="number"
                    value={selectedStep.sla_hours || ''}
                    onChange={(e) => updateStep(selectedStep.id, { sla_hours: parseInt(e.target.value) || undefined })}
                    placeholder="24"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => deleteStep(selectedStep.id)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Step</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
