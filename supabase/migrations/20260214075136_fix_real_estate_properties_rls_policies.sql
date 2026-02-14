/*
  # Fix Real Estate Properties RLS Policies

  ## Problem
  The real_estate_properties table only has a SELECT policy, causing INSERT operations to fail
  with RLS violations. Users cannot create new properties.

  ## Changes
  Add comprehensive RLS policies for INSERT, UPDATE, and DELETE operations on:
  - real_estate_properties
  - property_maintenance

  ## Security Model
  - HR and Finance roles can manage all properties in their company
  - Super Admins can manage properties across all companies
  - Employees can only view properties (existing SELECT policy)
*/

-- ============================================================================
-- REAL ESTATE PROPERTIES - INSERT
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can insert properties" ON real_estate_properties;

CREATE POLICY "HR and Finance can insert properties"
  ON real_estate_properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- ============================================================================
-- REAL ESTATE PROPERTIES - UPDATE
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can update properties" ON real_estate_properties;

CREATE POLICY "HR and Finance can update properties"
  ON real_estate_properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- ============================================================================
-- REAL ESTATE PROPERTIES - DELETE
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can delete properties" ON real_estate_properties;

CREATE POLICY "HR and Finance can delete properties"
  ON real_estate_properties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- ============================================================================
-- PROPERTY MAINTENANCE - INSERT
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can insert property maintenance" ON property_maintenance;

CREATE POLICY "HR and Finance can insert property maintenance"
  ON property_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- ============================================================================
-- PROPERTY MAINTENANCE - UPDATE
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can update property maintenance" ON property_maintenance;

CREATE POLICY "HR and Finance can update property maintenance"
  ON property_maintenance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- ============================================================================
-- PROPERTY MAINTENANCE - DELETE
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can delete property maintenance" ON property_maintenance;

CREATE POLICY "HR and Finance can delete property maintenance"
  ON property_maintenance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = company_id
      AND ur.role IN ('hr', 'finance', 'super_admin', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );
