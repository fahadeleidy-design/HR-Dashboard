/*
  # Contracts, Insurance, Travel & Expense Management

  ## Overview
  Complete management for contracts, insurance policies, business travel, and expense claims.

  ## Tables Created

  ### contracts
  - All company contracts management
  - Vendor and client contracts
  - Renewal tracking

  ### insurance_policies
  - All insurance types
  - Premium tracking
  - Claims management

  ### business_travel
  - Travel requests and approvals
  - Cost tracking
  - Itinerary management

  ### expense_claims
  - Employee expense claims
  - Approval workflow
  - Reimbursement tracking

  ## Security
  - RLS enabled on all tables
*/

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  contract_number text NOT NULL,
  contract_type text NOT NULL, -- vendor, client, lease, service, employment, partnership
  contract_title text NOT NULL,
  party_name text NOT NULL, -- other party in contract
  party_contact text,
  contract_value decimal(15, 2),
  currency text DEFAULT 'SAR',
  start_date date NOT NULL,
  end_date date,
  duration_months integer,
  auto_renewal boolean DEFAULT false,
  renewal_notice_days integer DEFAULT 30,
  payment_terms text,
  payment_frequency text, -- monthly, quarterly, annually, one_time
  responsible_person_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  contract_file_url text,
  status text NOT NULL DEFAULT 'active', -- draft, active, expired, terminated, renewed
  termination_date date,
  termination_reason text,
  special_terms text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, contract_number)
);

-- Insurance policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  policy_number text NOT NULL,
  insurance_type text NOT NULL, -- health, vehicle, property, liability, workers_comp, professional
  policy_name text NOT NULL,
  insurance_company text NOT NULL,
  insurance_company_contact text,
  broker_name text,
  broker_contact text,
  coverage_amount decimal(15, 2),
  premium_amount decimal(15, 2) NOT NULL,
  payment_frequency text, -- monthly, quarterly, semi_annual, annual
  start_date date NOT NULL,
  expiry_date date NOT NULL,
  renewal_date date,
  policy_file_url text,
  covered_items text[], -- for vehicle/property insurance
  covered_employees_count integer, -- for health insurance
  deductible_amount decimal(15, 2),
  claim_procedure text,
  status text NOT NULL DEFAULT 'active', -- active, expired, cancelled, under_renewal
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, policy_number)
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE CASCADE NOT NULL,
  claim_number text,
  claim_date date NOT NULL,
  incident_date date NOT NULL,
  claimant_name text NOT NULL,
  claimant_type text, -- employee, vehicle, property
  related_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  related_vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  claim_type text NOT NULL,
  description text NOT NULL,
  claim_amount decimal(15, 2) NOT NULL,
  approved_amount decimal(15, 2),
  paid_amount decimal(15, 2),
  payment_date date,
  status text NOT NULL DEFAULT 'submitted', -- submitted, under_review, approved, rejected, paid
  rejection_reason text,
  documents_urls text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Business travel table
CREATE TABLE IF NOT EXISTS business_travel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  trip_purpose text NOT NULL,
  destination_city text NOT NULL,
  destination_country text NOT NULL,
  departure_date date NOT NULL,
  return_date date NOT NULL,
  travel_days integer NOT NULL,
  travel_type text, -- domestic, international
  transportation_method text, -- flight, car, train
  accommodation_needed boolean DEFAULT true,
  estimated_cost decimal(15, 2),
  actual_cost decimal(15, 2),
  advance_amount decimal(15, 2),
  advance_paid boolean DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approved_by_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_date date,
  rejection_reason text,
  booking_status text, -- not_booked, booked, cancelled
  flight_details text,
  hotel_details text,
  rental_car_details text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expense claims table
CREATE TABLE IF NOT EXISTS expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  claim_date date NOT NULL,
  expense_date date NOT NULL,
  expense_category text NOT NULL, -- travel, meals, accommodation, fuel, entertainment, supplies, other
  description text NOT NULL,
  amount decimal(15, 2) NOT NULL,
  currency text DEFAULT 'SAR',
  payment_method text, -- cash, credit_card, personal_card
  receipt_file_url text,
  related_travel_id uuid REFERENCES business_travel(id) ON DELETE SET NULL,
  related_project text,
  approval_status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, paid
  approved_by_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_date date,
  rejection_reason text,
  reimbursement_date date,
  reimbursement_method text, -- bank_transfer, cash, salary
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_insurance_company ON insurance_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_status ON insurance_policies(status);
CREATE INDEX IF NOT EXISTS idx_insurance_expiry ON insurance_policies(expiry_date);
CREATE INDEX IF NOT EXISTS idx_claims_policy ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_travel_company ON business_travel(company_id);
CREATE INDEX IF NOT EXISTS idx_travel_employee ON business_travel(employee_id);
CREATE INDEX IF NOT EXISTS idx_travel_status ON business_travel(approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expense_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expense_claims(approval_status);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_travel ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view contracts"
  ON contracts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage contracts"
  ON contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view insurance policies"
  ON insurance_policies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage insurance policies"
  ON insurance_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view insurance claims"
  ON insurance_claims FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage insurance claims"
  ON insurance_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view travel"
  ON business_travel FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage travel"
  ON business_travel FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view expenses"
  ON expense_claims FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage expenses"
  ON expense_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
