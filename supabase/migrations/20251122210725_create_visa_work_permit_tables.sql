/*
  # Visa & Work Permit Management

  ## Overview
  Complete management of work visas, residence permits (Iqama), work permits,
  visa transfers, and Saudi Muqeem integration for expat employees.

  ## Tables Created

  ### work_visas
  - Entry visa tracking
  - Visa numbers and quotas
  - Status management

  ### residence_permits
  - Iqama/residence permit tracking
  - Renewal management
  - Sponsor changes

  ### visa_requests
  - New visa requests
  - Visa transfers
  - Approval workflow

  ## Security
  - RLS enabled on all tables
*/

-- Work visas table
CREATE TABLE IF NOT EXISTS work_visas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  visa_number text NOT NULL,
  visa_type text NOT NULL, -- work_visa, visit_visa, transfer_visa
  nationality text NOT NULL,
  job_title text NOT NULL,
  visa_quota_year integer NOT NULL,
  issue_date date NOT NULL,
  expiry_date date NOT NULL,
  used_for_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active', -- active, used, expired, cancelled
  muqeem_reference text,
  cost decimal(15, 2),
  recruitment_agency text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, visa_number)
);

-- Residence permits (Iqama) detailed tracking
CREATE TABLE IF NOT EXISTS residence_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  iqama_number text NOT NULL,
  iqama_profession text NOT NULL,
  iqama_profession_ar text,
  issue_date date NOT NULL,
  expiry_date date NOT NULL,
  border_number text,
  sponsor_id text, -- company/sponsor ID in MOI system
  sponsor_name text,
  muqeem_account_linked boolean DEFAULT false,
  muqeem_id text,
  last_exit_reentry_expiry date,
  exit_reentry_type text, -- single, multiple
  exit_reentry_validity_months integer,
  status text NOT NULL DEFAULT 'active', -- active, expired, under_renewal, transferred, cancelled
  final_exit_date date,
  transfer_date date,
  transfer_to_sponsor text,
  renewal_cost decimal(15, 2),
  last_renewal_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(iqama_number)
);

-- Visa and permit requests/transactions
CREATE TABLE IF NOT EXISTS visa_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  request_type text NOT NULL, -- new_visa, visa_renewal, iqama_renewal, exit_reentry, 
                               -- transfer_in, transfer_out, final_exit
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  nationality text NOT NULL,
  passport_number text NOT NULL,
  job_title text NOT NULL,
  request_date date NOT NULL,
  required_by_date date,
  processing_status text NOT NULL DEFAULT 'pending', -- pending, in_progress, approved, completed, rejected
  submission_date date,
  submission_reference text,
  approval_date date,
  completion_date date,
  rejection_reason text,
  cost decimal(15, 2),
  paid_amount decimal(15, 2),
  payment_date date,
  payment_reference text,
  government_fees decimal(15, 2),
  agency_fees decimal(15, 2),
  processing_office text, -- jawazat, mol, muqeem
  collected_by text,
  delivery_date date,
  muqeem_transaction_id text,
  documents_required text[],
  documents_submitted boolean DEFAULT false,
  priority text DEFAULT 'normal', -- urgent, high, normal, low
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exit reentry permits tracking
CREATE TABLE IF NOT EXISTS exit_reentry_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  permit_type text NOT NULL, -- single, multiple
  issue_date date NOT NULL,
  expiry_date date NOT NULL,
  used_date date,
  return_date date,
  destination_country text,
  purpose text,
  cost decimal(15, 2),
  muqeem_reference text,
  status text NOT NULL DEFAULT 'active', -- active, used, expired, cancelled
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_visas_company ON work_visas(company_id);
CREATE INDEX IF NOT EXISTS idx_work_visas_status ON work_visas(status);
CREATE INDEX IF NOT EXISTS idx_residence_permits_company ON residence_permits(company_id);
CREATE INDEX IF NOT EXISTS idx_residence_permits_employee ON residence_permits(employee_id);
CREATE INDEX IF NOT EXISTS idx_residence_permits_expiry ON residence_permits(expiry_date);
CREATE INDEX IF NOT EXISTS idx_visa_requests_company ON visa_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_visa_requests_status ON visa_requests(processing_status);
CREATE INDEX IF NOT EXISTS idx_exit_permits_employee ON exit_reentry_permits(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_permits_status ON exit_reentry_permits(status);

-- Enable RLS
ALTER TABLE work_visas ENABLE ROW LEVEL SECURITY;
ALTER TABLE residence_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_reentry_permits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view work visas"
  ON work_visas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage work visas"
  ON work_visas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view residence permits"
  ON residence_permits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage residence permits"
  ON residence_permits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view visa requests"
  ON visa_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage visa requests"
  ON visa_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view exit reentry permits"
  ON exit_reentry_permits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage exit reentry permits"
  ON exit_reentry_permits FOR ALL TO authenticated USING (true) WITH CHECK (true);
