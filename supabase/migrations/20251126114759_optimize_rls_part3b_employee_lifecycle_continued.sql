/*
  # Optimize RLS Policies - Part 3B: Employee Lifecycle Tables (Continued)
  
  ## Overview
  Continues optimization of employee lifecycle RLS policies.
  
  ## Tables Optimized (continued)
  - employee_equipment
  - employee_exit_surveys
  - employee_goals
  - employee_handbooks
  - employee_lifecycle_stages
  - employee_notes
  - employee_offboarding
  - employee_onboarding
  - employee_projects
  - employee_promotions
  - employee_recognitions
  - employee_referrals
  - employee_rehire_requests
  - employee_salary_reviews
  - employee_skills
  - employee_succession_planning
  - employee_survey_responses
  - employee_surveys
  - employee_time_tracking
  - employee_training_records
  - employee_transfers
*/

-- Employee Equipment
DROP POLICY IF EXISTS "Managers can manage data" ON employee_equipment;
CREATE POLICY "Managers can manage data" ON employee_equipment
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_equipment;
CREATE POLICY "Users can view own company data" ON employee_equipment
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Exit Surveys
DROP POLICY IF EXISTS "Managers can manage data" ON employee_exit_surveys;
CREATE POLICY "Managers can manage data" ON employee_exit_surveys
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_exit_surveys;
CREATE POLICY "Users can view own company data" ON employee_exit_surveys
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Goals
DROP POLICY IF EXISTS "Managers can manage data" ON employee_goals;
CREATE POLICY "Managers can manage data" ON employee_goals
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_goals;
CREATE POLICY "Users can view own company data" ON employee_goals
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Handbooks
DROP POLICY IF EXISTS "Admins can delete handbooks" ON employee_handbooks;
CREATE POLICY "Admins can delete handbooks" ON employee_handbooks
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can insert handbooks" ON employee_handbooks;
CREATE POLICY "Admins can insert handbooks" ON employee_handbooks
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update handbooks" ON employee_handbooks;
CREATE POLICY "Admins can update handbooks" ON employee_handbooks
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view company handbooks" ON employee_handbooks;
CREATE POLICY "Users can view company handbooks" ON employee_handbooks
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Lifecycle Stages
DROP POLICY IF EXISTS "Managers can manage data" ON employee_lifecycle_stages;
CREATE POLICY "Managers can manage data" ON employee_lifecycle_stages
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_lifecycle_stages;
CREATE POLICY "Users can view own company data" ON employee_lifecycle_stages
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Notes
DROP POLICY IF EXISTS "Managers can manage data" ON employee_notes;
CREATE POLICY "Managers can manage data" ON employee_notes
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_notes;
CREATE POLICY "Users can view own company data" ON employee_notes
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Offboarding
DROP POLICY IF EXISTS "Managers can manage data" ON employee_offboarding;
CREATE POLICY "Managers can manage data" ON employee_offboarding
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_offboarding;
CREATE POLICY "Users can view own company data" ON employee_offboarding
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Onboarding
DROP POLICY IF EXISTS "Managers can manage data" ON employee_onboarding;
CREATE POLICY "Managers can manage data" ON employee_onboarding
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_onboarding;
CREATE POLICY "Users can view own company data" ON employee_onboarding
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Projects
DROP POLICY IF EXISTS "Managers can manage data" ON employee_projects;
CREATE POLICY "Managers can manage data" ON employee_projects
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_projects;
CREATE POLICY "Users can view own company data" ON employee_projects
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Promotions
DROP POLICY IF EXISTS "Managers can manage data" ON employee_promotions;
CREATE POLICY "Managers can manage data" ON employee_promotions
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_promotions;
CREATE POLICY "Users can view own company data" ON employee_promotions
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Recognitions
DROP POLICY IF EXISTS "Managers can manage data" ON employee_recognitions;
CREATE POLICY "Managers can manage data" ON employee_recognitions
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_recognitions;
CREATE POLICY "Users can view own company data" ON employee_recognitions
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Referrals
DROP POLICY IF EXISTS "Managers can manage data" ON employee_referrals;
CREATE POLICY "Managers can manage data" ON employee_referrals
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_referrals;
CREATE POLICY "Users can view own company data" ON employee_referrals
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Rehire Requests
DROP POLICY IF EXISTS "Managers can manage data" ON employee_rehire_requests;
CREATE POLICY "Managers can manage data" ON employee_rehire_requests
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_rehire_requests;
CREATE POLICY "Users can view own company data" ON employee_rehire_requests
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Salary Reviews
DROP POLICY IF EXISTS "Managers can manage data" ON employee_salary_reviews;
CREATE POLICY "Managers can manage data" ON employee_salary_reviews
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_salary_reviews;
CREATE POLICY "Users can view own company data" ON employee_salary_reviews
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Skills
DROP POLICY IF EXISTS "Managers can manage data" ON employee_skills;
CREATE POLICY "Managers can manage data" ON employee_skills
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_skills;
CREATE POLICY "Users can view own company data" ON employee_skills
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Succession Planning
DROP POLICY IF EXISTS "Managers can manage data" ON employee_succession_planning;
CREATE POLICY "Managers can manage data" ON employee_succession_planning
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_succession_planning;
CREATE POLICY "Users can view own company data" ON employee_succession_planning
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Survey Responses
DROP POLICY IF EXISTS "Users can submit survey responses" ON employee_survey_responses;
CREATE POLICY "Users can submit survey responses" ON employee_survey_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    survey_id IN (
      SELECT es.id FROM employee_surveys es
      WHERE es.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Employee Surveys
DROP POLICY IF EXISTS "Users can view active surveys" ON employee_surveys;
CREATE POLICY "Users can view active surveys" ON employee_surveys
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Time Tracking
DROP POLICY IF EXISTS "Employees can view own time tracking" ON employee_time_tracking;
CREATE POLICY "Employees can view own time tracking" ON employee_time_tracking
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_roles ur ON ur.employee_id = e.id
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage data" ON employee_time_tracking;
CREATE POLICY "Managers can manage data" ON employee_time_tracking
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_time_tracking;
CREATE POLICY "Users can view own company data" ON employee_time_tracking
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Training Records
DROP POLICY IF EXISTS "Managers can manage data" ON employee_training_records;
CREATE POLICY "Managers can manage data" ON employee_training_records
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_training_records;
CREATE POLICY "Users can view own company data" ON employee_training_records
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Transfers
DROP POLICY IF EXISTS "Managers can manage data" ON employee_transfers;
CREATE POLICY "Managers can manage data" ON employee_transfers
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_transfers;
CREATE POLICY "Users can view own company data" ON employee_transfers
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );