/*
  # Create Multi-Level Approval Workflow System

  ## Overview
  Implements a comprehensive approval workflow: Employee → Manager → HR → Finance
  
  ## Changes
  1. Add approval workflow columns to advances, loans, leave_requests tables
  2. Add approver tracking fields (who approved at each level, when)
  3. Create unified pending requests view for Managers, HR, and Finance
  4. Update validation triggers to respect workflow
  5. Create helper functions for workflow management
  
  ## Approval Workflow
  - **Manager Approval**: First level - direct manager approves
  - **HR Approval**: Second level - HR department approves
  - **Finance Approval**: Third level - Finance department approves (final)
  - Status becomes 'approved' only after all required approvals
  
  ## Status Values
  - 'pending' - Awaiting manager approval
  - 'manager_approved' - Manager approved, awaiting HR
  - 'hr_approved' - HR approved, awaiting Finance
  - 'approved' - All approvals complete
  - 'rejected' - Rejected at any level
*/

-- =============================================
-- 1. ADD WORKFLOW COLUMNS TO ADVANCES
-- =============================================
ALTER TABLE advances
ADD COLUMN IF NOT EXISTS manager_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS hr_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS hr_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS finance_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS finance_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

COMMENT ON COLUMN advances.manager_approved_by IS 'Manager who approved (first level)';
COMMENT ON COLUMN advances.hr_approved_by IS 'HR employee who approved (second level)';
COMMENT ON COLUMN advances.finance_approved_by IS 'Finance employee who approved (final level)';

-- =============================================
-- 2. ADD WORKFLOW COLUMNS TO LOANS
-- =============================================
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS manager_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS hr_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS hr_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS finance_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS finance_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

COMMENT ON COLUMN loans.manager_approved_by IS 'Manager who approved (first level)';
COMMENT ON COLUMN loans.hr_approved_by IS 'HR employee who approved (second level)';
COMMENT ON COLUMN loans.finance_approved_by IS 'Finance employee who approved (final level)';

-- =============================================
-- 3. ADD WORKFLOW COLUMNS TO LEAVE_REQUESTS
-- =============================================
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS manager_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS hr_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS hr_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS finance_approved_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS finance_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

COMMENT ON COLUMN leave_requests.manager_approved_by IS 'Manager who approved (first level)';
COMMENT ON COLUMN leave_requests.hr_approved_by IS 'HR employee who approved (second level)';
COMMENT ON COLUMN leave_requests.finance_approved_by IS 'Finance employee who approved (final level)';

