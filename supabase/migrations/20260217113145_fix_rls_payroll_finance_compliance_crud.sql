/*
  # Fix missing CRUD policies for Payroll, Finance, and Compliance tables

  1. Problem
    - Payroll and finance tables only have SELECT policies (or partial policies)
    - Users cannot manage payroll calendars, formulas, GOSI, Nitaqat, etc.

  2. Tables Fixed (all have company_id)
    - deduction_types (INSERT/UPDATE/DELETE)
    - earnings_types (INSERT/UPDATE/DELETE)
    - payroll_calendars (INSERT/UPDATE/DELETE)
    - payroll_formulas (INSERT/UPDATE/DELETE)
    - payslips (INSERT/UPDATE)
    - payroll_analytics (INSERT/UPDATE)
    - wps_payroll_files (INSERT/UPDATE)
    - gosi_contributions (INSERT/UPDATE)
    - nitaqat_tracking (INSERT/UPDATE)
    - recruitment_metrics (INSERT/UPDATE)
    - expense_categories_limits (INSERT/UPDATE/DELETE)
    - expense_per_diem (INSERT/UPDATE/DELETE)
    - expense_violations (INSERT/UPDATE)
    - vehicle_violations (INSERT/UPDATE/DELETE)
    - system_settings (INSERT/UPDATE)
    - system_alerts (INSERT/UPDATE)
    - companies (UPDATE)

  3. Security
    - Privileged roles only with company isolation
*/

-- deduction_types
CREATE POLICY "Privileged roles can insert deduction types"
  ON deduction_types FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = deduction_types.company_id))));

CREATE POLICY "Privileged roles can update deduction types"
  ON deduction_types FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = deduction_types.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = deduction_types.company_id))));

CREATE POLICY "Privileged roles can delete deduction types"
  ON deduction_types FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = deduction_types.company_id))));

-- earnings_types
CREATE POLICY "Privileged roles can insert earnings types"
  ON earnings_types FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = earnings_types.company_id))));

CREATE POLICY "Privileged roles can update earnings types"
  ON earnings_types FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = earnings_types.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = earnings_types.company_id))));

CREATE POLICY "Privileged roles can delete earnings types"
  ON earnings_types FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = earnings_types.company_id))));

-- payroll_calendars
CREATE POLICY "Privileged roles can insert payroll calendars"
  ON payroll_calendars FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_calendars.company_id))));

CREATE POLICY "Privileged roles can update payroll calendars"
  ON payroll_calendars FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_calendars.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_calendars.company_id))));

CREATE POLICY "Privileged roles can delete payroll calendars"
  ON payroll_calendars FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_calendars.company_id))));

-- payroll_formulas
CREATE POLICY "Privileged roles can insert payroll formulas"
  ON payroll_formulas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_formulas.company_id))));

CREATE POLICY "Privileged roles can update payroll formulas"
  ON payroll_formulas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_formulas.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_formulas.company_id))));

CREATE POLICY "Privileged roles can delete payroll formulas"
  ON payroll_formulas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_formulas.company_id))));

-- payslips (INSERT/UPDATE - system generates these)
CREATE POLICY "Privileged roles can insert payslips"
  ON payslips FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payslips.company_id))));

CREATE POLICY "Privileged roles can update payslips"
  ON payslips FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payslips.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payslips.company_id))));

-- payroll_analytics (INSERT/UPDATE)
CREATE POLICY "Privileged roles can insert payroll analytics"
  ON payroll_analytics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_analytics.company_id))));

CREATE POLICY "Privileged roles can update payroll analytics"
  ON payroll_analytics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_analytics.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = payroll_analytics.company_id))));

-- wps_payroll_files (INSERT/UPDATE)
CREATE POLICY "Privileged roles can insert WPS payroll files"
  ON wps_payroll_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = wps_payroll_files.company_id))));

CREATE POLICY "Privileged roles can update WPS payroll files"
  ON wps_payroll_files FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = wps_payroll_files.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = wps_payroll_files.company_id))));

-- gosi_contributions (INSERT/UPDATE)
CREATE POLICY "Privileged roles can insert GOSI contributions"
  ON gosi_contributions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = gosi_contributions.company_id))));

CREATE POLICY "Privileged roles can update GOSI contributions"
  ON gosi_contributions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = gosi_contributions.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = gosi_contributions.company_id))));

-- nitaqat_tracking (INSERT/UPDATE)
CREATE POLICY "Privileged roles can insert Nitaqat tracking"
  ON nitaqat_tracking FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = nitaqat_tracking.company_id))));

CREATE POLICY "Privileged roles can update Nitaqat tracking"
  ON nitaqat_tracking FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = nitaqat_tracking.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = nitaqat_tracking.company_id))));

-- recruitment_metrics (INSERT/UPDATE)
CREATE POLICY "Privileged roles can insert recruitment metrics"
  ON recruitment_metrics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = recruitment_metrics.company_id))));

CREATE POLICY "Privileged roles can update recruitment metrics"
  ON recruitment_metrics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = recruitment_metrics.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = recruitment_metrics.company_id))));

-- expense_categories_limits
CREATE POLICY "Privileged roles can insert expense category limits"
  ON expense_categories_limits FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_categories_limits.company_id))));

CREATE POLICY "Privileged roles can update expense category limits"
  ON expense_categories_limits FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_categories_limits.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_categories_limits.company_id))));

CREATE POLICY "Privileged roles can delete expense category limits"
  ON expense_categories_limits FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_categories_limits.company_id))));

-- expense_per_diem
CREATE POLICY "Privileged roles can insert expense per diem"
  ON expense_per_diem FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_per_diem.company_id))));

CREATE POLICY "Privileged roles can update expense per diem"
  ON expense_per_diem FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_per_diem.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_per_diem.company_id))));

CREATE POLICY "Privileged roles can delete expense per diem"
  ON expense_per_diem FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_per_diem.company_id))));

-- expense_violations (INSERT/UPDATE)
CREATE POLICY "Privileged roles can insert expense violations"
  ON expense_violations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_violations.company_id))));

CREATE POLICY "Privileged roles can update expense violations"
  ON expense_violations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_violations.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = expense_violations.company_id))));

-- vehicle_violations
CREATE POLICY "Privileged roles can insert vehicle violations"
  ON vehicle_violations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_violations.company_id))));

CREATE POLICY "Privileged roles can update vehicle violations"
  ON vehicle_violations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_violations.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_violations.company_id))));

CREATE POLICY "Privileged roles can delete vehicle violations"
  ON vehicle_violations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_violations.company_id))));

-- system_settings (INSERT/UPDATE for admins)
CREATE POLICY "Admins can insert system settings"
  ON system_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = system_settings.company_id))));

CREATE POLICY "Admins can update system settings"
  ON system_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = system_settings.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = system_settings.company_id))));

-- system_alerts (INSERT/UPDATE)
CREATE POLICY "Privileged roles can insert system alerts"
  ON system_alerts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = system_alerts.company_id))));

CREATE POLICY "Privileged roles can update system alerts"
  ON system_alerts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = system_alerts.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = system_alerts.company_id))));

-- companies (UPDATE for admins - already has SELECT and INSERT)
CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = companies.id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = companies.id))));
