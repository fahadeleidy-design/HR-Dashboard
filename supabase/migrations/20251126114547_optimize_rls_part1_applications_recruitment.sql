/*
  # Optimize RLS Policies - Part 1: Applications & Recruitment
  
  ## Overview
  Optimizes RLS policies for application and recruitment-related tables by wrapping
  auth.uid() calls with SELECT subqueries for better performance at scale.
  
  ## Tables Optimized
  - application_stage_history (2 policies)
  - applications (2 policies)
  - candidates (1 policy)
  - interviews (2 policies)
  - interview_feedback (2 policies)
  - job_postings (2 policies)
  - job_offers (2 policies)
  
  ## Performance Impact
  Each policy will now evaluate auth.uid() once per query instead of once per row.
*/

-- Application Stage History
DROP POLICY IF EXISTS "Users can insert stage history" ON application_stage_history;
CREATE POLICY "Users can insert stage history" ON application_stage_history
  FOR INSERT TO authenticated
  WITH CHECK (
    application_id IN (
      SELECT a.id FROM applications a
      WHERE a.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can view stage history" ON application_stage_history;
CREATE POLICY "Users can view stage history" ON application_stage_history
  FOR SELECT TO authenticated
  USING (
    application_id IN (
      SELECT a.id FROM applications a
      WHERE a.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Applications
DROP POLICY IF EXISTS "Admins can manage applications" ON applications;
CREATE POLICY "Admins can manage applications" ON applications
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can view company applications" ON applications;
CREATE POLICY "Users can view company applications" ON applications
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Candidates
DROP POLICY IF EXISTS "Users can view candidates" ON candidates;
CREATE POLICY "Users can view candidates" ON candidates
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT a.candidate_id FROM applications a
      WHERE a.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Interviews
DROP POLICY IF EXISTS "Admins can manage interviews" ON interviews;
CREATE POLICY "Admins can manage interviews" ON interviews
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('admin', 'super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view company interviews" ON interviews;
CREATE POLICY "Users can view company interviews" ON interviews
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Interview Feedback
DROP POLICY IF EXISTS "Interviewers can submit feedback" ON interview_feedback;
CREATE POLICY "Interviewers can submit feedback" ON interview_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    interviewer_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN interviews i ON i.id = interview_id
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.company_id = i.company_id
      AND ur.role IN ('admin', 'super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view interview feedback" ON interview_feedback;
CREATE POLICY "Users can view interview feedback" ON interview_feedback
  FOR SELECT TO authenticated
  USING (
    interviewer_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN interviews i ON i.id = interview_id
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.company_id = i.company_id
    )
  );

-- Job Postings
DROP POLICY IF EXISTS "Admins can manage job postings" ON job_postings;
CREATE POLICY "Admins can manage job postings" ON job_postings
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('admin', 'super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view company job postings" ON job_postings;
CREATE POLICY "Users can view company job postings" ON job_postings
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Job Offers
DROP POLICY IF EXISTS "Admins can manage job offers" ON job_offers;
CREATE POLICY "Admins can manage job offers" ON job_offers
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('admin', 'super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view company job offers" ON job_offers;
CREATE POLICY "Users can view company job offers" ON job_offers
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );