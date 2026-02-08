/*
  # Fix approve_request_v2 function - remove invalid updated_at reference for leave_requests

  1. Changes
    - Recreate the `approve_request_v2` function
    - Remove `updated_at = now()` from the leave_requests UPDATE since that table
      does not have an `updated_at` column
    - All other request type handlers remain unchanged

  2. Reason
    - The function was failing with error: column "updated_at" of relation
      "leave_requests" does not exist (code 42703)
    - This prevented managers from approving leave requests
*/

CREATE OR REPLACE FUNCTION approve_request_v2(
  p_request_id uuid,
  p_request_type text,
  p_approval_level text,
  p_approver_id uuid,
  p_comments text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_new_status text;
BEGIN
  CASE p_request_type
    WHEN 'leave' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' ELSE 'approved' END;
      UPDATE leave_requests SET status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END
      WHERE id = p_request_id;

    WHEN 'loan' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' WHEN 'hr' THEN 'hr_approved' ELSE 'active' END;
      UPDATE loans SET status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        finance_approved_by = CASE WHEN p_approval_level = 'finance' THEN p_approver_id ELSE finance_approved_by END,
        finance_approved_at = CASE WHEN p_approval_level = 'finance' THEN now() ELSE finance_approved_at END,
        updated_at = now()
      WHERE id = p_request_id;

    WHEN 'advance' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' WHEN 'hr' THEN 'hr_approved' ELSE 'approved' END;
      UPDATE advances SET status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        finance_approved_by = CASE WHEN p_approval_level = 'finance' THEN p_approver_id ELSE finance_approved_by END,
        finance_approved_at = CASE WHEN p_approval_level = 'finance' THEN now() ELSE finance_approved_at END,
        updated_at = now()
      WHERE id = p_request_id;

    WHEN 'expense' THEN
      v_new_status := CASE WHEN p_approval_level = 'finance' THEN 'approved' ELSE 'pending' END;
      UPDATE expense_claims SET approval_status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        finance_approved_by = CASE WHEN p_approval_level = 'finance' THEN p_approver_id ELSE finance_approved_by END,
        finance_approved_at = CASE WHEN p_approval_level = 'finance' THEN now() ELSE finance_approved_at END,
        updated_at = now()
      WHERE id = p_request_id;

    WHEN 'penalty' THEN
      v_new_status := 'approved';
      UPDATE employee_penalties SET status = v_new_status,
        finance_approved_by = p_approver_id,
        finance_approved_at = now(),
        updated_at = now()
      WHERE id = p_request_id;

    WHEN 'travel' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' WHEN 'hr' THEN 'hr_approved' ELSE 'approved' END;
      UPDATE business_travel SET approval_status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        finance_approved_by = CASE WHEN p_approval_level = 'finance' THEN p_approver_id ELSE finance_approved_by END,
        finance_approved_at = CASE WHEN p_approval_level = 'finance' THEN now() ELSE finance_approved_at END,
        updated_at = now()
      WHERE id = p_request_id;

    WHEN 'attendance_request' THEN
      v_new_status := CASE p_approval_level WHEN 'manager' THEN 'manager_approved' ELSE 'approved' END;
      UPDATE attendance_requests SET status = v_new_status,
        manager_approved_by = CASE WHEN p_approval_level = 'manager' THEN p_approver_id ELSE manager_approved_by END,
        manager_approved_at = CASE WHEN p_approval_level = 'manager' THEN now() ELSE manager_approved_at END,
        hr_approved_by = CASE WHEN p_approval_level = 'hr' THEN p_approver_id ELSE hr_approved_by END,
        hr_approved_at = CASE WHEN p_approval_level = 'hr' THEN now() ELSE hr_approved_at END,
        updated_at = now()
      WHERE id = p_request_id;

    ELSE RAISE EXCEPTION 'Unknown request type: %', p_request_type;
  END CASE;

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;
