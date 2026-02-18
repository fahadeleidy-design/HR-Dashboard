/*
  # HR Cross-Company Access — Batch 1: Core HR Tables

  Replaces all company-scoped UPDATE/INSERT/DELETE/SELECT policies for the HR role
  with versions that use is_hr_or_above(), giving HR unrestricted access across all companies.

  Tables covered in this batch:
  - ai_workflows
  - approval_requests
  - approval_workflows
  - attendance
  - bank_files
  - budgets
  - business_travel
  - certification_renewals
  - companies
  - competency_frameworks
  - cost_centers
  - custom_reports
  - deduction_types
  - development_plans
  - document_renewals
  - earnings_types
  - employee_achievements
  - employee_beneficiaries
  - employee_deductions
  - employee_earnings
  - employee_emergency_contacts
  - employee_medical_records
  - employee_penalties
  - employee_qualifications
  - employee_surveys
  - employee_warnings
  - eos_finance_reviews
  - exit_reentry_permits
*/

-- ai_workflows
DROP POLICY IF EXISTS "AI workflows updatable by admin/hr" ON ai_workflows;
CREATE POLICY "AI workflows updatable by admin/hr"
  ON ai_workflows FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = ai_workflows.company_id AND role = ANY (ARRAY['admin','hr','hr_admin'])))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = ai_workflows.company_id AND role = ANY (ARRAY['admin','hr','hr_admin'])));

-- approval_requests
DROP POLICY IF EXISTS "Privileged roles can update approval requests" ON approval_requests;
CREATE POLICY "Privileged roles can update approval requests"
  ON approval_requests FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['manager']) AND ur.company_id = approval_requests.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['manager']) AND ur.company_id = approval_requests.company_id));

-- approval_workflows
DROP POLICY IF EXISTS "Privileged roles can update approval workflows" ON approval_workflows;
CREATE POLICY "Privileged roles can update approval workflows"
  ON approval_workflows FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = approval_workflows.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = approval_workflows.company_id));

-- attendance
DROP POLICY IF EXISTS "Attendance role-based update" ON attendance;
CREATE POLICY "Attendance role-based update"
  ON attendance FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ((ur.role = 'employee' AND ur.employee_id = attendance.employee_id AND ur.company_id = attendance.company_id) OR (ur.role = 'manager'))))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()));

-- bank_files
DROP POLICY IF EXISTS "Finance and payroll roles can update bank files" ON bank_files;
CREATE POLICY "Finance and payroll roles can update bank files"
  ON bank_files FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['manager','payroll_manager'])))
  WITH CHECK (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['manager','payroll_manager'])));

-- budgets
DROP POLICY IF EXISTS "Finance can update budgets" ON budgets;
CREATE POLICY "Finance can update budgets"
  ON budgets FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'));

-- business_travel
DROP POLICY IF EXISTS "Privileged roles can update business travel" ON business_travel;
CREATE POLICY "Privileged roles can update business travel"
  ON business_travel FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = business_travel.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = business_travel.company_id));

-- certification_renewals
DROP POLICY IF EXISTS "Privileged roles can update certification renewals" ON certification_renewals;
CREATE POLICY "Privileged roles can update certification renewals"
  ON certification_renewals FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = certification_renewals.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = certification_renewals.employee_id AND ur.role = 'manager'));

-- companies: HR can read all companies
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.company_id = companies.id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.company_id = companies.id));

-- competency_frameworks
DROP POLICY IF EXISTS "Privileged roles can update competency frameworks" ON competency_frameworks;
CREATE POLICY "Privileged roles can update competency frameworks"
  ON competency_frameworks FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = competency_frameworks.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = competency_frameworks.company_id));

-- cost_centers
DROP POLICY IF EXISTS "Privileged roles can update cost centers" ON cost_centers;
CREATE POLICY "Privileged roles can update cost centers"
  ON cost_centers FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = cost_centers.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = cost_centers.company_id));

-- custom_reports
DROP POLICY IF EXISTS "Privileged roles can update custom reports" ON custom_reports;
CREATE POLICY "Privileged roles can update custom reports"
  ON custom_reports FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = custom_reports.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = custom_reports.company_id));

-- deduction_types
DROP POLICY IF EXISTS "Privileged roles can update deduction types" ON deduction_types;
CREATE POLICY "Privileged roles can update deduction types"
  ON deduction_types FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = deduction_types.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = deduction_types.company_id));

