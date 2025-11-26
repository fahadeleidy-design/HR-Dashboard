/*
  # Optimize RLS Policies - Part 4: Payroll & Financial Tables
  
  ## Overview
  Optimizes RLS policies for payroll and financial management tables.
  
  ## Tables Optimized
  - bank_files (3 policies)
  - payroll_batches (4 policies)
  - payroll_items (4 policies)
  - payroll_approvals (3 policies)
  - payroll_corrections (3 policies)
  - payroll_item_components (4 policies)
  - payroll_processing_log (2 policies)
  - payroll_calendars (1 policy)
  - payroll_components (2 policies)
  - payroll_configurations (2 policies)
  - payroll_formulas (1 policy)
  - payroll_analytics (1 policy)
  - wps_files (4 policies)
  - performance_reviews (2 policies)
  - training_enrollments (2 policies)
  
  ## Performance Impact
  Critical performance boost for payroll processing operations.
*/

-- Bank Files
DROP POLICY IF EXISTS "Authenticated users can view bank files" ON bank_files;
CREATE POLICY "Authenticated users can view bank files" ON bank_files
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Payroll managers can create bank files" ON bank_files;
CREATE POLICY "Payroll managers can create bank files" ON bank_files
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Payroll managers can update bank files" ON bank_files;
CREATE POLICY "Payroll managers can update bank files" ON bank_files
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

