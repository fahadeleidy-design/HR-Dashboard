/*
  # HR Cross-Company Access — Batch 2 (Fixed): Expense, Finance, GOSI, Leave, Payroll, Performance

  Grants HR role unrestricted cross-company access using is_hr_or_above().
  Tables without direct company_id use is_hr_or_above() as sole privilege gate.
*/

-- expense_categories_limits
DROP POLICY IF EXISTS "Privileged roles can update expense category limits" ON expense_categories_limits;
CREATE POLICY "Privileged roles can update expense category limits"
  ON expense_categories_limits FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = expense_categories_limits.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = expense_categories_limits.company_id));

-- expense_claims
DROP POLICY IF EXISTS "Expense claims role-based update" ON expense_claims;
CREATE POLICY "Expense claims role-based update"
  ON expense_claims FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ((ur.role = 'employee' AND ur.employee_id = expense_claims.employee_id) OR (ur.role = 'manager' AND ur.company_id = expense_claims.company_id))))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ((ur.role = 'employee' AND ur.employee_id = expense_claims.employee_id) OR (ur.role = 'manager' AND ur.company_id = expense_claims.company_id))));

-- expense_per_diem
DROP POLICY IF EXISTS "Privileged roles can update expense per diem" ON expense_per_diem;
CREATE POLICY "Privileged roles can update expense per diem"
  ON expense_per_diem FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = expense_per_diem.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = expense_per_diem.company_id));

-- expense_violations
DROP POLICY IF EXISTS "Privileged roles can update expense violations" ON expense_violations;
CREATE POLICY "Privileged roles can update expense violations"
  ON expense_violations FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = expense_violations.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = expense_violations.company_id));

-- feedback_requests
DROP POLICY IF EXISTS "Privileged roles can update feedback requests" ON feedback_requests;
CREATE POLICY "Privileged roles can update feedback requests"
  ON feedback_requests FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = feedback_requests.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = feedback_requests.company_id));

-- financial_periods
DROP POLICY IF EXISTS "Finance can update financial periods" ON financial_periods;
CREATE POLICY "Finance can update financial periods"
  ON financial_periods FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'));

-- goal_milestones (no company_id — linked via goal_id -> employee_goals)
DROP POLICY IF EXISTS "Privileged roles can update goal milestones" ON goal_milestones;
CREATE POLICY "Privileged roles can update goal milestones"
  ON goal_milestones FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM employee_goals eg
    JOIN user_roles ur ON ur.company_id = eg.company_id
    WHERE eg.id = goal_milestones.goal_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ))
  WITH CHECK (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM employee_goals eg
    JOIN user_roles ur ON ur.company_id = eg.company_id
    WHERE eg.id = goal_milestones.goal_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ));

-- gosi_contributions
DROP POLICY IF EXISTS "Privileged roles can update GOSI contributions" ON gosi_contributions;
CREATE POLICY "Privileged roles can update GOSI contributions"
  ON gosi_contributions FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = gosi_contributions.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = gosi_contributions.company_id));

-- gosi_filing_records
DROP POLICY IF EXISTS "Finance can update gosi filing records" ON gosi_filing_records;
CREATE POLICY "Finance can update gosi filing records"
  ON gosi_filing_records FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'));

-- governmental_documents
DROP POLICY IF EXISTS "Privileged roles can update governmental documents" ON governmental_documents;
CREATE POLICY "Privileged roles can update governmental documents"
  ON governmental_documents FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = governmental_documents.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = governmental_documents.company_id));

-- insurance_beneficiaries (no company_id — linked via employee_id)
DROP POLICY IF EXISTS "Privileged roles can update insurance beneficiaries" ON insurance_beneficiaries;
CREATE POLICY "Privileged roles can update insurance beneficiaries"
  ON insurance_beneficiaries FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = insurance_beneficiaries.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = insurance_beneficiaries.employee_id AND ur.role = 'manager'));

-- insurance_claims
DROP POLICY IF EXISTS "Privileged roles can update insurance claims" ON insurance_claims;
CREATE POLICY "Privileged roles can update insurance claims"
  ON insurance_claims FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = insurance_claims.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = insurance_claims.company_id));

-- integration_links
DROP POLICY IF EXISTS "Privileged roles can update integration links" ON integration_links;
CREATE POLICY "Privileged roles can update integration links"
  ON integration_links FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = integration_links.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = integration_links.company_id));

-- iqama_dependents (no company_id — linked via employee_id)
DROP POLICY IF EXISTS "Privileged roles can update iqama dependents" ON iqama_dependents;
CREATE POLICY "Privileged roles can update iqama dependents"
  ON iqama_dependents FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = iqama_dependents.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = iqama_dependents.employee_id AND ur.role = 'manager'));

-- job_positions
DROP POLICY IF EXISTS "Privileged roles can update job positions" ON job_positions;
CREATE POLICY "Privileged roles can update job positions"
  ON job_positions FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = job_positions.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = job_positions.company_id));

-- learning_recommendations (no company_id — linked via employee_id)
DROP POLICY IF EXISTS "Privileged roles can update learning recommendations" ON learning_recommendations;
CREATE POLICY "Privileged roles can update learning recommendations"
  ON learning_recommendations FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = learning_recommendations.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = learning_recommendations.employee_id AND ur.role = 'manager'));

