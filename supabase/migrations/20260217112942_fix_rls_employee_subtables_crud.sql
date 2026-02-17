/*
  # Fix missing CRUD policies for employee sub-tables

  1. Problem
    - Multiple employee-related tables only have SELECT policies
    - Users cannot add/edit/delete employee details (bank accounts, contacts, medical records, etc.)

  2. Tables Fixed
    - employee_bank_accounts (INSERT/UPDATE/DELETE)
    - employee_emergency_contacts (INSERT/UPDATE/DELETE)
    - employee_medical_records (INSERT/UPDATE/DELETE)
    - employee_qualifications (INSERT/UPDATE/DELETE)
    - employee_achievements (INSERT/UPDATE/DELETE)
    - employee_beneficiaries (INSERT/UPDATE/DELETE)
    - employee_warnings (INSERT/UPDATE/DELETE)
    - employee_status_history (INSERT)
    - employee_deductions (INSERT/UPDATE/DELETE) - has company_id
    - employee_earnings (INSERT/UPDATE/DELETE) - has company_id
    - insurance_beneficiaries (INSERT/UPDATE/DELETE)
    - iqama_dependents (INSERT/UPDATE/DELETE)

  3. Security
    - Privileged roles (hr, finance, manager, admin, super_admin) can manage data
    - Company isolation enforced via employee -> company_id join
    - Tables with direct company_id use it for isolation
*/

-- employee_bank_accounts (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert employee bank accounts"
  ON employee_bank_accounts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_bank_accounts.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update employee bank accounts"
  ON employee_bank_accounts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_bank_accounts.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_bank_accounts.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete employee bank accounts"
  ON employee_bank_accounts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_bank_accounts.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- employee_emergency_contacts (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert employee emergency contacts"
  ON employee_emergency_contacts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_emergency_contacts.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update employee emergency contacts"
  ON employee_emergency_contacts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_emergency_contacts.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_emergency_contacts.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete employee emergency contacts"
  ON employee_emergency_contacts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_emergency_contacts.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- employee_medical_records (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert employee medical records"
  ON employee_medical_records FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_medical_records.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update employee medical records"
  ON employee_medical_records FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_medical_records.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_medical_records.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete employee medical records"
  ON employee_medical_records FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_medical_records.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- employee_qualifications (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert employee qualifications"
  ON employee_qualifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_qualifications.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update employee qualifications"
  ON employee_qualifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_qualifications.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_qualifications.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete employee qualifications"
  ON employee_qualifications FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_qualifications.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- employee_achievements (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert employee achievements"
  ON employee_achievements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_achievements.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update employee achievements"
  ON employee_achievements FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_achievements.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_achievements.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete employee achievements"
  ON employee_achievements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_achievements.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- employee_beneficiaries (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert employee beneficiaries"
  ON employee_beneficiaries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_beneficiaries.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update employee beneficiaries"
  ON employee_beneficiaries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_beneficiaries.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_beneficiaries.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete employee beneficiaries"
  ON employee_beneficiaries FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_beneficiaries.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- employee_warnings (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert employee warnings"
  ON employee_warnings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_warnings.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update employee warnings"
  ON employee_warnings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_warnings.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_warnings.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete employee warnings"
  ON employee_warnings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_warnings.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- employee_status_history (employee_id, no company_id - INSERT only)
CREATE POLICY "Privileged roles can insert employee status history"
  ON employee_status_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = employee_status_history.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- employee_deductions (has company_id + employee_id)
CREATE POLICY "Privileged roles can insert employee deductions"
  ON employee_deductions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employee_deductions.company_id))
    )
  );

CREATE POLICY "Privileged roles can update employee deductions"
  ON employee_deductions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employee_deductions.company_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employee_deductions.company_id))
    )
  );

CREATE POLICY "Privileged roles can delete employee deductions"
  ON employee_deductions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employee_deductions.company_id))
    )
  );

-- employee_earnings (has company_id + employee_id)
CREATE POLICY "Privileged roles can insert employee earnings"
  ON employee_earnings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employee_earnings.company_id))
    )
  );

CREATE POLICY "Privileged roles can update employee earnings"
  ON employee_earnings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employee_earnings.company_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employee_earnings.company_id))
    )
  );

CREATE POLICY "Privileged roles can delete employee earnings"
  ON employee_earnings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = employee_earnings.company_id))
    )
  );

-- insurance_beneficiaries (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert insurance beneficiaries"
  ON insurance_beneficiaries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = insurance_beneficiaries.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update insurance beneficiaries"
  ON insurance_beneficiaries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = insurance_beneficiaries.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = insurance_beneficiaries.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete insurance beneficiaries"
  ON insurance_beneficiaries FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = insurance_beneficiaries.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

-- iqama_dependents (employee_id, no company_id)
CREATE POLICY "Privileged roles can insert iqama dependents"
  ON iqama_dependents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = iqama_dependents.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can update iqama dependents"
  ON iqama_dependents FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = iqama_dependents.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = iqama_dependents.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );

CREATE POLICY "Privileged roles can delete iqama dependents"
  ON iqama_dependents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.company_id = ur.company_id
      WHERE ur.user_id = auth.uid()
        AND e.id = iqama_dependents.employee_id
        AND (ur.role = 'super_admin' OR ur.role IN ('hr', 'finance', 'manager', 'admin'))
    )
  );