-- Payroll Batches
DROP POLICY IF EXISTS "Finance roles can create payroll batches" ON payroll_batches;
CREATE POLICY "Finance roles can create payroll batches" ON payroll_batches
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Finance roles can update draft payroll batches" ON payroll_batches;
CREATE POLICY "Finance roles can update draft payroll batches" ON payroll_batches
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "Super Admin can delete draft payroll batches" ON payroll_batches;
CREATE POLICY "Super Admin can delete draft payroll batches" ON payroll_batches
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'super_admin'
    )
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "Users can view company payroll batches" ON payroll_batches;
CREATE POLICY "Users can view company payroll batches" ON payroll_batches
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Payroll Items
DROP POLICY IF EXISTS "Finance roles can create payroll items" ON payroll_items;
CREATE POLICY "Finance roles can create payroll items" ON payroll_items
  FOR INSERT TO authenticated
  WITH CHECK (
    batch_id IN (
      SELECT pb.id FROM payroll_batches pb
      WHERE pb.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Finance roles can update payroll items" ON payroll_items;
CREATE POLICY "Finance roles can update payroll items" ON payroll_items
  FOR UPDATE TO authenticated
  USING (
    batch_id IN (
      SELECT pb.id FROM payroll_batches pb
      WHERE pb.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Super Admin can delete payroll items" ON payroll_items;
CREATE POLICY "Super Admin can delete payroll items" ON payroll_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can view company payroll items" ON payroll_items;
CREATE POLICY "Users can view company payroll items" ON payroll_items
  FOR SELECT TO authenticated
  USING (
    batch_id IN (
      SELECT pb.id FROM payroll_batches pb
      WHERE pb.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Payroll Approvals
DROP POLICY IF EXISTS "Payroll managers can insert approvals" ON payroll_approvals;
CREATE POLICY "Payroll managers can insert approvals" ON payroll_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Payroll managers can update approvals" ON payroll_approvals;
CREATE POLICY "Payroll managers can update approvals" ON payroll_approvals
  FOR UPDATE TO authenticated
  USING (
    approver_id = (SELECT auth.uid()) OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Payroll managers can view approvals" ON payroll_approvals;
CREATE POLICY "Payroll managers can view approvals" ON payroll_approvals
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

-- Payroll Corrections
DROP POLICY IF EXISTS "Payroll managers can insert corrections" ON payroll_corrections;
CREATE POLICY "Payroll managers can insert corrections" ON payroll_corrections
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Payroll managers can update corrections" ON payroll_corrections;
CREATE POLICY "Payroll managers can update corrections" ON payroll_corrections
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Payroll managers can view corrections" ON payroll_corrections;
CREATE POLICY "Payroll managers can view corrections" ON payroll_corrections
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

-- Payroll Item Components
DROP POLICY IF EXISTS "Company members can view payroll components" ON payroll_item_components;
CREATE POLICY "Company members can view payroll components" ON payroll_item_components
  FOR SELECT TO authenticated
  USING (
    payroll_item_id IN (
      SELECT pi.id FROM payroll_items pi
      JOIN payroll_batches pb ON pb.id = pi.batch_id
      WHERE pb.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Payroll managers can delete components" ON payroll_item_components;
CREATE POLICY "Payroll managers can delete components" ON payroll_item_components
  FOR DELETE TO authenticated
  USING (
    payroll_item_id IN (
      SELECT pi.id FROM payroll_items pi
      JOIN payroll_batches pb ON pb.id = pi.batch_id
      WHERE pb.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Payroll managers can insert components" ON payroll_item_components;
CREATE POLICY "Payroll managers can insert components" ON payroll_item_components
  FOR INSERT TO authenticated
  WITH CHECK (
    payroll_item_id IN (
      SELECT pi.id FROM payroll_items pi
      JOIN payroll_batches pb ON pb.id = pi.batch_id
      WHERE pb.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Payroll managers can update components" ON payroll_item_components;
CREATE POLICY "Payroll managers can update components" ON payroll_item_components
  FOR UPDATE TO authenticated
  USING (
    payroll_item_id IN (
      SELECT pi.id FROM payroll_items pi
      JOIN payroll_batches pb ON pb.id = pi.batch_id
      WHERE pb.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
      )
    )
  );

-- Payroll Processing Log
DROP POLICY IF EXISTS "Payroll managers can view processing log" ON payroll_processing_log;
CREATE POLICY "Payroll managers can view processing log" ON payroll_processing_log
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "System can insert processing log" ON payroll_processing_log;
CREATE POLICY "System can insert processing log" ON payroll_processing_log
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Payroll Calendars
DROP POLICY IF EXISTS "Users can view own company calendars" ON payroll_calendars;
CREATE POLICY "Users can view own company calendars" ON payroll_calendars
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Payroll Components
DROP POLICY IF EXISTS "Users can manage own company components" ON payroll_components;
CREATE POLICY "Users can manage own company components" ON payroll_components
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company components" ON payroll_components;
CREATE POLICY "Users can view own company components" ON payroll_components
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Payroll Configurations
DROP POLICY IF EXISTS "Users can manage own company payroll config" ON payroll_configurations;
CREATE POLICY "Users can manage own company payroll config" ON payroll_configurations
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view own company payroll config" ON payroll_configurations;
CREATE POLICY "Users can view own company payroll config" ON payroll_configurations
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Payroll Formulas
DROP POLICY IF EXISTS "Users can view own company formulas" ON payroll_formulas;
CREATE POLICY "Users can view own company formulas" ON payroll_formulas
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Payroll Analytics
DROP POLICY IF EXISTS "Users can view payroll analytics" ON payroll_analytics;
CREATE POLICY "Users can view payroll analytics" ON payroll_analytics
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- WPS Files
DROP POLICY IF EXISTS "Payroll managers can delete WPS files" ON wps_files;
CREATE POLICY "Payroll managers can delete WPS files" ON wps_files
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Payroll managers can insert WPS files" ON wps_files;
CREATE POLICY "Payroll managers can insert WPS files" ON wps_files
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Payroll managers can update WPS files" ON wps_files;
CREATE POLICY "Payroll managers can update WPS files" ON wps_files
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

DROP POLICY IF EXISTS "Payroll managers can view WPS files" ON wps_files;
CREATE POLICY "Payroll managers can view WPS files" ON wps_files
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'finance_manager', 'payroll_manager')
    )
  );

-- Performance Reviews
DROP POLICY IF EXISTS "Managers can create performance reviews" ON performance_reviews;
CREATE POLICY "Managers can create performance reviews" ON performance_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Managers can update performance reviews" ON performance_reviews;
CREATE POLICY "Managers can update performance reviews" ON performance_reviews
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- Training Enrollments
DROP POLICY IF EXISTS "Employees can enroll in training" ON training_enrollments;
CREATE POLICY "Employees can enroll in training" ON training_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT ur.employee_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view training enrollments in their company" ON training_enrollments;
CREATE POLICY "Users can view training enrollments in their company" ON training_enrollments
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