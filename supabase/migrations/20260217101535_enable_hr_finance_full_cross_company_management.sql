/*
  # Enable HR and Finance Full Cross-Company Management

  1. Problem
    - HR and Finance roles are restricted to managing employees only in their assigned company
    - This prevents HR/Finance from performing cross-company employee management tasks
    - The employees UPDATE policy requires company_id match for hr/finance roles

  2. Solution
    - Update employees UPDATE policy to grant HR and Finance unrestricted cross-company access
    - Same level as super_admin for employee management operations
    - Maintain employee role restriction (can only update own record)

  3. Changes
    - Drop and recreate employees UPDATE policy
    - HR and Finance can now update employees across all companies
    - Employee role still restricted to own record in assigned company

  4. Security
    - Employee role: Can only update their own record in assigned company
    - HR, Finance: Full cross-company update access for employee management
    - Super Admin: Full cross-company update access (unchanged)
*/

DROP POLICY IF EXISTS "Employees can update based on role" ON employees;

CREATE POLICY "Employees can update based on role"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employees.id AND ur.company_id = employees.company_id)
        OR ur.role IN ('hr', 'finance', 'admin', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employees.id AND ur.company_id = employees.company_id)
        OR ur.role IN ('hr', 'finance', 'admin', 'super_admin')
      )
    )
  );

COMMENT ON POLICY "Employees can update based on role" ON employees IS
'Employee role restricted to own record. HR, Finance, Admin, and Super Admin have full cross-company employee management access.';
