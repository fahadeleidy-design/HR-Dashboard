/*
  # Restrict Employee Role from Editing Employee Data

  1. Purpose
    - Align with enterprise-grade HR systems where employees can only VIEW their data
    - Employees should NOT be able to edit their own employee record
    - Employees should NOT be able to add new employees
    - Only HR, Finance, and Super Admin roles can modify employee data

  2. Changes
    - Drop existing UPDATE policy that allows employees to edit their own records
    - Create new UPDATE policy that ONLY allows HR, Finance, and Super Admin roles
    - Keep SELECT policy to allow employees to view their own data

  3. Security Model
    - Employee role: Can ONLY view their own record (read-only)
    - HR/Finance/Super Admin: Can view and modify all employees in their company
    - Self-service features (leave requests, expenses, etc.) remain available via dedicated tables
*/

-- ============================================================================
-- EMPLOYEES TABLE - Restrict Employee Role from Updates
-- ============================================================================

-- Drop existing policy that allows employees to update their own records
DROP POLICY IF EXISTS "Employees can update based on role" ON employees;

-- UPDATE: ONLY HR, Finance, and Super Admin can update employee records
-- Employees with 'employee' role CANNOT update any employee records (including their own)
CREATE POLICY "Only HR Finance Admin can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'super_admin')
      AND ur.company_id = employees.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'super_admin')
      AND ur.company_id = employees.company_id
    )
  );

-- Note: SELECT policy remains unchanged - employees can still VIEW their own data
-- Note: INSERT policy remains unchanged - only HR and Super Admin can create employees
-- Note: DELETE policy remains unchanged - only HR and Super Admin can delete employees