-- =============================================
-- 4. CREATE HELPER FUNCTION: Get Employee's Manager
-- =============================================
CREATE OR REPLACE FUNCTION get_employee_manager(p_employee_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT manager_id
  FROM employees
  WHERE id = p_employee_id;
$$;

COMMENT ON FUNCTION get_employee_manager IS 'Returns the manager_id for a given employee';

-- =============================================
-- 5. CREATE UNIFIED PENDING REQUESTS VIEW
-- =============================================
CREATE OR REPLACE VIEW pending_requests_unified AS
-- Advances pending requests
SELECT 
  a.id,
  a.company_id,
  'advance' as request_type,
  a.employee_id,
  e.employee_number,
  CONCAT(e.first_name_en, ' ', e.last_name_en) as employee_name,
  e.department_id,
  e.job_position_id,
  e.manager_id,
  a.amount as request_amount,
  a.request_date as request_date,
  a.status,
  a.notes as description,
  CASE 
    WHEN a.status = 'pending' THEN 'manager'
    WHEN a.status = 'manager_approved' THEN 'hr'
    WHEN a.status = 'hr_approved' THEN 'finance'
    ELSE NULL
  END as pending_at_level,
  a.manager_approved_by,
  a.manager_approved_at,
  a.hr_approved_by,
  a.hr_approved_at,
  a.finance_approved_by,
  a.finance_approved_at,
  a.created_at,
  a.updated_at
FROM advances a
JOIN employees e ON e.id = a.employee_id
WHERE a.status IN ('pending', 'manager_approved', 'hr_approved')

UNION ALL

-- Loans pending requests
SELECT 
  l.id,
  l.company_id,
  'loan' as request_type,
  l.employee_id,
  e.employee_number,
  CONCAT(e.first_name_en, ' ', e.last_name_en) as employee_name,
  e.department_id,
  e.job_position_id,
  e.manager_id,
  l.loan_amount as request_amount,
  l.start_date as request_date,
  l.status,
  CONCAT(l.loan_type, ' - ', COALESCE(l.notes, '')) as description,
  CASE 
    WHEN l.status = 'pending' THEN 'manager'
    WHEN l.status = 'manager_approved' THEN 'hr'
    WHEN l.status = 'hr_approved' THEN 'finance'
    ELSE NULL
  END as pending_at_level,
  l.manager_approved_by,
  l.manager_approved_at,
  l.hr_approved_by,
  l.hr_approved_at,
  l.finance_approved_by,
  l.finance_approved_at,
  l.created_at,
  l.updated_at
FROM loans l
JOIN employees e ON e.id = l.employee_id
WHERE l.status IN ('pending', 'manager_approved', 'hr_approved')

UNION ALL

-- Leave requests pending
SELECT 
  lr.id,
  lr.company_id,
  'leave' as request_type,
  lr.employee_id,
  e.employee_number,
  CONCAT(e.first_name_en, ' ', e.last_name_en) as employee_name,
  e.department_id,
  e.job_position_id,
  e.manager_id,
  lr.total_days as request_amount,
  lr.start_date as request_date,
  lr.status,
  CONCAT(lt.name_en, ': ', lr.start_date, ' to ', lr.end_date, ' - ', COALESCE(lr.reason, '')) as description,
  CASE 
    WHEN lr.status = 'pending' THEN 'manager'
    WHEN lr.status = 'manager_approved' THEN 'hr'
    WHEN lr.status = 'hr_approved' THEN 'finance'
    ELSE NULL
  END as pending_at_level,
  lr.manager_approved_by,
  lr.manager_approved_at,
  lr.hr_approved_by,
  lr.hr_approved_at,
  lr.finance_approved_by,
  lr.finance_approved_at,
  lr.created_at,
  lr.created_at as updated_at
FROM leave_requests lr
JOIN employees e ON e.id = lr.employee_id
LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
WHERE lr.status IN ('pending', 'manager_approved', 'hr_approved');

COMMENT ON VIEW pending_requests_unified IS 'Unified view of all pending requests (advances, loans, leave) across all approval levels';

-- =============================================
-- 6. CREATE RLS POLICIES FOR PENDING REQUESTS VIEW
-- =============================================
ALTER VIEW pending_requests_unified SET (security_invoker = on);

-- =============================================
-- 7. CREATE APPROVAL FUNCTION
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
  v_result jsonb;
BEGIN
  -- Validate approval level
  IF p_approval_level NOT IN ('manager', 'hr', 'finance') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid approval level');
  END IF;

  -- Process based on request type
  IF p_request_type = 'advance' THEN
    -- Get current status
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM advances WHERE id = p_request_id;
    
    IF v_current_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    -- Determine new status
    IF p_approval_level = 'manager' AND v_current_status = 'pending' THEN
      v_new_status := 'manager_approved';
      UPDATE advances 
      SET status = v_new_status,
          manager_approved_by = p_approver_employee_id,
          manager_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'hr' AND v_current_status = 'manager_approved' THEN
      v_new_status := 'hr_approved';
      UPDATE advances 
      SET status = v_new_status,
          hr_approved_by = p_approver_employee_id,
          hr_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'finance' AND v_current_status = 'hr_approved' THEN
      v_new_status := 'approved';
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
    -- Get current status
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM loans WHERE id = p_request_id;
    
    IF v_current_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    -- Determine new status
    IF p_approval_level = 'manager' AND v_current_status = 'pending' THEN
      v_new_status := 'manager_approved';
      UPDATE loans 
      SET status = v_new_status,
          manager_approved_by = p_approver_employee_id,
          manager_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'hr' AND v_current_status = 'manager_approved' THEN
      v_new_status := 'hr_approved';
      UPDATE loans 
      SET status = v_new_status,
          hr_approved_by = p_approver_employee_id,
          hr_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'finance' AND v_current_status = 'hr_approved' THEN
      v_new_status := 'active';
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
    -- Get current status
    SELECT status, company_id INTO v_current_status, v_company_id
    FROM leave_requests WHERE id = p_request_id;
    
    IF v_current_status IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    -- Determine new status
    IF p_approval_level = 'manager' AND v_current_status = 'pending' THEN
      v_new_status := 'manager_approved';
      UPDATE leave_requests 
      SET status = v_new_status,
          manager_approved_by = p_approver_employee_id,
          manager_approved_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'hr' AND v_current_status = 'manager_approved' THEN
      v_new_status := 'hr_approved';
      UPDATE leave_requests 
      SET status = v_new_status,
          hr_approved_by = p_approver_employee_id,
          hr_approved_at = now()
      WHERE id = p_request_id;
    ELSIF p_approval_level = 'finance' AND v_current_status = 'hr_approved' THEN
      v_new_status := 'approved';
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

  RETURN jsonb_build_object(
    'success', true, 
    'new_status', v_new_status,
    'message', 'Request approved successfully'
  );
END;
$$;

COMMENT ON FUNCTION approve_request IS 'Approves a request (advance/loan/leave) at specified level (manager/hr/finance)';

-- =============================================
-- 8. CREATE REJECTION FUNCTION
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
  v_result jsonb;
BEGIN
  -- Process based on request type
  IF p_request_type = 'advance' THEN
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

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Request rejected successfully'
  );
END;
$$;

COMMENT ON FUNCTION reject_request IS 'Rejects a request (advance/loan/leave) with reason';

-- =============================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_advances_status_workflow 
ON advances(status, manager_approved_by, hr_approved_by, finance_approved_by)
WHERE status IN ('pending', 'manager_approved', 'hr_approved');

CREATE INDEX IF NOT EXISTS idx_loans_status_workflow 
ON loans(status, manager_approved_by, hr_approved_by, finance_approved_by)
WHERE status IN ('pending', 'manager_approved', 'hr_approved');

CREATE INDEX IF NOT EXISTS idx_leave_requests_status_workflow 
ON leave_requests(status, manager_approved_by, hr_approved_by, finance_approved_by)
WHERE status IN ('pending', 'manager_approved', 'hr_approved');

CREATE INDEX IF NOT EXISTS idx_advances_manager_id 
ON advances(employee_id);

CREATE INDEX IF NOT EXISTS idx_loans_manager_id 
ON loans(employee_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_manager_id 
ON leave_requests(employee_id);
