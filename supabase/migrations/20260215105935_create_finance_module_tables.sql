/*
  # Finance Module - Core Tables

  1. New Tables
    - `budgets` - Fiscal year budgets by cost center / department
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK to companies)
      - `fiscal_year` (integer)
      - `cost_center_id` (uuid, nullable, FK to cost_centers)
      - `department_id` (uuid, nullable, FK to departments)
      - `category` (text) - salaries, allowances, training, travel, equipment, other
      - `annual_amount` (numeric)
      - `monthly_amounts` (jsonb) - 12-month breakdown
      - `status` (text) - draft, active, closed
      - `created_by` (uuid)
      - `approved_by` (uuid, nullable)
      - `created_at` / `updated_at` (timestamptz)

    - `budget_transactions` - Actuals and commitments against budgets
      - `id` (uuid, primary key)
      - `budget_id` (uuid, FK to budgets)
      - `company_id` (uuid)
      - `transaction_type` (text) - actual, committed, reversal
      - `amount` (numeric)
      - `reference_type` (text) - payroll_batch, expense_claim, loan, advance, etc.
      - `reference_id` (uuid)
      - `transaction_month` (integer)
      - `description` (text)
      - `created_at` (timestamptz)

    - `financial_periods` - Monthly period management and close workflow
      - `id` (uuid, primary key)
      - `company_id` (uuid)
      - `period_year` (integer)
      - `period_month` (integer)
      - `status` (text) - open, in_progress, closed
      - `checklist_status` (jsonb) - tracks each close step
      - `opened_at` / `closed_at` (timestamptz)
      - `closed_by` (uuid, nullable)
      - `notes` (text)

    - `payment_reconciliations` - Bank payment reconciliation records
      - `id` (uuid, primary key)
      - `company_id` (uuid)
      - `payroll_batch_id` (uuid, nullable)
      - `bank_reference` (text)
      - `payment_date` (date)
      - `payment_amount` (numeric)
      - `matched_amount` (numeric, default 0)
      - `unmatched_amount` (numeric, default 0)
      - `status` (text) - pending, partially_matched, fully_matched, failed
      - `reconciled_by` (uuid, nullable)
      - `reconciled_at` (timestamptz, nullable)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `loan_disbursements` - Tracks loan payment release details
      - `id` (uuid, primary key)
      - `loan_id` (uuid)
      - `company_id` (uuid)
      - `disbursement_date` (date)
      - `disbursement_amount` (numeric)
      - `disbursement_method` (text) - bank_transfer, cash, check
      - `bank_reference` (text, nullable)
      - `disbursed_by` (uuid)
      - `created_at` (timestamptz)

    - `advance_disbursements` - Tracks advance payment release details
      - `id` (uuid, primary key)
      - `advance_id` (uuid)
      - `company_id` (uuid)
      - `disbursement_date` (date)
      - `disbursement_amount` (numeric)
      - `disbursement_method` (text) - bank_transfer, cash, check
      - `bank_reference` (text, nullable)
      - `disbursed_by` (uuid)
      - `created_at` (timestamptz)

    - `eos_finance_reviews` - Finance approval for end-of-service calculations
      - `id` (uuid, primary key)
      - `eos_calculation_id` (uuid)
      - `company_id` (uuid)
      - `status` (text) - pending, approved, rejected
      - `reviewed_by` (uuid, nullable)
      - `reviewed_at` (timestamptz, nullable)
      - `payment_date` (date, nullable)
      - `payment_method` (text, nullable)
      - `payment_reference` (text, nullable)
      - `net_benefit_amount` (numeric, nullable)
      - `deductions_json` (jsonb) - loan/advance/penalty deductions
      - `notes` (text)
      - `created_at` (timestamptz)

    - `gosi_filing_records` - GOSI submission tracking
      - `id` (uuid, primary key)
      - `company_id` (uuid)
      - `filing_month` (text) - YYYY-MM
      - `total_employees` (integer)
      - `total_wage_subject` (numeric)
      - `total_employee_contribution` (numeric)
      - `total_employer_contribution` (numeric)
      - `grand_total` (numeric)
      - `status` (text) - draft, submitted, paid, reconciled
      - `submission_date` (date, nullable)
      - `payment_date` (date, nullable)
      - `payment_reference` (text, nullable)
      - `filed_by` (uuid, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Finance role has full CRUD on own company data
    - Super admin has cross-company access
*/

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  fiscal_year integer NOT NULL,
  cost_center_id uuid REFERENCES cost_centers(id),
  department_id uuid REFERENCES departments(id),
  category text NOT NULL DEFAULT 'general',
  annual_amount numeric NOT NULL DEFAULT 0,
  monthly_amounts jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  approved_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can view budgets"
  ON budgets FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance','hr'])
    )
  );

CREATE POLICY "Finance can create budgets"
  ON budgets FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

CREATE POLICY "Finance can update budgets"
  ON budgets FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

