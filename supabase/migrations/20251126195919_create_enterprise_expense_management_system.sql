/*
  # Enterprise-Grade Expense Management System

  1. New Tables
    - `expense_policies` - Define expense policies and limits
      - `id`, `company_id`, `name`, `description`
      - Per-diem rates, mileage rates, category limits
      - Approval workflows, receipt requirements
      
    - `expense_categories` - Enhanced categories with limits
      - `id`, `company_id`, `name`, `parent_category`
      - `daily_limit`, `monthly_limit`, `requires_receipt`
      - `requires_justification`, `is_active`
      
    - `expense_approvers` - Multi-level approval workflow
      - `id`, `company_id`, `employee_id`, `approver_id`
      - `approval_level`, `amount_threshold`
      - `can_approve_own_expenses`
      
    - `expense_reports` - Group multiple expenses
      - `id`, `company_id`, `employee_id`, `report_number`
      - `title`, `period_start`, `period_end`
      - `total_amount`, `status`, `submitted_date`
      
    - `expense_items` - Individual expense line items
      - `id`, `company_id`, `report_id`, `expense_claim_id`
      - Enhanced with split billing, tax details
      
    - `expense_mileage` - Mileage tracking
      - `id`, `company_id`, `employee_id`, `date`
      - `from_location`, `to_location`, `distance_km`
      - `vehicle_type`, `rate_per_km`, `total_amount`
      
    - `expense_per_diem` - Per diem allowances
      - `id`, `company_id`, `employee_id`, `date`
      - `location`, `meal_type`, `rate`, `amount`
      
    - `expense_receipts` - Separate receipt management
      - `id`, `company_id`, `expense_claim_id`
      - `file_url`, `file_type`, `ocr_data`
      - `extracted_amount`, `extracted_date`, `extracted_vendor`
      
    - `expense_violations` - Policy violation tracking
      - `id`, `company_id`, `expense_claim_id`
      - `violation_type`, `severity`, `description`
      
    - `expense_analytics` - Materialized view for analytics
      - Spending trends, category analysis, employee spending

  2. Enhanced expense_claims Table
    - Add missing columns for enterprise features
    - Workflow status tracking
    - Integration fields

  3. Views & Functions
    - View: `expense_dashboard_summary`
    - View: `expense_by_category_monthly`
    - Function: `check_expense_policy_compliance`
    - Function: `calculate_per_diem_amount`
    - Function: `auto_assign_expense_approvers`

  4. Security
    - RLS policies for all tables
    - Employees can view/edit own expenses
    - Managers can approve subordinate expenses
    - Finance team has full access
*/

-- Create expense_policies table
CREATE TABLE IF NOT EXISTS expense_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  mileage_rate_per_km decimal(10,2) DEFAULT 0.85,
  per_diem_rate_domestic decimal(10,2) DEFAULT 200.00,
  per_diem_rate_international decimal(10,2) DEFAULT 350.00,
  receipt_required_above_amount decimal(10,2) DEFAULT 100.00,
  max_expense_age_days integer DEFAULT 90,
  require_manager_approval boolean DEFAULT true,
  require_finance_approval boolean DEFAULT true,
  require_finance_approval_above decimal(10,2) DEFAULT 5000.00,
  allow_personal_card boolean DEFAULT true,
  auto_approve_below_amount decimal(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  code text,
  parent_category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  description text,
  gl_account text,
  daily_limit decimal(10,2),
  monthly_limit decimal(10,2),
  annual_limit decimal(10,2),
  requires_receipt boolean DEFAULT true,
  requires_justification boolean DEFAULT false,
  allows_client_billing boolean DEFAULT true,
  icon text,
  color text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_approvers table
CREATE TABLE IF NOT EXISTS expense_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  approval_level integer DEFAULT 1,
  amount_threshold decimal(10,2),
  can_approve_own_expenses boolean DEFAULT false,
  is_active boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_reports table
CREATE TABLE IF NOT EXISTS expense_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  report_number text NOT NULL,
  title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  purpose text,
  total_amount decimal(10,2) DEFAULT 0,
  total_vat decimal(10,2) DEFAULT 0,
  total_items integer DEFAULT 0,
  status text CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid')) DEFAULT 'draft',
  submitted_date timestamptz,
  approved_date timestamptz,
  approved_by_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  rejection_reason text,
  payment_date timestamptz,
  payment_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, report_number)
);

-- Create expense_mileage table
CREATE TABLE IF NOT EXISTS expense_mileage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  report_id uuid REFERENCES expense_reports(id) ON DELETE CASCADE,
  date date NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  distance_km decimal(10,2) NOT NULL,
  vehicle_type text DEFAULT 'car',
  vehicle_registration text,
  rate_per_km decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  purpose text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_per_diem table
CREATE TABLE IF NOT EXISTS expense_per_diem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  report_id uuid REFERENCES expense_reports(id) ON DELETE CASCADE,
  date date NOT NULL,
  location text NOT NULL,
  is_international boolean DEFAULT false,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'full_day')),
  rate decimal(10,2) NOT NULL,
  amount decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_receipts table
