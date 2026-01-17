/*
  # Add SLA Tracking and Approval Audit Trail

  ## Overview
  Implements comprehensive SLA tracking and detailed audit trail for approval workflows.

  ## Changes
  1. **SLA Configuration Table**
     - Define SLA time limits for each request type and approval level
     - Configurable warning thresholds (e.g., warn at 80% of deadline)
     - Support for business hours vs calendar hours

  2. **Request SLA Tracking Table**
     - Track when each request enters each approval level
     - Calculate deadlines based on SLA configuration
     - Track overdue status and escalations

  3. **Approval Audit Trail Table**
     - Complete history of all approval actions
     - Track state transitions with timestamps
     - Store approver comments and reasons
     - Enable compliance reporting and analytics

  4. **Helper Functions**
     - Calculate SLA status (on-time, at-risk, overdue)
     - Automatic SLA deadline calculation
     - Audit trail logging

  ## SLA Status Values
  - 'on_time' - Within SLA limits
  - 'at_risk' - Approaching deadline (80%+ of time used)
  - 'overdue' - Past deadline

  ## Audit Actions
  - 'submitted' - Request created by employee
  - 'manager_approved' - Manager approved
  - 'hr_approved' - HR approved
  - 'finance_approved' - Finance approved (final)
  - 'rejected' - Rejected at any level
  - 'withdrawn' - Employee withdrew request
*/

-- =============================================
-- 1. CREATE SLA CONFIGURATION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sla_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('advance', 'loan', 'leave', 'expense')),
  approval_level text NOT NULL CHECK (approval_level IN ('manager', 'hr', 'finance')),
  sla_hours integer NOT NULL CHECK (sla_hours > 0),
  warning_threshold_percent integer NOT NULL DEFAULT 80 CHECK (warning_threshold_percent > 0 AND warning_threshold_percent <= 100),
  use_business_hours boolean NOT NULL DEFAULT false,
  escalation_enabled boolean NOT NULL DEFAULT false,
  escalation_to_role text CHECK (escalation_to_role IN ('hr', 'admin', 'super_admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, request_type, approval_level)
);

COMMENT ON TABLE sla_configurations IS 'Defines SLA time limits for each approval level';
COMMENT ON COLUMN sla_configurations.sla_hours IS 'Number of hours allowed for this approval level';
COMMENT ON COLUMN sla_configurations.warning_threshold_percent IS 'Percentage of SLA time used before triggering at-risk warning';
COMMENT ON COLUMN sla_configurations.use_business_hours IS 'If true, only count business hours (9-5, Mon-Fri)';
COMMENT ON COLUMN sla_configurations.escalation_enabled IS 'If true, auto-escalate overdue requests';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sla_config_company_type_level
ON sla_configurations(company_id, request_type, approval_level)
WHERE is_active = true;

-- =============================================
-- 2. CREATE REQUEST SLA TRACKING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS request_sla_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('advance', 'loan', 'leave', 'expense')),
  request_id uuid NOT NULL,
  approval_level text NOT NULL CHECK (approval_level IN ('manager', 'hr', 'finance')),
  level_started_at timestamptz NOT NULL DEFAULT now(),
  level_completed_at timestamptz,
  sla_deadline timestamptz NOT NULL,
  sla_status text NOT NULL DEFAULT 'on_time' CHECK (sla_status IN ('on_time', 'at_risk', 'overdue')),
  hours_taken numeric(10, 2),
  is_escalated boolean NOT NULL DEFAULT false,
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_type, request_id, approval_level)
);

COMMENT ON TABLE request_sla_tracking IS 'Tracks SLA compliance for each request at each approval level';
COMMENT ON COLUMN request_sla_tracking.level_started_at IS 'When request entered this approval level';
COMMENT ON COLUMN request_sla_tracking.level_completed_at IS 'When this level was completed (approved/rejected)';
COMMENT ON COLUMN request_sla_tracking.sla_deadline IS 'Calculated deadline for this approval level';
COMMENT ON COLUMN request_sla_tracking.hours_taken IS 'Actual hours taken to complete this level';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sla_tracking_request
ON request_sla_tracking(request_type, request_id);

