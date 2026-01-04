/*
  # Fix Loans Employee RBAC

  1. Purpose
    - Allow employees to create loan requests for themselves
    - Allow employees to view their own loans
    - Maintain restrictions for HR/Finance/Super Admin operations

  2. Changes
    - Update INSERT policy to allow employees to create loans for themselves
    - Update SELECT policy to allow employees to see their own loans
    - Keep UPDATE and DELETE restricted to HR/Finance/Super Admin

  3. Security
    - Employees can only create loans for themselves (employee_id must match)
    - Employees cannot edit or delete loans
    - HR/Finance/Super Admin maintain full access
*/

-- Drop all existing policies on loans table
DROP POLICY IF EXISTS "Super Admin can delete loans" ON loans;
DROP POLICY IF EXISTS "Authorized roles can create loans" ON loans;
DROP POLICY IF EXISTS "Finance roles can update loans" ON loans;
DROP POLICY IF EXISTS "Users can view company loans" ON loans;
DROP POLICY IF EXISTS "Authenticated users can view loans" ON loans;
DROP POLICY IF EXISTS "Authenticated users can manage loans" ON loans;

-- SELECT: Employees can view their own loans, HR/Finance/Admin can view all company loans
CREATE POLICY "Employees and staff can view loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = loans.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = loans.company_id)
      )
    )
  );

-- INSERT: Employees can create loans for themselves, HR/Finance/Admin can create for anyone
CREATE POLICY "Employees and staff can create loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = loans.employee_id AND ur.company_id = loans.company_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = loans.company_id)
      )
    )
  );

-- UPDATE: Only HR/Finance/Admin can update loans
CREATE POLICY "Staff can update loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'super_admin')
      AND ur.company_id = loans.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'super_admin')
      AND ur.company_id = loans.company_id
    )
  );

-- DELETE: Only Super Admin can delete loans
CREATE POLICY "Admin can delete loans"
  ON loans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );
