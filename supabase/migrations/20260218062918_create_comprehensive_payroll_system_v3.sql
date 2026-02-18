/*
  # Comprehensive Payroll Processing System - Part 1

  Core payroll tables with Saudi-specific features
*/

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE payroll_component_type AS ENUM ('earning', 'deduction', 'employer_cost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payroll_calculation_method AS ENUM ('fixed', 'percentage', 'formula', 'attendance_based', 'performance_based');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payroll_frequency AS ENUM ('monthly', 'semi_monthly', 'bi_weekly', 'weekly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payroll_cycle_status AS ENUM ('draft', 'calculating', 'calculated', 'validating', 'pending_approval', 'approved', 'processing', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payroll_adjustment_type AS ENUM ('retroactive', 'off_cycle', 'bonus', 'termination', 'correction', 'garnishment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bank_file_status AS ENUM ('pending', 'generated', 'uploaded', 'processed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE wps_file_status AS ENUM ('draft', 'generated', 'submitted', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PAYROLL COMPONENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_components_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  component_type payroll_component_type NOT NULL,
  
  calculation_method payroll_calculation_method NOT NULL DEFAULT 'fixed',
  calculation_formula text,
  base_component_id uuid REFERENCES payroll_components_v2(id),
  
  default_amount numeric(15,2),
  default_percentage numeric(5,2),
  
  is_taxable boolean DEFAULT true,
  is_gosi_applicable boolean DEFAULT true,
  affects_basic_salary boolean DEFAULT false,
  is_prorated boolean DEFAULT false,
  
  display_on_payslip boolean DEFAULT true,
  display_order integer DEFAULT 0,
  
  is_system_component boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_payroll_components_v2_company ON payroll_components_v2(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_components_v2_type ON payroll_components_v2(component_type);

-- ============================================================================
-- CALCULATION RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_calculation_rules_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES payroll_components_v2(id) ON DELETE CASCADE,
  
  rule_name text NOT NULL,
  rule_type text NOT NULL,
  conditions jsonb DEFAULT '[]'::jsonb,
  calculation_logic text NOT NULL,
  priority integer DEFAULT 0,
  
  effective_from date NOT NULL,
  effective_to date,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_calc_rules_v2_component ON payroll_calculation_rules_v2(component_id);

-- ============================================================================
-- EMPLOYEE COMPONENT ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_employee_components_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES payroll_components_v2(id) ON DELETE CASCADE,
  
  amount numeric(15,2),
  percentage numeric(5,2),
  
  effective_from date NOT NULL,
  effective_to date,
  
  is_recurring boolean DEFAULT true,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_emp_components_v2_employee ON payroll_employee_components_v2(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_components_v2_component ON payroll_employee_components_v2(component_id);

-- ============================================================================
-- PAYROLL CALENDARS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_calendars_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  calendar_name text NOT NULL,
  frequency payroll_frequency NOT NULL DEFAULT 'monthly',
  
  payment_day integer NOT NULL DEFAULT 1,
  cutoff_day integer,
  
  calculation_lead_days integer DEFAULT 5,
  approval_lead_days integer DEFAULT 3,
  
  is_default_calendar boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_calendars_v2_company ON payroll_calendars_v2(company_id);

-- ============================================================================
-- PAYROLL CYCLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_cycles_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  calendar_id uuid REFERENCES payroll_calendars_v2(id),
  
  cycle_name text NOT NULL,
  cycle_type text NOT NULL DEFAULT 'regular',
  
  period_start date NOT NULL,
  period_end date NOT NULL,
  payment_date date NOT NULL,
  
  status payroll_cycle_status NOT NULL DEFAULT 'draft',
  
  total_employees integer DEFAULT 0,
  total_gross numeric(15,2) DEFAULT 0,
  total_deductions numeric(15,2) DEFAULT 0,
  total_net numeric(15,2) DEFAULT 0,
  total_employer_cost numeric(15,2) DEFAULT 0,
  
  calculated_at timestamptz,
  calculated_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  paid_at timestamptz,
  
  has_errors boolean DEFAULT false,
  error_count integer DEFAULT 0,
  
  is_locked boolean DEFAULT false,
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id),
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_cycles_v2_company ON payroll_cycles_v2(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_cycles_v2_status ON payroll_cycles_v2(status);
CREATE INDEX IF NOT EXISTS idx_payroll_cycles_v2_period ON payroll_cycles_v2(period_start, period_end);

-- ============================================================================
-- PAYROLL CYCLE EMPLOYEES
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_cycle_employees_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES payroll_cycles_v2(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  employee_name text NOT NULL,
  employee_number text,
  department text,
  position text,
  
  working_days numeric(5,2) DEFAULT 0,
  present_days numeric(5,2) DEFAULT 0,
  absent_days numeric(5,2) DEFAULT 0,
  leave_days numeric(5,2) DEFAULT 0,
  
  basic_salary numeric(15,2) DEFAULT 0,
  total_allowances numeric(15,2) DEFAULT 0,
  total_deductions numeric(15,2) DEFAULT 0,
  gross_salary numeric(15,2) DEFAULT 0,
  net_salary numeric(15,2) DEFAULT 0,
  
  gosi_employee_share numeric(15,2) DEFAULT 0,
  gosi_employer_share numeric(15,2) DEFAULT 0,
  
  tax_amount numeric(15,2) DEFAULT 0,
  
  bank_name text,
  iban text,
  account_number text,
  
  calculation_status text DEFAULT 'pending',
  has_errors boolean DEFAULT false,
  error_messages jsonb DEFAULT '[]'::jsonb,
  
  calculated_at timestamptz,
  validated_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_cycle_employees_v2_cycle ON payroll_cycle_employees_v2(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_employees_v2_employee ON payroll_cycle_employees_v2(employee_id);

-- ============================================================================
-- PAYROLL CYCLE COMPONENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_cycle_components_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_employee_id uuid NOT NULL REFERENCES payroll_cycle_employees_v2(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES payroll_components_v2(id),
  
  component_code text NOT NULL,
  component_name text NOT NULL,
  component_type payroll_component_type NOT NULL,
  
  calculation_method text,
  base_amount numeric(15,2),
  rate numeric(5,2),
  units numeric(10,2),
  calculated_amount numeric(15,2) NOT NULL,
  
  is_taxable boolean DEFAULT true,
  is_gosi_applicable boolean DEFAULT true,
  
  calculation_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cycle_components_v2_employee ON payroll_cycle_components_v2(cycle_employee_id);

-- ============================================================================
-- PAYROLL ADJUSTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_adjustments_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES payroll_cycles_v2(id),
  
  adjustment_type payroll_adjustment_type NOT NULL,
  adjustment_date date NOT NULL,
  
  component_id uuid REFERENCES payroll_components_v2(id),
  amount numeric(15,2) NOT NULL,
  
  retroactive_from date,
  retroactive_to date,
  original_cycle_id uuid REFERENCES payroll_cycles_v2(id),
  
  requires_approval boolean DEFAULT true,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  reason text NOT NULL,
  notes text,
  
  is_processed boolean DEFAULT false,
  processed_in_cycle_id uuid REFERENCES payroll_cycles_v2(id),
  processed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_adjustments_v2_employee ON payroll_adjustments_v2(employee_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_v2_cycle ON payroll_adjustments_v2(cycle_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_v2_unprocessed ON payroll_adjustments_v2(is_processed) WHERE is_processed = false;

-- Enable RLS on all tables
ALTER TABLE payroll_components_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calculation_rules_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_employee_components_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calendars_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_cycles_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_cycle_employees_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_cycle_components_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view company payroll data"
  ON payroll_components_v2 FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'finance', 'manager')
    )
  );

CREATE POLICY "Privileged users manage payroll components"
  ON payroll_components_v2 FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'finance')
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users view payroll cycles"
  ON payroll_cycles_v2 FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Privileged users manage payroll cycles"
  ON payroll_cycles_v2 FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr', 'finance')
    )
  );