CREATE INDEX IF NOT EXISTS idx_sla_tracking_status
ON request_sla_tracking(company_id, sla_status, level_completed_at)
WHERE level_completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sla_tracking_overdue
ON request_sla_tracking(company_id, approval_level)
WHERE sla_status = 'overdue' AND level_completed_at IS NULL;

-- =============================================
-- 3. CREATE APPROVAL AUDIT TRAIL TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS approval_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('advance', 'loan', 'leave', 'expense')),
  request_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('submitted', 'manager_approved', 'hr_approved', 'finance_approved', 'rejected', 'withdrawn', 'escalated')),
  performed_by uuid NOT NULL REFERENCES employees(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  previous_status text,
  new_status text NOT NULL,
  approval_level text CHECK (approval_level IN ('manager', 'hr', 'finance')),
  comments text,
  rejection_reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE approval_audit_trail IS 'Complete audit trail of all approval workflow actions';
COMMENT ON COLUMN approval_audit_trail.action IS 'Type of action performed';
COMMENT ON COLUMN approval_audit_trail.performed_by IS 'Employee who performed the action';
COMMENT ON COLUMN approval_audit_trail.metadata IS 'Additional context (e.g., IP address, user agent)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_request
ON approval_audit_trail(request_type, request_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_company
ON approval_audit_trail(company_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_employee
ON approval_audit_trail(performed_by, performed_at DESC);

-- =============================================
-- 4. INSERT DEFAULT SLA CONFIGURATIONS
-- =============================================
DO $$
DECLARE
  v_company_record RECORD;
BEGIN
  FOR v_company_record IN SELECT id FROM companies LOOP
    -- Advance SLAs
    INSERT INTO sla_configurations (company_id, request_type, approval_level, sla_hours, warning_threshold_percent, use_business_hours)
    VALUES
      (v_company_record.id, 'advance', 'manager', 24, 80, false),
      (v_company_record.id, 'advance', 'hr', 48, 80, false),
      (v_company_record.id, 'advance', 'finance', 24, 80, false)
    ON CONFLICT (company_id, request_type, approval_level) DO NOTHING;

    -- Loan SLAs
    INSERT INTO sla_configurations (company_id, request_type, approval_level, sla_hours, warning_threshold_percent, use_business_hours)
    VALUES
      (v_company_record.id, 'loan', 'manager', 48, 80, false),
      (v_company_record.id, 'loan', 'hr', 72, 80, false),
      (v_company_record.id, 'loan', 'finance', 48, 80, false)
    ON CONFLICT (company_id, request_type, approval_level) DO NOTHING;

    -- Leave SLAs
    INSERT INTO sla_configurations (company_id, request_type, approval_level, sla_hours, warning_threshold_percent, use_business_hours)
    VALUES
      (v_company_record.id, 'leave', 'manager', 24, 80, false),
      (v_company_record.id, 'leave', 'hr', 24, 80, false),
      (v_company_record.id, 'leave', 'finance', 24, 80, false)
    ON CONFLICT (company_id, request_type, approval_level) DO NOTHING;
  END LOOP;
END $$;

-- =============================================
-- 5. CREATE FUNCTION: Calculate SLA Deadline
-- =============================================
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
  p_company_id uuid,
  p_request_type text,
  p_approval_level text,
  p_start_time timestamptz DEFAULT now()
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sla_hours integer;
  v_deadline timestamptz;
BEGIN
  SELECT sla_hours INTO v_sla_hours
  FROM sla_configurations
  WHERE company_id = p_company_id
    AND request_type = p_request_type
    AND approval_level = p_approval_level
    AND is_active = true;

  IF v_sla_hours IS NULL THEN
    v_sla_hours := 24;
  END IF;

  v_deadline := p_start_time + (v_sla_hours || ' hours')::interval;

  RETURN v_deadline;
END;
$$;

COMMENT ON FUNCTION calculate_sla_deadline IS 'Calculates SLA deadline based on configuration';

-- =============================================
-- 6. CREATE FUNCTION: Update SLA Status
-- =============================================
CREATE OR REPLACE FUNCTION update_sla_status()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_record RECORD;
  v_new_status text;
  v_warning_deadline timestamptz;
  v_config RECORD;
BEGIN
  FOR v_record IN
    SELECT * FROM request_sla_tracking
    WHERE level_completed_at IS NULL
  LOOP
    SELECT warning_threshold_percent INTO v_config
    FROM sla_configurations
    WHERE company_id = v_record.company_id
      AND request_type = v_record.request_type
      AND approval_level = v_record.approval_level
      AND is_active = true;

    IF v_config IS NOT NULL THEN
      v_warning_deadline := v_record.level_started_at +
        ((EXTRACT(EPOCH FROM (v_record.sla_deadline - v_record.level_started_at)) *
          v_config.warning_threshold_percent / 100) || ' seconds')::interval;
    ELSE
      v_warning_deadline := v_record.sla_deadline;
    END IF;

    IF now() > v_record.sla_deadline THEN
      v_new_status := 'overdue';
    ELSIF now() > v_warning_deadline THEN
      v_new_status := 'at_risk';
    ELSE
      v_new_status := 'on_time';
    END IF;

    IF v_new_status != v_record.sla_status THEN
      UPDATE request_sla_tracking
      SET sla_status = v_new_status,
          updated_at = now()
      WHERE id = v_record.id;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION update_sla_status IS 'Updates SLA status for all active requests (should be run periodically)';

-- =============================================
-- 7. CREATE FUNCTION: Log Approval Action
-- =============================================
CREATE OR REPLACE FUNCTION log_approval_action(
  p_company_id uuid,
  p_request_type text,
  p_request_id uuid,
  p_action text,
  p_performed_by uuid,
  p_previous_status text,
  p_new_status text,
  p_approval_level text DEFAULT NULL,
  p_comments text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO approval_audit_trail (
    company_id,
    request_type,
    request_id,
    action,
    performed_by,
    previous_status,
    new_status,
    approval_level,
    comments,
    rejection_reason
  ) VALUES (
    p_company_id,
    p_request_type,
    p_request_id,
    p_action,
    p_performed_by,
    p_previous_status,
    p_new_status,
    p_approval_level,
    p_comments,
    p_rejection_reason
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION log_approval_action IS 'Logs an action to the approval audit trail';

-- =============================================
-- 8. UPDATE APPROVE_REQUEST FUNCTION WITH SLA AND AUDIT
-- =============================================
CREATE OR REPLACE FUNCTION approve_request(
  p_request_type text,
  p_request_id uuid,
  p_approver_employee_id uuid,
  p_approval_level text,
  p_comments text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_new_status text;
  v_company_id uuid;
  v_next_level text;
  v_sla_deadline timestamptz;
  v_result jsonb;
BEGIN
  IF p_approval_level NOT IN ('manager', 'hr', 'finance') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid approval level');
  END IF;

  IF p_request_type = 'advance' THEN
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM advances WHERE id = p_request_id;

    IF v_current_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    IF p_approval_level = 'manager' AND v_current_status = 'pending' THEN
      v_new_status := 'manager_approved';
      v_next_level := 'hr';
      UPDATE advances
      SET status = v_new_status,
          manager_approved_by = p_approver_employee_id,
          manager_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'hr' AND v_current_status = 'manager_approved' THEN
      v_new_status := 'hr_approved';
      v_next_level := 'finance';
      UPDATE advances
      SET status = v_new_status,
          hr_approved_by = p_approver_employee_id,
          hr_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'finance' AND v_current_status = 'hr_approved' THEN
      v_new_status := 'approved';
      v_next_level := NULL;
      UPDATE advances
      SET status = v_new_status,
          finance_approved_by = p_approver_employee_id,
          finance_approved_at = now(),
          approved_date = CURRENT_DATE,
          approved_by = p_approver_employee_id,
          updated_at = now()
      WHERE id = p_request_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid approval sequence');
    END IF;

  ELSIF p_request_type = 'loan' THEN
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM loans WHERE id = p_request_id;

    IF v_current_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    IF p_approval_level = 'manager' AND v_current_status = 'pending' THEN
      v_new_status := 'manager_approved';
      v_next_level := 'hr';
      UPDATE loans
      SET status = v_new_status,
          manager_approved_by = p_approver_employee_id,
          manager_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'hr' AND v_current_status = 'manager_approved' THEN
      v_new_status := 'hr_approved';
      v_next_level := 'finance';
      UPDATE loans
      SET status = v_new_status,
          hr_approved_by = p_approver_employee_id,
          hr_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'finance' AND v_current_status = 'hr_approved' THEN
      v_new_status := 'active';
      v_next_level := NULL;
      UPDATE loans
      SET status = v_new_status,
          finance_approved_by = p_approver_employee_id,
          finance_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid approval sequence');
    END IF;

  ELSIF p_request_type = 'leave' THEN
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM leave_requests WHERE id = p_request_id;

    IF v_current_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    IF p_approval_level = 'manager' AND v_current_status = 'pending' THEN
      v_new_status := 'manager_approved';
      v_next_level := 'hr';
      UPDATE leave_requests
      SET status = v_new_status,
          manager_approved_by = p_approver_employee_id,
          manager_approved_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'hr' AND v_current_status = 'manager_approved' THEN
      v_new_status := 'hr_approved';
      v_next_level := 'finance';
      UPDATE leave_requests
      SET status = v_new_status,
          hr_approved_by = p_approver_employee_id,
          hr_approved_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'finance' AND v_current_status = 'hr_approved' THEN
      v_new_status := 'approved';
      v_next_level := NULL;
      UPDATE leave_requests
      SET status = v_new_status,
          finance_approved_by = p_approver_employee_id,
          finance_approved_at = now(),
          approved_at = now(),
          approver_id = p_approver_employee_id
      WHERE id = p_request_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid approval sequence');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid request type');
  END IF;

  UPDATE request_sla_tracking
  SET level_completed_at = now(),
      hours_taken = EXTRACT(EPOCH FROM (now() - level_started_at)) / 3600.0,
      updated_at = now()
  WHERE request_type = p_request_type
    AND request_id = p_request_id
    AND approval_level = p_approval_level
    AND level_completed_at IS NULL;

  PERFORM log_approval_action(
    v_company_id,
    p_request_type,
    p_request_id,
    p_approval_level || '_approved',
    p_approver_employee_id,
    v_current_status,
    v_new_status,
    p_approval_level,
    p_comments,
    NULL
  );

  IF v_next_level IS NOT NULL THEN
    v_sla_deadline := calculate_sla_deadline(v_company_id, p_request_type, v_next_level);

    INSERT INTO request_sla_tracking (
      company_id,
      request_type,
      request_id,
      approval_level,
      sla_deadline
    ) VALUES (
      v_company_id,
      p_request_type,
      p_request_id,
      v_next_level,
      v_sla_deadline
    )
    ON CONFLICT (request_type, request_id, approval_level) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_status', v_new_status,
    'message', 'Request approved successfully'
  );
END;
$$;

-- =============================================
-- 9. UPDATE REJECT_REQUEST FUNCTION WITH AUDIT
-- =============================================
CREATE OR REPLACE FUNCTION reject_request(
  p_request_type text,
  p_request_id uuid,
  p_rejector_employee_id uuid,
  p_rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_company_id uuid;
  v_approval_level text;
BEGIN
  IF p_request_type = 'advance' THEN
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM advances WHERE id = p_request_id;

    IF v_current_status = 'pending' THEN
      v_approval_level := 'manager';
    ELSIF v_current_status = 'manager_approved' THEN
      v_approval_level := 'hr';
    ELSIF v_current_status = 'hr_approved' THEN
      v_approval_level := 'finance';
    END IF;

    UPDATE advances
    SET status = 'rejected',
        rejection_reason = p_rejection_reason,
        rejected_by = p_rejector_employee_id,
        rejected_at = now(),
        updated_at = now()
    WHERE id = p_request_id
      AND status IN ('pending', 'manager_approved', 'hr_approved');

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

  ELSIF p_request_type = 'loan' THEN
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM loans WHERE id = p_request_id;

    IF v_current_status = 'pending' THEN
      v_approval_level := 'manager';
    ELSIF v_current_status = 'manager_approved' THEN
      v_approval_level := 'hr';
    ELSIF v_current_status = 'hr_approved' THEN
      v_approval_level := 'finance';
    END IF;

    UPDATE loans
    SET status = 'rejected',
        rejection_reason = p_rejection_reason,
        rejected_by = p_rejector_employee_id,
        rejected_at = now(),
        updated_at = now()
    WHERE id = p_request_id
      AND status IN ('pending', 'manager_approved', 'hr_approved');

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

  ELSIF p_request_type = 'leave' THEN
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM leave_requests WHERE id = p_request_id;

    IF v_current_status = 'pending' THEN
      v_approval_level := 'manager';
    ELSIF v_current_status = 'manager_approved' THEN
      v_approval_level := 'hr';
    ELSIF v_current_status = 'hr_approved' THEN
      v_approval_level := 'finance';
    END IF;

    UPDATE leave_requests
    SET status = 'rejected',
        rejection_reason = p_rejection_reason,
        rejected_by = p_rejector_employee_id,
        rejected_at = now()
    WHERE id = p_request_id
      AND status IN ('pending', 'manager_approved', 'hr_approved');

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid request type');
  END IF;

  UPDATE request_sla_tracking
  SET level_completed_at = now(),
      hours_taken = EXTRACT(EPOCH FROM (now() - level_started_at)) / 3600.0,
      updated_at = now()
  WHERE request_type = p_request_type
    AND request_id = p_request_id
    AND level_completed_at IS NULL;

  PERFORM log_approval_action(
    v_company_id,
    p_request_type,
    p_request_id,
    'rejected',
    p_rejector_employee_id,
    v_current_status,
    'rejected',
    v_approval_level,
    NULL,
    p_rejection_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Request rejected successfully'
  );
END;
$$;

-- =============================================
-- 10. CREATE TRIGGER: Initialize SLA Tracking
-- =============================================
CREATE OR REPLACE FUNCTION initialize_request_sla()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sla_deadline timestamptz;
  v_request_type text;
BEGIN
  v_request_type := CASE TG_TABLE_NAME
    WHEN 'advances' THEN 'advance'
    WHEN 'loans' THEN 'loan'
    WHEN 'leave_requests' THEN 'leave'
    ELSE NULL
  END;

  IF v_request_type IS NULL THEN
    RETURN NEW;
  END IF;

  v_sla_deadline := calculate_sla_deadline(NEW.company_id, v_request_type, 'manager');

  INSERT INTO request_sla_tracking (
    company_id,
    request_type,
    request_id,
    approval_level,
    sla_deadline
  ) VALUES (
    NEW.company_id,
    v_request_type,
    NEW.id,
    'manager',
    v_sla_deadline
  );

  PERFORM log_approval_action(
    NEW.company_id,
    v_request_type,
    NEW.id,
    'submitted',
    NEW.employee_id,
    NULL,
    'pending',
    NULL,
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_initialize_advance_sla ON advances;
CREATE TRIGGER trigger_initialize_advance_sla
  AFTER INSERT ON advances
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION initialize_request_sla();

DROP TRIGGER IF EXISTS trigger_initialize_loan_sla ON loans;
CREATE TRIGGER trigger_initialize_loan_sla
  AFTER INSERT ON loans
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION initialize_request_sla();

DROP TRIGGER IF EXISTS trigger_initialize_leave_sla ON leave_requests;
CREATE TRIGGER trigger_initialize_leave_sla
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION initialize_request_sla();

-- =============================================
-- 11. ENABLE RLS
-- =============================================
ALTER TABLE sla_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_sla_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_trail ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 12. CREATE RLS POLICIES
-- =============================================

CREATE POLICY "sla_config_select_policy" ON sla_configurations
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sla_config_insert_policy" ON sla_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "sla_config_update_policy" ON sla_configurations
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "sla_tracking_select_policy" ON request_sla_tracking
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sla_tracking_insert_policy" ON request_sla_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "sla_tracking_update_policy" ON request_sla_tracking
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "audit_trail_select_policy" ON approval_audit_trail
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "audit_trail_insert_policy" ON approval_audit_trail
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
