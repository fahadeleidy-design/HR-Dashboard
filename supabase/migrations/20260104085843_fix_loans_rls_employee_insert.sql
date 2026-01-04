/*
  # Fix Loans RLS for Employee Insert

  1. Purpose
    - Simplify and fix the INSERT policy for loans to allow employees to create loans
    - Add better debugging and ensure the policy works correctly

  2. Changes
    - Recreate INSERT policy with simplified logic
    - Ensure employee_id and company_id match user_roles record

  3. Security
    - Employees can only create loans for themselves
    - Staff (HR/Finance/Admin) can create loans for anyone in their company
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Employees and staff can create loans" ON loans;

-- Recreate INSERT policy with clearer logic
CREATE POLICY "Employees and staff can create loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user has a role in user_roles for this company
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = loans.company_id
      AND (
        -- Employee can create loan for themselves
        (ur.role = 'employee' AND ur.employee_id = loans.employee_id)
        OR 
        -- Staff can create loan for anyone in company
        ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );
