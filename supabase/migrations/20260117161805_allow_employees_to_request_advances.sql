/*
  # Allow Employees to Request Advances

  ## Purpose
  Update the advances INSERT policy to allow employees to submit advance requests for themselves,
  while still allowing HR, Finance, and Super Admin to create advances for any employee.

  ## Changes
  - Drop the existing restrictive INSERT policy on advances
  - Create a new policy that allows:
    1. Employees to create advance requests for themselves
    2. HR, Finance, and Super Admin to create advances for any employee
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authorized roles can create advances" ON advances;

-- Create a new policy that allows employees to request their own advances
CREATE POLICY "Employees and staff can create advances"
  ON advances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be in the same company
    company_id IN (
      SELECT ur.company_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
    AND (
      -- Employees can create advances for themselves
      employee_id IN (
        SELECT ur.employee_id
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.company_id = advances.company_id
      )
      -- OR privileged roles can create for anyone
      OR EXISTS (
        SELECT 1
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
        AND ur.company_id = advances.company_id
      )
    )
  );
