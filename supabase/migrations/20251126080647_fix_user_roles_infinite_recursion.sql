/*
  # Fix User Roles Infinite Recursion

  ## Changes Made

  1. **Create Helper Function**
     - `is_admin_for_company(company_uuid)` - checks if current user is admin/super_admin
     - Uses SECURITY DEFINER to bypass RLS

  2. **Update RLS Policies**
     - Drop recursive policies
     - Create new policies using helper function
     - No more infinite recursion

  ## Security Notes
  - Helper function is SECURITY DEFINER but safe (only checks user's own role)
  - Policies properly separate by operation type
*/

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view company roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- Create helper function to check if user is admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_admin_for_company(company_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = company_uuid
    AND role IN ('super_admin', 'admin')
  );
END;
$$;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all roles in their company
CREATE POLICY "Admins can view company roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (is_admin_for_company(company_id));

-- Admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_for_company(company_id));

-- Admins can update roles
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (is_admin_for_company(company_id))
  WITH CHECK (is_admin_for_company(company_id));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (is_admin_for_company(company_id));
