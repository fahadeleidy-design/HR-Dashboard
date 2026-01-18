/*
  # Fix Super Admin Multi-Company Manager Assignment

  1. Problem
    - The employee UPDATE policy incorrectly restricts super_admin to their assigned company
    - This prevents super_admin from assigning managers across different companies
    - Migration 20260114070239 added company_id restriction that broke multi-company access

  2. Solution
    - Update employee UPDATE policies to allow super_admin full access across all companies
    - Keep admin, hr, and finance restricted to their assigned companies
    - Maintain security for employee role (can only update their own record)

  3. Changes
    - Drop conflicting UPDATE policies on employees table
    - Recreate UPDATE policy allowing super_admin full access
    - Keep company-level restrictions for other privileged roles

  4. Security
    - Employee role: Can only update their own record in assigned company
    - Admin, HR, Finance: Can update employees in their assigned company
    - Super Admin: Can update employees across all companies (required for multi-tenant management)
*/

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Employees can update based on role" ON employees;
DROP POLICY IF EXISTS "Only HR Finance Admin can update employees" ON employees;

-- Recreate UPDATE policy with proper multi-company access for super_admin
CREATE POLICY "Employees can update based on role"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can only update their own record in their assigned company
        (ur.role = 'employee' AND ur.employee_id = employees.id AND ur.company_id = employees.company_id)
        -- Super admin can update any employee in any company
        OR ur.role = 'super_admin'
        -- Admin, HR, and Finance can update employees in their assigned company
        OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employees.company_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can only update their own record in their assigned company
        (ur.role = 'employee' AND ur.employee_id = employees.id AND ur.company_id = employees.company_id)
        -- Super admin can update any employee in any company
        OR ur.role = 'super_admin'
        -- Admin, HR, and Finance can update employees in their assigned company
        OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employees.company_id)
      )
    )
  );

-- Add helpful comment
COMMENT ON POLICY "Employees can update based on role" ON employees IS
'Employee role restricted to own record. Admin/HR/Finance restricted to assigned company. Super admin has full multi-company access for manager assignment and employee management.';