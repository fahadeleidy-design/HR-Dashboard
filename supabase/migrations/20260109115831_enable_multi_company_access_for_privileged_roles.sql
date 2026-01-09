/*
  # Enable Multi-Company Access for Privileged Roles

  This migration allows super_admin, hr, and finance roles to access and switch between all companies in the system.

  ## Changes

  1. RLS Policies
    - Update companies table policy to allow privileged roles to see all companies
    - Regular employees can only see their assigned companies
    - Super Admin, HR, and Finance roles can access all companies

  ## Security

  - Maintains security for employee role (restricted to assigned companies only)
  - Grants broader access to administrative and finance roles for system-wide management
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can only view their assigned companies" ON companies;

-- Create new policy that allows privileged roles to see all companies
-- Regular employees can only see their assigned companies
CREATE POLICY "Privileged roles can view all companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin, HR, and Finance roles can see all companies
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'hr', 'finance')
    )
    OR
    -- Regular employees can only see companies they're assigned to
    id IN (
      SELECT company_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the multi-company access
COMMENT ON POLICY "Privileged roles can view all companies" ON companies IS
'Allows super_admin, hr, and finance roles to access all companies for system-wide management. Regular employees (employee role) are restricted to their assigned companies only.';
