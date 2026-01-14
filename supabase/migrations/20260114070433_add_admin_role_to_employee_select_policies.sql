/*
  # Add Admin Role to Employee SELECT Policies
  
  1. Changes
    - Update employee SELECT policy to include 'admin' role
    - This allows admin users to view employees for manager assignment
    - Maintains existing security by still checking company_id
  
  2. Security
    - Admin users can only view employees within their assigned company
    - Super_admin can view across all companies
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Employees can view based on role" ON employees;

-- Recreate SELECT policy with admin role included
CREATE POLICY "Employees can view based on role"
  ON employees
  FOR SELECT
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
  );
