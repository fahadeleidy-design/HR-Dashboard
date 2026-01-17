import { supabase } from '../../lib/supabase';

export interface WorkflowExecutionContext {
  entity_type: string;
  entity_id: string;
  entity_data: any;
  requested_by: string;
  company_id: string;
}

export class WorkflowEngine {
  static async startWorkflow(
    workflowTemplateId: string,
    context: WorkflowExecutionContext
  ): Promise<{ success: boolean; instanceId?: string; error?: string }> {
    try {
      const { data: template, error: templateError } = await supabase
        .from('workflow_templates')
        .select('*, workflow_steps(*), workflow_connections(*)')
        .eq('id', workflowTemplateId)
        .single();

      if (templateError) throw templateError;

      const slaDeadline = template.default_sla_hours
        ? new Date(Date.now() + template.default_sla_hours * 60 * 60 * 1000)
        : null;

      const { data: instance, error: instanceError } = await supabase
        .from('workflow_instances')
        .insert({
          workflow_template_id: workflowTemplateId,
          company_id: context.company_id,
          entity_type: context.entity_type,
          entity_id: context.entity_id,
          requested_by: context.requested_by,
          status: 'in_progress',
          context_data: context.entity_data,
          sla_deadline: slaDeadline,
          sla_status: 'on_track',
        })
        .select()
        .single();

      if (instanceError) throw instanceError;

      const startStep = template.workflow_steps.find((s: any) => s.step_type === 'start');
      if (!startStep) {
        throw new Error('No start step found in workflow template');
      }

      await this.executeStep(instance.id, startStep.id);

      return { success: true, instanceId: instance.id };
    } catch (error: any) {
      console.error('Error starting workflow:', error);
      return { success: false, error: error.message };
    }
  }

  static async executeStep(instanceId: string, stepId: string): Promise<void> {
    const { data: step, error: stepError } = await supabase
      .from('workflow_steps')
      .select('*, workflow_step_approvers(*), workflow_conditions(*)')
      .eq('id', stepId)
      .single();

    if (stepError) throw stepError;

    const slaDeadline = step.sla_hours
      ? new Date(Date.now() + step.sla_hours * 60 * 60 * 1000)
      : null;

    const { data: instanceStep, error: instanceStepError } = await supabase
      .from('workflow_instance_steps')
      .insert({
        workflow_instance_id: instanceId,
        workflow_step_id: stepId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        sla_deadline: slaDeadline,
      })
      .select()
      .single();

    if (instanceStepError) throw instanceStepError;

    switch (step.step_type) {
      case 'start':
        await this.completeStep(instanceId, instanceStep.id, 'approved');
        break;
      case 'approval':
        await this.handleApprovalStep(instanceId, instanceStep.id, step);
        break;
      case 'notification':
        await this.handleNotificationStep(instanceId, instanceStep.id, step);
        break;
      case 'condition':
        await this.handleConditionStep(instanceId, instanceStep.id, step);
        break;
      case 'delay':
        await this.handleDelayStep(instanceId, instanceStep.id, step);
        break;
      case 'end':
        await this.completeWorkflow(instanceId, 'approved');
        break;
      default:
        await this.completeStep(instanceId, instanceStep.id, 'approved');
    }
  }

  static async handleApprovalStep(instanceId: string, instanceStepId: string, step: any): Promise<void> {
    const { data: instance } = await supabase
      .from('workflow_instances')
      .select('context_data')
      .eq('id', instanceId)
      .single();

    const approvers = await this.resolveApprovers(step.workflow_step_approvers, instance?.context_data);

    await supabase
      .from('workflow_instance_steps')
      .update({
        assigned_approvers: approvers,
        approvals_required: this.calculateRequiredApprovals(step.approval_type, approvers.length),
      })
      .eq('id', instanceStepId);

    for (const approverId of approvers) {
      await this.sendNotification(instanceId, instanceStepId, approverId, 'assigned');
    }
  }

  static async resolveApprovers(approverConfigs: any[], contextData: any): Promise<string[]> {
    const resolvedApprovers: string[] = [];

    for (const config of approverConfigs) {
      switch (config.approver_type) {
        case 'specific_user':
          if (config.user_id) {
            resolvedApprovers.push(config.user_id);
          }
          break;
        case 'manager':
          if (contextData.employee_id) {
            const { data: employee } = await supabase
              .from('employees')
              .select('manager_id')
              .eq('id', contextData.employee_id)
              .single();
            if (employee?.manager_id) {
              resolvedApprovers.push(employee.manager_id);
            }
          }
          break;
        case 'role':
          if (config.role_name) {
            const { data: users } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', config.role_name)
              .eq('company_id', contextData.company_id);
            if (users) {
              resolvedApprovers.push(...users.map(u => u.user_id));
            }
          }
          break;
        case 'department':
          if (config.department_id) {
            const { data: dept } = await supabase
              .from('departments')
              .select('head_id')
              .eq('id', config.department_id)
              .single();
            if (dept?.head_id) {
              resolvedApprovers.push(dept.head_id);
            }
          }
          break;
        case 'budget_owner':
          if (contextData.amount) {
            const amount = parseFloat(contextData.amount);
            if (
              (!config.budget_min_amount || amount >= config.budget_min_amount) &&
              (!config.budget_max_amount || amount <= config.budget_max_amount)
            ) {
              const { data: users } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'finance_manager')
                .eq('company_id', contextData.company_id);
              if (users && users.length > 0) {
                resolvedApprovers.push(users[0].user_id);
              }
            }
          }
          break;
      }
    }

