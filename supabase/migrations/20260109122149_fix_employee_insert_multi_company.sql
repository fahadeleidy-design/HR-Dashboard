/*
  # Fix Employee INSERT Policy for Multi-Company Access

  ## Problem
  The employee INSERT policy still checks that user_roles.company_id matches employees.company_id,
  which prevents super_admin/hr users from creating employees in companies other than their
  originally assigned company.

  ## Solution
  Remove the company_id check from INSERT policy for privileged roles, allowing them to
  create employees in any company.

  ## Security
  - Only HR and super_admin roles can insert employees
  - Employee role users still cannot create employees
  - No company_id restriction for privileged roles
*/

DROP POLICY IF EXISTS "HR and Admin can insert employees" ON employees;

CREATE POLICY "HR and Admin can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'super_admin')
    )
  );

-- Add comment
COMMENT ON POLICY "HR and Admin can insert employees" ON employees IS
'Allows HR and super_admin roles to create employees in any company. No company_id restriction for multi-company access.';