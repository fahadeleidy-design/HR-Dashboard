/*
  # Optimize RLS Policies - Part 2: Document Management
  
  ## Overview
  Optimizes RLS policies for document management tables by wrapping
  auth.uid() calls with SELECT subqueries for better performance.
  
  ## Tables Optimized
  - document_activities (1 policy)
  - document_approvals (2 policies)
  - document_categories (2 policies)
  - document_compliance_checks (4 policies)
  - document_reminders (4 policies)
  - document_shares (1 policy)
  - document_storage_locations (4 policies)
  - document_tag_assignments (3 policies)
  - document_tags (2 policies)
  - document_templates (2 policies)
  - document_versions (2 policies)
  - document_workflows (4 policies)
  
  ## Performance Impact
  Dramatic performance improvement for document-heavy workloads.
*/

-- Document Activities
DROP POLICY IF EXISTS "Users can view activities" ON document_activities;
CREATE POLICY "Users can view activities" ON document_activities
  FOR SELECT TO authenticated
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Document Approvals
DROP POLICY IF EXISTS "Users can update their approvals" ON document_approvals;
CREATE POLICY "Users can update their approvals" ON document_approvals
  FOR UPDATE TO authenticated
  USING (approver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view approvals" ON document_approvals;
CREATE POLICY "Users can view approvals" ON document_approvals
  FOR SELECT TO authenticated
  USING (
    approver_id = (SELECT auth.uid()) OR
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

-- Document Categories
DROP POLICY IF EXISTS "Admins can manage categories" ON document_categories;
CREATE POLICY "Admins can manage categories" ON document_categories
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view categories in their company" ON document_categories;
CREATE POLICY "Users can view categories in their company" ON document_categories
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Document Compliance Checks
DROP POLICY IF EXISTS "Admins can delete compliance checks" ON document_compliance_checks;
CREATE POLICY "Admins can delete compliance checks" ON document_compliance_checks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert compliance checks" ON document_compliance_checks;
CREATE POLICY "Admins can insert compliance checks" ON document_compliance_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update compliance checks" ON document_compliance_checks;
CREATE POLICY "Admins can update compliance checks" ON document_compliance_checks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Company members can view compliance checks" ON document_compliance_checks;
CREATE POLICY "Company members can view compliance checks" ON document_compliance_checks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
      AND d.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Document Reminders
DROP POLICY IF EXISTS "Admins can delete reminders" ON document_reminders;
CREATE POLICY "Admins can delete reminders" ON document_reminders
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert reminders" ON document_reminders;
CREATE POLICY "Admins can insert reminders" ON document_reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update reminders" ON document_reminders;
CREATE POLICY "Admins can update reminders" ON document_reminders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Company members can view reminders" ON document_reminders;
CREATE POLICY "Company members can view reminders" ON document_reminders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
      AND d.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Document Shares
DROP POLICY IF EXISTS "Users can view their shares" ON document_shares;
CREATE POLICY "Users can view their shares" ON document_shares
  FOR SELECT TO authenticated
  USING (
    shared_with_user_id = (SELECT auth.uid()) OR
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Document Storage Locations
DROP POLICY IF EXISTS "Admins can delete storage locations" ON document_storage_locations;
CREATE POLICY "Admins can delete storage locations" ON document_storage_locations
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert storage locations" ON document_storage_locations;
CREATE POLICY "Admins can insert storage locations" ON document_storage_locations
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update storage locations" ON document_storage_locations;
CREATE POLICY "Admins can update storage locations" ON document_storage_locations
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Company members can view storage locations" ON document_storage_locations;
CREATE POLICY "Company members can view storage locations" ON document_storage_locations
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Document Tag Assignments
DROP POLICY IF EXISTS "Admins can delete tag assignments" ON document_tag_assignments;
CREATE POLICY "Admins can delete tag assignments" ON document_tag_assignments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert tag assignments" ON document_tag_assignments;
CREATE POLICY "Admins can insert tag assignments" ON document_tag_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN user_roles ur ON d.company_id = ur.company_id
      WHERE d.id = document_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Company members can view tag assignments" ON document_tag_assignments;
CREATE POLICY "Company members can view tag assignments" ON document_tag_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id
      AND d.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Document Tags
DROP POLICY IF EXISTS "Admins can manage tags" ON document_tags;
CREATE POLICY "Admins can manage tags" ON document_tags
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view tags in their company" ON document_tags;
CREATE POLICY "Users can view tags in their company" ON document_tags
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Document Templates
DROP POLICY IF EXISTS "Admins can manage templates" ON document_templates;
CREATE POLICY "Admins can manage templates" ON document_templates
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Users can view templates" ON document_templates;
CREATE POLICY "Users can view templates" ON document_templates
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

-- Document Versions
DROP POLICY IF EXISTS "Admins can manage versions" ON document_versions;
CREATE POLICY "Admins can manage versions" ON document_versions
  FOR ALL TO authenticated
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

DROP POLICY IF EXISTS "Users can view document versions" ON document_versions;
CREATE POLICY "Users can view document versions" ON document_versions
  FOR SELECT TO authenticated
  USING (
    document_id IN (
      SELECT d.id FROM documents d
      WHERE d.company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
      )
    )
  );

-- Document Workflows
DROP POLICY IF EXISTS "Admins can delete workflows" ON document_workflows;
CREATE POLICY "Admins can delete workflows" ON document_workflows
  FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert workflows" ON document_workflows;
CREATE POLICY "Admins can insert workflows" ON document_workflows
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update workflows" ON document_workflows;
CREATE POLICY "Admins can update workflows" ON document_workflows
  FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Company members can view workflows" ON document_workflows;
CREATE POLICY "Company members can view workflows" ON document_workflows
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );