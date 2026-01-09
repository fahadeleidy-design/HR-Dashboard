/*
  # Fix Core Tables RLS for Multi-Company Access

  Updates RLS policies on core tables to allow super_admin, hr, and finance roles
  to access data across all companies while keeping employees restricted to their
  assigned company.

  ## Tables Updated
  - departments
  - documents  
  - vehicles
  - real_estate_properties
  - contracts
  - insurance_policies
  - business_travel
  - nitaqat_tracking
  - loans
  - advances
*/

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can view departments" ON departments;

CREATE POLICY "Users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;

CREATE POLICY "Users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = documents.company_id 
          AND (documents.employee_id IS NULL OR ur.employee_id = documents.employee_id))
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- VEHICLES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON vehicles;

CREATE POLICY "Users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = vehicles.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- REAL ESTATE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view properties" ON real_estate_properties;
DROP POLICY IF EXISTS "Authenticated users can view properties" ON real_estate_properties;

CREATE POLICY "Users can view properties"
  ON real_estate_properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = real_estate_properties.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- CONTRACTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contracts;

CREATE POLICY "Users can view contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = contracts.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- INSURANCE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view insurance" ON insurance_policies;
DROP POLICY IF EXISTS "Authenticated users can view insurance" ON insurance_policies;

CREATE POLICY "Users can view insurance"
  ON insurance_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = insurance_policies.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- BUSINESS TRAVEL
-- ============================================================================

DROP POLICY IF EXISTS "Users can view travel" ON business_travel;
DROP POLICY IF EXISTS "Authenticated users can view travel" ON business_travel;

CREATE POLICY "Users can view travel"
  ON business_travel FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = business_travel.employee_id AND ur.company_id = business_travel.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- NITAQAT TRACKING
-- ============================================================================

DROP POLICY IF EXISTS "Users can view nitaqat" ON nitaqat_tracking;
DROP POLICY IF EXISTS "Authenticated users can view nitaqat" ON nitaqat_tracking;

CREATE POLICY "Users can view nitaqat"
  ON nitaqat_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = nitaqat_tracking.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- LOANS
-- ============================================================================

DROP POLICY IF EXISTS "Loans role-based select" ON loans;
DROP POLICY IF EXISTS "Employees can view own loans" ON loans;

CREATE POLICY "Loans role-based select"
  ON loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = loans.employee_id AND ur.company_id = loans.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- ADVANCES
-- ============================================================================

DROP POLICY IF EXISTS "Advances role-based select" ON advances;
DROP POLICY IF EXISTS "Employees can view own advances" ON advances;

CREATE POLICY "Advances role-based select"
  ON advances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = advances.employee_id AND ur.company_id = advances.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );