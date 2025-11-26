/*
  # Integrated Enterprise System - Cross-Module Integration

  1. Unified Notifications System
    - `system_notifications` - Universal notification center
    - Supports all modules (employees, attendance, expenses, payroll, etc.)
    
  2. Unified Approval Workflows
    - `approval_workflows` - Define approval chains
    - `approval_workflow_steps` - Multi-step approval configuration
    - `approval_requests` - Universal approval tracking
    
  3. System-Wide Alerts & Reminders
    - `system_alerts` - Automated alerts for compliance, expiry, etc.
    - `alert_subscriptions` - User alert preferences
    
  4. Unified Activity Log
    - `system_activity_log` - Complete audit trail across all modules
    
  5. Document Management Integration
    - Link documents to any entity (employee, expense, contract, etc.)
    
  6. Reporting & Analytics
    - `custom_reports` - User-defined reports
    - `report_schedules` - Automated report generation
    
  7. Cross-Module Relationships
    - Link expenses to attendance/travel
    - Link payroll to attendance/performance
    - Link documents to employees/contracts
*/

-- System Notifications Table
CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  recipient_employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  category text,
  related_module text,
  related_entity_type text,
  related_entity_id uuid,
  action_url text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  is_dismissed boolean DEFAULT false,
  dismissed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Approval Workflows Table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  workflow_name text NOT NULL,
  workflow_type text NOT NULL,
  description text,
  applies_to_module text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Approval Workflow Steps Table
CREATE TABLE IF NOT EXISTS approval_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES approval_workflows(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  step_name text NOT NULL,
  approver_role text,
  approver_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  amount_threshold decimal(10,2),
  can_skip boolean DEFAULT false,
  is_parallel boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Approval Requests Table
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  workflow_id uuid REFERENCES approval_workflows(id) ON DELETE SET NULL,
  request_type text NOT NULL,
  related_module text NOT NULL,
  related_entity_id uuid NOT NULL,
  requester_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  current_step integer DEFAULT 1,
  current_approver_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  submitted_date timestamptz DEFAULT now(),
  completed_date timestamptz,
  final_approver_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  rejection_reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Approval Actions Table
CREATE TABLE IF NOT EXISTS approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid REFERENCES approval_requests(id) ON DELETE CASCADE NOT NULL,
  step_number integer NOT NULL,
  approver_id uuid REFERENCES employees(id) ON DELETE SET NULL NOT NULL,
  action text CHECK (action IN ('approved', 'rejected', 'delegated')) NOT NULL,
  comments text,
  action_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  alert_category text NOT NULL,
  title text NOT NULL,
  description text,
  severity text CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  related_module text,
  related_entity_type text,
  related_entity_id uuid,
  trigger_date date,
  expiry_date date,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  resolution_notes text,
  auto_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Alert Subscriptions Table
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  alert_category text NOT NULL,
  notification_method text CHECK (notification_method IN ('in_app', 'email', 'sms', 'all')) DEFAULT 'in_app',
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- System Activity Log Table
CREATE TABLE IF NOT EXISTS system_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  module_name text NOT NULL,
  entity_type text,
  entity_id uuid,
  action text NOT NULL,
  description text,
  ip_address text,
  user_agent text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Custom Reports Table
CREATE TABLE IF NOT EXISTS custom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  report_name text NOT NULL,
  report_type text NOT NULL,
  description text,
  module_name text,
  query_config jsonb,
  columns_config jsonb,
  filters_config jsonb,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  is_shared boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Report Schedules Table
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  report_id uuid REFERENCES custom_reports(id) ON DELETE CASCADE NOT NULL,
  schedule_name text NOT NULL,
  frequency text CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')) NOT NULL,
  schedule_config jsonb,
  recipients jsonb,
  delivery_method text CHECK (delivery_method IN ('email', 'download', 'both')) DEFAULT 'email',
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Integration Links Table (polymorphic relationships)
CREATE TABLE IF NOT EXISTS integration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  source_module text NOT NULL,
  source_entity_type text NOT NULL,
  source_entity_id uuid NOT NULL,
  target_module text NOT NULL,
  target_entity_type text NOT NULL,
  target_entity_id uuid NOT NULL,
  link_type text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  setting_category text NOT NULL,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, setting_category, setting_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_notifications_company ON system_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_user ON system_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_employee ON system_notifications(recipient_employee_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_is_read ON system_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created ON system_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_company ON approval_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_module ON approval_workflows(applies_to_module);

CREATE INDEX IF NOT EXISTS idx_approval_requests_company ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_module ON approval_requests(related_module);

CREATE INDEX IF NOT EXISTS idx_system_alerts_company ON system_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_system_activity_log_company ON system_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_system_activity_log_employee ON system_activity_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_system_activity_log_module ON system_activity_log(module_name);
CREATE INDEX IF NOT EXISTS idx_system_activity_log_created ON system_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_links_source ON integration_links(source_module, source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_integration_links_target ON integration_links(target_module, target_entity_type, target_entity_id);

-- Enable RLS
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view notifications for their company"
  ON system_notifications FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON system_notifications FOR UPDATE
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view approval workflows for their company"
  ON approval_workflows FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view approval requests for their company"
  ON approval_requests FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view alerts for their company"
  ON system_alerts FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view activity log for their company"
  ON system_activity_log FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view custom reports for their company"
  ON custom_reports FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view integration links for their company"
  ON integration_links FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view system settings for their company"
  ON system_settings FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

-- Create function to log activity
CREATE OR REPLACE FUNCTION log_system_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_activity_log (
    company_id,
    user_id,
    activity_type,
    module_name,
    entity_type,
    entity_id,
    action,
    description,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Record created'
      WHEN TG_OP = 'UPDATE' THEN 'Record updated'
      WHEN TG_OP = 'DELETE' THEN 'Record deleted'
    END,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed default approval workflows
INSERT INTO approval_workflows (company_id, workflow_name, workflow_type, applies_to_module, description)
SELECT 
  c.id,
  'Expense Approval Workflow',
  'expense_approval',
  'expenses',
  'Default workflow for expense claim approvals'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM approval_workflows 
  WHERE company_id = c.id AND applies_to_module = 'expenses'
)
ON CONFLICT DO NOTHING;

INSERT INTO approval_workflows (company_id, workflow_name, workflow_type, applies_to_module, description)
SELECT 
  c.id,
  'Leave Request Approval',
  'leave_approval',
  'leave',
  'Default workflow for leave request approvals'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM approval_workflows 
  WHERE company_id = c.id AND applies_to_module = 'leave'
)
ON CONFLICT DO NOTHING;

INSERT INTO approval_workflows (company_id, workflow_name, workflow_type, applies_to_module, description)
SELECT 
  c.id,
  'Travel Request Approval',
  'travel_approval',
  'travel',
  'Default workflow for business travel approvals'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM approval_workflows 
  WHERE company_id = c.id AND applies_to_module = 'travel'
)
ON CONFLICT DO NOTHING;