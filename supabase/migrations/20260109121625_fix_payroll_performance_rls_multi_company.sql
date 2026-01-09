/*
  # Fix Payroll and Performance RLS for Multi-Company Access

  Updates RLS policies on payroll and performance tables to allow super_admin, hr, 
  and finance roles to access data across all companies.

  ## Tables Updated
  - payroll_items
  - employee_earnings  
  - employee_deductions
  - gosi_contributions
  - salary_history
  - salary_adjustments
  - performance_cycles
  - performance_review_templates
  - competency_frameworks
  - performance_improvement_plans
  - pip_action_items
*/

-- ============================================================================
-- PAYROLL MODULE
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view own payroll items" ON payroll_items;
CREATE POLICY "Employees can view own payroll items"
  ON payroll_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = payroll_items.employee_id AND ur.company_id = payroll_items.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view own earnings" ON employee_earnings;
CREATE POLICY "Employees can view own earnings"
  ON employee_earnings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employee_earnings.employee_id AND ur.company_id = employee_earnings.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view own deductions" ON employee_deductions;
CREATE POLICY "Employees can view own deductions"
  ON employee_deductions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employee_deductions.employee_id AND ur.company_id = employee_deductions.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view own GOSI" ON gosi_contributions;
CREATE POLICY "Employees can view own GOSI"
  ON gosi_contributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = gosi_contributions.employee_id AND ur.company_id = gosi_contributions.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view own salary history" ON salary_history;
CREATE POLICY "Employees can view own salary history"
  ON salary_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = salary_history.employee_id AND ur.company_id = salary_history.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view own adjustments" ON salary_adjustments;
CREATE POLICY "Employees can view own adjustments"
  ON salary_adjustments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = salary_adjustments.employee_id AND ur.company_id = salary_adjustments.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- ============================================================================
-- PERFORMANCE MODULE
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view performance cycles" ON performance_cycles;
CREATE POLICY "Employees can view performance cycles"
  ON performance_cycles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = performance_cycles.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view review templates" ON performance_review_templates;
CREATE POLICY "Employees can view review templates"
  ON performance_review_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = performance_review_templates.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view competency frameworks" ON competency_frameworks;
CREATE POLICY "Employees can view competency frameworks"
  ON competency_frameworks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.company_id = competency_frameworks.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view own PIPs" ON performance_improvement_plans;
CREATE POLICY "Employees can view own PIPs"
  ON performance_improvement_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = performance_improvement_plans.employee_id AND ur.company_id = performance_improvement_plans.company_id)
        OR ur.role IN ('hr', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can view own PIP actions" ON pip_action_items;
CREATE POLICY "Employees can view own PIP actions"
  ON pip_action_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN performance_improvement_plans pip ON pip.id = pip_action_items.pip_id
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = pip.employee_id AND ur.company_id = pip.company_id)
        OR ur.role IN ('hr', 'super_admin')
      )
    )
  );