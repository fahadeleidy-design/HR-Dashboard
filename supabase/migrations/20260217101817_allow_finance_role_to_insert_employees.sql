/*
  # Allow Finance Role to Insert Employees

  1. Problem
    - Finance role cannot create new employees, only HR and super_admin can
    - To enable full cross-company management, Finance needs INSERT access

  2. Solution
    - Update employees INSERT policy to include finance role

  3. Security
    - Only HR, Finance, and Super Admin can create employees
    - Employee role still cannot create employees
*/

DROP POLICY IF EXISTS "HR and Admin can insert employees" ON employees;

CREATE POLICY "HR and Admin can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'super_admin')
    )
  );

COMMENT ON POLICY "HR and Admin can insert employees" ON employees IS
'Allows HR, Finance, and Super Admin roles to create employees in any company for full cross-company management.';
