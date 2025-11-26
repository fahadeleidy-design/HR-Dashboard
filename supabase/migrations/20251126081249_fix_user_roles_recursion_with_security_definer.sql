/*
  # Fix User Roles Infinite Recursion with Security Definer

  ## Problem
  - Policies checking user_roles from within user_roles policies cause infinite recursion
  - Subqueries are also subject to RLS, creating loops

  ## Solution
  1. **Create Security Definer Function**
     - `get_user_role_for_company()` bypasses RLS entirely
     - Returns the user's role for a specific company
     - Safe because it only returns current user's own role

  2. **Update All Policies**
     - Use the security definer function instead of subqueries
     - No more recursion - function bypasses RLS

  ## Security Notes
  - Function is SECURITY DEFINER but safe (only returns auth.uid()'s role)
  - Cannot be abused to see other users' roles
  - Policies remain restrictive
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "View own roles" ON user_roles;
DROP POLICY IF EXISTS "View company roles as admin" ON user_roles;
DROP POLICY IF EXISTS "Insert roles as admin" ON user_roles;
DROP POLICY IF EXISTS "Update roles as admin" ON user_roles;
DROP POLICY IF EXISTS "Delete roles as admin" ON user_roles;

-- Create security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION get_user_role_for_company(target_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the role for the current authenticated user in the specified company
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid()
  AND company_id = target_company_id
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Policy 1: Users can always view their own roles
CREATE POLICY "View own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Admins can view all roles in their company
CREATE POLICY "Admins view company roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    get_user_role_for_company(company_id) IN ('super_admin', 'admin')
  );

-- Policy 3: Admins can insert roles in their company
CREATE POLICY "Admins insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role_for_company(company_id) IN ('super_admin', 'admin')
  );

-- Policy 4: Admins can update roles in their company
CREATE POLICY "Admins update roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    get_user_role_for_company(company_id) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    get_user_role_for_company(company_id) IN ('super_admin', 'admin')
  );

-- Policy 5: Admins can delete roles in their company
CREATE POLICY "Admins delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    get_user_role_for_company(company_id) IN ('super_admin', 'admin')
  );
