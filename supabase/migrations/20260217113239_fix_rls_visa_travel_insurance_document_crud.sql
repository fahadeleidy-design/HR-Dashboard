/*
  # Fix missing CRUD policies for Visa, Travel, Insurance, and Document tables

  1. Problem
    - Visa, travel, insurance, and document tables only have SELECT policies
    - Users cannot manage visa requests, travel records, insurance claims, etc.

  2. Tables Fixed
    - business_travel (INSERT/UPDATE/DELETE) - has company_id
    - visa_requests (INSERT/UPDATE/DELETE) - has company_id
    - work_visas (INSERT/UPDATE/DELETE) - has company_id
    - exit_reentry_permits (INSERT/UPDATE/DELETE) - has company_id
    - residence_permits (INSERT/UPDATE/DELETE) - has company_id
    - visa_quotas (INSERT/UPDATE/DELETE) - has company_id
    - travel_per_diem_rates (INSERT/UPDATE/DELETE) - has company_id
    - governmental_documents (INSERT/UPDATE/DELETE) - has company_id
    - insurance_claims (INSERT/UPDATE/DELETE) - has company_id
    - document_renewals (INSERT/UPDATE) - has company_id
    - integration_links (INSERT/UPDATE/DELETE) - has company_id
    - competency_frameworks (INSERT/UPDATE/DELETE) - has company_id

  3. Security
    - Privileged roles only with company isolation
*/

-- business_travel
CREATE POLICY "Privileged roles can insert business travel"
  ON business_travel FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = business_travel.company_id))));

CREATE POLICY "Privileged roles can update business travel"
  ON business_travel FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = business_travel.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = business_travel.company_id))));

CREATE POLICY "Privileged roles can delete business travel"
  ON business_travel FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = business_travel.company_id))));

-- visa_requests
CREATE POLICY "Privileged roles can insert visa requests"
  ON visa_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = visa_requests.company_id))));

CREATE POLICY "Privileged roles can update visa requests"
  ON visa_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = visa_requests.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = visa_requests.company_id))));

CREATE POLICY "Privileged roles can delete visa requests"
  ON visa_requests FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = visa_requests.company_id))));

-- work_visas
CREATE POLICY "Privileged roles can insert work visas"
  ON work_visas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = work_visas.company_id))));

CREATE POLICY "Privileged roles can update work visas"
  ON work_visas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = work_visas.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = work_visas.company_id))));

CREATE POLICY "Privileged roles can delete work visas"
  ON work_visas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = work_visas.company_id))));

-- exit_reentry_permits
CREATE POLICY "Privileged roles can insert exit reentry permits"
  ON exit_reentry_permits FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = exit_reentry_permits.company_id))));

CREATE POLICY "Privileged roles can update exit reentry permits"
  ON exit_reentry_permits FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = exit_reentry_permits.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = exit_reentry_permits.company_id))));

CREATE POLICY "Privileged roles can delete exit reentry permits"
  ON exit_reentry_permits FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = exit_reentry_permits.company_id))));

-- residence_permits
CREATE POLICY "Privileged roles can insert residence permits"
  ON residence_permits FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = residence_permits.company_id))));

CREATE POLICY "Privileged roles can update residence permits"
  ON residence_permits FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = residence_permits.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = residence_permits.company_id))));

CREATE POLICY "Privileged roles can delete residence permits"
  ON residence_permits FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = residence_permits.company_id))));

-- visa_quotas
CREATE POLICY "Privileged roles can insert visa quotas"
  ON visa_quotas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = visa_quotas.company_id))));

CREATE POLICY "Privileged roles can update visa quotas"
  ON visa_quotas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = visa_quotas.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = visa_quotas.company_id))));

CREATE POLICY "Privileged roles can delete visa quotas"
  ON visa_quotas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = visa_quotas.company_id))));

-- travel_per_diem_rates
CREATE POLICY "Privileged roles can insert travel per diem rates"
  ON travel_per_diem_rates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = travel_per_diem_rates.company_id))));

CREATE POLICY "Privileged roles can update travel per diem rates"
  ON travel_per_diem_rates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = travel_per_diem_rates.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = travel_per_diem_rates.company_id))));

CREATE POLICY "Privileged roles can delete travel per diem rates"
  ON travel_per_diem_rates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'admin') AND ur.company_id = travel_per_diem_rates.company_id))));

-- governmental_documents
CREATE POLICY "Privileged roles can insert governmental documents"
  ON governmental_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = governmental_documents.company_id))));

CREATE POLICY "Privileged roles can update governmental documents"
  ON governmental_documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = governmental_documents.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = governmental_documents.company_id))));

CREATE POLICY "Privileged roles can delete governmental documents"
  ON governmental_documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = governmental_documents.company_id))));

-- insurance_claims
CREATE POLICY "Privileged roles can insert insurance claims"
  ON insurance_claims FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = insurance_claims.company_id))));

CREATE POLICY "Privileged roles can update insurance claims"
  ON insurance_claims FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = insurance_claims.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = insurance_claims.company_id))));

CREATE POLICY "Privileged roles can delete insurance claims"
  ON insurance_claims FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = insurance_claims.company_id))));

-- document_renewals (INSERT/UPDATE)
CREATE POLICY "Privileged roles can insert document renewals"
  ON document_renewals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = document_renewals.company_id))));

CREATE POLICY "Privileged roles can update document renewals"
  ON document_renewals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = document_renewals.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'manager', 'admin') AND ur.company_id = document_renewals.company_id))));

-- integration_links
CREATE POLICY "Privileged roles can insert integration links"
  ON integration_links FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = integration_links.company_id))));

CREATE POLICY "Privileged roles can update integration links"
  ON integration_links FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = integration_links.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = integration_links.company_id))));

CREATE POLICY "Privileged roles can delete integration links"
  ON integration_links FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role = 'admin' AND ur.company_id = integration_links.company_id))));

-- competency_frameworks
CREATE POLICY "Privileged roles can insert competency frameworks"
  ON competency_frameworks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = competency_frameworks.company_id))));

CREATE POLICY "Privileged roles can update competency frameworks"
  ON competency_frameworks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = competency_frameworks.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = competency_frameworks.company_id))));

CREATE POLICY "Privileged roles can delete competency frameworks"
  ON competency_frameworks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND (ur.role = 'super_admin' OR (ur.role IN ('hr', 'admin') AND ur.company_id = competency_frameworks.company_id))));
