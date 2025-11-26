/*
  # Optimize RLS Policies - Part 5: GOSI, Compliance & Remaining Tables
  
  ## Overview
  Final optimization of RLS policies for GOSI, compliance, and all remaining tables.
  
  ## Tables Optimized
  - end_of_service_calculations (5 policies)
  - end_of_service_calculation_details (5 policies)
  - gosi_api_config (4 policies)
  - gosi_contribution_breakdown (1 policy)
  - gosi_rates_config (4 policies)
  - gosi_sync_logs (2 policies)
  - governmental_subscriptions (4 policies)
  - handbook_acknowledgments (1 policy)
  - nitaqat_weekly_snapshots (3 policies)
  - recruitment_metrics (1 policy)
  - contract_amendments (1 policy)
  - contract_templates (2 policies)
  
  ## Performance Impact
  Completes the comprehensive RLS optimization across the entire database.
*/

-- End of Service Calculations
DROP POLICY IF EXISTS "Authorized roles can create EOS calculations" ON end_of_service_calculations;
DROP POLICY IF EXISTS "HR, Finance, and Super Admin can create EOS calculations" ON end_of_service_calculations;
CREATE POLICY "Authorized roles can create EOS calculations" ON end_of_service_calculations
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Authorized roles can update draft EOS calculations" ON end_of_service_calculations;
DROP POLICY IF EXISTS "HR, Finance, and Super Admin can update draft EOS calculations" ON end_of_service_calculations;
CREATE POLICY "Authorized roles can update draft EOS calculations" ON end_of_service_calculations
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
    )
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "Super Admin and Finance can delete draft EOS calculations" ON end_of_service_calculations;
DROP POLICY IF EXISTS "Super Admin can delete draft EOS calculations" ON end_of_service_calculations;
CREATE POLICY "Super Admin can delete draft EOS calculations" ON end_of_service_calculations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'super_admin'
    )
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "Users can view company EOS calculations" ON end_of_service_calculations;
CREATE POLICY "Users can view company EOS calculations" ON end_of_service_calculations
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- End of Service Calculation Details
DROP POLICY IF EXISTS "Authorized roles can create EOS calculation details" ON end_of_service_calculation_details;
DROP POLICY IF EXISTS "HR, Finance, and Super Admin can create EOS calculation details" ON end_of_service_calculation_details;
CREATE POLICY "Authorized roles can create EOS calculation details" ON end_of_service_calculation_details
  FOR INSERT TO authenticated
  WITH CHECK (
    calculation_id IN (
      SELECT eos.id FROM end_of_service_calculations eos
      WHERE eos.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Authorized roles can update EOS calculation details" ON end_of_service_calculation_details;
DROP POLICY IF EXISTS "HR, Finance, and Super Admin can update EOS calculation details" ON end_of_service_calculation_details;
CREATE POLICY "Authorized roles can update EOS calculation details" ON end_of_service_calculation_details
  FOR UPDATE TO authenticated
  USING (
    calculation_id IN (
      SELECT eos.id FROM end_of_service_calculations eos
      WHERE eos.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Super Admin and Finance can delete EOS calculation details" ON end_of_service_calculation_details;
DROP POLICY IF EXISTS "Super Admin can delete EOS calculation details" ON end_of_service_calculation_details;
CREATE POLICY "Super Admin can delete EOS calculation details" ON end_of_service_calculation_details
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can view EOS calculation details" ON end_of_service_calculation_details;
CREATE POLICY "Users can view EOS calculation details" ON end_of_service_calculation_details
  FOR SELECT TO authenticated
  USING (
    calculation_id IN (
      SELECT eos.id FROM end_of_service_calculations eos
      WHERE eos.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- GOSI API Config
DROP POLICY IF EXISTS "Super Admin and Finance can delete GOSI config" ON gosi_api_config;
CREATE POLICY "Super Admin and Finance can delete GOSI config" ON gosi_api_config
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Super Admin and Finance can insert GOSI config" ON gosi_api_config;
CREATE POLICY "Super Admin and Finance can insert GOSI config" ON gosi_api_config
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Super Admin and Finance can update GOSI config" ON gosi_api_config;
CREATE POLICY "Super Admin and Finance can update GOSI config" ON gosi_api_config
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Super Admin, HR, and Finance can view GOSI config" ON gosi_api_config;
CREATE POLICY "Super Admin, HR, and Finance can view GOSI config" ON gosi_api_config
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
    )
  );

-- GOSI Contribution Breakdown
DROP POLICY IF EXISTS "Only admins can modify GOSI breakdown" ON gosi_contribution_breakdown;
CREATE POLICY "Only admins can modify GOSI breakdown" ON gosi_contribution_breakdown
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager')
    )
  );

-- GOSI Rates Config
DROP POLICY IF EXISTS "Super Admin and Finance can delete GOSI rates" ON gosi_rates_config;
CREATE POLICY "Super Admin and Finance can delete GOSI rates" ON gosi_rates_config
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Super Admin and Finance can insert GOSI rates" ON gosi_rates_config;
CREATE POLICY "Super Admin and Finance can insert GOSI rates" ON gosi_rates_config
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Super Admin and Finance can update GOSI rates" ON gosi_rates_config;
CREATE POLICY "Super Admin and Finance can update GOSI rates" ON gosi_rates_config
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Super Admin, HR, and Finance can view GOSI rates" ON gosi_rates_config;
CREATE POLICY "Super Admin, HR, and Finance can view GOSI rates" ON gosi_rates_config
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
    )
  );

