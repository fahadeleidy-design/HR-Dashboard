/*
  # Automated Governance Reporting System

  1. Core Tables
    - **report_definitions**: Report templates with data sources and filters
    - **report_configurations**: Company-specific report settings
    - **report_schedules**: Automated report generation schedules
    - **report_executions**: History of report runs with status
    - **report_recipients**: Distribution lists with role-based access
    - **report_deliveries**: Individual delivery tracking per recipient
    - **report_approvals**: Approval workflow for sensitive reports
    - **report_compliance_log**: Detailed audit trail for compliance

  2. Security Features
    - RLS policies for multi-tenant isolation
    - Role-based data filtering
    - Encryption flags for sensitive reports
    - Approval requirements by sensitivity level
    - Complete audit logging

  3. Key Features
    - Scheduled generation (daily, weekly, monthly, quarterly, yearly)
    - Event-driven triggers (on-demand, workflow completion)
    - Role-based data filtering (only see what you're allowed)
    - Attachment encryption for sensitive data
    - Email delivery tracking
    - Compliance logging with retention policies
    - Approval workflows for critical reports
*/

-- Report sensitivity levels
CREATE TYPE report_sensitivity AS ENUM ('public', 'internal', 'confidential', 'restricted');

-- Report frequency types
CREATE TYPE report_frequency AS ENUM ('on_demand', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- Report execution status
CREATE TYPE report_execution_status AS ENUM ('pending', 'generating', 'completed', 'failed', 'cancelled');

-- Report delivery status
CREATE TYPE report_delivery_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'failed', 'bounced');

-- Report approval status
CREATE TYPE report_approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- ============================================================================
-- REPORT DEFINITIONS (TEMPLATES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL, -- payroll, compliance, hr, finance, etc.
  
  -- Data source configuration
  data_source text NOT NULL, -- table or view name
  query_template text, -- SQL template with {{variables}}
  filters jsonb DEFAULT '[]'::jsonb, -- Dynamic filter definitions
  columns jsonb NOT NULL, -- Column definitions with labels
  
  -- Role-based access
  allowed_roles text[] NOT NULL DEFAULT '{super_admin}',
  row_level_filter text, -- SQL WHERE clause template for RLS
  
  -- Report characteristics
  sensitivity report_sensitivity NOT NULL DEFAULT 'internal',
  requires_approval boolean DEFAULT false,
  encrypt_attachment boolean DEFAULT false,
  
  -- Format and output
  file_format text[] DEFAULT '{pdf,excel,csv}',
  default_format text DEFAULT 'pdf',
  supports_charts boolean DEFAULT false,
  chart_config jsonb,
  
  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_category CHECK (category IN ('payroll', 'compliance', 'hr', 'finance', 'recruitment', 'performance', 'attendance', 'leave', 'training', 'assets'))
);

CREATE INDEX IF NOT EXISTS idx_report_definitions_category ON report_definitions(category);
CREATE INDEX IF NOT EXISTS idx_report_definitions_active ON report_definitions(is_active) WHERE is_active = true;

-- ============================================================================
-- REPORT CONFIGURATIONS (COMPANY-SPECIFIC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_definition_id uuid NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  
  -- Company-specific settings
  custom_name text,
  is_enabled boolean DEFAULT true,
  
  -- Filter overrides
  default_filters jsonb DEFAULT '{}'::jsonb,
  parameter_values jsonb DEFAULT '{}'::jsonb,
  
  -- Distribution settings
  default_recipients text[], -- email addresses
  recipient_roles text[], -- auto-include users with these roles
  cc_recipients text[],
  bcc_recipients text[],
  
  -- Email settings
  email_subject text,
  email_body text,
  include_summary boolean DEFAULT true,
  attach_report boolean DEFAULT true,
  
  -- Approval workflow
  requires_approval_override boolean,
  approval_chain uuid[], -- ordered list of approver user IDs
  auto_approve_threshold numeric, -- e.g., reports under certain value
  
  -- Retention and compliance
  retention_days integer DEFAULT 365,
  auto_archive boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, report_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_report_configs_company ON report_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_enabled ON report_configurations(is_enabled) WHERE is_enabled = true;

-- ============================================================================
-- REPORT SCHEDULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_configuration_id uuid NOT NULL REFERENCES report_configurations(id) ON DELETE CASCADE,
  
  -- Schedule configuration
  frequency report_frequency NOT NULL DEFAULT 'monthly',
  schedule_time time DEFAULT '08:00:00',
  schedule_day integer, -- day of week (1-7) or day of month (1-31)
  schedule_month integer, -- for quarterly/yearly (1-12)
  timezone text DEFAULT 'Asia/Riyadh',
  
  -- Execution window
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date, -- null for indefinite
  
  -- Status
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  
  -- Notifications
  notify_on_success boolean DEFAULT false,
  notify_on_failure boolean DEFAULT true,
  notification_recipients text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_schedule_day CHECK (
    (frequency = 'weekly' AND schedule_day BETWEEN 1 AND 7) OR
    (frequency = 'monthly' AND schedule_day BETWEEN 1 AND 31) OR
    (frequency NOT IN ('weekly', 'monthly'))
  )
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_company ON report_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_active ON report_schedules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;

-- ============================================================================
-- REPORT EXECUTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_configuration_id uuid NOT NULL REFERENCES report_configurations(id) ON DELETE CASCADE,
  report_schedule_id uuid REFERENCES report_schedules(id) ON DELETE SET NULL,
  
  -- Execution details
  execution_type text NOT NULL DEFAULT 'scheduled', -- scheduled, manual, event_triggered
  status report_execution_status NOT NULL DEFAULT 'pending',
  
  -- Parameters
  parameters jsonb DEFAULT '{}'::jsonb,
  filters_applied jsonb DEFAULT '{}'::jsonb,
  date_range_start date,
  date_range_end date,
  
  -- Results
  row_count integer,
  file_size_bytes bigint,
  file_format text,
  file_path text, -- Storage bucket path
  file_url text, -- Signed URL (temporary)
  encrypted boolean DEFAULT false,
  encryption_key_id text, -- Reference to key management system
  
  -- Performance metrics
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds numeric,
  
  -- Error handling
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  
  -- Approval tracking
  requires_approval boolean DEFAULT false,
  approval_status report_approval_status,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  
  -- Metadata
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_date_range CHECK (date_range_end IS NULL OR date_range_end >= date_range_start)
);

CREATE INDEX IF NOT EXISTS idx_report_executions_company ON report_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);
CREATE INDEX IF NOT EXISTS idx_report_executions_created ON report_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_executions_approval ON report_executions(approval_status) WHERE requires_approval = true;

-- ============================================================================
-- REPORT RECIPIENTS (DISTRIBUTION LISTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_configuration_id uuid NOT NULL REFERENCES report_configurations(id) ON DELETE CASCADE,
  
  -- Recipient details
  recipient_type text NOT NULL DEFAULT 'email', -- email, role, user, department
  recipient_value text NOT NULL, -- email address, role name, user ID, or department ID
  recipient_name text,
  
  -- Access control
  can_view_data boolean DEFAULT true,
  can_download boolean DEFAULT true,
  access_expires_at timestamptz,
  
  -- Delivery preferences
  delivery_method text DEFAULT 'email', -- email, portal, both
  file_formats text[] DEFAULT '{pdf}',
  compress_attachment boolean DEFAULT false,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_report_recipients_company ON report_recipients(company_id);
CREATE INDEX IF NOT EXISTS idx_report_recipients_config ON report_recipients(report_configuration_id);
CREATE INDEX IF NOT EXISTS idx_report_recipients_type ON report_recipients(recipient_type);

-- ============================================================================
-- REPORT DELIVERIES (TRACKING)
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_execution_id uuid NOT NULL REFERENCES report_executions(id) ON DELETE CASCADE,
  report_recipient_id uuid REFERENCES report_recipients(id) ON DELETE SET NULL,
  
  -- Delivery details
  recipient_email text NOT NULL,
  recipient_name text,
  delivery_method text NOT NULL DEFAULT 'email',
  
  -- Email tracking
  email_queue_id uuid REFERENCES email_queue(id),
  status report_delivery_status NOT NULL DEFAULT 'pending',
  
  -- File details
  file_path text,
  file_size_bytes bigint,
  file_format text,
  is_encrypted boolean DEFAULT false,
  download_password text, -- for encrypted attachments
  
  -- Tracking
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  downloaded_at timestamptz,
  download_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  
  -- Access control
  access_expires_at timestamptz,
  access_revoked boolean DEFAULT false,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  revoked_reason text,
  
  -- Error handling
  error_message text,
  retry_count integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_deliveries_company ON report_deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_execution ON report_deliveries(report_execution_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_status ON report_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_recipient ON report_deliveries(recipient_email);

-- ============================================================================
-- REPORT APPROVALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_execution_id uuid NOT NULL REFERENCES report_executions(id) ON DELETE CASCADE,
  
  -- Approval workflow
  approval_level integer NOT NULL DEFAULT 1,
  approver_id uuid NOT NULL REFERENCES auth.users(id),
  approver_role text,
  
  -- Status
  status report_approval_status NOT NULL DEFAULT 'pending',
  
  -- Actions
  approved_at timestamptz,
  rejected_at timestamptz,
  comments text,
  
  -- Notifications
  notified_at timestamptz,
  reminder_sent_at timestamptz,
  reminder_count integer DEFAULT 0,
  
  -- Expiration
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(report_execution_id, approval_level, approver_id)
);

CREATE INDEX IF NOT EXISTS idx_report_approvals_company ON report_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_report_approvals_execution ON report_approvals(report_execution_id);
CREATE INDEX IF NOT EXISTS idx_report_approvals_approver ON report_approvals(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_report_approvals_pending ON report_approvals(status, expires_at) WHERE status = 'pending';

-- ============================================================================
-- REPORT COMPLIANCE LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_compliance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_execution_id uuid REFERENCES report_executions(id) ON DELETE SET NULL,
  report_delivery_id uuid REFERENCES report_deliveries(id) ON DELETE SET NULL,
  
  -- Event details
  event_type text NOT NULL, -- generated, approved, delivered, accessed, downloaded, revoked, deleted
  event_category text NOT NULL, -- generation, approval, distribution, access, compliance
  
  -- User tracking
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  user_role text,
  user_ip_address inet,
  user_agent text,
  
  -- Report metadata
  report_name text,
  report_sensitivity report_sensitivity,
  data_classification text,
  
  -- Data access details
  data_accessed jsonb, -- Summary of what data was accessed
  row_count integer,
  contains_pii boolean DEFAULT false,
  contains_financial boolean DEFAULT false,
  
  -- Compliance fields
  access_reason text,
  business_justification text,
  retention_applied boolean DEFAULT false,
  encryption_applied boolean DEFAULT false,
  
  -- Audit trail
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  session_id text,
  request_id text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_log_company ON report_compliance_log(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_log_event_type ON report_compliance_log(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_log_user ON report_compliance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_log_timestamp ON report_compliance_log(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_log_execution ON report_compliance_log(report_execution_id);
CREATE INDEX IF NOT EXISTS idx_compliance_log_pii ON report_compliance_log(contains_pii) WHERE contains_pii = true;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_compliance_log ENABLE ROW LEVEL SECURITY;

-- Report definitions (global, role-based)
CREATE POLICY "Users can view report definitions for their role"
  ON report_definitions FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    (
      auth.uid() IN (SELECT user_id FROM user_roles WHERE role = ANY(allowed_roles))
      OR 'super_admin' = ANY(SELECT role FROM user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Super admins and HR manage report definitions"
  ON report_definitions FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('super_admin', 'hr')
    )
  );

-- Report configurations (company-scoped)
CREATE POLICY "Users can view company report configurations"
  ON report_configurations FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'finance', 'manager')
    )
  );

CREATE POLICY "Privileged users manage report configurations"
  ON report_configurations FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );

-- Report schedules
CREATE POLICY "Users can view company report schedules"
  ON report_schedules FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'finance', 'manager')
    )
  );

CREATE POLICY "Privileged users manage report schedules"
  ON report_schedules FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );

-- Report executions
CREATE POLICY "Users can view their company report executions"
  ON report_executions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
    OR generated_by = auth.uid()
  );

CREATE POLICY "Privileged users manage report executions"
  ON report_executions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'finance', 'manager')
    )
  );

CREATE POLICY "Privileged users update report executions"
  ON report_executions FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );

-- Report recipients
CREATE POLICY "Users can view company report recipients"
  ON report_recipients FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Privileged users manage report recipients"
  ON report_recipients FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );

-- Report deliveries
CREATE POLICY "Users can view deliveries for their company"
  ON report_deliveries FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'finance')
    )
  );

CREATE POLICY "System can manage report deliveries"
  ON report_deliveries FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );

-- Report approvals
CREATE POLICY "Users can view their approvals"
  ON report_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid()
    OR company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );

CREATE POLICY "Approvers can update their approvals"
  ON report_approvals FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid());

CREATE POLICY "System creates report approvals"
  ON report_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );

-- Compliance log
CREATE POLICY "Compliance officers view compliance log"
  ON report_compliance_log FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'compliance')
    )
  );

CREATE POLICY "System creates compliance log entries"
  ON report_compliance_log FOR INSERT
  TO authenticated
  WITH CHECK (true); -- All authenticated users can log events

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log compliance events
CREATE OR REPLACE FUNCTION log_report_compliance_event(
  p_company_id uuid,
  p_report_execution_id uuid,
  p_report_delivery_id uuid,
  p_event_type text,
  p_event_category text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
  v_user_id uuid;
  v_user_email text;
  v_user_role text;
BEGIN
  -- Get current user details
  v_user_id := auth.uid();
  
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = v_user_id AND company_id = p_company_id
  LIMIT 1;
  
  -- Insert compliance log entry
  INSERT INTO report_compliance_log (
    company_id,
    report_execution_id,
    report_delivery_id,
    event_type,
    event_category,
    user_id,
    user_email,
    user_role,
    user_ip_address,
    metadata
  ) VALUES (
    p_company_id,
    p_report_execution_id,
    p_report_delivery_id,
    p_event_type,
    p_event_category,
    v_user_id,
    v_user_email,
    v_user_role,
    inet_client_addr(),
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next run time for schedules
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_schedule_id uuid
) RETURNS timestamptz AS $$
DECLARE
  v_schedule record;
  v_next_run timestamptz;
BEGIN
  SELECT * INTO v_schedule
  FROM report_schedules
  WHERE id = p_schedule_id;
  
  IF v_schedule.frequency = 'daily' THEN
    v_next_run := (CURRENT_DATE + interval '1 day' + v_schedule.schedule_time) AT TIME ZONE v_schedule.timezone;
  ELSIF v_schedule.frequency = 'weekly' THEN
    v_next_run := (CURRENT_DATE + ((v_schedule.schedule_day - EXTRACT(DOW FROM CURRENT_DATE))::int % 7 + 7) % 7 * interval '1 day' + v_schedule.schedule_time) AT TIME ZONE v_schedule.timezone;
    IF v_next_run <= now() THEN
      v_next_run := v_next_run + interval '7 days';
    END IF;
  ELSIF v_schedule.frequency = 'monthly' THEN
    v_next_run := (date_trunc('month', CURRENT_DATE) + interval '1 month' + (v_schedule.schedule_day - 1) * interval '1 day' + v_schedule.schedule_time) AT TIME ZONE v_schedule.timezone;
  ELSIF v_schedule.frequency = 'quarterly' THEN
    v_next_run := (date_trunc('quarter', CURRENT_DATE) + interval '3 months' + (v_schedule.schedule_day - 1) * interval '1 day' + v_schedule.schedule_time) AT TIME ZONE v_schedule.timezone;
  ELSIF v_schedule.frequency = 'yearly' THEN
    v_next_run := (date_trunc('year', CURRENT_DATE) + interval '1 year' + (v_schedule.schedule_month - 1) * interval '1 month' + (v_schedule.schedule_day - 1) * interval '1 day' + v_schedule.schedule_time) AT TIME ZONE v_schedule.timezone;
  ELSE
    v_next_run := NULL;
  END IF;
  
  RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update next_run_at after execution
CREATE OR REPLACE FUNCTION update_schedule_after_execution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.report_schedule_id IS NOT NULL THEN
    UPDATE report_schedules
    SET 
      last_run_at = NEW.completed_at,
      next_run_at = calculate_next_run_time(NEW.report_schedule_id),
      run_count = run_count + 1,
      updated_at = now()
    WHERE id = NEW.report_schedule_id;
  ELSIF NEW.status = 'failed' AND NEW.report_schedule_id IS NOT NULL THEN
    UPDATE report_schedules
    SET 
      failure_count = failure_count + 1,
      updated_at = now()
    WHERE id = NEW.report_schedule_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedule_after_execution
  AFTER UPDATE OF status ON report_executions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_schedule_after_execution();

-- Trigger to log compliance events automatically
CREATE OR REPLACE FUNCTION auto_log_report_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'report_executions' THEN
    PERFORM log_report_compliance_event(
      NEW.company_id,
      NEW.id,
      NULL,
      'generated',
      'generation',
      jsonb_build_object(
        'report_id', NEW.report_configuration_id,
        'execution_type', NEW.execution_type
      )
    );
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'report_executions' AND OLD.status != NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM log_report_compliance_event(
        NEW.company_id,
        NEW.id,
        NULL,
        'completed',
        'generation',
        jsonb_build_object('row_count', NEW.row_count, 'file_size', NEW.file_size_bytes)
      );
    END IF;
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'report_deliveries' THEN
    PERFORM log_report_compliance_event(
      NEW.company_id,
      NEW.report_execution_id,
      NEW.id,
      'delivered',
      'distribution',
      jsonb_build_object(
        'recipient', NEW.recipient_email,
        'delivery_method', NEW.delivery_method,
        'is_encrypted', NEW.is_encrypted
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_log_execution_events
  AFTER INSERT OR UPDATE ON report_executions
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_report_events();

CREATE TRIGGER trigger_auto_log_delivery_events
  AFTER INSERT ON report_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_report_events();