/*
  # Fix missing CRUD policies for Performance, Salary, and HR tables

  1. Problem
    - Multiple company-owned HR tables only have SELECT policies
    - Users cannot manage performance cycles, goals, salary scales, etc.

  2. Tables Fixed (all have company_id)
    - performance_cycles (INSERT/UPDATE/DELETE)
    - performance_goals (INSERT/UPDATE/DELETE)
    - performance_improvement_plans (INSERT/UPDATE/DELETE)
    - performance_review_templates (INSERT/UPDATE/DELETE)
    - succession_plans (INSERT/UPDATE/DELETE)
    - development_plans (INSERT/UPDATE/DELETE)
    - feedback_requests (INSERT/UPDATE/DELETE)
    - salary_adjustments (INSERT/UPDATE)
    - salary_scales (INSERT/UPDATE/DELETE)
    - salary_history (INSERT)
    - cost_centers (INSERT/UPDATE/DELETE)
    - job_positions (INSERT/UPDATE/DELETE)
    - custom_reports (INSERT/UPDATE/DELETE)
    - employee_surveys (INSERT/UPDATE/DELETE)

  3. Security
    - Privileged roles only (hr, finance, manager, admin, super_admin)
    - Company isolation via company_id
*/

-- performance_cycles
CREATE POLICY "Privileged roles can insert performance cycles"
  ON performance_cycles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_cycles.company_id))));

CREATE POLICY "Privileged roles can update performance cycles"
  ON performance_cycles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_cycles.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_cycles.company_id))));

CREATE POLICY "Privileged roles can delete performance cycles"
  ON performance_cycles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_cycles.company_id))));

-- performance_goals
CREATE POLICY "Privileged roles can insert performance goals"
  ON performance_goals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_goals.company_id))));

CREATE POLICY "Privileged roles can update performance goals"
  ON performance_goals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_goals.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_goals.company_id))));

CREATE POLICY "Privileged roles can delete performance goals"
  ON performance_goals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_goals.company_id))));

-- performance_improvement_plans
CREATE POLICY "Privileged roles can insert PIPs"
  ON performance_improvement_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_improvement_plans.company_id))));

CREATE POLICY "Privileged roles can update PIPs"
  ON performance_improvement_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_improvement_plans.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_improvement_plans.company_id))));

CREATE POLICY "Privileged roles can delete PIPs"
  ON performance_improvement_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = performance_improvement_plans.company_id))));

-- performance_review_templates
CREATE POLICY "Privileged roles can insert review templates"
  ON performance_review_templates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = performance_review_templates.company_id))));

CREATE POLICY "Privileged roles can update review templates"
  ON performance_review_templates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = performance_review_templates.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = performance_review_templates.company_id))));

CREATE POLICY "Privileged roles can delete review templates"
  ON performance_review_templates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = performance_review_templates.company_id))));

-- succession_plans
CREATE POLICY "Privileged roles can insert succession plans"
  ON succession_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = succession_plans.company_id))));

CREATE POLICY "Privileged roles can update succession plans"
  ON succession_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = succession_plans.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = succession_plans.company_id))));

CREATE POLICY "Privileged roles can delete succession plans"
  ON succession_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = succession_plans.company_id))));

-- development_plans
CREATE POLICY "Privileged roles can insert development plans"
  ON development_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = development_plans.company_id))));

CREATE POLICY "Privileged roles can update development plans"
  ON development_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = development_plans.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = development_plans.company_id))));

CREATE POLICY "Privileged roles can delete development plans"
  ON development_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = development_plans.company_id))));

-- feedback_requests
CREATE POLICY "Privileged roles can insert feedback requests"
  ON feedback_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = feedback_requests.company_id))));

CREATE POLICY "Privileged roles can update feedback requests"
  ON feedback_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = feedback_requests.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = feedback_requests.company_id))));

CREATE POLICY "Privileged roles can delete feedback requests"
  ON feedback_requests FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = feedback_requests.company_id))));

-- salary_adjustments (INSERT/UPDATE only - no delete for audit trail)
CREATE POLICY "Privileged roles can insert salary adjustments"
  ON salary_adjustments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = salary_adjustments.company_id))));

CREATE POLICY "Privileged roles can update salary adjustments"
  ON salary_adjustments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = salary_adjustments.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = salary_adjustments.company_id))));

-- salary_scales
CREATE POLICY "Privileged roles can insert salary scales"
  ON salary_scales FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = salary_scales.company_id))));

CREATE POLICY "Privileged roles can update salary scales"
  ON salary_scales FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = salary_scales.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = salary_scales.company_id))));

CREATE POLICY "Privileged roles can delete salary scales"
  ON salary_scales FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = salary_scales.company_id))));

-- salary_history (INSERT only - append-only audit trail)
CREATE POLICY "Privileged roles can insert salary history"
  ON salary_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = salary_history.company_id))));

-- cost_centers
CREATE POLICY "Privileged roles can insert cost centers"
  ON cost_centers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = cost_centers.company_id))));

CREATE POLICY "Privileged roles can update cost centers"
  ON cost_centers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = cost_centers.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = cost_centers.company_id))));

CREATE POLICY "Privileged roles can delete cost centers"
  ON cost_centers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = cost_centers.company_id))));

-- job_positions
CREATE POLICY "Privileged roles can insert job positions"
  ON job_positions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = job_positions.company_id))));

CREATE POLICY "Privileged roles can update job positions"
  ON job_positions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = job_positions.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = job_positions.company_id))));

CREATE POLICY "Privileged roles can delete job positions"
  ON job_positions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = job_positions.company_id))));

-- custom_reports
CREATE POLICY "Privileged roles can insert custom reports"
  ON custom_reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = custom_reports.company_id))));

CREATE POLICY "Privileged roles can update custom reports"
  ON custom_reports FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = custom_reports.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = custom_reports.company_id))));

CREATE POLICY "Privileged roles can delete custom reports"
  ON custom_reports FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = custom_reports.company_id))));

-- employee_surveys
CREATE POLICY "Privileged roles can insert employee surveys"
  ON employee_surveys FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = employee_surveys.company_id))));

CREATE POLICY "Privileged roles can update employee surveys"
  ON employee_surveys FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = employee_surveys.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = employee_surveys.company_id))));

CREATE POLICY "Privileged roles can delete employee surveys"
  ON employee_surveys FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = employee_surveys.company_id))));
