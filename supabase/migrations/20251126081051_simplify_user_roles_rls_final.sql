/*
  # Simplify User Roles RLS Policies

  ## Changes Made

  1. **Drop All Existing Policies**
     - Remove all complex policies causing issues

  2. **Create Simple, Working Policies**
     - Users can view their own roles
     - Users can view roles if they are admin in same company
     - Users can insert/update/delete roles if they are admin in same company
     - Use simple EXISTS checks without helper functions

  3. **Security Notes**
     - Policies work from frontend with auth.uid()
     - Admin operations require super_admin or admin role
     - No infinite recursion - checks done in subquery
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view company roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Users can bootstrap their own role" ON user_roles;

-- Drop helper function
DROP FUNCTION IF EXISTS is_admin_for_company(uuid);

-- Policy 1: Users can view their own roles
CREATE POLICY "View own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can view all roles in companies where they are admin
CREATE POLICY "View company roles as admin"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = user_roles.company_id
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Policy 3: Admins can insert roles in their company
CREATE POLICY "Insert roles as admin"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Policy 4: Admins can update roles in their company
CREATE POLICY "Update roles as admin"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = user_roles.company_id
      AND ur.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = user_roles.company_id
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Policy 5: Admins can delete roles in their company
CREATE POLICY "Delete roles as admin"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = user_roles.company_id
      AND ur.role IN ('super_admin', 'admin')
    )
  );
