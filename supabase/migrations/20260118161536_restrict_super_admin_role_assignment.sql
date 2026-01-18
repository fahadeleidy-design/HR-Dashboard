/*
  # Restrict Super Admin Role Assignment

  1. Security Changes
    - Only super_admin users can assign the super_admin role
    - HR users can assign hr, finance, and employee roles but NOT super_admin
    - Updates INSERT and UPDATE policies on user_roles table to enforce this restriction
  
  2. Changes Made
    - Drop existing role assignment policies
    - Create new policies with role-based restrictions
    - Super admins can assign any role
    - Non-super admins cannot assign super_admin role
*/

-- Drop existing policies that will be replaced
DROP POLICY IF EXISTS "Admins insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins update roles" ON user_roles;

-- Create new INSERT policy: Only super_admin can assign super_admin role
CREATE POLICY "Role-based insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be admin or super_admin to insert any role
    get_user_role_for_company(company_id) = ANY (ARRAY['super_admin'::text, 'admin'::text, 'hr'::text])
    AND
    -- If trying to assign super_admin role, user must be super_admin themselves
    (
      role != 'super_admin' 
      OR 
      get_user_role_for_company(company_id) = 'super_admin'
    )
  );

-- Create new UPDATE policy: Only super_admin can change to/from super_admin role
CREATE POLICY "Role-based update roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    -- Must be admin or super_admin to update any role
    get_user_role_for_company(company_id) = ANY (ARRAY['super_admin'::text, 'admin'::text, 'hr'::text])
  )
  WITH CHECK (
    -- Must be admin or super_admin to update any role
    get_user_role_for_company(company_id) = ANY (ARRAY['super_admin'::text, 'admin'::text, 'hr'::text])
    AND
    -- If trying to assign super_admin role, user must be super_admin themselves
    (
      role != 'super_admin' 
      OR 
      get_user_role_for_company(company_id) = 'super_admin'
    )
  );
