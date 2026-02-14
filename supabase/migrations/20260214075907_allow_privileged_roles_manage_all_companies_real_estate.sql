/*
  # Allow Privileged Roles to Manage Real Estate Across All Companies

  ## Changes
  Update RLS policies on real_estate_properties, property_maintenance,
  company_assets, and asset_maintenance so HR, Finance, and Admin roles
  can manage records across all companies (not just their own).

  ## Security
  - HR, Finance, Admin, Super Admin: full access across all companies
  - Employees: view only within their own company
*/

-- ============================================================================
-- REAL ESTATE PROPERTIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view properties" ON real_estate_properties;
DROP POLICY IF EXISTS "HR and Finance can insert properties" ON real_estate_properties;
DROP POLICY IF EXISTS "HR and Finance can update properties" ON real_estate_properties;
DROP POLICY IF EXISTS "HR and Finance can delete properties" ON real_estate_properties;

CREATE POLICY "Users can view properties"
  ON real_estate_properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        ur.role IN ('hr', 'finance', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.company_id = real_estate_properties.company_id)
      )
    )
  );

CREATE POLICY "Privileged roles can insert properties"
  ON real_estate_properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Privileged roles can update properties"
  ON real_estate_properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Privileged roles can delete properties"
  ON real_estate_properties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- PROPERTY MAINTENANCE
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view property maintenance" ON property_maintenance;
DROP POLICY IF EXISTS "Authenticated users can manage property maintenance" ON property_maintenance;
DROP POLICY IF EXISTS "HR and Finance can insert property maintenance" ON property_maintenance;
DROP POLICY IF EXISTS "HR and Finance can update property maintenance" ON property_maintenance;
DROP POLICY IF EXISTS "HR and Finance can delete property maintenance" ON property_maintenance;

CREATE POLICY "Users can view property maintenance"
  ON property_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        ur.role IN ('hr', 'finance', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.company_id = property_maintenance.company_id)
      )
    )
  );

CREATE POLICY "Privileged roles can insert property maintenance"
  ON property_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Privileged roles can update property maintenance"
  ON property_maintenance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Privileged roles can delete property maintenance"
  ON property_maintenance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- COMPANY ASSETS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view assets" ON company_assets;
DROP POLICY IF EXISTS "HR and Finance can insert assets" ON company_assets;
DROP POLICY IF EXISTS "HR and Finance can update assets" ON company_assets;
DROP POLICY IF EXISTS "HR and Finance can delete assets" ON company_assets;

CREATE POLICY "Users can view assets"
  ON company_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        ur.role IN ('hr', 'finance', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.company_id = company_assets.company_id)
      )
    )
  );

CREATE POLICY "Privileged roles can insert assets"
  ON company_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Privileged roles can update assets"
  ON company_assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Privileged roles can delete assets"
  ON company_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- ASSET MAINTENANCE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view asset maintenance" ON asset_maintenance;
DROP POLICY IF EXISTS "Authenticated users can view asset maintenance" ON asset_maintenance;
DROP POLICY IF EXISTS "Authenticated users can manage asset maintenance" ON asset_maintenance;
DROP POLICY IF EXISTS "HR and Finance can insert asset maintenance" ON asset_maintenance;
DROP POLICY IF EXISTS "HR and Finance can update asset maintenance" ON asset_maintenance;
DROP POLICY IF EXISTS "HR and Finance can delete asset maintenance" ON asset_maintenance;

CREATE POLICY "Users can view asset maintenance"
  ON asset_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        ur.role IN ('hr', 'finance', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.company_id = asset_maintenance.company_id)
      )
    )
  );

CREATE POLICY "Privileged roles can insert asset maintenance"
  ON asset_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Privileged roles can update asset maintenance"
  ON asset_maintenance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Privileged roles can delete asset maintenance"
  ON asset_maintenance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
    )
  );
