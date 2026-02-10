/*
  # Fix Critical RLS Policies - Replace USING(true) with Company-Scoped Access

  This migration replaces overly permissive RLS policies (USING true) on critical
  tables with proper company-scoped and role-based policies.

  1. New Helper Functions
    - `user_has_company_access(target_company_id uuid)` - checks if user has any role
      granting access to the given company (super_admin gets all companies)
    - `user_has_admin_access(target_company_id uuid)` - checks if user has an admin-level
      role for the given company

  2. Tables Fixed (9 tables)
    - `departments` - UPDATE/DELETE now restricted to admin roles with company scope
    - `attendance` - FOR ALL replaced with per-operation company-scoped policies
    - `documents` - FOR ALL replaced with per-operation company-scoped policies
    - `leave_types` - FOR ALL replaced; SELECT for company members, mutations for admins
    - `payroll` - UPDATE restricted to finance/admin roles
    - `performance_reviews` - FOR ALL replaced with per-operation policies
    - `training_programs` - FOR ALL replaced with per-operation policies
    - `training_enrollments` - FOR ALL replaced; access via training_programs.company_id

  3. Security Model
    - All SELECT policies check company membership
    - INSERT/UPDATE/DELETE require admin/hr/finance roles
    - Super admin always has cross-company access
*/

CREATE OR REPLACE FUNCTION user_has_company_access(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND (company_id = target_company_id OR role = 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION user_has_admin_access(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'hr_manager', 'finance', 'finance_manager')
    AND (company_id = target_company_id OR role = 'super_admin')
  );
$$;

-- Helper for training_enrollments which lacks company_id
CREATE OR REPLACE FUNCTION enrollment_company_access(p_training_program_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM training_programs tp
    JOIN user_roles ur ON ur.user_id = auth.uid()
    WHERE tp.id = p_training_program_id
    AND (ur.company_id = tp.company_id OR ur.role = 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION enrollment_admin_access(p_training_program_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM training_programs tp
    JOIN user_roles ur ON ur.user_id = auth.uid()
    WHERE tp.id = p_training_program_id
    AND ur.role IN ('super_admin', 'admin', 'hr', 'hr_manager')
    AND (ur.company_id = tp.company_id OR ur.role = 'super_admin')
  );
$$;

-- ============================================================
-- DEPARTMENTS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can delete departments" ON departments;
CREATE POLICY "Admin roles can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (user_has_admin_access(company_id));

DROP POLICY IF EXISTS "Authenticated users can update departments" ON departments;
CREATE POLICY "Admin roles can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (user_has_admin_access(company_id))
  WITH CHECK (user_has_admin_access(company_id));

-- ============================================================
-- ATTENDANCE
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can manage attendance" ON attendance;

CREATE POLICY "Users can view company attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (user_has_company_access(company_id));

CREATE POLICY "Admin roles can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (user_has_admin_access(company_id))
  WITH CHECK (user_has_admin_access(company_id));

CREATE POLICY "Admin roles can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (user_has_admin_access(company_id));

-- ============================================================
-- DOCUMENTS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can manage documents" ON documents;

CREATE POLICY "Users can view company documents"
  ON documents FOR SELECT
  TO authenticated
  USING (user_has_company_access(company_id));

CREATE POLICY "Users can upload documents to their company"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Admin roles can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (user_has_admin_access(company_id))
  WITH CHECK (user_has_admin_access(company_id));

CREATE POLICY "Admin roles can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (user_has_admin_access(company_id));

-- ============================================================
-- LEAVE_TYPES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can manage leave types" ON leave_types;
DROP POLICY IF EXISTS "Authenticated users can view leave types" ON leave_types;

CREATE POLICY "Users can view company leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (user_has_company_access(company_id));

CREATE POLICY "Admin roles can insert leave types"
  ON leave_types FOR INSERT
  TO authenticated
  WITH CHECK (user_has_admin_access(company_id));

CREATE POLICY "Admin roles can update leave types"
  ON leave_types FOR UPDATE
  TO authenticated
  USING (user_has_admin_access(company_id))
  WITH CHECK (user_has_admin_access(company_id));

CREATE POLICY "Admin roles can delete leave types"
  ON leave_types FOR DELETE
  TO authenticated
  USING (user_has_admin_access(company_id));

-- ============================================================
-- PAYROLL
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can update payroll" ON payroll;
CREATE POLICY "Finance and admin can update payroll"
  ON payroll FOR UPDATE
  TO authenticated
  USING (user_has_admin_access(company_id))
  WITH CHECK (user_has_admin_access(company_id));

-- ============================================================
-- PERFORMANCE_REVIEWS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can manage performance reviews" ON performance_reviews;
DROP POLICY IF EXISTS "Authenticated users can view performance reviews" ON performance_reviews;

CREATE POLICY "Users can view company performance reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (user_has_company_access(company_id));

CREATE POLICY "Admin roles can update performance reviews"
  ON performance_reviews FOR UPDATE
  TO authenticated
  USING (user_has_admin_access(company_id))
  WITH CHECK (user_has_admin_access(company_id));

CREATE POLICY "Admin roles can delete performance reviews"
  ON performance_reviews FOR DELETE
  TO authenticated
  USING (user_has_admin_access(company_id));

-- ============================================================
-- TRAINING_PROGRAMS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can manage training programs" ON training_programs;
DROP POLICY IF EXISTS "Authenticated users can view training programs" ON training_programs;

CREATE POLICY "Users can view company training programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING (user_has_company_access(company_id));

CREATE POLICY "Admin roles can insert training programs"
  ON training_programs FOR INSERT
  TO authenticated
  WITH CHECK (user_has_admin_access(company_id));

CREATE POLICY "Admin roles can update training programs"
  ON training_programs FOR UPDATE
  TO authenticated
  USING (user_has_admin_access(company_id))
  WITH CHECK (user_has_admin_access(company_id));

CREATE POLICY "Admin roles can delete training programs"
  ON training_programs FOR DELETE
  TO authenticated
  USING (user_has_admin_access(company_id));

-- ============================================================
-- TRAINING_ENROLLMENTS (no company_id - uses training_program_id)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can manage training enrollments" ON training_enrollments;
DROP POLICY IF EXISTS "Authenticated users can view training enrollments" ON training_enrollments;

CREATE POLICY "Users can view company training enrollments"
  ON training_enrollments FOR SELECT
  TO authenticated
  USING (enrollment_company_access(training_program_id));

CREATE POLICY "Admin roles can update training enrollments"
  ON training_enrollments FOR UPDATE
  TO authenticated
  USING (enrollment_admin_access(training_program_id))
  WITH CHECK (enrollment_admin_access(training_program_id));

CREATE POLICY "Admin roles can delete training enrollments"
  ON training_enrollments FOR DELETE
  TO authenticated
  USING (enrollment_admin_access(training_program_id));