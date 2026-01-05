/*
  # Fix Loans INSERT Policy - Final Fix

  1. Purpose
    - Resolve RLS policy violation when employees try to create loans
    - Ensure the policy properly evaluates auth.uid() in the user context
    - Simplify policy logic to avoid any edge cases

  2. Root Cause Analysis
    - The WITH CHECK clause was failing even though manual tests showed it should pass
    - Possible issue with policy evaluation timing or auth context
    - Need to ensure policy is crystal clear and foolproof

  3. Changes
    - Drop and recreate the INSERT policy with simplified, bulletproof logic
    - Add explicit company_id check first
    - Then check role-based permissions

  4. Security
    - Employees can only create loans for themselves (matching employee_id and company_id)
    - HR/Finance/Admin can create loans for anyone in their company
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Employees and staff can create loans" ON loans;

-- Recreate with simplified logic
CREATE POLICY "Employees and staff can create loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (
    -- First verify the user has a role in this company
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
    AND
    -- Then check role-specific permissions
    (
      -- Employee creating loan for themselves
      (
        employee_id IN (
          SELECT ur.employee_id
          FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'employee'
          AND ur.company_id = loans.company_id
        )
      )
      OR
      -- Staff (HR/Finance/Admin) can create for anyone in their company
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('hr', 'finance', 'super_admin')
        AND ur.company_id = loans.company_id
      )
    )
  );

-- Add a helper comment for debugging
COMMENT ON POLICY "Employees and staff can create loans" ON loans IS 
  'Allows employees to create loans for themselves and staff to create loans for anyone in their company';
