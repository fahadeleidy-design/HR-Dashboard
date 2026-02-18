/*
  # Saudi Payroll Tables - Simplified
*/

-- GOSI Contributions
CREATE TABLE IF NOT EXISTS payroll_gosi_contributions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  cycle_employee_id uuid NOT NULL REFERENCES payroll_cycle_employees_v2(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  national_id text NOT NULL,
  nationality text NOT NULL,
  basic_salary numeric(15,2) NOT NULL,
  housing_allowance numeric(15,2) DEFAULT 0,
  contribution_base numeric(15,2) NOT NULL,
  employee_rate numeric(5,2) NOT NULL,
  employer_rate numeric(5,2) NOT NULL,
  employee_contribution numeric(15,2) NOT NULL,
  employer_contribution numeric(15,2) NOT NULL,
  total_contribution numeric(15,2) NOT NULL,
  hazard_rate numeric(5,2) DEFAULT 0,
  hazard_contribution numeric(15,2) DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gosi_v2_cycle ON payroll_gosi_contributions_v2(cycle_id);

-- WPS Files
CREATE TABLE IF NOT EXISTS payroll_wps_files_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  
  file_number text NOT NULL,
  file_name text NOT NULL,
  file_path text,
  bank_name text NOT NULL,
  bank_code text NOT NULL,
  establishment_id text NOT NULL,
  total_employees integer NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  salary_month integer NOT NULL,
  salary_year integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  generated_at timestamptz,
  generated_by uuid REFERENCES auth.users(id),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_wps_v2_cycle ON payroll_wps_files_v2(cycle_id);

-- Tax Withholding
CREATE TABLE IF NOT EXISTS payroll_tax_withholding_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  cycle_employee_id uuid NOT NULL REFERENCES payroll_cycle_employees_v2(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  nationality text NOT NULL,
  gross_income numeric(15,2) NOT NULL,
  taxable_income numeric(15,2) NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  ytd_tax_withheld numeric(15,2),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tax_v2_cycle ON payroll_tax_withholding_v2(cycle_id);

-- Zakat Calculations
CREATE TABLE IF NOT EXISTS payroll_zakat_calculations_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  cycle_employee_id uuid NOT NULL REFERENCES payroll_cycle_employees_v2(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  national_id text NOT NULL,
  gross_income numeric(15,2) NOT NULL,
  zakatable_amount numeric(15,2) NOT NULL,
  zakat_rate numeric(5,2) DEFAULT 2.5,
  zakat_amount numeric(15,2) NOT NULL,
  is_deducted boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_zakat_v2_cycle ON payroll_zakat_calculations_v2(cycle_id);

-- Validations
CREATE TABLE IF NOT EXISTS payroll_validations_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  cycle_employee_id uuid REFERENCES payroll_cycle_employees_v2(id),
  
  rule_code text NOT NULL,
  rule_name text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  is_valid boolean DEFAULT false,
  validation_message text NOT NULL,
  is_resolved boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_validations_v2_cycle ON payroll_validations_v2(cycle_id);

-- Approvals
CREATE TABLE IF NOT EXISTS payroll_approvals_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  
  approval_level integer NOT NULL DEFAULT 1,
  approver_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  comments text,
  
  created_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, approval_level, approver_id)
);

CREATE INDEX idx_approvals_v2_cycle ON payroll_approvals_v2(cycle_id);

-- Bank Files
CREATE TABLE IF NOT EXISTS payroll_bank_files_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  
  file_name text NOT NULL,
  file_path text,
  bank_name text NOT NULL,
  total_employees integer NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  generated_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bank_files_v2_cycle ON payroll_bank_files_v2(cycle_id);

-- Payslips
CREATE TABLE IF NOT EXISTS payroll_payslips_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  cycle_employee_id uuid NOT NULL REFERENCES payroll_cycle_employees_v2(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  payslip_number text NOT NULL,
  payslip_date date NOT NULL,
  file_path text,
  sent_at timestamptz,
  view_count integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);

CREATE INDEX idx_payslips_v2_cycle ON payroll_payslips_v2(cycle_id);

-- Cost Allocation
CREATE TABLE IF NOT EXISTS payroll_cost_allocation_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  cycle_employee_id uuid NOT NULL REFERENCES payroll_cycle_employees_v2(id) ON DELETE CASCADE,
  
  cost_center_code text NOT NULL,
  allocation_percentage numeric(5,2) NOT NULL DEFAULT 100.00,
  allocated_amount numeric(15,2) NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cost_allocation_v2_cycle ON payroll_cost_allocation_v2(cycle_id);

-- Garnishments
CREATE TABLE IF NOT EXISTS payroll_garnishments_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  garnishment_type text NOT NULL,
  deduction_type text NOT NULL DEFAULT 'percentage',
  fixed_amount numeric(15,2),
  percentage numeric(5,2),
  total_amount_owed numeric(15,2),
  effective_from date NOT NULL,
  effective_to date,
  total_deducted numeric(15,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_garnishments_v2_employee ON payroll_garnishments_v2(employee_id);

-- Enable RLS
ALTER TABLE payroll_gosi_contributions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_wps_files_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_tax_withholding_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_zakat_calculations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_validations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_approvals_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_bank_files_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payslips_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_cost_allocation_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_garnishments_v2 ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "view_company_payroll" ON payroll_gosi_contributions_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "manage_company_payroll" ON payroll_gosi_contributions_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));

-- Apply same pattern to other tables
CREATE POLICY "view_wps" ON payroll_wps_files_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "manage_wps" ON payroll_wps_files_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));

CREATE POLICY "view_payslips" ON payroll_payslips_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "manage_payslips" ON payroll_payslips_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));