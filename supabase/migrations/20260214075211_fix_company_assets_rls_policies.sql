/*
  # Fix Company Assets and Asset Maintenance RLS Policies

  ## Problem
  The company_assets and asset_maintenance tables only have SELECT policies, causing INSERT/UPDATE/DELETE
  operations to fail with RLS violations.

  ## Changes
  Add comprehensive RLS policies for INSERT, UPDATE, and DELETE operations on:
  - company_assets
  - asset_maintenance

  ## Security Model
  - HR and Finance roles can manage all assets in their company
  - Super Admins can manage assets across all companies
  - Employees can only view assets (existing SELECT policy)
*/

-- ============================================================================
-- COMPANY ASSETS - SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view assets" ON company_assets;
DROP POLICY IF EXISTS "Authenticated users can view assets" ON company_assets;

CREATE POLICY "Users can view assets"
  ON company_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = company_assets.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin', 'admin')
      )
    )
  );

-- ============================================================================
-- COMPANY ASSETS - INSERT
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can insert assets" ON company_assets;

CREATE POLICY "HR and Finance can insert assets"
  ON company_assets FOR INSERT
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
-- COMPANY ASSETS - UPDATE
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can update assets" ON company_assets;

CREATE POLICY "HR and Finance can update assets"
  ON company_assets FOR UPDATE
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
-- COMPANY ASSETS - DELETE
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can delete assets" ON company_assets;

CREATE POLICY "HR and Finance can delete assets"
  ON company_assets FOR DELETE
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
-- ASSET MAINTENANCE - SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view asset maintenance" ON asset_maintenance;
DROP POLICY IF EXISTS "Authenticated users can view asset maintenance" ON asset_maintenance;

CREATE POLICY "Users can view asset maintenance"
  ON asset_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = asset_maintenance.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin', 'admin')
      )
    )
  );

-- ============================================================================
-- ASSET MAINTENANCE - INSERT
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can insert asset maintenance" ON asset_maintenance;

CREATE POLICY "HR and Finance can insert asset maintenance"
  ON asset_maintenance FOR INSERT
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
-- ASSET MAINTENANCE - UPDATE
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can update asset maintenance" ON asset_maintenance;

CREATE POLICY "HR and Finance can update asset maintenance"
  ON asset_maintenance FOR UPDATE
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
-- ASSET MAINTENANCE - DELETE
-- ============================================================================

DROP POLICY IF EXISTS "HR and Finance can delete asset maintenance" ON asset_maintenance;

CREATE POLICY "HR and Finance can delete asset maintenance"
  ON asset_maintenance FOR DELETE
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