    return [...new Set(resolvedApprovers)];
  }

  static calculateRequiredApprovals(approvalType: string, totalApprovers: number): number {
    switch (approvalType) {
      case 'any_one':
        return 1;
      case 'all':
        return totalApprovers;
      case 'majority':
        return Math.ceil(totalApprovers / 2);
      default:
        return 1;
    }
  }

  static async approveStep(
    instanceId: string,
    instanceStepId: string,
    approverId: string,
    comments?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: instanceStep } = await supabase
        .from('workflow_instance_steps')
        .select('*, workflow_step:workflow_steps(*)')
        .eq('id', instanceStepId)
        .single();

      if (!instanceStep) {
        return { success: false, error: 'Step not found' };
      }

      if (!instanceStep.assigned_approvers.includes(approverId)) {
        return { success: false, error: 'User is not assigned as approver' };
      }

      const startTime = new Date(instanceStep.started_at).getTime();
      const timeToApprove = Math.floor((Date.now() - startTime) / (1000 * 60));

      await supabase.from('workflow_approvals').insert({
        workflow_instance_id: instanceId,
        workflow_instance_step_id: instanceStepId,
        approver_id: approverId,
        approver_type: 'specific_user',
        action: 'approved',
        comments,
        time_to_approve_minutes: timeToApprove,
      });

      const newApprovalsCount = instanceStep.approvals_received + 1;

      await supabase
        .from('workflow_instance_steps')
        .update({
          approvals_received: newApprovalsCount,
        })
        .eq('id', instanceStepId);

      if (newApprovalsCount >= instanceStep.approvals_required) {
        await this.completeStep(instanceId, instanceStepId, 'approved');
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async rejectStep(
    instanceId: string,
    instanceStepId: string,
    approverId: string,
    comments?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: instanceStep } = await supabase
        .from('workflow_instance_steps')
        .select('*')
        .eq('id', instanceStepId)
        .single();

      if (!instanceStep) {
        return { success: false, error: 'Step not found' };
      }

      if (!instanceStep.assigned_approvers.includes(approverId)) {
        return { success: false, error: 'User is not assigned as approver' };
      }

      await supabase.from('workflow_approvals').insert({
        workflow_instance_id: instanceId,
        workflow_instance_step_id: instanceStepId,
        approver_id: approverId,
        approver_type: 'specific_user',
        action: 'rejected',
        comments,
      });

      await this.completeStep(instanceId, instanceStepId, 'rejected');
      await this.completeWorkflow(instanceId, 'rejected');

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async completeStep(instanceId: string, instanceStepId: string, status: string): Promise<void> {
    await supabase
      .from('workflow_instance_steps')
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq('id', instanceStepId);

    if (status === 'approved') {
      await this.moveToNextStep(instanceId, instanceStepId);
    }
  }

  static async moveToNextStep(instanceId: string, currentStepId: string): Promise<void> {
    const { data: currentInstanceStep } = await supabase
      .from('workflow_instance_steps')
      .select('workflow_step_id')
      .eq('id', currentStepId)
      .single();

    if (!currentInstanceStep) return;

    const { data: connections } = await supabase
      .from('workflow_connections')
      .select('target_step_id')
      .eq('source_step_id', currentInstanceStep.workflow_step_id)
      .eq('connection_type', 'sequence');

    if (connections && connections.length > 0) {
      await this.executeStep(instanceId, connections[0].target_step_id);
    }
  }

  static async completeWorkflow(instanceId: string, status: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();

    await supabase
      .from('workflow_instances')
      .update({
        status,
        completed_at: new Date().toISOString(),
        completed_by: user?.user?.id,
      })
      .eq('id', instanceId);
  }

  static async handleNotificationStep(instanceId: string, instanceStepId: string, step: any): Promise<void> {
    await this.completeStep(instanceId, instanceStepId, 'approved');
  }

  static async handleConditionStep(instanceId: string, instanceStepId: string, step: any): Promise<void> {
    const { data: instance } = await supabase
      .from('workflow_instances')
      .select('context_data')
      .eq('id', instanceId)
      .single();

    const conditions = step.workflow_conditions;
    let targetStepKey = null;

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, instance?.context_data);
      if (result) {
        targetStepKey = condition.target_step_key;
        break;
      }
    }

    await this.completeStep(instanceId, instanceStepId, 'approved');

    if (targetStepKey) {
      const { data: targetStep } = await supabase
        .from('workflow_steps')
        .select('id')
        .eq('workflow_template_id', step.workflow_template_id)
        .eq('step_key', targetStepKey)
        .single();

      if (targetStep) {
        await this.executeStep(instanceId, targetStep.id);
      }
    }
  }

  static evaluateCondition(condition: any, contextData: any): boolean {
    const fieldValue = contextData[condition.field_name];
    const compareValue = condition.comparison_value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'not_equals':
        return fieldValue !== compareValue;
      case 'greater_than':
        return fieldValue > compareValue;
      case 'less_than':
        return fieldValue < compareValue;
      case 'greater_or_equal':
        return fieldValue >= compareValue;
      case 'less_or_equal':
        return fieldValue <= compareValue;
      case 'contains':
        return String(fieldValue).includes(String(compareValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(compareValue));
      default:
        return false;
    }
  }

  static async handleDelayStep(instanceId: string, instanceStepId: string, step: any): Promise<void> {
    await this.completeStep(instanceId, instanceStepId, 'approved');
  }

  static async sendNotification(
    instanceId: string,
    instanceStepId: string,
    userId: string,
    eventType: string
  ): Promise<void> {
    await supabase.from('workflow_notifications').insert({
      workflow_instance_id: instanceId,
      workflow_instance_step_id: instanceStepId,
      recipient_user_id: userId,
      notification_type: 'in_app',
      event_type: eventType,
      message: `You have a new workflow approval request`,
      status: 'pending',
    });
  }

  static async escalateStep(instanceId: string, instanceStepId: string): Promise<void> {
    const { data: instanceStep } = await supabase
      .from('workflow_instance_steps')
      .select('*, workflow_step:workflow_steps(*)')
      .eq('id', instanceStepId)
      .single();

    if (!instanceStep) return;

    const escalationUserId = instanceStep.workflow_step.escalation_to_user_id;

    await supabase.from('workflow_escalations').insert({
      workflow_instance_id: instanceId,
      workflow_instance_step_id: instanceStepId,
      escalated_from_user_id: instanceStep.assigned_approvers[0],
      escalated_to_user_id: escalationUserId,
      escalation_level: 1,
      reason: 'timeout',
      escalation_type: 'manager',
    });

    await supabase
      .from('workflow_instance_steps')
      .update({
        escalated: true,
        escalated_at: new Date().toISOString(),
        escalated_to_user_id: escalationUserId,
      })
      .eq('id', instanceStepId);

    if (escalationUserId) {
      await this.sendNotification(instanceId, instanceStepId, escalationUserId, 'escalated');
    }
  }
}
