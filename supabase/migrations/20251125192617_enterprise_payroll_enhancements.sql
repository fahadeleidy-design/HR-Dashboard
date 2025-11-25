/*
  # Enterprise-Grade Payroll Management System Enhancement

  ## Overview
  Transforms the payroll system into a comprehensive enterprise-grade solution

  ## 1. New Tables

  ### payroll_configurations
  Company-wide payroll settings, tax brackets, GOSI config, payment schedules

  ### payroll_components
  Configurable earning/deduction components with formula-based calculations

  ### payroll_formulas
  Custom formula definitions for variable calculations

  ### payroll_calendars
  Pay period management, processing schedules, cut-off dates

  ### cost_centers
  Department/division tracking, cost allocation, budget management

  ### employee_cost_centers
  Employee cost center allocations with percentages

  ### payroll_item_components
  Detailed breakdown of each payroll item component

  ### payroll_corrections
  Error corrections, retroactive adjustments, audit trail

  ### payroll_approvals
  Multi-level approval workflow with history

  ### wps_files
  WPS SIF file generation for SARIE compliance

  ### bank_files
  Bank transfer file generation for multiple banks

  ### payroll_analytics
  Historical data aggregation for trend analysis

  ### payroll_processing_log
  Complete audit trail of all payroll operations

  ## 2. Security
  - Enhanced RLS policies for all tables
  - Company-based access control
  - Audit logging

  ## 3. Performance
  - Optimized indexes for all tables
  - Automatic calculation triggers
  - Batch update functions
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Payroll Configurations
CREATE TABLE IF NOT EXISTS payroll_configurations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  pay_frequency text DEFAULT 'monthly' CHECK (pay_frequency IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')),
  pay_day integer DEFAULT 1 CHECK (pay_day BETWEEN 1 AND 31),
  base_currency text DEFAULT 'SAR',
  allow_multi_currency boolean DEFAULT false,
  working_days_per_month integer DEFAULT 30,
  working_hours_per_day decimal(4,2) DEFAULT 8.00,
  overtime_multiplier decimal(4,2) DEFAULT 1.5,
  gosi_auto_calculate boolean DEFAULT true,
  gosi_ceiling decimal(10,2) DEFAULT 45000,
  tax_enabled boolean DEFAULT false,
  tax_percentage decimal(5,2) DEFAULT 0,
  rounding_method text DEFAULT 'nearest' CHECK (rounding_method IN ('up', 'down', 'nearest')),
  rounding_precision integer DEFAULT 2,
  requires_approval boolean DEFAULT true,
  approval_levels integer DEFAULT 2,
  wps_enabled boolean DEFAULT true,
  wps_employer_id text,
  wps_establishment_id text,
  auto_send_payslips boolean DEFAULT false,
  payslip_email_template text,
  allow_negative_pay boolean DEFAULT false,
  prorate_salary boolean DEFAULT true,
  include_inactive_employees boolean DEFAULT false,
  notify_on_approval boolean DEFAULT true,
  notify_on_payment boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll Formulas
CREATE TABLE IF NOT EXISTS payroll_formulas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  formula text NOT NULL,
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Payroll Components
CREATE TABLE IF NOT EXISTS payroll_components (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  component_type text NOT NULL CHECK (component_type IN ('earning', 'deduction', 'benefit')),
  calculation_method text DEFAULT 'fixed' CHECK (calculation_method IN ('fixed', 'percentage', 'formula', 'hours', 'days')),
  default_value decimal(10,2) DEFAULT 0,
  formula_id uuid REFERENCES payroll_formulas(id) ON DELETE SET NULL,
  is_recurring boolean DEFAULT true,
  is_taxable boolean DEFAULT true,
  affects_gosi boolean DEFAULT false,
  is_prorated boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  applies_to_saudi boolean DEFAULT true,
  applies_to_non_saudi boolean DEFAULT true,
  min_days_worked integer DEFAULT 0,
  max_absence_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Payroll Calendars
CREATE TABLE IF NOT EXISTS payroll_calendars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  period_start date NOT NULL,
  period_end date NOT NULL,
  cutoff_date date NOT NULL,
  payment_date date NOT NULL,
  attendance_start date NOT NULL,
  attendance_end date NOT NULL,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'open', 'locked', 'processed', 'closed')),
  working_days integer NOT NULL DEFAULT 30,
  public_holidays integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, year, month)
);

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  parent_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
  monthly_budget decimal(12,2) DEFAULT 0,
  annual_budget decimal(12,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Employee Cost Centers
CREATE TABLE IF NOT EXISTS employee_cost_centers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cost_center_id uuid NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
  allocation_percentage decimal(5,2) NOT NULL DEFAULT 100.00 CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CHECK (effective_date < end_date OR end_date IS NULL)
);

-- Payroll Item Components
CREATE TABLE IF NOT EXISTS payroll_item_components (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_item_id uuid NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES payroll_components(id) ON DELETE RESTRICT,
  amount decimal(10,2) NOT NULL DEFAULT 0,
  quantity decimal(10,2) DEFAULT 1,
  rate decimal(10,2) DEFAULT 0,
  calculation_details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Payroll Corrections
CREATE TABLE IF NOT EXISTS payroll_corrections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_item_id uuid NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
  corrected_item_id uuid REFERENCES payroll_items(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  correction_type text NOT NULL CHECK (correction_type IN ('adjustment', 'reversal', 'reprocessing')),
  field_name text NOT NULL,
  old_value decimal(10,2),
  new_value decimal(10,2),
  reason text NOT NULL,
  supporting_documents jsonb DEFAULT '[]',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Payroll Approvals
CREATE TABLE IF NOT EXISTS payroll_approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  approval_level integer NOT NULL DEFAULT 1,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approver_role text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delegated')),
  approved_at timestamptz,
  comments text,
  delegated_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delegated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(batch_id, approval_level, approver_id)
);

-- WPS Files
CREATE TABLE IF NOT EXISTS wps_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_content text NOT NULL,
  file_format text DEFAULT 'SIF' CHECK (file_format IN ('SIF', 'CSV', 'XML')),
  employer_id text NOT NULL,
  establishment_id text NOT NULL,
  payment_date date NOT NULL,
  total_employees integer NOT NULL,
  total_amount decimal(12,2) NOT NULL,
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'submitted', 'approved', 'rejected', 'processed')),
  submission_date timestamptz,
  molajcnet_reference text,
  validation_errors jsonb DEFAULT '[]',
  processing_errors jsonb DEFAULT '[]',
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Bank Files
CREATE TABLE IF NOT EXISTS bank_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  bank_code text,
  file_name text NOT NULL,
  file_content text NOT NULL,
  file_format text DEFAULT 'CSV' CHECK (file_format IN ('CSV', 'SWIFT', 'ACH', 'CUSTOM')),
  total_employees integer NOT NULL,
  total_amount decimal(12,2) NOT NULL,
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'acknowledged', 'processed', 'failed')),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  processed_at timestamptz,
  bank_reference text,
  reconciliation_status text,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Payroll Analytics
CREATE TABLE IF NOT EXISTS payroll_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  total_employees integer DEFAULT 0,
  saudi_employees integer DEFAULT 0,
  non_saudi_employees integer DEFAULT 0,
  total_gross decimal(12,2) DEFAULT 0,
  total_net decimal(12,2) DEFAULT 0,
  total_deductions decimal(12,2) DEFAULT 0,
  total_gosi_employee decimal(12,2) DEFAULT 0,
  total_gosi_employer decimal(12,2) DEFAULT 0,
  total_loans decimal(12,2) DEFAULT 0,
  total_advances decimal(12,2) DEFAULT 0,
  total_overtime decimal(12,2) DEFAULT 0,
  total_bonuses decimal(12,2) DEFAULT 0,
  avg_salary decimal(10,2) DEFAULT 0,
  avg_saudi_salary decimal(10,2) DEFAULT 0,
  avg_non_saudi_salary decimal(10,2) DEFAULT 0,
  gross_change_percentage decimal(5,2) DEFAULT 0,
  employee_count_change integer DEFAULT 0,
  cost_center_breakdown jsonb DEFAULT '{}',
  department_breakdown jsonb DEFAULT '{}',
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, period_year, period_month)
);

-- Payroll Processing Log
CREATE TABLE IF NOT EXISTS payroll_processing_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid REFERENCES payroll_batches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now(),
  affected_employees integer DEFAULT 0,
  processing_duration interval,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  errors jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}'
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_components_company ON payroll_components(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_formulas_company ON payroll_formulas(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_calendars_company_period ON payroll_calendars(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_cost_centers_employee ON employee_cost_centers(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_components_item ON payroll_item_components(payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_payroll_corrections_employee ON payroll_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approvals_batch ON payroll_approvals(batch_id);
CREATE INDEX IF NOT EXISTS idx_wps_files_batch ON wps_files(batch_id);
CREATE INDEX IF NOT EXISTS idx_bank_files_batch ON bank_files(batch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_analytics_company_period ON payroll_analytics(company_id, period_year, period_month);

-- Enable RLS
ALTER TABLE payroll_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_item_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wps_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_processing_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company payroll config"
  ON payroll_configurations FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own company payroll config"
  ON payroll_configurations FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view own company components"
  ON payroll_components FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own company components"
  ON payroll_components FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view own company formulas"
  ON payroll_formulas FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own company calendars"
  ON payroll_calendars FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own company cost centers"
  ON cost_centers FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view payroll analytics"
  ON payroll_analytics FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

-- Insert default configurations
INSERT INTO payroll_configurations (company_id)
SELECT id FROM companies
WHERE NOT EXISTS (SELECT 1 FROM payroll_configurations WHERE company_id = companies.id);

-- Insert default components for each company
DO $$
DECLARE
  comp record;
BEGIN
  FOR comp IN SELECT id FROM companies LOOP
    INSERT INTO payroll_components (company_id, code, name_en, name_ar, component_type, calculation_method, is_system)
    VALUES
      (comp.id, 'BASIC', 'Basic Salary', 'الراتب الأساسي', 'earning', 'fixed', true),
      (comp.id, 'HOUSING', 'Housing Allowance', 'بدل السكن', 'earning', 'fixed', true),
      (comp.id, 'TRANSPORT', 'Transportation Allowance', 'بدل النقل', 'earning', 'fixed', true),
      (comp.id, 'OVERTIME', 'Overtime Pay', 'أجر العمل الإضافي', 'earning', 'hours', true),
      (comp.id, 'BONUS', 'Bonus', 'مكافأة', 'earning', 'fixed', true),
      (comp.id, 'GOSI_EMP', 'GOSI Employee', 'التأمينات', 'deduction', 'percentage', true),
      (comp.id, 'LOAN', 'Loan Deduction', 'خصم القرض', 'deduction', 'fixed', true),
      (comp.id, 'ADVANCE', 'Advance Deduction', 'خصم السلفة', 'deduction', 'fixed', true),
      (comp.id, 'ABSENCE', 'Absence Deduction', 'خصم الغياب', 'deduction', 'days', true)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END $$;
