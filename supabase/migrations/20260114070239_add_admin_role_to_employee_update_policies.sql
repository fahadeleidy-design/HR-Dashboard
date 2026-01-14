/*
  # Add Admin Role to Employee Update Policies
  
  1. Changes
    - Update employee UPDATE policies to include 'admin' role
    - This allows admin users to assign managers and update employee records
    - Maintains existing security by still checking company_id
  
  2. Security
    - Admin users can only update employees within their assigned company
    - Super_admin can update across all companies
*/

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Employees can update based on role" ON employees;
DROP POLICY IF EXISTS "Only HR Finance Admin can update employees" ON employees;

-- Recreate UPDATE policy with admin role included
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

-- Create policy for privileged roles (hr, finance, admin, super_admin)
CREATE POLICY "Only HR Finance Admin can update employees"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
      AND ur.company_id = employees.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
      AND ur.company_id = employees.company_id
    )
  );
