/*
  # Optimize Critical RLS Policies

  Optimizes RLS policies by wrapping auth.<function>() calls in SELECT subqueries.
  This prevents re-evaluation of auth functions for each row, significantly improving performance.

  ## Changes
  - Optimize policies on most frequently queried tables
  - Wrap auth.uid() and auth.jwt() calls with (select auth.<function>())
  - Focus on company-scoped queries (most common pattern)
*/

-- Drop and recreate policies for advances table
DROP POLICY IF EXISTS "Users can view company advances" ON advances;
DROP POLICY IF EXISTS "Authorized roles can create advances" ON advances;
DROP POLICY IF EXISTS "Finance roles can update advances" ON advances;
DROP POLICY IF EXISTS "Super Admin can delete advances" ON advances;

CREATE POLICY "Users can view company advances"
  ON advances FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Authorized roles can create advances"
  ON advances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND company_id = advances.company_id 
      AND role IN ('super_admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Finance roles can update advances"
  ON advances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND company_id = advances.company_id 
      AND role IN ('super_admin', 'finance')
    )
  );

CREATE POLICY "Super Admin can delete advances"
  ON advances FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- Optimize policies for contracts table
DROP POLICY IF EXISTS "Users can view company contracts" ON contracts;
DROP POLICY IF EXISTS "Authorized roles can create contracts" ON contracts;
DROP POLICY IF EXISTS "Authorized roles can update contracts" ON contracts;
DROP POLICY IF EXISTS "Super Admin can delete contracts" ON contracts;

CREATE POLICY "Users can view company contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Authorized roles can create contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND company_id = contracts.company_id 
      AND role IN ('super_admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Authorized roles can update contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND company_id = contracts.company_id 
      AND role IN ('super_admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Super Admin can delete contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- Optimize policies for loans table
DROP POLICY IF EXISTS "Users can view company loans" ON loans;
DROP POLICY IF EXISTS "Authorized roles can create loans" ON loans;
DROP POLICY IF EXISTS "Finance roles can update loans" ON loans;
DROP POLICY IF EXISTS "Super Admin can delete loans" ON loans;

CREATE POLICY "Users can view company loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Authorized roles can create loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND company_id = loans.company_id 
      AND role IN ('super_admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Finance roles can update loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND company_id = loans.company_id 
      AND role IN ('super_admin', 'finance')
    )
  );

CREATE POLICY "Super Admin can delete loans"
  ON loans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- Optimize policies for insurance_policies table
DROP POLICY IF EXISTS "Users can view company insurance" ON insurance_policies;
DROP POLICY IF EXISTS "Authorized roles can create insurance" ON insurance_policies;
DROP POLICY IF EXISTS "Authorized roles can update insurance" ON insurance_policies;
DROP POLICY IF EXISTS "Super Admin can delete insurance" ON insurance_policies;

CREATE POLICY "Users can view company insurance"
  ON insurance_policies FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Authorized roles can create insurance"
  ON insurance_policies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND company_id = insurance_policies.company_id 
      AND role IN ('super_admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Authorized roles can update insurance"
  ON insurance_policies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND company_id = insurance_policies.company_id 
      AND role IN ('super_admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Super Admin can delete insurance"
  ON insurance_policies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- Optimize user_roles policy
DROP POLICY IF EXISTS "View own roles" ON user_roles;

CREATE POLICY "View own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Optimize audit_log policy
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON audit_log;

CREATE POLICY "Super admin can view all audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- Optimize cost_centers policy
DROP POLICY IF EXISTS "Users can view own company cost centers" ON cost_centers;

CREATE POLICY "Users can view own company cost centers"
  ON cost_centers FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = (select auth.uid())
    )
  );
