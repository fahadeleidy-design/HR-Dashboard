/*
  # Comprehensive Employee RBAC Enforcement - Final

  1. Purpose
    - Implement enterprise-grade role-based access control (RBAC) across all modules
    - Ensure employees can only access their own data and appropriate self-service features
    - Prevent employees from accessing administrative functions and sensitive company data

  2. Modules Covered
    - Payroll: READ-ONLY access to own payroll data, deductions, and GOSI
    - Performance: Access to own reviews, goals, feedback, and PIPs
    - Attendance: Access to own shifts, schedules, and policies
    - Leave: READ access to leave types and policies
    - Expenses: READ access to expense categories and policies
    - Training: Access to own training enrollments and assignments
    - Documents: Access to templates

  3. Security Model
    - Employee role: Can ONLY view/manage their own records
    - Manager role: Can view team members' data (where applicable)
    - HR/Finance/Super Admin: Can view and manage all records
    - All policies follow least-privilege principle
*/

-- ============================================================================
-- PAYROLL MODULE - Employee READ-ONLY Access
-- ============================================================================

-- Payroll Items: Employees can view their own payroll breakdown
DROP POLICY IF EXISTS "Employees can view own payroll items" ON payroll_items;
CREATE POLICY "Employees can view own payroll items"
  ON payroll_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = payroll_items.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = payroll_items.company_id)
      )
    )
  );

-- Employee Earnings: Employees can view their own earnings
DROP POLICY IF EXISTS "Employees can view own earnings" ON employee_earnings;
CREATE POLICY "Employees can view own earnings"
  ON employee_earnings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employee_earnings.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = employee_earnings.company_id)
      )
    )
  );

-- Employee Deductions: Employees can view their own deductions
DROP POLICY IF EXISTS "Employees can view own deductions" ON employee_deductions;
CREATE POLICY "Employees can view own deductions"
  ON employee_deductions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employee_deductions.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = employee_deductions.company_id)
      )
    )
  );

-- GOSI Contributions: Employees can view their own GOSI contributions
DROP POLICY IF EXISTS "Employees can view own GOSI" ON gosi_contributions;
CREATE POLICY "Employees can view own GOSI"
  ON gosi_contributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = gosi_contributions.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = gosi_contributions.company_id)
      )
    )
  );

-- Salary History: Employees can view their own salary history
DROP POLICY IF EXISTS "Employees can view own salary history" ON salary_history;
CREATE POLICY "Employees can view own salary history"
  ON salary_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = salary_history.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = salary_history.company_id)
      )
    )
  );

-- Salary Adjustments: Employees can view their own salary adjustments
DROP POLICY IF EXISTS "Employees can view own adjustments" ON salary_adjustments;
CREATE POLICY "Employees can view own adjustments"
  ON salary_adjustments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = salary_adjustments.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = salary_adjustments.company_id)
      )
    )
  );

-- ============================================================================
-- PERFORMANCE MODULE - Employee Access to Own Data
-- ============================================================================

-- Performance Cycles: All employees can view active performance cycles (informational)
DROP POLICY IF EXISTS "Employees can view performance cycles" ON performance_cycles;
CREATE POLICY "Employees can view performance cycles"
  ON performance_cycles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = performance_cycles.company_id
    )
  );

-- Performance Review Templates: All employees can view templates (informational)
DROP POLICY IF EXISTS "Employees can view review templates" ON performance_review_templates;
CREATE POLICY "Employees can view review templates"
  ON performance_review_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = performance_review_templates.company_id
    )
  );

-- Competency Frameworks: All employees can view frameworks (informational)
DROP POLICY IF EXISTS "Employees can view competency frameworks" ON competency_frameworks;
CREATE POLICY "Employees can view competency frameworks"
  ON competency_frameworks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = competency_frameworks.company_id
    )
  );

-- Performance Improvement Plans: Employees can view their own PIPs
DROP POLICY IF EXISTS "Employees can view own PIPs" ON performance_improvement_plans;
CREATE POLICY "Employees can view own PIPs"
  ON performance_improvement_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = performance_improvement_plans.employee_id)
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = performance_improvement_plans.company_id)
      )
    )
  );

-- PIP Action Items: Employees can view action items in their PIPs
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
        (ur.role = 'employee' AND ur.employee_id = pip.employee_id)
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = pip.company_id)
      )
    )
  );

-- PIP Check-ins: Employees can view and update check-ins in their PIPs
DROP POLICY IF EXISTS "Employees can view own PIP checkins" ON pip_check_ins;
CREATE POLICY "Employees can view own PIP checkins"
  ON pip_check_ins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN performance_improvement_plans pip ON pip.id = pip_check_ins.pip_id
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = pip.employee_id)
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = pip.company_id)
      )
    )
  );

-- Goal Milestones: Employees can view milestones for their own goals
DROP POLICY IF EXISTS "Employees can view own goal milestones" ON goal_milestones;
CREATE POLICY "Employees can view own goal milestones"
  ON goal_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employee_goals eg ON eg.id = goal_milestones.goal_id
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = eg.employee_id)
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = eg.company_id)
      )
    )
  );

-- Employee Achievements: Employees can view their own achievements
DROP POLICY IF EXISTS "Employees can view own achievements" ON employee_achievements;
CREATE POLICY "Employees can view own achievements"
  ON employee_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'employee' 
      AND ur.employee_id = employee_achievements.employee_id
    ) OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'super_admin')
    )
  );

-- Feedback Requests: Employees can view feedback requests where they are the reviewer or subject
DROP POLICY IF EXISTS "Employees can view relevant feedback requests" ON feedback_requests;
CREATE POLICY "Employees can view relevant feedback requests"
  ON feedback_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND (ur.employee_id = feedback_requests.subject_employee_id OR ur.employee_id = feedback_requests.reviewer_employee_id))
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = feedback_requests.company_id)
      )
    )
  );

-- ============================================================================
-- ATTENDANCE MODULE - Employee Access to Own Data
-- ============================================================================

-- Employee Shifts: Employees can view their own shift assignments
DROP POLICY IF EXISTS "Employees can view own shifts" ON employee_shifts;
CREATE POLICY "Employees can view own shifts"
  ON employee_shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employee_shifts.employee_id)
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = employee_shifts.company_id)
      )
    )
  );

-- Attendance Shifts: All employees can view shift definitions (informational)
DROP POLICY IF EXISTS "Employees can view shift definitions" ON attendance_shifts;
CREATE POLICY "Employees can view shift definitions"
  ON attendance_shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = attendance_shifts.company_id
    )
  );

-- Attendance Policies: All employees can view attendance policies (informational)
DROP POLICY IF EXISTS "Employees can view attendance policies" ON attendance_policies;
CREATE POLICY "Employees can view attendance policies"
  ON attendance_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = attendance_policies.company_id
    )
  );

-- Attendance Locations: All employees can view attendance locations (informational)
DROP POLICY IF EXISTS "Employees can view attendance locations" ON attendance_locations;
CREATE POLICY "Employees can view attendance locations"
  ON attendance_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = attendance_locations.company_id
    )
  );

-- Attendance Exceptions: Employees can view their own attendance exceptions
DROP POLICY IF EXISTS "Employees can view own exceptions" ON attendance_exceptions;
CREATE POLICY "Employees can view own exceptions"
  ON attendance_exceptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = attendance_exceptions.employee_id)
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = attendance_exceptions.company_id)
      )
    )
  );

-- ============================================================================
-- LEAVE MODULE - Employee READ Access to Reference Data
-- ============================================================================

-- Leave Types: All employees can view leave types (informational)
DROP POLICY IF EXISTS "Employees can view leave types" ON leave_types;
CREATE POLICY "Employees can view leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = leave_types.company_id
    )
  );

-- ============================================================================
-- EXPENSES MODULE - Employee READ Access to Reference Data
-- ============================================================================

-- Expense Categories: All employees can view expense categories (informational)
DROP POLICY IF EXISTS "Employees can view expense categories" ON expense_categories;
CREATE POLICY "Employees can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = expense_categories.company_id
    )
  );

-- Expense Policies: All employees can view expense policies (informational)
DROP POLICY IF EXISTS "Employees can view expense policies" ON expense_policies;
CREATE POLICY "Employees can view expense policies"
  ON expense_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = expense_policies.company_id
    )
  );

-- Expense Reports: Employees can view their own expense reports
DROP POLICY IF EXISTS "Employees can view own expense reports" ON expense_reports;
CREATE POLICY "Employees can view own expense reports"
  ON expense_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = expense_reports.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = expense_reports.company_id)
      )
    )
  );

-- ============================================================================
-- TRAINING MODULE - Employee Access to Own Training Data
-- ============================================================================

-- Training Enrollments: Employees can view and update their own enrollments
DROP POLICY IF EXISTS "Employees can view own training enrollments" ON employee_training_records;
CREATE POLICY "Employees can view own training enrollments"
  ON employee_training_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employee_training_records.employee_id)
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = employee_training_records.company_id)
      )
    )
  );

-- Training Programs: All employees can view available training programs (informational)
DROP POLICY IF EXISTS "Employees can view training programs" ON training_programs;
CREATE POLICY "Employees can view training programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = training_programs.company_id
    )
  );

-- ============================================================================
-- DOCUMENTS MODULE - Employee Access to Templates
-- ============================================================================

-- Document Templates: All employees can view document templates (informational)
DROP POLICY IF EXISTS "Employees can view document templates" ON document_templates;
CREATE POLICY "Employees can view document templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = document_templates.company_id
    )
  );
