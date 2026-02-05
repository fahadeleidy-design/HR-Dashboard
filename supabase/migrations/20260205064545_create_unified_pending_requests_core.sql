/*
  # Unified Pending Requests View - Core Services

  Creates unified view for the main HR services with proper workflow columns:
  - Leave requests
  - Loans
  - Advances  
  - Expense claims
  - Penalties
  - Business travel
  - Attendance requests
*/

DROP VIEW IF EXISTS all_pending_requests_unified;

CREATE OR REPLACE VIEW all_pending_requests_unified AS

-- Leave Requests
SELECT 
  lr.id, lr.company_id, 'leave' AS request_type, lr.employee_id,
  COALESCE(e.first_name_en, '') || ' ' || COALESCE(e.last_name_en, '') AS employee_name,
  e.employee_number, d.name_en AS department, lt.name_en AS request_subtype,
  lr.start_date::text AS request_date, lr.total_days AS amount_or_days, 'days' AS unit,
  lr.reason AS description, lr.status,
  CASE WHEN lr.status = 'pending' THEN 'manager' WHEN lr.status = 'manager_approved' THEN 'hr' ELSE 'completed' END AS pending_at_level,
  lr.manager_approved_by, lr.manager_approved_at, lr.hr_approved_by, lr.hr_approved_at,
  lr.finance_approved_by, lr.finance_approved_at, lr.rejected_by, lr.rejected_at,
  lr.rejection_reason, NULL::timestamptz AS sla_deadline, lr.created_at, e.manager_id
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.status IN ('pending', 'manager_approved')

UNION ALL

-- Loans
SELECT 
  l.id, l.company_id, 'loan' AS request_type, l.employee_id,
  COALESCE(e.first_name_en, '') || ' ' || COALESCE(e.last_name_en, '') AS employee_name,
  e.employee_number, d.name_en AS department, l.loan_type AS request_subtype,
  l.created_at::text AS request_date, l.loan_amount AS amount_or_days, 'SAR' AS unit,
  l.notes AS description, l.status,
  CASE WHEN l.status = 'pending' THEN 'manager' WHEN l.status = 'manager_approved' THEN 'hr' WHEN l.status = 'hr_approved' THEN 'finance' ELSE 'completed' END AS pending_at_level,
  l.manager_approved_by, l.manager_approved_at, l.hr_approved_by, l.hr_approved_at,
  l.finance_approved_by, l.finance_approved_at, l.rejected_by, l.rejected_at,
  l.rejection_reason, NULL::timestamptz AS sla_deadline, l.created_at, e.manager_id
FROM loans l
JOIN employees e ON l.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE l.status IN ('pending', 'manager_approved', 'hr_approved')

UNION ALL

-- Advances
SELECT 
  a.id, a.company_id, 'advance' AS request_type, a.employee_id,
  COALESCE(e.first_name_en, '') || ' ' || COALESCE(e.last_name_en, '') AS employee_name,
  e.employee_number, d.name_en AS department, 'Advance' AS request_subtype,
  a.request_date::text, a.amount AS amount_or_days, 'SAR' AS unit,
  a.notes AS description, a.status,
  CASE WHEN a.status = 'pending' THEN 'manager' WHEN a.status = 'manager_approved' THEN 'hr' WHEN a.status = 'hr_approved' THEN 'finance' ELSE 'completed' END AS pending_at_level,
  a.manager_approved_by, a.manager_approved_at, a.hr_approved_by, a.hr_approved_at,
  a.finance_approved_by, a.finance_approved_at, a.rejected_by, a.rejected_at,
  a.rejection_reason, NULL::timestamptz AS sla_deadline, a.created_at, e.manager_id
FROM advances a
JOIN employees e ON a.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE a.status IN ('pending', 'manager_approved', 'hr_approved')

UNION ALL

-- Expense Claims
SELECT 
  ec.id, ec.company_id, 'expense' AS request_type, ec.employee_id,
  COALESCE(e.first_name_en, '') || ' ' || COALESCE(e.last_name_en, '') AS employee_name,
  e.employee_number, d.name_en AS department, ec.expense_category AS request_subtype,
  ec.expense_date::text, ec.amount AS amount_or_days, ec.currency AS unit,
  ec.description, ec.approval_status AS status,
  CASE WHEN ec.manager_approved_by IS NULL THEN 'manager' WHEN ec.hr_approved_by IS NULL THEN 'hr' WHEN ec.finance_approved_by IS NULL THEN 'finance' ELSE 'completed' END AS pending_at_level,
  ec.manager_approved_by, ec.manager_approved_at, ec.hr_approved_by, ec.hr_approved_at,
  ec.finance_approved_by, ec.finance_approved_at, ec.rejected_by, ec.rejected_at,
  ec.workflow_rejection_reason AS rejection_reason, ec.sla_deadline, ec.created_at, e.manager_id
FROM expense_claims ec
JOIN employees e ON ec.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE ec.approval_status = 'pending'

UNION ALL

-- Penalties
SELECT 
  ep.id, ep.company_id, 'penalty' AS request_type, ep.employee_id,
  COALESCE(e.first_name_en, '') || ' ' || COALESCE(e.last_name_en, '') AS employee_name,
  e.employee_number, d.name_en AS department, COALESCE(pt.name_en, 'Penalty') AS request_subtype,
  ep.incident_date::text, ep.amount AS amount_or_days, 'SAR' AS unit,
  ep.reason AS description, ep.status, 'finance' AS pending_at_level,
  ep.manager_approved_by, ep.manager_approved_at, ep.hr_approved_by, ep.hr_approved_at,
  ep.finance_approved_by, ep.finance_approved_at, ep.rejected_by, ep.rejected_at,
  ep.finance_rejection_reason AS rejection_reason, ep.sla_deadline, ep.created_at, e.manager_id
FROM employee_penalties ep
JOIN employees e ON ep.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN penalty_types pt ON ep.penalty_type_id = pt.id
WHERE ep.status = 'pending_finance'

UNION ALL

-- Business Travel
SELECT 
  bt.id, bt.company_id, 'travel' AS request_type, bt.employee_id,
  COALESCE(e.first_name_en, '') || ' ' || COALESCE(e.last_name_en, '') AS employee_name,
  e.employee_number, d.name_en AS department, bt.travel_type AS request_subtype,
  bt.departure_date::text, bt.estimated_cost AS amount_or_days, 'SAR' AS unit,
  bt.trip_purpose AS description, bt.approval_status AS status,
  CASE WHEN bt.manager_approved_by IS NULL THEN 'manager' WHEN bt.hr_approved_by IS NULL THEN 'hr' WHEN bt.finance_approved_by IS NULL THEN 'finance' ELSE 'completed' END AS pending_at_level,
  bt.manager_approved_by, bt.manager_approved_at, bt.hr_approved_by, bt.hr_approved_at,
  bt.finance_approved_by, bt.finance_approved_at, bt.rejected_by, bt.rejected_at,
  bt.rejection_reason, bt.sla_deadline, bt.created_at, e.manager_id
FROM business_travel bt
JOIN employees e ON bt.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE bt.approval_status IN ('pending', 'submitted', 'manager_approved', 'hr_approved')

UNION ALL

-- Attendance Requests
SELECT 
  ar.id, ar.company_id, 'attendance_request' AS request_type, ar.employee_id,
  COALESCE(e.first_name_en, '') || ' ' || COALESCE(e.last_name_en, '') AS employee_name,
  e.employee_number, d.name_en AS department, ar.request_type AS request_subtype,
  ar.date::text, 1 AS amount_or_days, 'request' AS unit,
  ar.reason AS description, ar.status,
  CASE WHEN ar.manager_approved_by IS NULL THEN 'manager' WHEN ar.hr_approved_by IS NULL THEN 'hr' ELSE 'completed' END AS pending_at_level,
  ar.manager_approved_by, ar.manager_approved_at, ar.hr_approved_by, ar.hr_approved_at,
  NULL::uuid AS finance_approved_by, NULL::timestamptz AS finance_approved_at, ar.rejected_by, ar.rejected_at,
  ar.rejection_reason, ar.sla_deadline, ar.created_at, e.manager_id
FROM attendance_requests ar
JOIN employees e ON ar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE ar.status IN ('pending', 'manager_approved');

-- Universal approve function
CREATE OR REPLACE FUNCTION approve_request_v2(
  p_request_id uuid, p_request_type text, p_approval_level text, p_approver_id uuid, p_comments text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_status text;
BEGIN
  CASE p_request_type
    WHEN 'leave' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' ELSE 'approved' END;
      UPDATE leave_requests SET status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        updated_at = now() WHERE id = p_request_id;
    WHEN 'loan' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' WHEN 'hr' THEN 'hr_approved' ELSE 'active' END;
      UPDATE loans SET status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        finance_approved_by = CASE WHEN p_approval_level = 'finance' THEN p_approver_id ELSE finance_approved_by END,
        finance_approved_at = CASE WHEN p_approval_level = 'finance' THEN now() ELSE finance_approved_at END,
        updated_at = now() WHERE id = p_request_id;
    WHEN 'advance' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' WHEN 'hr' THEN 'hr_approved' ELSE 'approved' END;
      UPDATE advances SET status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        finance_approved_by = CASE WHEN p_approval_level = 'finance' THEN p_approver_id ELSE finance_approved_by END,
        finance_approved_at = CASE WHEN p_approval_level = 'finance' THEN now() ELSE finance_approved_at END,
        updated_at = now() WHERE id = p_request_id;
    WHEN 'expense' THEN
      v_new_status := CASE WHEN p_approval_level = 'finance' THEN 'approved' ELSE 'pending' END;
      UPDATE expense_claims SET approval_status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        finance_approved_by = CASE WHEN p_approval_level = 'finance' THEN p_approver_id ELSE finance_approved_by END,
        finance_approved_at = CASE WHEN p_approval_level = 'finance' THEN now() ELSE finance_approved_at END,
        updated_at = now() WHERE id = p_request_id;
    WHEN 'penalty' THEN
      v_new_status := 'approved';
      UPDATE employee_penalties SET status = v_new_status, finance_approved_by = p_approver_id, finance_approved_at = now(), updated_at = now() WHERE id = p_request_id;
    WHEN 'travel' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' WHEN 'hr' THEN 'hr_approved' ELSE 'approved' END;
      UPDATE business_travel SET approval_status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        finance_approved_by = CASE WHEN p_approval_level = 'finance' THEN p_approver_id ELSE finance_approved_by END,
        finance_approved_at = CASE WHEN p_approval_level = 'finance' THEN now() ELSE finance_approved_at END,
        updated_at = now() WHERE id = p_request_id;
    WHEN 'attendance_request' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' ELSE 'approved' END;
      UPDATE attendance_requests SET status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        updated_at = now() WHERE id = p_request_id;
    ELSE RAISE EXCEPTION 'Unknown request type: %', p_request_type;
  END CASE;
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END; $$;

-- Universal reject function  
CREATE OR REPLACE FUNCTION reject_request_v2(
  p_request_id uuid, p_request_type text, p_approval_level text, p_rejector_id uuid, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  CASE p_request_type
    WHEN 'leave' THEN UPDATE leave_requests SET status = 'rejected', rejected_by = p_rejector_id, rejected_at = now(), rejection_reason = p_reason, updated_at = now() WHERE id = p_request_id;
    WHEN 'loan' THEN UPDATE loans SET status = 'rejected', rejected_by = p_rejector_id, rejected_at = now(), rejection_reason = p_reason, updated_at = now() WHERE id = p_request_id;
    WHEN 'advance' THEN UPDATE advances SET status = 'rejected', rejected_by = p_rejector_id, rejected_at = now(), rejection_reason = p_reason, updated_at = now() WHERE id = p_request_id;
    WHEN 'expense' THEN UPDATE expense_claims SET approval_status = 'rejected', rejected_by = p_rejector_id, rejected_at = now(), workflow_rejection_reason = p_reason, updated_at = now() WHERE id = p_request_id;
    WHEN 'penalty' THEN UPDATE employee_penalties SET status = 'rejected', rejected_by = p_rejector_id, rejected_at = now(), finance_rejection_reason = p_reason, updated_at = now() WHERE id = p_request_id;
    WHEN 'travel' THEN UPDATE business_travel SET approval_status = 'rejected', rejected_by = p_rejector_id, rejected_at = now(), rejection_reason = p_reason, updated_at = now() WHERE id = p_request_id;
    WHEN 'attendance_request' THEN UPDATE attendance_requests SET status = 'rejected', rejected_by = p_rejector_id, rejected_at = now(), rejection_reason = p_reason, updated_at = now() WHERE id = p_request_id;
    ELSE RAISE EXCEPTION 'Unknown request type: %', p_request_type;
  END CASE;
  RETURN jsonb_build_object('success', true, 'new_status', 'rejected');
END; $$;

GRANT EXECUTE ON FUNCTION approve_request_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION reject_request_v2 TO authenticated;