-- leave_requests
DROP POLICY IF EXISTS "Leave requests role-based update" ON leave_requests;
CREATE POLICY "Leave requests role-based update"
  ON leave_requests FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ((ur.role = 'employee' AND ur.employee_id = leave_requests.employee_id AND ur.company_id = leave_requests.company_id) OR (ur.role = 'manager' AND ur.company_id = leave_requests.company_id))))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ((ur.role = 'employee' AND ur.employee_id = leave_requests.employee_id AND ur.company_id = leave_requests.company_id) OR (ur.role = 'manager' AND ur.company_id = leave_requests.company_id))));

-- loans
DROP POLICY IF EXISTS "Staff can update loans" ON loans;
CREATE POLICY "Staff can update loans"
  ON loans FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ((ur.role = 'employee' AND ur.employee_id = loans.employee_id) OR (ur.role = 'manager' AND ur.company_id = loans.company_id))))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ((ur.role = 'employee' AND ur.employee_id = loans.employee_id) OR (ur.role = 'manager' AND ur.company_id = loans.company_id))));

-- nitaqat_tracking
DROP POLICY IF EXISTS "Privileged roles can update Nitaqat tracking" ON nitaqat_tracking;
CREATE POLICY "Privileged roles can update Nitaqat tracking"
  ON nitaqat_tracking FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = nitaqat_tracking.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = nitaqat_tracking.company_id));

-- payment_reconciliations
DROP POLICY IF EXISTS "Finance can update payment reconciliations" ON payment_reconciliations;
CREATE POLICY "Finance can update payment reconciliations"
  ON payment_reconciliations FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'));

-- payroll (legacy)
DROP POLICY IF EXISTS "Privileged roles can update payroll" ON payroll;
CREATE POLICY "Privileged roles can update payroll"
  ON payroll FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll.company_id));

-- payroll_analytics
DROP POLICY IF EXISTS "Privileged roles can update payroll analytics" ON payroll_analytics;
CREATE POLICY "Privileged roles can update payroll analytics"
  ON payroll_analytics FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll_analytics.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll_analytics.company_id));

-- payroll_calendars
DROP POLICY IF EXISTS "Privileged roles can update payroll calendars" ON payroll_calendars;
CREATE POLICY "Privileged roles can update payroll calendars"
  ON payroll_calendars FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll_calendars.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll_calendars.company_id));

-- payroll_formulas
DROP POLICY IF EXISTS "Privileged roles can update payroll formulas" ON payroll_formulas;
CREATE POLICY "Privileged roles can update payroll formulas"
  ON payroll_formulas FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll_formulas.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll_formulas.company_id));

-- payroll_settings
DROP POLICY IF EXISTS "Privileged roles can update payroll settings" ON payroll_settings;
CREATE POLICY "Privileged roles can update payroll settings"
  ON payroll_settings FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll_settings.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payroll_settings.company_id));

-- payslips
DROP POLICY IF EXISTS "Privileged roles can update payslips" ON payslips;
CREATE POLICY "Privileged roles can update payslips"
  ON payslips FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payslips.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = payslips.company_id));

-- penalty_types
DROP POLICY IF EXISTS "HR and Admin can update penalty types" ON penalty_types;
CREATE POLICY "HR and Admin can update penalty types"
  ON penalty_types FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = penalty_types.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = penalty_types.company_id));

-- performance_cycles
DROP POLICY IF EXISTS "Privileged roles can update performance cycles" ON performance_cycles;
CREATE POLICY "Privileged roles can update performance cycles"
  ON performance_cycles FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = performance_cycles.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = performance_cycles.company_id));

-- performance_goals
DROP POLICY IF EXISTS "Privileged roles can update performance goals" ON performance_goals;
CREATE POLICY "Privileged roles can update performance goals"
  ON performance_goals FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = performance_goals.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = performance_goals.company_id));

-- performance_improvement_plans
DROP POLICY IF EXISTS "Privileged roles can update PIPs" ON performance_improvement_plans;
CREATE POLICY "Privileged roles can update PIPs"
  ON performance_improvement_plans FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = performance_improvement_plans.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = performance_improvement_plans.company_id));

-- performance_review_templates
DROP POLICY IF EXISTS "Privileged roles can update review templates" ON performance_review_templates;
CREATE POLICY "Privileged roles can update review templates"
  ON performance_review_templates FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = performance_review_templates.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = performance_review_templates.company_id));

-- pip_action_items (no company_id — linked via pip_id -> performance_improvement_plans)
DROP POLICY IF EXISTS "Privileged roles can update PIP action items" ON pip_action_items;
CREATE POLICY "Privileged roles can update PIP action items"
  ON pip_action_items FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM performance_improvement_plans pip
    JOIN user_roles ur ON ur.company_id = pip.company_id
    WHERE pip.id = pip_action_items.pip_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ))
  WITH CHECK (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM performance_improvement_plans pip
    JOIN user_roles ur ON ur.company_id = pip.company_id
    WHERE pip.id = pip_action_items.pip_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ));

-- pip_check_ins (no company_id — linked via pip_id -> performance_improvement_plans)
DROP POLICY IF EXISTS "Privileged roles can update PIP check-ins" ON pip_check_ins;
CREATE POLICY "Privileged roles can update PIP check-ins"
  ON pip_check_ins FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM performance_improvement_plans pip
    JOIN user_roles ur ON ur.company_id = pip.company_id
    WHERE pip.id = pip_check_ins.pip_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ))
  WITH CHECK (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM performance_improvement_plans pip
    JOIN user_roles ur ON ur.company_id = pip.company_id
    WHERE pip.id = pip_check_ins.pip_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ));
