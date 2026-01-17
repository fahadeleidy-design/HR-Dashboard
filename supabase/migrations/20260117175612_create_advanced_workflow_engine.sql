/*
  # Advanced Workflow Engine - Enterprise-Grade Workflow System

  ## Overview
  Complete workflow management system with visual builder, conditional logic,
  parallel approvals, escalations, delegations, and comprehensive audit trails.

  ## New Tables

  ### Core Workflow Tables
  - `workflow_templates` - Workflow definitions and configurations
  - `workflow_steps` - Individual steps in a workflow template
  - `workflow_conditions` - Conditional branching logic (if-then-else)
  - `workflow_step_approvers` - Approver assignments for each step
  - `workflow_connections` - Visual connections between steps

  ### Workflow Execution Tables
  - `workflow_instances` - Runtime instances of workflow executions
  - `workflow_instance_steps` - Progress tracking for each instance step
  - `workflow_approvals` - Detailed approval/rejection history
  - `workflow_delegations` - Delegation assignments and tracking
  - `workflow_escalations` - Escalation events and resolutions

  ### Supporting Tables
  - `workflow_notifications` - Notification tracking and delivery
  - `workflow_templates_audit` - Version control for workflow changes
  - `workflow_step_types` - Enumeration of step types
  - `workflow_metrics` - Performance and analytics data

  ## Key Features
  1. Visual workflow builder with drag-and-drop
  2. Conditional branching (if-then-else logic)
  3. Parallel and sequential approval paths
  4. Time-based escalation rules
  5. Dynamic approver assignment (role, department, manager, budget-based)
  6. External approver support
  7. Delegation management with date ranges
  8. Matrix approval (multiple criteria)
  9. SLA tracking per step
  10. Comprehensive audit trail
  11. Email/SMS notifications
  12. Workflow versioning

  ## Security
  - RLS enabled on all tables
  - Company and department isolation
  - Role-based access control
  - Audit logging for all changes
*/

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

