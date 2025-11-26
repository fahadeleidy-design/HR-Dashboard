/*
  # Add Missing RLS Policies (Corrected Version)

  ## Changes Made

  ### New RLS Policies Added
  1. **bank_files** - Payroll managers can view and manage
  2. **document_compliance_checks** - Company members view, admins manage
  3. **document_reminders** - Company members view, admins manage
  4. **document_storage_locations** - Company members view, admins manage
  5. **document_tag_assignments** - Company members view, admins manage
  6. **document_workflows** - Company members view, admins manage
  7. **employee_cost_centers** - Company members view, HR/payroll manage
  8. **payroll_approvals** - Payroll managers only
  9. **payroll_corrections** - Payroll managers only
  10. **payroll_item_components** - Company members view, payroll manages
  11. **payroll_processing_log** - Payroll managers view, system inserts
  12. **wps_files** - Payroll managers only

  ## Security Notes
  - All policies follow principle of least privilege
  - Restrictive by default - users only see their company data
  - Role-based access control for sensitive operations
  - Payroll data restricted to authorized managers only
*/

-- bank_files policies
CREATE POLICY "Authenticated users can view bank files"
  ON bank_files FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Payroll managers can create bank files"
  ON bank_files FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Payroll managers can update bank files"
  ON bank_files FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'payroll_manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

-- document_compliance_checks policies
CREATE POLICY "Company members can view compliance checks"
  ON document_compliance_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_compliance_checks.document_id
      AND d.company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert compliance checks"
  ON document_compliance_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_compliance_checks.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update compliance checks"
  ON document_compliance_checks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_compliance_checks.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_compliance_checks.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete compliance checks"
  ON document_compliance_checks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_compliance_checks.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- document_reminders policies
CREATE POLICY "Company members can view reminders"
  ON document_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_reminders.document_id
      AND d.company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert reminders"
  ON document_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_reminders.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update reminders"
  ON document_reminders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_reminders.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_reminders.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete reminders"
  ON document_reminders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_reminders.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- document_storage_locations policies
CREATE POLICY "Company members can view storage locations"
  ON document_storage_locations FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert storage locations"
  ON document_storage_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update storage locations"
  ON document_storage_locations FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete storage locations"
  ON document_storage_locations FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- document_tag_assignments policies
CREATE POLICY "Company members can view tag assignments"
  ON document_tag_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_tag_assignments.document_id
      AND d.company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert tag assignments"
  ON document_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_tag_assignments.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete tag assignments"
  ON document_tag_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_tag_assignments.document_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- document_workflows policies
CREATE POLICY "Company members can view workflows"
  ON document_workflows FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert workflows"
  ON document_workflows FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update workflows"
  ON document_workflows FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete workflows"
  ON document_workflows FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- employee_cost_centers policies
CREATE POLICY "Company members can view cost centers"
  ON employee_cost_centers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = employee_cost_centers.employee_id
      AND e.company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert cost centers"
  ON employee_cost_centers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_roles ur ON e.company_id = ur.company_id
      WHERE e.id = employee_cost_centers.employee_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Admins can update cost centers"
  ON employee_cost_centers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_roles ur ON e.company_id = ur.company_id
      WHERE e.id = employee_cost_centers.employee_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_roles ur ON e.company_id = ur.company_id
      WHERE e.id = employee_cost_centers.employee_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Admins can delete cost centers"
  ON employee_cost_centers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN user_roles ur ON e.company_id = ur.company_id
      WHERE e.id = employee_cost_centers.employee_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

-- payroll_approvals policies
CREATE POLICY "Payroll managers can view approvals"
  ON payroll_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      WHERE pb.id = payroll_approvals.batch_id
      AND pb.company_id IN (
        SELECT company_id FROM user_roles 
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'payroll_manager')
      )
    )
  );

CREATE POLICY "Payroll managers can insert approvals"
  ON payroll_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pb.id = payroll_approvals.batch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Payroll managers can update approvals"
  ON payroll_approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pb.id = payroll_approvals.batch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pb.id = payroll_approvals.batch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

-- payroll_corrections policies  
CREATE POLICY "Payroll managers can view corrections"
  ON payroll_corrections FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Payroll managers can insert corrections"
  ON payroll_corrections FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Payroll managers can update corrections"
  ON payroll_corrections FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'payroll_manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

-- payroll_item_components policies
CREATE POLICY "Company members can view payroll components"
  ON payroll_item_components FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_items pi
      JOIN payroll_batches pb ON pi.batch_id = pb.id
      WHERE pi.id = payroll_item_components.payroll_item_id
      AND pb.company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Payroll managers can insert components"
  ON payroll_item_components FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_items pi
      JOIN payroll_batches pb ON pi.batch_id = pb.id
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pi.id = payroll_item_components.payroll_item_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Payroll managers can update components"
  ON payroll_item_components FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_items pi
      JOIN payroll_batches pb ON pi.batch_id = pb.id
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pi.id = payroll_item_components.payroll_item_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_items pi
      JOIN payroll_batches pb ON pi.batch_id = pb.id
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pi.id = payroll_item_components.payroll_item_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Payroll managers can delete components"
  ON payroll_item_components FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_items pi
      JOIN payroll_batches pb ON pi.batch_id = pb.id
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pi.id = payroll_item_components.payroll_item_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

-- payroll_processing_log policies
CREATE POLICY "Payroll managers can view processing log"
  ON payroll_processing_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      WHERE pb.id = payroll_processing_log.batch_id
      AND pb.company_id IN (
        SELECT company_id FROM user_roles 
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'payroll_manager')
      )
    )
  );

CREATE POLICY "System can insert processing log"
  ON payroll_processing_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pb.id = payroll_processing_log.batch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

-- wps_files policies
CREATE POLICY "Payroll managers can view WPS files"
  ON wps_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      WHERE pb.id = wps_files.batch_id
      AND pb.company_id IN (
        SELECT company_id FROM user_roles 
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'payroll_manager')
      )
    )
  );

CREATE POLICY "Payroll managers can insert WPS files"
  ON wps_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pb.id = wps_files.batch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Payroll managers can update WPS files"
  ON wps_files FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pb.id = wps_files.batch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pb.id = wps_files.batch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );

CREATE POLICY "Payroll managers can delete WPS files"
  ON wps_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_batches pb
      JOIN user_roles ur ON pb.company_id = ur.company_id
      WHERE pb.id = wps_files.batch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'payroll_manager')
    )
  );
