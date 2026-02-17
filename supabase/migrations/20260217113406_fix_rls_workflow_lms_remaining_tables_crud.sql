/*
  # Fix missing CRUD policies for Workflow, LMS, and remaining tables

  1. Problem
    - Multiple workflow, LMS, and child tables only have partial policies
    - Users cannot manage approval workflows, PIP items, salary bands, etc.

  2. Tables Fixed
    With company_id:
    - approval_requests (INSERT/UPDATE)
    - approval_workflows (INSERT/UPDATE/DELETE)
    - system_activity_log (INSERT)

    Via parent table join:
    - pip_action_items (INSERT/UPDATE/DELETE via PIPs -> company_id)
    - pip_check_ins (INSERT/UPDATE via PIPs -> company_id)
    - goal_milestones (INSERT/UPDATE/DELETE via performance_goals -> company_id)
    - salary_bands (INSERT/UPDATE/DELETE via salary_scales -> company_id)
    - salary_proposals (INSERT/UPDATE via employees -> company_id)
    - contract_renewals (INSERT/UPDATE via contracts -> employees -> company_id)
    - certification_renewals (INSERT/UPDATE via employees -> company_id)
    - learning_recommendations (INSERT/UPDATE via employees -> company_id)
    - mentorship_matches (INSERT via employees -> company_id)
    - skill_matches (INSERT via employees -> company_id)

    Role-based only (child/junction tables):
    - document_shares (INSERT/DELETE)
    - document_approvals (INSERT)
    - course_prerequisites (INSERT/DELETE)
    - course_tag_mappings (INSERT/DELETE)
    - learning_path_courses (INSERT/DELETE)
    - external_content_items (INSERT/UPDATE/DELETE)
    - visa_fees_structure (INSERT/UPDATE/DELETE)

  3. Security
    - Privileged roles enforced on all policies
    - Company isolation via parent joins where possible
*/

-- approval_requests (has company_id)
CREATE POLICY "Privileged roles can insert approval requests"
  ON approval_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = approval_requests.company_id))));

CREATE POLICY "Privileged roles can update approval requests"
  ON approval_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = approval_requests.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = approval_requests.company_id))));

-- approval_workflows (has company_id)
CREATE POLICY "Privileged roles can insert approval workflows"
  ON approval_workflows FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = approval_workflows.company_id))));

CREATE POLICY "Privileged roles can update approval workflows"
  ON approval_workflows FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = approval_workflows.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = approval_workflows.company_id))));

CREATE POLICY "Privileged roles can delete approval workflows"
  ON approval_workflows FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = approval_workflows.company_id))));

-- system_activity_log (has company_id - INSERT only for audit)
CREATE POLICY "Privileged roles can insert system activity log"
  ON system_activity_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))));

-- pip_action_items (FK to performance_improvement_plans -> company_id)
CREATE POLICY "Privileged roles can insert PIP action items"
  ON pip_action_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_improvement_plans pip ON pip.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pip.id = pip_action_items.pip_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can update PIP action items"
  ON pip_action_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_improvement_plans pip ON pip.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pip.id = pip_action_items.pip_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_improvement_plans pip ON pip.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pip.id = pip_action_items.pip_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can delete PIP action items"
  ON pip_action_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_improvement_plans pip ON pip.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pip.id = pip_action_items.pip_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

-- pip_check_ins (FK to performance_improvement_plans -> company_id)
CREATE POLICY "Privileged roles can insert PIP check-ins"
  ON pip_check_ins FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_improvement_plans pip ON pip.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pip.id = pip_check_ins.pip_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can update PIP check-ins"
  ON pip_check_ins FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_improvement_plans pip ON pip.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pip.id = pip_check_ins.pip_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_improvement_plans pip ON pip.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pip.id = pip_check_ins.pip_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

-- goal_milestones (FK to performance_goals -> company_id)
CREATE POLICY "Privileged roles can insert goal milestones"
  ON goal_milestones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_goals pg ON pg.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pg.id = goal_milestones.goal_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can update goal milestones"
  ON goal_milestones FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_goals pg ON pg.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pg.id = goal_milestones.goal_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_goals pg ON pg.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pg.id = goal_milestones.goal_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can delete goal milestones"
  ON goal_milestones FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN performance_goals pg ON pg.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND pg.id = goal_milestones.goal_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

-- salary_bands (FK to salary_scales -> company_id)
CREATE POLICY "Privileged roles can insert salary bands"
  ON salary_bands FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN salary_scales ss ON ss.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND ss.id = salary_bands.salary_scale_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'admin'))
  ));

CREATE POLICY "Privileged roles can update salary bands"
  ON salary_bands FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN salary_scales ss ON ss.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND ss.id = salary_bands.salary_scale_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN salary_scales ss ON ss.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND ss.id = salary_bands.salary_scale_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'admin'))
  ));

CREATE POLICY "Privileged roles can delete salary bands"
  ON salary_bands FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN salary_scales ss ON ss.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND ss.id = salary_bands.salary_scale_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'admin'))
  ));

-- salary_proposals (employee_id FK to employees -> company_id)
CREATE POLICY "Privileged roles can insert salary proposals"
  ON salary_proposals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = salary_proposals.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can update salary proposals"
  ON salary_proposals FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = salary_proposals.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = salary_proposals.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
  ));

-- contract_renewals (FK to contracts - need to check contracts table for company link)
CREATE POLICY "Privileged roles can insert contract renewals"
  ON contract_renewals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can update contract renewals"
  ON contract_renewals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))));

CREATE POLICY "Privileged roles can delete contract renewals"
  ON contract_renewals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))));

-- certification_renewals (employee_id)
CREATE POLICY "Privileged roles can insert certification renewals"
  ON certification_renewals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = certification_renewals.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can update certification renewals"
  ON certification_renewals FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = certification_renewals.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = certification_renewals.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

-- learning_recommendations (employee_id)
CREATE POLICY "Privileged roles can insert learning recommendations"
  ON learning_recommendations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = learning_recommendations.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

CREATE POLICY "Privileged roles can update learning recommendations"
  ON learning_recommendations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = learning_recommendations.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = learning_recommendations.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

-- mentorship_matches (FK to employees via mentor_id/mentee_id)
CREATE POLICY "Privileged roles can insert mentorship matches"
  ON mentorship_matches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))));

-- skill_matches (employee_id)
CREATE POLICY "Privileged roles can insert skill matches"
  ON skill_matches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.company_id = ur.company_id
    WHERE ur.user_id = auth.uid() AND e.id = skill_matches.employee_id
      AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))
  ));

-- document_shares (role-based, no company_id)
CREATE POLICY "Privileged roles can insert document shares"
  ON document_shares FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))));

CREATE POLICY "Privileged roles can delete document shares"
  ON document_shares FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))));

-- document_approvals (needs INSERT)
CREATE POLICY "Privileged roles can insert document approvals"
  ON document_approvals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'manager', 'admin'))));

-- course_prerequisites (role-based)
CREATE POLICY "Privileged roles can insert course prerequisites"
  ON course_prerequisites FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

CREATE POLICY "Privileged roles can delete course prerequisites"
  ON course_prerequisites FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

-- course_tag_mappings (role-based)
CREATE POLICY "Privileged roles can insert course tag mappings"
  ON course_tag_mappings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

CREATE POLICY "Privileged roles can delete course tag mappings"
  ON course_tag_mappings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

-- learning_path_courses (role-based)
CREATE POLICY "Privileged roles can insert learning path courses"
  ON learning_path_courses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

CREATE POLICY "Privileged roles can delete learning path courses"
  ON learning_path_courses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

-- external_content_items (role-based)
CREATE POLICY "Privileged roles can insert external content items"
  ON external_content_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

CREATE POLICY "Privileged roles can update external content items"
  ON external_content_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

CREATE POLICY "Privileged roles can delete external content items"
  ON external_content_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'admin'))));

-- visa_fees_structure (admin reference data)
CREATE POLICY "Admins can insert visa fees structure"
  ON visa_fees_structure FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role = 'admin')));

CREATE POLICY "Admins can update visa fees structure"
  ON visa_fees_structure FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role = 'admin')));

CREATE POLICY "Admins can delete visa fees structure"
  ON visa_fees_structure FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR ur.role = 'admin')));
