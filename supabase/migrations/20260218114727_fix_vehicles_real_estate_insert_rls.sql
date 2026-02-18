/*
  # Fix Vehicles and Real Estate Properties INSERT/UPDATE RLS Policies

  ## Problem
  The INSERT policies on `vehicles` and `real_estate_properties` use direct subqueries
  on `user_roles` which can fail when RLS on `user_roles` blocks the lookup, or when
  the company_id check is too restrictive for super_admin users.

  ## Changes
  - Drop and recreate INSERT and UPDATE policies on `vehicles` using the
    SECURITY DEFINER `get_user_role_for_company` function for reliable role lookup
  - Drop and recreate INSERT and UPDATE policies on `real_estate_properties` using
    the same approach
  - super_admin users can operate on any company's records
  - Other privileged roles (hr, finance, admin, manager) restricted to their company
*/

-- Fix vehicles INSERT policy
DROP POLICY IF EXISTS "Privileged roles can insert vehicles" ON vehicles;
CREATE POLICY "Privileged roles can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
  );

-- Fix vehicles UPDATE policy
DROP POLICY IF EXISTS "Privileged roles can update vehicles" ON vehicles;
CREATE POLICY "Privileged roles can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
  )
  WITH CHECK (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
  );

-- Fix vehicles DELETE policy
DROP POLICY IF EXISTS "Privileged roles can delete vehicles" ON vehicles;
CREATE POLICY "Privileged roles can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
  );

-- Fix real_estate_properties INSERT policy
DROP POLICY IF EXISTS "Privileged roles can insert properties" ON real_estate_properties;
CREATE POLICY "Privileged roles can insert properties"
  ON real_estate_properties FOR INSERT
  TO authenticated
  WITH CHECK (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
  );

-- Fix real_estate_properties UPDATE policy
DROP POLICY IF EXISTS "Privileged roles can update properties" ON real_estate_properties;
CREATE POLICY "Privileged roles can update properties"
  ON real_estate_properties FOR UPDATE
  TO authenticated
  USING (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
  )
  WITH CHECK (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
  );

-- Fix real_estate_properties DELETE policy
DROP POLICY IF EXISTS "Privileged roles can delete properties" ON real_estate_properties;
CREATE POLICY "Privileged roles can delete properties"
  ON real_estate_properties FOR DELETE
  TO authenticated
  USING (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
  );
