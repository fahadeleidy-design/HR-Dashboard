/*
  # HR Cross-Company Access — Batch 3 (Fixed): Recruitment, Salary, Visa, Training, Misc

  Tables without direct company_id use is_hr_or_above() as the sole privilege gate.
*/

-- recruitment_metrics
DROP POLICY IF EXISTS "Privileged roles can update recruitment metrics" ON recruitment_metrics;
CREATE POLICY "Privileged roles can update recruitment metrics"
  ON recruitment_metrics FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = recruitment_metrics.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = recruitment_metrics.company_id));

-- residence_permits
DROP POLICY IF EXISTS "Privileged roles can update residence permits" ON residence_permits;
CREATE POLICY "Privileged roles can update residence permits"
  ON residence_permits FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = residence_permits.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = residence_permits.company_id));

-- salary_bands (no company_id — linked via salary_scale_id -> salary_scales)
DROP POLICY IF EXISTS "Privileged roles can update salary bands" ON salary_bands;
CREATE POLICY "Privileged roles can update salary bands"
  ON salary_bands FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM salary_scales ss
    JOIN user_roles ur ON ur.company_id = ss.company_id
    WHERE ss.id = salary_bands.salary_scale_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ))
  WITH CHECK (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM salary_scales ss
    JOIN user_roles ur ON ur.company_id = ss.company_id
    WHERE ss.id = salary_bands.salary_scale_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ));

-- salary_proposals (no company_id — linked via employee_id -> employees)
DROP POLICY IF EXISTS "Privileged roles can update salary proposals" ON salary_proposals;
CREATE POLICY "Privileged roles can update salary proposals"
  ON salary_proposals FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM employees e
    JOIN user_roles ur ON ur.company_id = e.company_id
    WHERE e.id = salary_proposals.employee_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ))
  WITH CHECK (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM employees e
    JOIN user_roles ur ON ur.company_id = e.company_id
    WHERE e.id = salary_proposals.employee_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ));

-- salary_scales
DROP POLICY IF EXISTS "Privileged roles can update salary scales" ON salary_scales;
CREATE POLICY "Privileged roles can update salary scales"
  ON salary_scales FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = salary_scales.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = salary_scales.company_id));

-- succession_plans
DROP POLICY IF EXISTS "Privileged roles can update succession plans" ON succession_plans;
CREATE POLICY "Privileged roles can update succession plans"
  ON succession_plans FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = succession_plans.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = succession_plans.company_id));

-- system_alerts
DROP POLICY IF EXISTS "Privileged roles can update system alerts" ON system_alerts;
CREATE POLICY "Privileged roles can update system alerts"
  ON system_alerts FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = system_alerts.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = system_alerts.company_id));

-- system_settings
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;
CREATE POLICY "Admins can update system settings"
  ON system_settings FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = system_settings.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = system_settings.company_id));

-- training_enrollments (no company_id — linked via employee_id -> employees)
DROP POLICY IF EXISTS "HR and Admin can update enrollments" ON training_enrollments;
CREATE POLICY "HR and Admin can update enrollments"
  ON training_enrollments FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM employees e
    JOIN user_roles ur ON ur.company_id = e.company_id
    WHERE e.id = training_enrollments.employee_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ))
  WITH CHECK (is_hr_or_above() OR EXISTS (
    SELECT 1 FROM employees e
    JOIN user_roles ur ON ur.company_id = e.company_id
    WHERE e.id = training_enrollments.employee_id AND ur.user_id = auth.uid() AND ur.role = 'manager'
  ));

-- travel_per_diem_rates
DROP POLICY IF EXISTS "Privileged roles can update travel per diem rates" ON travel_per_diem_rates;
CREATE POLICY "Privileged roles can update travel per diem rates"
  ON travel_per_diem_rates FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = travel_per_diem_rates.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = travel_per_diem_rates.company_id));

-- vehicle_assignments
DROP POLICY IF EXISTS "Privileged roles can update vehicle assignments" ON vehicle_assignments;
CREATE POLICY "Privileged roles can update vehicle assignments"
  ON vehicle_assignments FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = vehicle_assignments.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = vehicle_assignments.company_id));

-- vehicle_maintenance
DROP POLICY IF EXISTS "Privileged roles can update vehicle maintenance" ON vehicle_maintenance;
CREATE POLICY "Privileged roles can update vehicle maintenance"
  ON vehicle_maintenance FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = vehicle_maintenance.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = vehicle_maintenance.company_id));

-- vehicle_violations
DROP POLICY IF EXISTS "Privileged roles can update vehicle violations" ON vehicle_violations;
CREATE POLICY "Privileged roles can update vehicle violations"
  ON vehicle_violations FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = vehicle_violations.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = vehicle_violations.company_id));

-- visa_quotas
DROP POLICY IF EXISTS "Privileged roles can update visa quotas" ON visa_quotas;
CREATE POLICY "Privileged roles can update visa quotas"
  ON visa_quotas FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = visa_quotas.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = visa_quotas.company_id));

-- visa_requests
DROP POLICY IF EXISTS "Privileged roles can update visa requests" ON visa_requests;
CREATE POLICY "Privileged roles can update visa requests"
  ON visa_requests FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = visa_requests.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = visa_requests.company_id));

-- work_visas
DROP POLICY IF EXISTS "Privileged roles can update work visas" ON work_visas;
CREATE POLICY "Privileged roles can update work visas"
  ON work_visas FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = work_visas.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = work_visas.company_id));

-- wps_bank_configs
DROP POLICY IF EXISTS "Admin roles can update WPS bank configs" ON wps_bank_configs;
CREATE POLICY "Admin roles can update WPS bank configs"
  ON wps_bank_configs FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = wps_bank_configs.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = wps_bank_configs.company_id));

-- wps_payroll_files
DROP POLICY IF EXISTS "Privileged roles can update WPS payroll files" ON wps_payroll_files;
CREATE POLICY "Privileged roles can update WPS payroll files"
  ON wps_payroll_files FOR UPDATE TO authenticated
  USING (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = wps_payroll_files.company_id))
  WITH CHECK (is_hr_or_above() OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'manager' AND ur.company_id = wps_payroll_files.company_id));
