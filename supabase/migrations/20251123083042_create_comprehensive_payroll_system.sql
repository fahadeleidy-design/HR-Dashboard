/*
  # Comprehensive Payroll System Enhancement

  ## Overview
  This migration enhances the payroll system with comprehensive features including:
  - Payroll batches with approval workflow
  - Detailed earnings and deductions
  - Payslip generation
  - Payment processing tracking
  - Salary history and audit trail
  - Bonus and commission management
  - Loan and advance management
  - Tax and Zakat calculations

  ## 1. New Tables

  ### payroll_batches
  Manages monthly payroll processing batches
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `month` (text) - YYYY-MM format
  - `period_start` (date)
  - `period_end` (date)
  - `total_employees` (integer)
  - `total_gross` (decimal)
  - `total_net` (decimal)
  - `total_deductions` (decimal)
  - `status` (text) - draft, pending_approval, approved, processed, paid
  - `created_by` (uuid)
  - `approved_by` (uuid)
  - `approved_at` (timestamptz)
  - `processed_at` (timestamptz)
  - `notes` (text)

  ### payroll_items
  Individual payroll entries for each employee in a batch
  - `id` (uuid, primary key)
  - `batch_id` (uuid, foreign key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `basic_salary` (decimal)
  - `housing_allowance` (decimal)
  - `transportation_allowance` (decimal)
  - `food_allowance` (decimal)
  - `mobile_allowance` (decimal)
  - `other_allowances` (decimal)
  - `overtime_amount` (decimal)
  - `bonus_amount` (decimal)
  - `commission_amount` (decimal)
  - `total_earnings` (decimal)
  - `gosi_employee` (decimal)
  - `gosi_employer` (decimal)
  - `loan_deduction` (decimal)
  - `advance_deduction` (decimal)
  - `absence_deduction` (decimal)
  - `other_deductions` (decimal)
  - `total_deductions` (decimal)
  - `net_salary` (decimal)
  - `days_worked` (integer)
  - `overtime_hours` (decimal)
  - `absence_days` (integer)
  - `payment_method` (text)
  - `payment_status` (text)
  - `payment_date` (date)
  - `payment_reference` (text)

  ### earnings_types
  Master data for different types of earnings
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `code` (text)
  - `name_en` (text)
  - `name_ar` (text)
  - `is_recurring` (boolean)
  - `is_taxable` (boolean)
  - `affects_gosi` (boolean)
  - `is_active` (boolean)

  ### deduction_types
  Master data for different types of deductions
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `code` (text)
  - `name_en` (text)
  - `name_ar` (text)
  - `is_recurring` (boolean)
  - `is_active` (boolean)

  ### employee_earnings
  Additional earnings per employee
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `earning_type_id` (uuid, foreign key)
  - `amount` (decimal)
  - `effective_date` (date)
  - `notes` (text)

  ### employee_deductions
  Additional deductions per employee
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `deduction_type_id` (uuid, foreign key)
  - `amount` (decimal)
  - `effective_date` (date)
  - `notes` (text)

  ### loans
  Employee loan management
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `loan_type` (text)
  - `loan_amount` (decimal)
  - `remaining_amount` (decimal)
  - `monthly_installment` (decimal)
  - `start_date` (date)
  - `end_date` (date)
  - `status` (text)
  - `notes` (text)

  ### advances
  Salary advance management
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `amount` (decimal)
  - `remaining_amount` (decimal)
  - `deduction_amount` (decimal)
  - `request_date` (date)
  - `approved_date` (date)
  - `status` (text)
  - `notes` (text)

  ### payslips
  Generated payslips for distribution
  - `id` (uuid, primary key)
  - `payroll_item_id` (uuid, foreign key)
  - `employee_id` (uuid, foreign key)
  - `generated_at` (timestamptz)
  - `sent_at` (timestamptz)
  - `viewed_at` (timestamptz)

  ### salary_history
  Tracks all salary changes with audit trail
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `old_basic_salary` (decimal)
  - `new_basic_salary` (decimal)
  - `old_allowances` (jsonb)
  - `new_allowances` (jsonb)
  - `effective_date` (date)
  - `change_reason` (text)
  - `changed_by` (uuid)

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for company-based access control

  ## 3. Indexes
  - Add indexes for performance optimization
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payroll Batches Table
CREATE TABLE IF NOT EXISTS payroll_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_employees integer DEFAULT 0,
  total_gross decimal(12,2) DEFAULT 0,
  total_net decimal(12,2) DEFAULT 0,
  total_deductions decimal(12,2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'processed', 'paid')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  processed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, month)
);

-- Payroll Items Table
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  basic_salary decimal(10,2) DEFAULT 0,
  housing_allowance decimal(10,2) DEFAULT 0,
  transportation_allowance decimal(10,2) DEFAULT 0,
  food_allowance decimal(10,2) DEFAULT 0,
  mobile_allowance decimal(10,2) DEFAULT 0,
  other_allowances decimal(10,2) DEFAULT 0,
  overtime_amount decimal(10,2) DEFAULT 0,
  bonus_amount decimal(10,2) DEFAULT 0,
  commission_amount decimal(10,2) DEFAULT 0,
  total_earnings decimal(10,2) DEFAULT 0,
  gosi_employee decimal(10,2) DEFAULT 0,
  gosi_employer decimal(10,2) DEFAULT 0,
  loan_deduction decimal(10,2) DEFAULT 0,
  advance_deduction decimal(10,2) DEFAULT 0,
  absence_deduction decimal(10,2) DEFAULT 0,
  other_deductions decimal(10,2) DEFAULT 0,
  total_deductions decimal(10,2) DEFAULT 0,
  net_salary decimal(10,2) DEFAULT 0,
  days_worked integer DEFAULT 30,
  overtime_hours decimal(5,2) DEFAULT 0,
  absence_days integer DEFAULT 0,
  payment_method text DEFAULT 'wps' CHECK (payment_method IN ('wps', 'cash', 'check', 'bank_transfer')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed')),
  payment_date date,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(batch_id, employee_id)
);

-- Earnings Types Table
CREATE TABLE IF NOT EXISTS earnings_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  is_recurring boolean DEFAULT false,
  is_taxable boolean DEFAULT true,
  affects_gosi boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Deduction Types Table
CREATE TABLE IF NOT EXISTS deduction_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  is_recurring boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Employee Earnings Table
CREATE TABLE IF NOT EXISTS employee_earnings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  earning_type_id uuid NOT NULL REFERENCES earnings_types(id) ON DELETE RESTRICT,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Employee Deductions Table
CREATE TABLE IF NOT EXISTS employee_deductions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deduction_type_id uuid NOT NULL REFERENCES deduction_types(id) ON DELETE RESTRICT,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  loan_type text NOT NULL CHECK (loan_type IN ('personal', 'housing', 'emergency', 'other')),
  loan_amount decimal(10,2) NOT NULL DEFAULT 0,
  remaining_amount decimal(10,2) NOT NULL DEFAULT 0,
  monthly_installment decimal(10,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Advances Table
CREATE TABLE IF NOT EXISTS advances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  remaining_amount decimal(10,2) NOT NULL DEFAULT 0,
  deduction_amount decimal(10,2) NOT NULL DEFAULT 0,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  approved_date date,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payslips Table
CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_item_id uuid NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  viewed_at timestamptz,
  download_count integer DEFAULT 0
);

-- Salary History Table
CREATE TABLE IF NOT EXISTS salary_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  old_basic_salary decimal(10,2),
  new_basic_salary decimal(10,2) NOT NULL,
  old_allowances jsonb DEFAULT '{}',
  new_allowances jsonb DEFAULT '{}',
  effective_date date NOT NULL,
  change_reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_batches_company ON payroll_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_batches_month ON payroll_batches(company_id, month);
CREATE INDEX IF NOT EXISTS idx_payroll_batches_status ON payroll_batches(status);

CREATE INDEX IF NOT EXISTS idx_payroll_items_batch ON payroll_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_company ON payroll_items(company_id);

CREATE INDEX IF NOT EXISTS idx_earnings_types_company ON earnings_types(company_id);
CREATE INDEX IF NOT EXISTS idx_deduction_types_company ON deduction_types(company_id);

CREATE INDEX IF NOT EXISTS idx_employee_earnings_employee ON employee_earnings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee ON employee_deductions(employee_id);

CREATE INDEX IF NOT EXISTS idx_loans_employee ON loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

CREATE INDEX IF NOT EXISTS idx_advances_employee ON advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_status ON advances(status);

CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_item ON payslips(payroll_item_id);

CREATE INDEX IF NOT EXISTS idx_salary_history_employee ON salary_history(employee_id);

-- Enable Row Level Security
ALTER TABLE payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_batches
CREATE POLICY "Users can view own company payroll batches"
  ON payroll_batches FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create payroll batches for own company"
  ON payroll_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update own company payroll batches"
  ON payroll_batches FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for payroll_items
CREATE POLICY "Users can view own company payroll items"
  ON payroll_items FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create payroll items for own company"
  ON payroll_items FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update own company payroll items"
  ON payroll_items FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for earnings_types
CREATE POLICY "Users can view own company earnings types"
  ON earnings_types FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage own company earnings types"
  ON earnings_types FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for deduction_types
CREATE POLICY "Users can view own company deduction types"
  ON deduction_types FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage own company deduction types"
  ON deduction_types FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for employee_earnings
CREATE POLICY "Users can view own company employee earnings"
  ON employee_earnings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage own company employee earnings"
  ON employee_earnings FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for employee_deductions
CREATE POLICY "Users can view own company employee deductions"
  ON employee_deductions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage own company employee deductions"
  ON employee_deductions FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for loans
CREATE POLICY "Users can view own company loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage own company loans"
  ON loans FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for advances
CREATE POLICY "Users can view own company advances"
  ON advances FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage own company advances"
  ON advances FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for payslips
CREATE POLICY "Users can view own company payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage own company payslips"
  ON payslips FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- RLS Policies for salary_history
CREATE POLICY "Users can view own company salary history"
  ON salary_history FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create salary history for own company"
  ON salary_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE id IN (
        SELECT id FROM employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- Insert default earning types
INSERT INTO earnings_types (company_id, code, name_en, name_ar, is_recurring, is_taxable, affects_gosi, is_active)
SELECT 
  c.id,
  'BONUS',
  'Bonus',
  'مكافأة',
  false,
  true,
  false,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM earnings_types WHERE company_id = c.id AND code = 'BONUS'
);

INSERT INTO earnings_types (company_id, code, name_en, name_ar, is_recurring, is_taxable, affects_gosi, is_active)
SELECT 
  c.id,
  'COMMISSION',
  'Commission',
  'عمولة',
  false,
  true,
  false,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM earnings_types WHERE company_id = c.id AND code = 'COMMISSION'
);

INSERT INTO earnings_types (company_id, code, name_en, name_ar, is_recurring, is_taxable, affects_gosi, is_active)
SELECT 
  c.id,
  'OVERTIME',
  'Overtime',
  'عمل إضافي',
  false,
  true,
  false,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM earnings_types WHERE company_id = c.id AND code = 'OVERTIME'
);

-- Insert default deduction types
INSERT INTO deduction_types (company_id, code, name_en, name_ar, is_recurring, is_active)
SELECT 
  c.id,
  'ABSENCE',
  'Absence Deduction',
  'خصم غياب',
  false,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM deduction_types WHERE company_id = c.id AND code = 'ABSENCE'
);

INSERT INTO deduction_types (company_id, code, name_en, name_ar, is_recurring, is_active)
SELECT 
  c.id,
  'LATE',
  'Late Deduction',
  'خصم تأخير',
  false,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM deduction_types WHERE company_id = c.id AND code = 'LATE'
);

INSERT INTO deduction_types (company_id, code, name_en, name_ar, is_recurring, is_active)
SELECT 
  c.id,
  'INSURANCE',
  'Insurance',
  'تأمين',
  true,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM deduction_types WHERE company_id = c.id AND code = 'INSURANCE'
);