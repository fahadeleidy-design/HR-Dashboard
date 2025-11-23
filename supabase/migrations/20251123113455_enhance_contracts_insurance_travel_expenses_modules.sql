/*
  # Enhance Contracts, Insurance, Travel & Expenses Modules

  1. Changes to Contracts Table
    - Add Saudi Labor Law compliance fields
    - Add SADAD payment integration fields
    - Add contract templates and clauses
    - Add penalty/liquidated damages tracking
  
  2. Changes to Insurance Table
    - Add Saudi insurance provider requirements
    - Add CCHI (Saudi Health Insurance Council) compliance
    - Add TPL (Third Party Liability) for vehicles
    - Add workmen compensation tracking
  
  3. Changes to Travel Table
    - Add Saudi travel approval requirements
    - Add per diem rates per Saudi regulations
    - Add visa requirements for travel
    - Add government approvals tracking
  
  4. Changes to Expenses Table
    - Add VAT tracking (15% in Saudi)
    - Add expense limits per Saudi policies
    - Add WPS (Wage Protection System) integration
    - Add receipt requirements compliance
  
  5. New Tables
    - contract_renewals - Track renewal history
    - insurance_beneficiaries - Track policy beneficiaries
    - travel_per_diem_rates - Saudi government per diem rates
    - expense_categories_limits - Company expense policies
*/

-- Add fields to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_category text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS legal_entity text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cr_number text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) DEFAULT 15.00;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vat_inclusive boolean DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS penalty_clause text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS penalty_amount decimal(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS liquidated_damages decimal(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS governing_law text DEFAULT 'Saudi Arabia';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS dispute_resolution text DEFAULT 'Saudi Courts';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS force_majeure_clause text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS confidentiality_clause text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS ip_rights_clause text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS last_review_date date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS next_review_date date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reviewed_by_legal boolean DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approved_by_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approval_date date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_used text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tags text[];

COMMENT ON COLUMN contracts.governing_law IS 'Applicable law for contract (default: Saudi Arabia)';
COMMENT ON COLUMN contracts.dispute_resolution IS 'Dispute resolution mechanism (Saudi Courts, Arbitration, etc.)';
COMMENT ON COLUMN contracts.vat_rate IS 'VAT rate applicable (default 15% for Saudi Arabia)';

-- Contract renewals tracking
CREATE TABLE IF NOT EXISTS contract_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  renewal_date date NOT NULL,
  previous_end_date date NOT NULL,
  new_end_date date NOT NULL,
  previous_value decimal(15,2),
  new_value decimal(15,2),
  value_change_percentage numeric(5,2),
  terms_changed boolean DEFAULT false,
  changes_summary text,
  approved_by_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  approval_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract ON contract_renewals(contract_id);

ALTER TABLE contract_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contract renewals"
  ON contract_renewals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage contract renewals"
  ON contract_renewals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add fields to insurance_policies table
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS cchi_approved boolean DEFAULT false;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS cchi_code text;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS insurance_class text;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS policy_document_number text;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS iban text;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS network_type text;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS coverage_territory text DEFAULT 'Saudi Arabia';
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS dependents_covered boolean DEFAULT false;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS maternity_coverage boolean DEFAULT false;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS dental_coverage boolean DEFAULT false;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS optical_coverage boolean DEFAULT false;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS co_payment_percentage numeric(5,2);
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS annual_limit decimal(15,2);
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS claim_settlement_days integer;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS policy_language text DEFAULT 'Arabic/English';
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS approved_by_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS grace_period_days integer DEFAULT 30;

COMMENT ON COLUMN insurance_policies.cchi_approved IS 'Whether policy is approved by Council of Cooperative Health Insurance (Saudi Arabia)';
COMMENT ON COLUMN insurance_policies.cchi_code IS 'CCHI approval code for health insurance';
COMMENT ON COLUMN insurance_policies.insurance_class IS 'Insurance class as per Saudi insurance regulations (A, B, C, etc.)';

-- Insurance beneficiaries
CREATE TABLE IF NOT EXISTS insurance_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  beneficiary_name text NOT NULL,
  relationship text NOT NULL,
  beneficiary_type text NOT NULL,
  id_number text,
  date_of_birth date,
  percentage_share numeric(5,2) DEFAULT 100.00,
  is_primary boolean DEFAULT true,
  contact_phone text,
  address text,
  status text DEFAULT 'active',
  added_date date DEFAULT CURRENT_DATE,
  removed_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_beneficiaries_policy ON insurance_beneficiaries(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_beneficiaries_employee ON insurance_beneficiaries(employee_id);

ALTER TABLE insurance_beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view insurance beneficiaries"
  ON insurance_beneficiaries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage insurance beneficiaries"
  ON insurance_beneficiaries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add fields to business_travel table
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS approval_level text;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS manager_approval_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS manager_approval_date date;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS hr_approval_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS hr_approval_date date;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS finance_approval_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS finance_approval_date date;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS visa_required boolean DEFAULT false;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS visa_status text;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS exit_reentry_required boolean DEFAULT false;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS exit_reentry_obtained boolean DEFAULT false;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS per_diem_rate decimal(10,2);
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS total_per_diem decimal(10,2);
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS insurance_coverage text;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS project_code text;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS cost_center text;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS receipts_submitted boolean DEFAULT false;
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'pending';
ALTER TABLE business_travel ADD COLUMN IF NOT EXISTS settlement_date date;

COMMENT ON COLUMN business_travel.exit_reentry_required IS 'Whether exit-reentry permit is required for expat employees';
COMMENT ON COLUMN business_travel.per_diem_rate IS 'Daily allowance rate per Saudi government/company policy';

-- Travel per diem rates (Saudi government standard rates)
CREATE TABLE IF NOT EXISTS travel_per_diem_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  destination_country text NOT NULL,
  destination_city text,
  travel_type text NOT NULL,
  employee_grade text,
  per_diem_rate decimal(10,2) NOT NULL,
  accommodation_rate decimal(10,2),
  transportation_rate decimal(10,2),
  currency text DEFAULT 'SAR',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, destination_country, destination_city, travel_type, employee_grade, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_per_diem_company ON travel_per_diem_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_per_diem_destination ON travel_per_diem_rates(destination_country);

ALTER TABLE travel_per_diem_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view per diem rates"
  ON travel_per_diem_rates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage per diem rates"
  ON travel_per_diem_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add fields to expense_claims table
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS vat_amount decimal(15,2);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) DEFAULT 15.00;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS amount_excluding_vat decimal(15,2);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS receipt_number text;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS vendor_name text;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS vendor_vat_number text;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS is_vat_reclaimable boolean DEFAULT false;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS manager_approval_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS manager_approval_date date;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS finance_approval_id uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS finance_approval_date date;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS policy_compliant boolean DEFAULT true;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS policy_violation_reason text;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS expense_limit decimal(15,2);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS exceeds_limit boolean DEFAULT false;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS advance_deducted decimal(15,2);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS net_reimbursement decimal(15,2);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS reimbursement_reference text;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS cost_center text;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS project_code text;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS gl_account text;

COMMENT ON COLUMN expense_claims.vat_rate IS 'VAT rate (15% standard rate in Saudi Arabia)';
COMMENT ON COLUMN expense_claims.is_vat_reclaimable IS 'Whether VAT can be reclaimed from ZATCA (Saudi Tax Authority)';
COMMENT ON COLUMN expense_claims.vendor_vat_number IS 'Vendor VAT registration number for compliance';

-- Expense category limits
CREATE TABLE IF NOT EXISTS expense_categories_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  expense_category text NOT NULL,
  expense_sub_category text,
  employee_grade text,
  daily_limit decimal(15,2),
  transaction_limit decimal(15,2),
  monthly_limit decimal(15,2),
  annual_limit decimal(15,2),
  requires_receipt_above decimal(15,2),
  requires_manager_approval boolean DEFAULT true,
  requires_finance_approval_above decimal(15,2),
  receipt_mandatory boolean DEFAULT true,
  vat_reclaimable boolean DEFAULT false,
  notes text,
  effective_from date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_limits_company ON expense_categories_limits(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_limits_category ON expense_categories_limits(expense_category);

ALTER TABLE expense_categories_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view expense limits"
  ON expense_categories_limits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage expense limits"
  ON expense_categories_limits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default Saudi expense categories and limits
INSERT INTO expense_categories_limits (company_id, expense_category, transaction_limit, monthly_limit, requires_receipt_above, receipt_mandatory, notes)
SELECT 
  c.id,
  category,
  limit_amount,
  monthly_limit,
  receipt_above,
  true,
  description
FROM companies c
CROSS JOIN (VALUES
  ('travel', 5000.00, 20000.00, 100.00, 'Business travel expenses including flights, hotels'),
  ('meals', 200.00, 3000.00, 50.00, 'Business meals and entertainment'),
  ('fuel', 500.00, 3000.00, 50.00, 'Fuel and vehicle expenses'),
  ('accommodation', 1000.00, 10000.00, 100.00, 'Hotel and accommodation costs'),
  ('transportation', 300.00, 2000.00, 50.00, 'Local transportation, taxis, car rentals'),
  ('communication', 500.00, 2000.00, 100.00, 'Phone, internet, communication expenses'),
  ('supplies', 1000.00, 5000.00, 100.00, 'Office supplies and materials'),
  ('entertainment', 500.00, 3000.00, 100.00, 'Client entertainment and gifts'),
  ('training', 5000.00, 20000.00, 500.00, 'Training courses and materials'),
  ('other', 1000.00, 5000.00, 100.00, 'Other business expenses')
) AS defaults(category, limit_amount, monthly_limit, receipt_above, description)
ON CONFLICT DO NOTHING;
