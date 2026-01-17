/*
  # Add SLA Tracking to Approval System

  1. Add SLA columns to approval_requests
    - sla_due_date
    - sla_warning_date
    - sla_status
    - time_in_status_minutes
    - sla_breach_notified

  2. Functions
    - update_approval_sla_status() - Update SLA for all pending approvals
    - get_overdue_approvals() - Get list of overdue approvals

  3. Scheduled Job Support
    - Functions can be called by edge functions or cron jobs
*/

-- Add SLA columns to approval_requests if they don't exist
DO $$ BEGIN
  ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sla_due_date timestamptz;
  ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sla_warning_date timestamptz;
  ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sla_status text DEFAULT 'on_track';
  ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS time_in_status_minutes integer DEFAULT 0;
  ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sla_breach_notified boolean DEFAULT false;
  ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sla_warning_notified boolean DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add SLA columns to sla_configurations if missing
DO $$ BEGIN
  ALTER TABLE sla_configurations ADD COLUMN IF NOT EXISTS approval_level text;
  ALTER TABLE sla_configurations ADD COLUMN IF NOT EXISTS response_time_hours integer DEFAULT 24;
  ALTER TABLE sla_configurations ADD COLUMN IF NOT EXISTS resolution_time_hours integer DEFAULT 72;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index for SLA queries
CREATE INDEX IF NOT EXISTS idx_approval_requests_sla_status ON approval_requests(status, sla_due_date) 
  WHERE status IN ('pending', 'in_progress');

-- Function to calculate SLA due dates for new approval requests
CREATE OR REPLACE FUNCTION calculate_approval_sla()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sla_hours integer := 72;
BEGIN
  SELECT sla_hours INTO v_sla_hours
  FROM sla_configurations
  WHERE company_id = NEW.company_id
  AND request_type = NEW.request_type
  AND approval_level = 'level_1'
  AND is_active = true
  LIMIT 1;
  
  IF v_sla_hours IS NULL THEN
    v_sla_hours := 72;
  END IF;
  
  NEW.sla_due_date := NEW.submitted_date + (v_sla_hours || ' hours')::interval;
  NEW.sla_warning_date := NEW.submitted_date + ((v_sla_hours * 0.75) || ' hours')::interval;
  NEW.sla_status := 'on_track';
  
  RETURN NEW;
END;
$$;

-- Create trigger for new approval requests
DROP TRIGGER IF EXISTS set_approval_sla ON approval_requests;
CREATE TRIGGER set_approval_sla
  BEFORE INSERT ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_approval_sla();

-- Function to update SLA status for all pending approvals
CREATE OR REPLACE FUNCTION update_approval_sla_status()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer := 0;
BEGIN
  UPDATE approval_requests
  SET 
    time_in_status_minutes = EXTRACT(EPOCH FROM (now() - submitted_date)) / 60,
    sla_status = CASE
      WHEN now() > sla_due_date THEN 'breached'
      WHEN now() > sla_warning_date THEN 'warning'
      ELSE 'on_track'
    END,
    updated_at = now()
  WHERE status IN ('pending', 'in_progress')
  AND sla_due_date IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;

-- Function to get overdue approvals
CREATE OR REPLACE FUNCTION get_overdue_approvals(p_company_id uuid DEFAULT NULL)
RETURNS TABLE (
  request_id uuid,
  company_id uuid,
  request_type text,
  requester_id uuid,
  current_approver_id uuid,
  submitted_date timestamptz,
  sla_due_date timestamptz,
  sla_status text,
  minutes_overdue integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id,
    ar.company_id,
    ar.request_type,
    ar.requester_id,
    ar.current_approver_id,
    ar.submitted_date,
    ar.sla_due_date,
    ar.sla_status,
    GREATEST(0, EXTRACT(EPOCH FROM (now() - ar.sla_due_date)) / 60)::integer
  FROM approval_requests ar
  WHERE ar.status IN ('pending', 'in_progress')
  AND ar.sla_due_date IS NOT NULL
  AND now() > ar.sla_warning_date
  AND (p_company_id IS NULL OR ar.company_id = p_company_id)
  ORDER BY ar.sla_due_date ASC;
END;
$$;

-- Function to get SLA summary statistics
CREATE OR REPLACE FUNCTION get_sla_summary(
  p_company_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  request_type text,
  total_requests bigint,
  on_track bigint,
  warning bigint,
  breached bigint,
  completed_on_time bigint,
  completed_late bigint,
  avg_completion_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.request_type,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE ar.sla_status = 'on_track' AND ar.status IN ('pending', 'in_progress')) as on_track,
    COUNT(*) FILTER (WHERE ar.sla_status = 'warning' AND ar.status IN ('pending', 'in_progress')) as warning,
    COUNT(*) FILTER (WHERE ar.sla_status = 'breached' AND ar.status IN ('pending', 'in_progress')) as breached,
    COUNT(*) FILTER (WHERE ar.status IN ('approved', 'rejected') AND ar.completed_date <= ar.sla_due_date) as completed_on_time,
    COUNT(*) FILTER (WHERE ar.status IN ('approved', 'rejected') AND ar.completed_date > ar.sla_due_date) as completed_late,
    AVG(EXTRACT(EPOCH FROM (ar.completed_date - ar.submitted_date)) / 3600) 
      FILTER (WHERE ar.status IN ('approved', 'rejected')) as avg_completion_hours
  FROM approval_requests ar
  WHERE ar.company_id = p_company_id
  AND ar.created_at >= now() - (p_days || ' days')::interval
  GROUP BY ar.request_type;
END;
$$;

-- Function to send SLA notifications (returns pending notifications)
CREATE OR REPLACE FUNCTION get_pending_sla_notifications()
RETURNS TABLE (
  request_id uuid,
  company_id uuid,
  request_type text,
  requester_id uuid,
  current_approver_id uuid,
  sla_status text,
  notification_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id,
    ar.company_id,
    ar.request_type,
    ar.requester_id,
    ar.current_approver_id,
    ar.sla_status,
    CASE 
      WHEN ar.sla_status = 'warning' AND NOT ar.sla_warning_notified THEN 'warning'
      WHEN ar.sla_status = 'breached' AND NOT ar.sla_breach_notified THEN 'breach'
    END as notification_type
  FROM approval_requests ar
  WHERE ar.status IN ('pending', 'in_progress')
  AND (
    (ar.sla_status = 'warning' AND NOT ar.sla_warning_notified)
    OR (ar.sla_status = 'breached' AND NOT ar.sla_breach_notified)
  );
END;
$$;

-- Function to mark notification as sent
CREATE OR REPLACE FUNCTION mark_sla_notification_sent(
  p_request_id uuid,
  p_notification_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_notification_type = 'warning' THEN
    UPDATE approval_requests
    SET sla_warning_notified = true
    WHERE id = p_request_id;
  ELSIF p_notification_type = 'breach' THEN
    UPDATE approval_requests
    SET sla_breach_notified = true
    WHERE id = p_request_id;
  END IF;
END;
$$;

-- Backfill SLA dates for existing pending requests
UPDATE approval_requests
SET 
  sla_due_date = submitted_date + interval '72 hours',
  sla_warning_date = submitted_date + interval '54 hours',
  sla_status = CASE
    WHEN now() > submitted_date + interval '72 hours' THEN 'breached'
    WHEN now() > submitted_date + interval '54 hours' THEN 'warning'
    ELSE 'on_track'
  END,
  time_in_status_minutes = EXTRACT(EPOCH FROM (now() - submitted_date)) / 60
WHERE status IN ('pending', 'in_progress')
AND sla_due_date IS NULL;