CREATE POLICY "Super admin can delete budgets"
  ON budgets FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin'])
    )
  );

-- Budget transactions
CREATE TABLE IF NOT EXISTS budget_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  transaction_type text NOT NULL DEFAULT 'actual' CHECK (transaction_type IN ('actual', 'committed', 'reversal')),
  amount numeric NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  transaction_month integer NOT NULL CHECK (transaction_month >= 1 AND transaction_month <= 12),
  description text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can view budget transactions"
  ON budget_transactions FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance','hr'])
    )
  );

CREATE POLICY "Finance can create budget transactions"
  ON budget_transactions FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

-- Financial periods
CREATE TABLE IF NOT EXISTS financial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  period_year integer NOT NULL,
  period_month integer NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  checklist_status jsonb DEFAULT '{"payroll_verified": false, "gosi_filed": false, "expenses_processed": false, "loans_deducted": false, "advances_processed": false, "penalties_applied": false, "bank_reconciled": false, "reports_generated": false}',
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, period_year, period_month)
);

ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view financial periods"
  ON financial_periods FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

CREATE POLICY "Finance can create financial periods"
  ON financial_periods FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

CREATE POLICY "Finance can update financial periods"
  ON financial_periods FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

-- Payment reconciliations
CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  payroll_batch_id uuid,
  bank_reference text,
  payment_date date,
  payment_amount numeric NOT NULL DEFAULT 0,
  matched_amount numeric NOT NULL DEFAULT 0,
  unmatched_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_matched', 'fully_matched', 'failed')),
  reconciled_by uuid,
  reconciled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view payment reconciliations"
  ON payment_reconciliations FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

CREATE POLICY "Finance can create payment reconciliations"
  ON payment_reconciliations FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

CREATE POLICY "Finance can update payment reconciliations"
  ON payment_reconciliations FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

-- Loan disbursements
CREATE TABLE IF NOT EXISTS loan_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id),
  disbursement_date date NOT NULL,
  disbursement_amount numeric NOT NULL,
  disbursement_method text NOT NULL DEFAULT 'bank_transfer' CHECK (disbursement_method IN ('bank_transfer', 'cash', 'check')),
  bank_reference text,
  disbursed_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loan_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view loan disbursements"
  ON loan_disbursements FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance','hr'])
    )
  );

CREATE POLICY "Finance can create loan disbursements"
  ON loan_disbursements FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

-- Advance disbursements
CREATE TABLE IF NOT EXISTS advance_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id),
  disbursement_date date NOT NULL,
  disbursement_amount numeric NOT NULL,
  disbursement_method text NOT NULL DEFAULT 'bank_transfer' CHECK (disbursement_method IN ('bank_transfer', 'cash', 'check')),
  bank_reference text,
  disbursed_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE advance_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view advance disbursements"
  ON advance_disbursements FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance','hr'])
    )
  );

CREATE POLICY "Finance can create advance disbursements"
  ON advance_disbursements FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

-- EOS finance reviews
CREATE TABLE IF NOT EXISTS eos_finance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eos_calculation_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  payment_date date,
  payment_method text CHECK (payment_method IN ('bank_transfer', 'cash', 'check')),
  payment_reference text,
  net_benefit_amount numeric,
  deductions_json jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE eos_finance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view eos reviews"
  ON eos_finance_reviews FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance','hr'])
    )
  );

CREATE POLICY "Finance can create eos reviews"
  ON eos_finance_reviews FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

CREATE POLICY "Finance can update eos reviews"
  ON eos_finance_reviews FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

-- GOSI filing records
CREATE TABLE IF NOT EXISTS gosi_filing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  filing_month text NOT NULL,
  total_employees integer NOT NULL DEFAULT 0,
  total_wage_subject numeric NOT NULL DEFAULT 0,
  total_employee_contribution numeric NOT NULL DEFAULT 0,
  total_employer_contribution numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid', 'reconciled')),
  submission_date date,
  payment_date date,
  payment_reference text,
  filed_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, filing_month)
);

ALTER TABLE gosi_filing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view gosi filing records"
  ON gosi_filing_records FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance','hr'])
    )
  );

CREATE POLICY "Finance can create gosi filing records"
  ON gosi_filing_records FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

CREATE POLICY "Finance can update gosi filing records"
  ON gosi_filing_records FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(ARRAY['super_admin','admin','finance'])
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_company_year ON budgets(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_budget ON budget_transactions(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_company ON budget_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_company ON financial_periods(company_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_company ON payment_reconciliations(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_batch ON payment_reconciliations(payroll_batch_id);
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_loan ON loan_disbursements(loan_id);
CREATE INDEX IF NOT EXISTS idx_advance_disbursements_advance ON advance_disbursements(advance_id);
CREATE INDEX IF NOT EXISTS idx_eos_finance_reviews_eos ON eos_finance_reviews(eos_calculation_id);
CREATE INDEX IF NOT EXISTS idx_gosi_filing_records_company ON gosi_filing_records(company_id, filing_month);
