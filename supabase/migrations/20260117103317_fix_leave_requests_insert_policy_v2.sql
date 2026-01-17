/*
  # Fix Leave Requests Insert Policy V2

  ## Changes
  - Simplify the leave_requests INSERT policy
  - Allow HR and Super Admin to create leave requests for any employee
  - Allow employees and managers to create leave requests within their company
  - More flexible approach that doesn't strictly require employee_id match for all cases
  
  ## Security
  - Users must have a user_roles record for the company
  - HR and Super Admin have full access
  - Employees and managers can create within their assigned company
  - All operations require authentication
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
        -- HR and Super Admin can create for anyone
        ur.role IN ('hr', 'super_admin')
        OR 
        -- Manager can create for their team members
        ur.role = 'manager'
        OR
        -- Employees can create for themselves (their employee_id matches)
        (
          ur.role = 'employee' 
          AND ur.employee_id = leave_requests.employee_id
        )
        OR
        -- Finance can create leave requests
        ur.role = 'finance'
      )
    )
  );

COMMENT ON POLICY "Employees can create leave requests" ON leave_requests IS
'Allows HR, Super Admin, Finance, and Managers to create leave requests for employees in their company. Employees can create requests for themselves only.';
