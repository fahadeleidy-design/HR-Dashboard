/*
  # Governmental Documents Management

  ## Overview
  Comprehensive management for all governmental documents including Commercial Registration,
  Ministry licenses, Municipality permits, Civil Defense, Chamber of Commerce, and more.

  ## Tables Created

  ### governmental_documents
  - All types of governmental documents
  - Expiry tracking and alerts
  - Renewal management
  - Cost tracking

  ### document_renewals
  - Renewal history
  - Cost tracking per renewal
  - Status management

  ## Security
  - RLS enabled on all tables
*/

-- Governmental documents table
CREATE TABLE IF NOT EXISTS governmental_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  document_type text NOT NULL, -- cr, municipal_license, chamber_of_commerce, civil_defense, 
                                -- ministry_license, zakat_certificate, vat_certificate, etc.
  document_number text NOT NULL,
  document_name_en text NOT NULL,
  document_name_ar text,
  issuing_authority text NOT NULL,
  issuing_authority_ar text,
  issue_date date NOT NULL,
  expiry_date date,
  renewal_period_months integer, -- for automatic calculation
  cost decimal(15, 2) DEFAULT 0,
  annual_cost decimal(15, 2) DEFAULT 0,
  responsible_person text,
  responsible_email text,
  responsible_phone text,
  document_file_url text, -- for storing scanned copies
  status text NOT NULL DEFAULT 'active', -- active, expired, under_renewal, cancelled
  auto_renew boolean DEFAULT false,
  renewal_reminder_days integer DEFAULT 30, -- alert days before expiry
  related_entity text, -- which department/branch it relates to
  special_conditions text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, document_type, document_number)
);

-- Document renewals history
CREATE TABLE IF NOT EXISTS document_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  document_id uuid REFERENCES governmental_documents(id) ON DELETE CASCADE NOT NULL,
  renewal_date date NOT NULL,
  new_expiry_date date NOT NULL,
  cost decimal(15, 2) DEFAULT 0,
  payment_method text,
  payment_reference text,
  processed_by text,
  notes text,
  receipt_file_url text,
  status text NOT NULL DEFAULT 'completed', -- pending, completed, failed
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gov_docs_company ON governmental_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_gov_docs_type ON governmental_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_gov_docs_status ON governmental_documents(status);
CREATE INDEX IF NOT EXISTS idx_gov_docs_expiry ON governmental_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_doc_renewals_document ON document_renewals(document_id);

-- Enable RLS
ALTER TABLE governmental_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_renewals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view governmental documents"
  ON governmental_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage governmental documents"
  ON governmental_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view document renewals"
  ON document_renewals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage document renewals"
  ON document_renewals FOR ALL TO authenticated USING (true) WITH CHECK (true);
