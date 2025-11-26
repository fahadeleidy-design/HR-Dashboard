/*
  # Optimize RLS Policies - Part 3: Employee Lifecycle Tables
  
  ## Overview
  Optimizes RLS policies for employee lifecycle management tables.
  
  ## Tables Optimized
  - employee_analytics_summary (2 policies)
  - employee_assessments (2 policies)
  - employee_certifications (2 policies)
  - employee_contracts (4 policies)
  - employee_cost_centers (4 policies)
  - employee_dependents (2 policies)
  - employee_disciplinary_actions (2 policies)
  - employee_documents (3 policies)
  - employee_education (2 policies)
  - employee_emergency_contacts (1 policy)
  - employee_equipment (2 policies)
  - employee_exit_surveys (2 policies)
  - employee_goals (2 policies)
  - employee_handbooks (4 policies)
  - employee_lifecycle_stages (2 policies)
  - employee_notes (2 policies)
  - employee_offboarding (2 policies)
  - employee_onboarding (2 policies)
  - employee_projects (2 policies)
  - employee_promotions (2 policies)
  - employee_recognitions (2 policies)
  - employee_referrals (2 policies)
  - employee_rehire_requests (2 policies)
  - employee_salary_reviews (2 policies)
  - employee_skills (2 policies)
  - employee_succession_planning (2 policies)
  - employee_survey_responses (1 policy)
  - employee_surveys (1 policy)
  - employee_time_tracking (3 policies)
  - employee_training_records (2 policies)
  - employee_transfers (2 policies)
  
  ## Performance Impact
  Significant improvement for HR operations involving many employees.
*/

-- Employee Analytics Summary
DROP POLICY IF EXISTS "Managers can manage data" ON employee_analytics_summary;
CREATE POLICY "Managers can manage data" ON employee_analytics_summary
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_analytics_summary;
CREATE POLICY "Users can view own company data" ON employee_analytics_summary
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Assessments
DROP POLICY IF EXISTS "Managers can manage data" ON employee_assessments;
CREATE POLICY "Managers can manage data" ON employee_assessments
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_assessments;
CREATE POLICY "Users can view own company data" ON employee_assessments
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Certifications
DROP POLICY IF EXISTS "Managers can manage data" ON employee_certifications;
CREATE POLICY "Managers can manage data" ON employee_certifications
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_certifications;
CREATE POLICY "Users can view own company data" ON employee_certifications
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Contracts
DROP POLICY IF EXISTS "HR/Admin can delete contracts" ON employee_contracts;
CREATE POLICY "HR/Admin can delete contracts" ON employee_contracts
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "HR/Admin can insert contracts" ON employee_contracts;
CREATE POLICY "HR/Admin can insert contracts" ON employee_contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "HR/Admin can update contracts" ON employee_contracts;
CREATE POLICY "HR/Admin can update contracts" ON employee_contracts
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view contracts in their company" ON employee_contracts;
CREATE POLICY "Users can view contracts in their company" ON employee_contracts
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Cost Centers
DROP POLICY IF EXISTS "Admins can delete cost centers" ON employee_cost_centers;
CREATE POLICY "Admins can delete cost centers" ON employee_cost_centers
  FOR DELETE TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'admin', 'finance_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Admins can insert cost centers" ON employee_cost_centers;
CREATE POLICY "Admins can insert cost centers" ON employee_cost_centers
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'admin', 'finance_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Admins can update cost centers" ON employee_cost_centers;
CREATE POLICY "Admins can update cost centers" ON employee_cost_centers
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'admin', 'finance_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Company members can view cost centers" ON employee_cost_centers;
CREATE POLICY "Company members can view cost centers" ON employee_cost_centers
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Employee Dependents
DROP POLICY IF EXISTS "Managers can manage data" ON employee_dependents;
CREATE POLICY "Managers can manage data" ON employee_dependents
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_dependents;
CREATE POLICY "Users can view own company data" ON employee_dependents
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Disciplinary Actions
DROP POLICY IF EXISTS "Managers can manage data" ON employee_disciplinary_actions;
CREATE POLICY "Managers can manage data" ON employee_disciplinary_actions
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_disciplinary_actions;
CREATE POLICY "Users can view own company data" ON employee_disciplinary_actions
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Documents
DROP POLICY IF EXISTS "Employees can view own documents" ON employee_documents;
CREATE POLICY "Employees can view own documents" ON employee_documents
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_roles ur ON ur.employee_id = e.id
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage data" ON employee_documents;
CREATE POLICY "Managers can manage data" ON employee_documents
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_documents;
CREATE POLICY "Users can view own company data" ON employee_documents
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Education
DROP POLICY IF EXISTS "Managers can manage data" ON employee_education;
CREATE POLICY "Managers can manage data" ON employee_education
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON employee_education;
CREATE POLICY "Users can view own company data" ON employee_education
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Employee Emergency Contacts
DROP POLICY IF EXISTS "Employees can view own emergency contacts" ON employee_emergency_contacts;
CREATE POLICY "Employees can view own emergency contacts" ON employee_emergency_contacts
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN user_roles ur ON ur.employee_id = e.id
      WHERE ur.user_id = (SELECT auth.uid())
    ) OR
    employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

-- Continue with remaining employee tables...