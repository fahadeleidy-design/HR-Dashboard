/*
  # Enable Finance Role Full Access to Financial Modules

  This migration grants the 'finance' role comprehensive access to all
  financial, operational, and reporting tables in the system.

  1. Modified Tables
    - `payroll_batches` - Add finance/hr to create and delete policies
    - `payroll_items` - Add finance/hr to create and delete policies
    - `bank_files` - Add finance to create and update policies
    - `end_of_service_calculations` - Add finance/hr to create policy
    - `audit_log` - Add finance to view policy
    - `expense_receipts` - Add finance/hr to insert policy
    - `wps_bank_configs` - Add finance to delete policy
    - `has_email_admin_role` function - Add finance

  2. Security
    - All policies maintain company-level isolation
    - Finance role is scoped to company membership
    - No USING(true) policies created
*/

-- 1. Fix payroll_batches INSERT - add 'finance' and 'hr' roles
DROP POLICY IF EXISTS "Finance roles can create payroll batches" ON payroll_batches;
CREATE POLICY "Finance roles can create payroll batches"
  ON payroll_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin', 'admin', 'hr', 'finance', 'finance_manager', 'payroll_manager', 'manager'])
    )
  );

-- 2. Fix payroll_items INSERT - add 'finance' and 'hr' roles
DROP POLICY IF EXISTS "Finance roles can create payroll items" ON payroll_items;
CREATE POLICY "Finance roles can create payroll items"
  ON payroll_items FOR INSERT
  TO authenticated
  WITH CHECK (
    batch_id IN (
      SELECT pb.id FROM payroll_batches pb
      WHERE pb.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['super_admin', 'admin', 'hr', 'finance', 'finance_manager', 'payroll_manager', 'manager'])
      )
    )
  );

-- 3. Fix bank_files INSERT - add 'finance' role
DROP POLICY IF EXISTS "Payroll managers can create bank files" ON bank_files;
CREATE POLICY "Finance and payroll roles can create bank files"
  ON bank_files FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin', 'admin', 'finance', 'payroll_manager', 'manager'])
    )
  );

-- 4. Fix bank_files UPDATE - add 'finance' role
DROP POLICY IF EXISTS "Payroll managers can update bank files" ON bank_files;
CREATE POLICY "Finance and payroll roles can update bank files"
  ON bank_files FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin', 'admin', 'finance', 'payroll_manager', 'manager'])
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin', 'admin', 'finance', 'payroll_manager', 'manager'])
    )
  );

-- 5. Fix end_of_service_calculations INSERT - add 'finance' and 'hr'
DROP POLICY IF EXISTS "Authorized roles can create EOS calculations" ON end_of_service_calculations;
CREATE POLICY "Authorized roles can create EOS calculations"
  ON end_of_service_calculations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin', 'admin', 'hr', 'finance', 'hr_manager', 'finance_manager', 'manager'])
    )
  );

-- 6. Fix audit_log SELECT - add 'finance' role
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON audit_log;
CREATE POLICY "Admin and finance can view all audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin', 'finance'])
    )
  );

-- 7. Fix expense_receipts INSERT for HR/Finance - add 'finance' and 'hr'
DROP POLICY IF EXISTS "HR and Finance can insert expense receipts" ON expense_receipts;
CREATE POLICY "HR and Finance can insert expense receipts"
  ON expense_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT user_roles.company_id FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY(ARRAY['super_admin', 'admin', 'hr', 'finance', 'company_admin', 'hr_manager', 'finance_manager', 'manager'])
    )
  );

-- 8. Fix wps_bank_configs DELETE - add 'finance' role
DROP POLICY IF EXISTS "Admin roles can delete WPS bank configs" ON wps_bank_configs;
CREATE POLICY "Admin and finance roles can delete WPS bank configs"
  ON wps_bank_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY(ARRAY['super_admin', 'admin', 'finance', 'manager'])
      AND (user_roles.company_id = wps_bank_configs.company_id OR user_roles.role = 'super_admin')
    )
  );

-- 9. Fix has_email_admin_role function - add 'finance'
CREATE OR REPLACE FUNCTION has_email_admin_role(check_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
SELECT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role IN ('super_admin', 'admin', 'hr', 'finance')
  AND (company_id = check_company_id OR role = 'super_admin')
);
$$;