-- development_plans
DROP POLICY IF EXISTS "Privileged roles can update development plans" ON development_plans;
CREATE POLICY "Privileged roles can update development plans"
  ON development_plans FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = development_plans.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = development_plans.company_id));

-- document_renewals
DROP POLICY IF EXISTS "Privileged roles can update document renewals" ON document_renewals;
CREATE POLICY "Privileged roles can update document renewals"
  ON document_renewals FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = document_renewals.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = document_renewals.company_id));

-- earnings_types
DROP POLICY IF EXISTS "Privileged roles can update earnings types" ON earnings_types;
CREATE POLICY "Privileged roles can update earnings types"
  ON earnings_types FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = earnings_types.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = earnings_types.company_id));

-- employee_achievements
DROP POLICY IF EXISTS "Privileged roles can update employee achievements" ON employee_achievements;
CREATE POLICY "Privileged roles can update employee achievements"
  ON employee_achievements FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_achievements.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_achievements.employee_id AND ur.role = 'manager'));

-- employee_beneficiaries
DROP POLICY IF EXISTS "Privileged roles can update employee beneficiaries" ON employee_beneficiaries;
CREATE POLICY "Privileged roles can update employee beneficiaries"
  ON employee_beneficiaries FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_beneficiaries.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_beneficiaries.employee_id AND ur.role = 'manager'));

-- employee_deductions
DROP POLICY IF EXISTS "Privileged roles can update employee deductions" ON employee_deductions;
CREATE POLICY "Privileged roles can update employee deductions"
  ON employee_deductions FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = employee_deductions.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = employee_deductions.company_id));

-- employee_earnings
DROP POLICY IF EXISTS "Privileged roles can update employee earnings" ON employee_earnings;
CREATE POLICY "Privileged roles can update employee earnings"
  ON employee_earnings FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = employee_earnings.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = employee_earnings.company_id));

-- employee_emergency_contacts
DROP POLICY IF EXISTS "Privileged roles can update employee emergency contacts" ON employee_emergency_contacts;
CREATE POLICY "Privileged roles can update employee emergency contacts"
  ON employee_emergency_contacts FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_emergency_contacts.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_emergency_contacts.employee_id AND ur.role = 'manager'));

-- employee_medical_records
DROP POLICY IF EXISTS "Privileged roles can update employee medical records" ON employee_medical_records;
CREATE POLICY "Privileged roles can update employee medical records"
  ON employee_medical_records FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_medical_records.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_medical_records.employee_id AND ur.role = 'manager'));

-- employee_penalties
DROP POLICY IF EXISTS "HR and Finance can update penalties" ON employee_penalties;
CREATE POLICY "HR and Finance can update penalties"
  ON employee_penalties FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = employee_penalties.company_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = employee_penalties.company_id AND ur.role = 'manager'));

-- employee_qualifications
DROP POLICY IF EXISTS "Privileged roles can update employee qualifications" ON employee_qualifications;
CREATE POLICY "Privileged roles can update employee qualifications"
  ON employee_qualifications FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_qualifications.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_qualifications.employee_id AND ur.role = 'manager'));

-- employee_surveys
DROP POLICY IF EXISTS "Privileged roles can update employee surveys" ON employee_surveys;
CREATE POLICY "Privileged roles can update employee surveys"
  ON employee_surveys FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = employee_surveys.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = employee_surveys.company_id));

-- employee_warnings
DROP POLICY IF EXISTS "Privileged roles can update employee warnings" ON employee_warnings;
CREATE POLICY "Privileged roles can update employee warnings"
  ON employee_warnings FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_warnings.employee_id AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur JOIN employees e ON e.company_id = ur.company_id WHERE ur.user_id = auth.uid() AND e.id = employee_warnings.employee_id AND ur.role = 'manager'));

-- eos_finance_reviews
DROP POLICY IF EXISTS "Finance can update eos reviews" ON eos_finance_reviews;
CREATE POLICY "Finance can update eos reviews"
  ON eos_finance_reviews FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'))
  WITH CHECK (is_hr_or_above() OR company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager'));

-- exit_reentry_permits
DROP POLICY IF EXISTS "Privileged roles can update exit reentry permits" ON exit_reentry_permits;
CREATE POLICY "Privileged roles can update exit reentry permits"
  ON exit_reentry_permits FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = exit_reentry_permits.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = exit_reentry_permits.company_id));
