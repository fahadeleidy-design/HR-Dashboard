/*
  # Add Admin Role to Leave Requests Policy

  ## Changes
  - Add 'admin' role to the list of privileged roles that can create leave requests
  - This ensures admin users have the same access as HR and Super Admin
  
  ## Security
  - Maintains existing security model
  - Admin role gets same permissions as HR for leave management
*/

DROP POLICY IF EXISTS "Employees can create leave requests" ON leave_requests;

CREATE POLICY "Employees can create leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user has access to this company through user_roles
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = leave_requests.company_id
      AND (
        -- Privileged roles can create for anyone
        ur.role IN ('hr', 'super_admin', 'admin', 'finance', 'manager')
        OR 
        -- Employees can create for themselves (their employee_id matches)
        (
          ur.role = 'employee' 
          AND ur.employee_id = leave_requests.employee_id
        )
      )
    )
  );

COMMENT ON POLICY "Employees can create leave requests" ON leave_requests IS
'Allows HR, Super Admin, Admin, Finance, and Managers to create leave requests for any employee in their company. Employees can create requests for themselves only.';