-- GOSI Sync Logs
DROP POLICY IF EXISTS "System can insert GOSI sync logs" ON gosi_sync_logs;
CREATE POLICY "System can insert GOSI sync logs" ON gosi_sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view GOSI sync logs for their company" ON gosi_sync_logs;
CREATE POLICY "Users can view GOSI sync logs for their company" ON gosi_sync_logs
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Governmental Subscriptions
DROP POLICY IF EXISTS "Users can delete subscriptions for their company" ON governmental_subscriptions;
CREATE POLICY "Users can delete subscriptions for their company" ON governmental_subscriptions
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Users can insert subscriptions for their company" ON governmental_subscriptions;
CREATE POLICY "Users can insert subscriptions for their company" ON governmental_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Users can update subscriptions for their company" ON governmental_subscriptions;
CREATE POLICY "Users can update subscriptions for their company" ON governmental_subscriptions
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view subscriptions for their company" ON governmental_subscriptions;
CREATE POLICY "Users can view subscriptions for their company" ON governmental_subscriptions
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Handbook Acknowledgments
DROP POLICY IF EXISTS "Users can view acknowledgments" ON handbook_acknowledgments;
CREATE POLICY "Users can view acknowledgments" ON handbook_acknowledgments
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Nitaqat Weekly Snapshots
DROP POLICY IF EXISTS "Users can insert own company snapshots" ON nitaqat_weekly_snapshots;
CREATE POLICY "Users can insert own company snapshots" ON nitaqat_weekly_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can update own company snapshots" ON nitaqat_weekly_snapshots;
CREATE POLICY "Users can update own company snapshots" ON nitaqat_weekly_snapshots
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company snapshots" ON nitaqat_weekly_snapshots;
CREATE POLICY "Users can view own company snapshots" ON nitaqat_weekly_snapshots
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Recruitment Metrics
DROP POLICY IF EXISTS "Users can view recruitment metrics" ON recruitment_metrics;
CREATE POLICY "Users can view recruitment metrics" ON recruitment_metrics
  FOR SELECT TO authenticated
  USING (
    job_posting_id IN (
      SELECT jp.id FROM job_postings jp
      WHERE jp.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Contract Amendments (fix the remaining one)
DROP POLICY IF EXISTS "Users can view amendments in their company" ON contract_amendments;
CREATE POLICY "Users can view amendments in their company" ON contract_amendments
  FOR SELECT TO authenticated
  USING (
    contract_id IN (
      SELECT ec.id FROM employee_contracts ec
      WHERE ec.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Contract Templates (fix the remaining ones)
DROP POLICY IF EXISTS "HR/Admin can manage templates" ON contract_templates;
CREATE POLICY "HR/Admin can manage templates" ON contract_templates
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view templates in their company" ON contract_templates;
CREATE POLICY "Users can view templates in their company" ON contract_templates
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );