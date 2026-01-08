/*
  # Restrict Company Access by User Role

  This migration implements security measures to ensure users can only access companies they are assigned to:

  ## Changes

  1. RLS Policies
    - Add policy to restrict companies table access based on user_roles
    - Users can only see companies where they have an active role
    - Super admins cannot switch to other companies unless they have a role

  ## Security

  - Users must have a record in user_roles table to access a company
  - No cross-company data access
  - Prevents unauthorized company switching
*/

-- Drop existing company policies if any
DROP POLICY IF EXISTS "Users can view their assigned companies" ON companies;
DROP POLICY IF EXISTS "Users can view companies" ON companies;

-- Create restrictive policy for companies table
-- Users can only see companies where they have a role
CREATE POLICY "Users can only view their assigned companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the restriction
COMMENT ON POLICY "Users can only view their assigned companies" ON companies IS
'Restricts company access to only those companies where the user has an active role in user_roles table. Prevents unauthorized company switching.';