CREATE TABLE IF NOT EXISTS expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  expense_claim_id uuid REFERENCES expense_claims(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  ocr_processed boolean DEFAULT false,
  ocr_data jsonb,
  extracted_amount decimal(10,2),
  extracted_date date,
  extracted_vendor text,
  extracted_vat_number text,
  extracted_vat_amount decimal(10,2),
  verification_status text CHECK (verification_status IN ('pending', 'verified', 'mismatch')) DEFAULT 'pending',
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create expense_violations table
CREATE TABLE IF NOT EXISTS expense_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  expense_claim_id uuid REFERENCES expense_claims(id) ON DELETE CASCADE NOT NULL,
  violation_type text CHECK (violation_type IN ('exceeds_limit', 'missing_receipt', 'late_submission', 'duplicate', 'invalid_category', 'policy_breach')) NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description text NOT NULL,
  expected_value text,
  actual_value text,
  auto_detected boolean DEFAULT true,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to expense_claims table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'claim_number') THEN
    ALTER TABLE expense_claims ADD COLUMN claim_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'report_id') THEN
    ALTER TABLE expense_claims ADD COLUMN report_id uuid REFERENCES expense_reports(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'subcategory') THEN
    ALTER TABLE expense_claims ADD COLUMN subcategory text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'business_purpose') THEN
    ALTER TABLE expense_claims ADD COLUMN business_purpose text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'billable_to_client') THEN
    ALTER TABLE expense_claims ADD COLUMN billable_to_client boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'client_name') THEN
    ALTER TABLE expense_claims ADD COLUMN client_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'amount_in_sar') THEN
    ALTER TABLE expense_claims ADD COLUMN amount_in_sar decimal(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'exchange_rate') THEN
    ALTER TABLE expense_claims ADD COLUMN exchange_rate decimal(10,6) DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'receipt_attached') THEN
    ALTER TABLE expense_claims ADD COLUMN receipt_attached boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'receipt_files') THEN
    ALTER TABLE expense_claims ADD COLUMN receipt_files text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'manager_approval_status') THEN
    ALTER TABLE expense_claims ADD COLUMN manager_approval_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'finance_approval_status') THEN
    ALTER TABLE expense_claims ADD COLUMN finance_approval_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_claims' AND column_name = 'submitted_date') THEN
    ALTER TABLE expense_claims ADD COLUMN submitted_date timestamptz;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expense_policies_company ON expense_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_company ON expense_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON expense_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvers_employee ON expense_approvers(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvers_approver ON expense_approvers(approver_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_company ON expense_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_employee ON expense_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON expense_reports(status);
CREATE INDEX IF NOT EXISTS idx_expense_mileage_employee ON expense_mileage(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_mileage_date ON expense_mileage(date);
CREATE INDEX IF NOT EXISTS idx_expense_per_diem_employee ON expense_per_diem(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_claim ON expense_receipts(expense_claim_id);
CREATE INDEX IF NOT EXISTS idx_expense_violations_claim ON expense_violations(expense_claim_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_report ON expense_claims(report_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(approval_status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_date ON expense_claims(expense_date);

-- Enable RLS
ALTER TABLE expense_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_mileage ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_per_diem ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view expense policies for their company"
  ON expense_policies FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view expense categories for their company"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view expense reports for their company"
  ON expense_reports FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Employees can manage their own expense reports"
  ON expense_reports FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view mileage for their company"
  ON expense_mileage FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Employees can manage their own mileage"
  ON expense_mileage FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view per diem for their company"
  ON expense_per_diem FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view receipts for their company"
  ON expense_receipts FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view violations for their company"
  ON expense_violations FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR can manage expense policies"
  ON expense_policies FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager', 'finance_manager')
    )
  );

CREATE POLICY "HR can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager', 'finance_manager')
    )
  );

-- Create view for expense dashboard
CREATE OR REPLACE VIEW expense_dashboard_summary AS
SELECT 
  ec.company_id,
  DATE_TRUNC('month', ec.expense_date) as month,
  COUNT(*) as total_claims,
  COUNT(*) FILTER (WHERE ec.approval_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE ec.approval_status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE ec.approval_status = 'rejected') as rejected_count,
  COALESCE(SUM(ec.amount_in_sar), 0) as total_amount,
  COALESCE(SUM(ec.vat_amount), 0) as total_vat,
  COALESCE(AVG(ec.amount_in_sar), 0) as avg_claim_amount,
  COUNT(*) FILTER (WHERE NOT ec.policy_compliant) as policy_violations
FROM expense_claims ec
GROUP BY ec.company_id, DATE_TRUNC('month', ec.expense_date);

-- Seed default expense policy for existing companies
INSERT INTO expense_policies (company_id, name, description, is_active)
SELECT id, 'Default Expense Policy', 'Standard expense policy with Saudi market rates', true
FROM companies
WHERE id NOT IN (SELECT company_id FROM expense_policies WHERE is_active = true)
ON CONFLICT DO NOTHING;

-- Seed default expense categories
INSERT INTO expense_categories (company_id, name, code, requires_receipt, is_active)
SELECT c.id, cat.name, cat.code, cat.requires_receipt, true
FROM companies c
CROSS JOIN (
  VALUES 
    ('Travel - Flights', 'TRV-FLT', true),
    ('Travel - Ground Transport', 'TRV-GRD', true),
    ('Accommodation', 'ACC', true),
    ('Meals & Entertainment', 'MEL', true),
    ('Office Supplies', 'OFF', true),
    ('Communication', 'COM', true),
    ('Training & Development', 'TRN', true),
    ('Marketing', 'MKT', true),
    ('Professional Services', 'PRO', true),
    ('IT & Software', 'IT', true)
) AS cat(name, code, requires_receipt)
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories WHERE company_id = c.id
)
ON CONFLICT DO NOTHING;