DO $$ BEGIN
  CREATE TYPE workflow_step_type AS ENUM (
    'start',           -- Starting point
    'approval',        -- Approval step
    'notification',    -- Send notification
    'condition',       -- Conditional branch (if-then-else)
    'parallel',        -- Parallel execution (fork)
    'merge',           -- Merge parallel paths
    'automation',      -- Automated action
    'delay',           -- Time-based delay
    'end'              -- End point
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_approval_type AS ENUM (
    'any_one',         -- Any one approver can approve
    'all',             -- All approvers must approve
    'majority',        -- Majority must approve
    'sequential',      -- Approvers in sequence
    'weighted'         -- Weighted voting
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_approver_type AS ENUM (
    'specific_user',   -- Specific user ID
    'role',            -- User role
    'department',      -- Department head
    'manager',         -- Direct manager
    'manager_chain',   -- Manager hierarchy
    'budget_owner',    -- Budget owner based on amount
    'custom_field',    -- Based on custom field value
    'external'         -- External approver (email)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_condition_operator AS ENUM (
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_or_equal',
    'less_or_equal',
    'contains',
    'not_contains',
    'in',
    'not_in',
    'is_null',
    'is_not_null',
    'between'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_instance_status AS ENUM (
    'pending',
    'in_progress',
    'approved',
    'rejected',
    'cancelled',
    'expired',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_step_status AS ENUM (
    'pending',
    'in_progress',
    'approved',
    'rejected',
    'skipped',
    'expired',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- WORKFLOW TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  category text, -- 'leave', 'expense', 'loan', 'purchase', 'contract', etc.
  entity_type text, -- Table name this workflow applies to

  -- Configuration
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false, -- Default workflow for this entity type
  version integer DEFAULT 1,
  parent_template_id uuid REFERENCES workflow_templates(id) ON DELETE SET NULL, -- For versioning

  -- Visual builder data
  canvas_data jsonb, -- Stores positions and visual layout

  -- Triggers
  trigger_conditions jsonb, -- When this workflow should auto-start

  -- SLA Configuration
  default_sla_hours integer, -- Default SLA for entire workflow
  escalation_enabled boolean DEFAULT true,

  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(company_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_company ON workflow_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_entity ON workflow_templates(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active) WHERE is_active = true;

-- =====================================================
-- WORKFLOW STEPS
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE NOT NULL,

  -- Step identification
  step_key text NOT NULL, -- Unique key within workflow (e.g., 'manager_approval_1')
  step_type workflow_step_type NOT NULL,
  name text NOT NULL,
  description text,

  -- Order and hierarchy
  step_order integer NOT NULL, -- Overall order in workflow
  level integer DEFAULT 0, -- Depth level for parallel execution

  -- Visual position (for drag-and-drop builder)
  position_x integer,
  position_y integer,

  -- Approval configuration (for approval steps)
  approval_type workflow_approval_type,
  required_approvals integer, -- Number of approvals needed
  approval_weights jsonb, -- For weighted voting: {user_id: weight}

  -- SLA configuration
  sla_hours integer, -- Time limit for this step
  escalation_hours integer, -- When to escalate
  escalation_to_role text, -- Role to escalate to
  escalation_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Auto-approval configuration
  auto_approve_after_hours integer,
  auto_approve_action text, -- 'approve' or 'reject'

  -- Notification configuration
  notify_on_start boolean DEFAULT true,
  notify_on_complete boolean DEFAULT true,
  notify_on_escalate boolean DEFAULT true,
  notification_template text,

  -- Skip conditions
  skip_if_conditions jsonb, -- Conditions to skip this step

  -- Custom actions
  custom_actions jsonb, -- Actions to execute (webhooks, functions, etc.)

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(workflow_template_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_template ON workflow_steps(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_order ON workflow_steps(workflow_template_id, step_order);

-- =====================================================
-- WORKFLOW CONDITIONS (Branching Logic)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_step_id uuid REFERENCES workflow_steps(id) ON DELETE CASCADE NOT NULL,

  -- Condition definition
  condition_order integer DEFAULT 0, -- Order of evaluation
  field_name text NOT NULL, -- Field to evaluate (e.g., 'amount', 'department_id')
  operator workflow_condition_operator NOT NULL,
  value_type text, -- 'string', 'number', 'boolean', 'date', 'array'
  comparison_value jsonb, -- Value to compare against

  -- Logical operators
  logical_operator text, -- 'AND' or 'OR' with next condition
  group_id text, -- For grouping conditions

  -- Target
  target_step_key text, -- Which step to go to if condition is true

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_conditions_step ON workflow_conditions(workflow_step_id);

-- =====================================================
-- WORKFLOW CONNECTIONS (Visual Builder)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE NOT NULL,

  -- Connection definition
  source_step_id uuid REFERENCES workflow_steps(id) ON DELETE CASCADE NOT NULL,
  target_step_id uuid REFERENCES workflow_steps(id) ON DELETE CASCADE NOT NULL,

  -- Connection type
  connection_type text, -- 'sequence', 'condition_true', 'condition_false', 'parallel'
  label text, -- Label for the connection line

  -- Condition for this path (if conditional)
  condition_expression jsonb,

  created_at timestamptz DEFAULT now(),

  UNIQUE(source_step_id, target_step_id, connection_type)
);

CREATE INDEX IF NOT EXISTS idx_workflow_connections_template ON workflow_connections(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_source ON workflow_connections(source_step_id);

-- =====================================================
-- WORKFLOW STEP APPROVERS
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_step_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_step_id uuid REFERENCES workflow_steps(id) ON DELETE CASCADE NOT NULL,

  -- Approver definition
  approver_type workflow_approver_type NOT NULL,
  approver_order integer DEFAULT 0, -- For sequential approval

  -- Static assignment
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role_name text,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,

  -- Dynamic assignment
  manager_level integer DEFAULT 1, -- 1 = direct manager, 2 = skip-level, etc.
  budget_min_amount numeric(15,2),
  budget_max_amount numeric(15,2),
  custom_field_name text, -- For custom field-based assignment
  custom_field_value text,

  -- External approver
  external_email text,
  external_name text,
  external_company text,

  -- Voting weight (for weighted approval)
  vote_weight integer DEFAULT 1,

  -- Notification preferences
  notify_on_assignment boolean DEFAULT true,
  notify_on_reminder boolean DEFAULT true,
  reminder_frequency_hours integer DEFAULT 24,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_approvers_step ON workflow_step_approvers(workflow_step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_approvers_user ON workflow_step_approvers(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_approvers_dept ON workflow_step_approvers(department_id);

-- =====================================================
-- WORKFLOW INSTANCES (Runtime Execution)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id uuid REFERENCES workflow_templates(id) ON DELETE RESTRICT NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Entity this workflow is for
  entity_type text NOT NULL, -- Table name (e.g., 'leave_requests')
  entity_id uuid NOT NULL, -- Record ID

  -- Status
  status workflow_instance_status DEFAULT 'pending' NOT NULL,
  current_step_id uuid REFERENCES workflow_steps(id) ON DELETE SET NULL,

  -- Requester
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  requested_at timestamptz DEFAULT now(),

  -- Completion
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Context data (snapshot of entity at workflow start)
  context_data jsonb,

  -- SLA tracking
  sla_deadline timestamptz,
  sla_status text, -- 'on_track', 'at_risk', 'breached'
  sla_breached_at timestamptz,

  -- Priority
  priority integer DEFAULT 5, -- 1-10, higher = more urgent

  -- Comments and notes
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_template ON workflow_instances(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_company ON workflow_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_requester ON workflow_instances(requested_by);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_sla ON workflow_instances(sla_deadline) WHERE status IN ('pending', 'in_progress');

-- =====================================================
-- WORKFLOW INSTANCE STEPS (Step Progress)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_instance_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid REFERENCES workflow_instances(id) ON DELETE CASCADE NOT NULL,
  workflow_step_id uuid REFERENCES workflow_steps(id) ON DELETE RESTRICT NOT NULL,

  -- Status
  status workflow_step_status DEFAULT 'pending' NOT NULL,

  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  sla_deadline timestamptz,

  -- Current approvers
  assigned_approvers jsonb, -- Array of user IDs currently assigned

  -- Approval tracking
  approvals_received integer DEFAULT 0,
  approvals_required integer,
  rejections_received integer DEFAULT 0,

  -- Escalation
  escalated boolean DEFAULT false,
  escalated_at timestamptz,
  escalated_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Skip/bypass
  skipped boolean DEFAULT false,
  skip_reason text,

  -- Retry tracking
  retry_count integer DEFAULT 0,
  last_retry_at timestamptz,
  error_message text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instance_steps_instance ON workflow_instance_steps(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instance_steps_status ON workflow_instance_steps(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instance_steps_sla ON workflow_instance_steps(sla_deadline) WHERE status IN ('pending', 'in_progress');

-- =====================================================
-- WORKFLOW APPROVALS (Approval History)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid REFERENCES workflow_instances(id) ON DELETE CASCADE NOT NULL,
  workflow_instance_step_id uuid REFERENCES workflow_instance_steps(id) ON DELETE CASCADE NOT NULL,

  -- Approver
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_type workflow_approver_type,
  approver_email text, -- For external approvers
  approver_name text,

  -- Decision
  action text NOT NULL, -- 'approved', 'rejected', 'returned', 'forwarded'
  decision_date timestamptz DEFAULT now(),

  -- Delegation tracking
  is_delegated boolean DEFAULT false,
  delegated_from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delegation_id uuid, -- Reference to workflow_delegations

  -- Comments and attachments
  comments text,
  attachments jsonb, -- Array of file URLs

  -- Voting weight (if applicable)
  vote_weight integer DEFAULT 1,

  -- Timing
  time_to_approve_minutes integer, -- Time from assignment to approval

  -- IP and device tracking
  ip_address inet,
  user_agent text,
  device_info jsonb,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance ON workflow_approvals(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_step ON workflow_approvals(workflow_instance_step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_approver ON workflow_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_action ON workflow_approvals(action);

-- =====================================================
-- WORKFLOW DELEGATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Delegation setup
  delegator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Person delegating
  delegate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Person receiving delegation

  -- Scope
  workflow_template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE, -- Specific workflow (null = all)
  entity_types text[], -- Array of entity types to delegate (null = all)

  -- Date range
  start_date date NOT NULL,
  end_date date NOT NULL,

  -- Status
  is_active boolean DEFAULT true,

  -- Permissions
  can_approve boolean DEFAULT true,
  can_reject boolean DEFAULT true,
  can_return boolean DEFAULT false,
  can_forward boolean DEFAULT false,

  -- Reason
  reason text,

  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_workflow_delegations_company ON workflow_delegations(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_delegations_delegator ON workflow_delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_workflow_delegations_delegate ON workflow_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_workflow_delegations_active ON workflow_delegations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_delegations_dates ON workflow_delegations(start_date, end_date);

-- =====================================================
-- WORKFLOW ESCALATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid REFERENCES workflow_instances(id) ON DELETE CASCADE NOT NULL,
  workflow_instance_step_id uuid REFERENCES workflow_instance_steps(id) ON DELETE CASCADE NOT NULL,

  -- Escalation details
  escalated_from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  escalated_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  escalation_level integer DEFAULT 1, -- Can escalate multiple times

  -- Reason
  reason text NOT NULL, -- 'timeout', 'manual', 'auto'
  escalation_type text, -- 'manager', 'role', 'admin', 'custom'

  -- Timing
  escalated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_action text, -- 'approved', 'rejected', 'returned', 'reassigned'

  -- Notes
  notes text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_escalations_instance ON workflow_escalations(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_escalations_step ON workflow_escalations(workflow_instance_step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_escalations_to_user ON workflow_escalations(escalated_to_user_id);

-- =====================================================
-- WORKFLOW NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid REFERENCES workflow_instances(id) ON DELETE CASCADE NOT NULL,
  workflow_instance_step_id uuid REFERENCES workflow_instance_steps(id) ON DELETE CASCADE,

  -- Recipient
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text, -- For external recipients
  recipient_phone text, -- For SMS

  -- Notification details
  notification_type text NOT NULL, -- 'email', 'sms', 'in_app', 'push'
  event_type text NOT NULL, -- 'assigned', 'approved', 'rejected', 'escalated', 'reminder'

  -- Content
  subject text,
  message text NOT NULL,
  template_used text,

  -- Delivery status
  status text DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,

  -- Error tracking
  error_message text,
  retry_count integer DEFAULT 0,

  -- Metadata
  metadata jsonb,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_notifications_instance ON workflow_notifications(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_recipient ON workflow_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_status ON workflow_notifications(status);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_type ON workflow_notifications(notification_type, event_type);

-- =====================================================
-- WORKFLOW TEMPLATES AUDIT (Version Control)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_templates_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE NOT NULL,

  -- Version tracking
  version_number integer NOT NULL,
  change_type text NOT NULL, -- 'created', 'updated', 'published', 'deprecated', 'deleted'

  -- Snapshot of workflow at this version
  template_snapshot jsonb NOT NULL, -- Full template configuration
  steps_snapshot jsonb, -- All steps
  connections_snapshot jsonb, -- All connections

  -- Changes made
  changes_summary text,
  changes_detail jsonb, -- Detailed diff

  -- Who made the change
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  change_reason text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_audit_template ON workflow_templates_audit(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_audit_version ON workflow_templates_audit(workflow_template_id, version_number);

-- =====================================================
-- WORKFLOW METRICS (Analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  workflow_template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE,

  -- Date
  metric_date date NOT NULL,

  -- Volume metrics
  instances_started integer DEFAULT 0,
  instances_completed integer DEFAULT 0,
  instances_approved integer DEFAULT 0,
  instances_rejected integer DEFAULT 0,
  instances_cancelled integer DEFAULT 0,
  instances_expired integer DEFAULT 0,

  -- Timing metrics (in minutes)
  avg_completion_time integer,
  median_completion_time integer,
  min_completion_time integer,
  max_completion_time integer,

  -- SLA metrics
  sla_met_count integer DEFAULT 0,
  sla_breached_count integer DEFAULT 0,
  sla_compliance_rate numeric(5,2),

  -- Step metrics
  avg_steps_per_instance numeric(5,2),
  avg_approvers_per_instance numeric(5,2),

  -- Escalation metrics
  escalations_count integer DEFAULT 0,
  escalation_rate numeric(5,2),

  -- Bottlenecks
  bottleneck_steps jsonb, -- Steps with longest average time

  created_at timestamptz DEFAULT now(),

  UNIQUE(company_id, workflow_template_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_workflow_metrics_company ON workflow_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_template ON workflow_metrics(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_date ON workflow_metrics(metric_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instance_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_metrics ENABLE ROW LEVEL SECURITY;

-- Workflow Templates Policies
CREATE POLICY "Users can view workflows for their company"
  ON workflow_templates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workflows"
  ON workflow_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = workflow_templates.company_id
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- Workflow Steps Policies
CREATE POLICY "Users can view workflow steps"
  ON workflow_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_templates wt
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE wt.id = workflow_steps.workflow_template_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workflow steps"
  ON workflow_steps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_templates wt
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE wt.id = workflow_steps.workflow_template_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- Workflow Conditions Policies
CREATE POLICY "Users can view workflow conditions"
  ON workflow_conditions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_steps ws
      INNER JOIN workflow_templates wt ON wt.id = ws.workflow_template_id
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE ws.id = workflow_conditions.workflow_step_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workflow conditions"
  ON workflow_conditions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_steps ws
      INNER JOIN workflow_templates wt ON wt.id = ws.workflow_template_id
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE ws.id = workflow_conditions.workflow_step_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- Workflow Connections Policies
CREATE POLICY "Users can view workflow connections"
  ON workflow_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_templates wt
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE wt.id = workflow_connections.workflow_template_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workflow connections"
  ON workflow_connections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_templates wt
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE wt.id = workflow_connections.workflow_template_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- Workflow Step Approvers Policies
CREATE POLICY "Users can view workflow approvers"
  ON workflow_step_approvers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_steps ws
      INNER JOIN workflow_templates wt ON wt.id = ws.workflow_template_id
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE ws.id = workflow_step_approvers.workflow_step_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage workflow approvers"
  ON workflow_step_approvers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_steps ws
      INNER JOIN workflow_templates wt ON wt.id = ws.workflow_template_id
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE ws.id = workflow_step_approvers.workflow_step_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- Workflow Instances Policies
CREATE POLICY "Users can view workflow instances for their company"
  ON workflow_instances FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workflow_instance_steps wis
      WHERE wis.workflow_instance_id = workflow_instances.id
      AND wis.assigned_approvers::jsonb ? auth.uid()::text
    )
  );

CREATE POLICY "Users can create workflow instances"
  ON workflow_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and approvers can update workflow instances"
  ON workflow_instances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = workflow_instances.company_id
      AND role IN ('super_admin', 'admin', 'hr_manager', 'manager')
    )
    OR requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workflow_instance_steps wis
      WHERE wis.workflow_instance_id = workflow_instances.id
      AND wis.assigned_approvers::jsonb ? auth.uid()::text
    )
  );

-- Workflow Instance Steps Policies
CREATE POLICY "Users can view workflow instance steps"
  ON workflow_instance_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_instances wi
      WHERE wi.id = workflow_instance_steps.workflow_instance_id
      AND (
        wi.company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
        OR wi.requested_by = auth.uid()
        OR assigned_approvers::jsonb ? auth.uid()::text
      )
    )
  );

CREATE POLICY "System can manage workflow instance steps"
  ON workflow_instance_steps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_instances wi
      INNER JOIN user_roles ur ON ur.company_id = wi.company_id
      WHERE wi.id = workflow_instance_steps.workflow_instance_id
      AND ur.user_id = auth.uid()
    )
  );

-- Workflow Approvals Policies
CREATE POLICY "Users can view workflow approvals"
  ON workflow_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_instances wi
      WHERE wi.id = workflow_approvals.workflow_instance_id
      AND (
        wi.company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
        OR wi.requested_by = auth.uid()
        OR approver_id = auth.uid()
      )
    )
  );

CREATE POLICY "Approvers can create approval records"
  ON workflow_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workflow_delegations wd
      WHERE wd.delegator_id = approver_id
      AND wd.delegate_id = auth.uid()
      AND wd.is_active = true
      AND CURRENT_DATE BETWEEN wd.start_date AND wd.end_date
    )
  );

-- Workflow Delegations Policies
CREATE POLICY "Users can view their delegations"
  ON workflow_delegations FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
    AND (
      delegator_id = auth.uid()
      OR delegate_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND company_id = workflow_delegations.company_id
        AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

CREATE POLICY "Users can manage their delegations"
  ON workflow_delegations FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
    AND (
      delegator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND company_id = workflow_delegations.company_id
        AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

-- Workflow Escalations Policies
CREATE POLICY "Users can view workflow escalations"
  ON workflow_escalations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_instances wi
      WHERE wi.id = workflow_escalations.workflow_instance_id
      AND (
        wi.company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
        OR wi.requested_by = auth.uid()
        OR escalated_to_user_id = auth.uid()
        OR escalated_from_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can create escalations"
  ON workflow_escalations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflow_instances wi
      INNER JOIN user_roles ur ON ur.company_id = wi.company_id
      WHERE wi.id = workflow_escalations.workflow_instance_id
      AND ur.user_id = auth.uid()
    )
  );

-- Workflow Notifications Policies
CREATE POLICY "Users can view their notifications"
  ON workflow_notifications FOR SELECT
  TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workflow_instances wi
      INNER JOIN user_roles ur ON ur.company_id = wi.company_id
      WHERE wi.id = workflow_notifications.workflow_instance_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "System can create notifications"
  ON workflow_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Workflow Templates Audit Policies
CREATE POLICY "Admins can view workflow audit"
  ON workflow_templates_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflow_templates wt
      INNER JOIN user_roles ur ON ur.company_id = wt.company_id
      WHERE wt.id = workflow_templates_audit.workflow_template_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "System can create audit records"
  ON workflow_templates_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Workflow Metrics Policies
CREATE POLICY "Admins can view workflow metrics"
  ON workflow_metrics FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "System can manage workflow metrics"
  ON workflow_metrics FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get active delegations for a user
CREATE OR REPLACE FUNCTION get_active_delegations(
  p_user_id uuid,
  p_workflow_template_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL
)
RETURNS TABLE (
  delegation_id uuid,
  delegator_id uuid,
  delegate_id uuid,
  can_approve boolean,
  can_reject boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wd.id,
    wd.delegator_id,
    wd.delegate_id,
    wd.can_approve,
    wd.can_reject
  FROM workflow_delegations wd
  WHERE wd.is_active = true
  AND CURRENT_DATE BETWEEN wd.start_date AND wd.end_date
  AND (
    (wd.delegator_id = p_user_id AND wd.delegate_id IS NOT NULL)
    OR (wd.delegate_id = p_user_id)
  )
  AND (p_workflow_template_id IS NULL OR wd.workflow_template_id = p_workflow_template_id OR wd.workflow_template_id IS NULL)
  AND (p_entity_type IS NULL OR p_entity_type = ANY(wd.entity_types) OR wd.entity_types IS NULL);
END;
$$;

-- Function to calculate workflow metrics
CREATE OR REPLACE FUNCTION calculate_workflow_metrics(
  p_company_id uuid,
  p_workflow_template_id uuid,
  p_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_instances_started integer;
  v_instances_completed integer;
  v_instances_approved integer;
  v_instances_rejected integer;
  v_instances_cancelled integer;
  v_instances_expired integer;
  v_avg_completion_time integer;
  v_median_completion_time integer;
  v_min_completion_time integer;
  v_max_completion_time integer;
  v_sla_met_count integer;
  v_sla_breached_count integer;
  v_sla_compliance_rate numeric(5,2);
  v_escalations_count integer;
  v_escalation_rate numeric(5,2);
BEGIN
  -- Calculate volume metrics
  SELECT
    COUNT(*) FILTER (WHERE DATE(created_at) = p_date),
    COUNT(*) FILTER (WHERE DATE(completed_at) = p_date AND status IN ('approved', 'rejected', 'cancelled')),
    COUNT(*) FILTER (WHERE DATE(completed_at) = p_date AND status = 'approved'),
    COUNT(*) FILTER (WHERE DATE(completed_at) = p_date AND status = 'rejected'),
    COUNT(*) FILTER (WHERE DATE(completed_at) = p_date AND status = 'cancelled'),
    COUNT(*) FILTER (WHERE DATE(completed_at) = p_date AND status = 'expired')
  INTO
    v_instances_started,
    v_instances_completed,
    v_instances_approved,
    v_instances_rejected,
    v_instances_cancelled,
    v_instances_expired
  FROM workflow_instances
  WHERE company_id = p_company_id
  AND (p_workflow_template_id IS NULL OR workflow_template_id = p_workflow_template_id);

  -- Calculate timing metrics
  SELECT
    AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/60)::integer,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - requested_at))/60)::integer,
    MIN(EXTRACT(EPOCH FROM (completed_at - requested_at))/60)::integer,
    MAX(EXTRACT(EPOCH FROM (completed_at - requested_at))/60)::integer
  INTO
    v_avg_completion_time,
    v_median_completion_time,
    v_min_completion_time,
    v_max_completion_time
  FROM workflow_instances
  WHERE company_id = p_company_id
  AND (p_workflow_template_id IS NULL OR workflow_template_id = p_workflow_template_id)
  AND DATE(completed_at) = p_date
  AND completed_at IS NOT NULL;

  -- Calculate SLA metrics
  SELECT
    COUNT(*) FILTER (WHERE sla_status = 'on_track'),
    COUNT(*) FILTER (WHERE sla_status = 'breached')
  INTO v_sla_met_count, v_sla_breached_count
  FROM workflow_instances
  WHERE company_id = p_company_id
  AND (p_workflow_template_id IS NULL OR workflow_template_id = p_workflow_template_id)
  AND DATE(completed_at) = p_date;

  IF (v_sla_met_count + v_sla_breached_count) > 0 THEN
    v_sla_compliance_rate := (v_sla_met_count::numeric / (v_sla_met_count + v_sla_breached_count)) * 100;
  ELSE
    v_sla_compliance_rate := 0;
  END IF;

  -- Calculate escalation metrics
  SELECT COUNT(DISTINCT workflow_instance_id)
  INTO v_escalations_count
  FROM workflow_escalations we
  INNER JOIN workflow_instances wi ON wi.id = we.workflow_instance_id
  WHERE wi.company_id = p_company_id
  AND (p_workflow_template_id IS NULL OR wi.workflow_template_id = p_workflow_template_id)
  AND DATE(we.escalated_at) = p_date;

  IF v_instances_completed > 0 THEN
    v_escalation_rate := (v_escalations_count::numeric / v_instances_completed) * 100;
  ELSE
    v_escalation_rate := 0;
  END IF;

  -- Insert or update metrics
  INSERT INTO workflow_metrics (
    company_id,
    workflow_template_id,
    metric_date,
    instances_started,
    instances_completed,
    instances_approved,
    instances_rejected,
    instances_cancelled,
    instances_expired,
    avg_completion_time,
    median_completion_time,
    min_completion_time,
    max_completion_time,
    sla_met_count,
    sla_breached_count,
    sla_compliance_rate,
    escalations_count,
    escalation_rate
  ) VALUES (
    p_company_id,
    p_workflow_template_id,
    p_date,
    v_instances_started,
    v_instances_completed,
    v_instances_approved,
    v_instances_rejected,
    v_instances_cancelled,
    v_instances_expired,
    v_avg_completion_time,
    v_median_completion_time,
    v_min_completion_time,
    v_max_completion_time,
    v_sla_met_count,
    v_sla_breached_count,
    v_sla_compliance_rate,
    v_escalations_count,
    v_escalation_rate
  )
  ON CONFLICT (company_id, workflow_template_id, metric_date)
  DO UPDATE SET
    instances_started = EXCLUDED.instances_started,
    instances_completed = EXCLUDED.instances_completed,
    instances_approved = EXCLUDED.instances_approved,
    instances_rejected = EXCLUDED.instances_rejected,
    instances_cancelled = EXCLUDED.instances_cancelled,
    instances_expired = EXCLUDED.instances_expired,
    avg_completion_time = EXCLUDED.avg_completion_time,
    median_completion_time = EXCLUDED.median_completion_time,
    min_completion_time = EXCLUDED.min_completion_time,
    max_completion_time = EXCLUDED.max_completion_time,
    sla_met_count = EXCLUDED.sla_met_count,
    sla_breached_count = EXCLUDED.sla_breached_count,
    sla_compliance_rate = EXCLUDED.sla_compliance_rate,
    escalations_count = EXCLUDED.escalations_count,
    escalation_rate = EXCLUDED.escalation_rate;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_workflow_templates_timestamp
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_timestamp();

CREATE TRIGGER update_workflow_instances_timestamp
  BEFORE UPDATE ON workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_timestamp();

CREATE TRIGGER update_workflow_instance_steps_timestamp
  BEFORE UPDATE ON workflow_instance_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_timestamp();

-- Audit trail for workflow template changes
CREATE OR REPLACE FUNCTION audit_workflow_template_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO workflow_templates_audit (
      workflow_template_id,
      version_number,
      change_type,
      template_snapshot,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.version,
      'updated',
      to_jsonb(NEW),
      NEW.updated_by,
      'Template updated'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_workflow_template_changes_trigger
  AFTER UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION audit_workflow_template_changes();
