/*
  # Global HR Capabilities - Multi-Country Enterprise System (Fixed)

  ## Overview
  Comprehensive global HR system supporting multi-country operations, local compliance,
  multi-currency payroll, expatriate management, and global reporting.

  This migration creates all necessary tables for global operations with proper RLS.
*/

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

DO $$ BEGIN
  CREATE TYPE tax_calculation_method AS ENUM (
    'progressive',
    'flat',
    'hybrid',
    'territorial',
    'residential'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE employment_law_type AS ENUM (
    'permanent',
    'fixed_term',
    'contractor',
    'intern',
    'part_time',
    'seasonal',
    'apprentice'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expatriate_type AS ENUM (
    'short_term',
    'long_term',
    'permanent',
    'commuter',
    'remote'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE work_permit_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired',
    'renewed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- COUNTRIES
-- =====================================================

CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text UNIQUE NOT NULL,
  country_code_3 text UNIQUE NOT NULL,
  name text NOT NULL,
  native_name text,
  region text,
  subregion text,
  capital text,
  default_currency_code text,
  date_format text DEFAULT 'DD/MM/YYYY',
  time_format text DEFAULT '24h',
  first_day_of_week integer DEFAULT 0,
  timezone text DEFAULT 'UTC',
  utc_offset text,
  working_days jsonb DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
  standard_working_hours numeric(4,2) DEFAULT 40,
  min_wage numeric(15,2),
  max_weekly_hours integer,
  overtime_threshold_hours integer,
  overtime_multiplier numeric(3,2) DEFAULT 1.5,
  min_annual_leave_days integer,
  max_annual_leave_days integer,
  sick_leave_days integer,
  maternity_leave_days integer,
  paternity_leave_days integer,
  min_notice_period_days integer,
  max_notice_period_days integer,
  probation_period_days integer DEFAULT 90,
  payroll_frequency text DEFAULT 'monthly',
  payroll_day integer DEFAULT 1,
  has_income_tax boolean DEFAULT true,
  has_social_security boolean DEFAULT true,
  has_pension boolean DEFAULT true,
  tax_calculation_method tax_calculation_method DEFAULT 'progressive',
  tax_year_start_month integer DEFAULT 1,
  requires_work_permit boolean DEFAULT false,
  requires_social_insurance boolean DEFAULT false,
  requires_health_insurance boolean DEFAULT false,
  is_active boolean DEFAULT true,
  phone_code text,
  languages jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(country_code);
CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(is_active) WHERE is_active = true;

-- =====================================================
-- CURRENCIES
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text UNIQUE NOT NULL,
  currency_name text NOT NULL,
  currency_symbol text,
  decimal_places integer DEFAULT 2,
  decimal_separator text DEFAULT '.',
  thousands_separator text DEFAULT ',',
  symbol_position text DEFAULT 'before',
  is_active boolean DEFAULT true,
  is_crypto boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(currency_code);

-- =====================================================
-- EXCHANGE RATES
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency_code text NOT NULL,
  to_currency_code text NOT NULL,
  rate numeric(18,6) NOT NULL,
  effective_date date NOT NULL,
  source text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_currency_code, to_currency_code, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency_code, to_currency_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date DESC);

-- =====================================================
-- COUNTRY TAX RULES
-- =====================================================

CREATE TABLE IF NOT EXISTS country_tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text REFERENCES countries(country_code) ON DELETE CASCADE NOT NULL,
  tax_type text NOT NULL,
  tax_name text NOT NULL,
  calculation_method text DEFAULT 'bracket',
  min_income numeric(15,2),
  max_income numeric(15,2),
  tax_rate numeric(5,2) NOT NULL,
  fixed_amount numeric(15,2) DEFAULT 0,
  is_flat_rate boolean DEFAULT false,
  flat_rate_percentage numeric(5,2),
  employee_percentage numeric(5,2),
  employer_percentage numeric(5,2),
  min_taxable_income numeric(15,2),
  max_taxable_income numeric(15,2),
  annual_cap numeric(15,2),
  personal_allowance numeric(15,2) DEFAULT 0,
  dependent_allowance numeric(15,2) DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean DEFAULT true,
  description text,
  calculation_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_tax_rules_country ON country_tax_rules(country_code);
CREATE INDEX IF NOT EXISTS idx_country_tax_rules_type ON country_tax_rules(tax_type);

-- =====================================================
-- COUNTRY LABOR LAWS
-- =====================================================

CREATE TABLE IF NOT EXISTS country_labor_laws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text REFERENCES countries(country_code) ON DELETE CASCADE NOT NULL,
  employment_type employment_law_type NOT NULL,
  requires_written_contract boolean DEFAULT true,
  max_contract_duration_months integer,
  max_contract_renewals integer,
  max_daily_hours numeric(4,2),
  max_weekly_hours numeric(4,2),
  max_consecutive_days integer,
  min_rest_hours_between_shifts numeric(4,2),
  requires_lunch_break boolean DEFAULT true,
  lunch_break_duration_minutes integer,
  requires_rest_breaks boolean DEFAULT true,
  rest_break_frequency_hours integer,
  overtime_calculation_method text,
  overtime_rate_multiplier numeric(3,2),
  weekend_rate_multiplier numeric(3,2),
  holiday_rate_multiplier numeric(3,2),
  night_shift_rate_multiplier numeric(3,2),
  requires_notice_period boolean DEFAULT true,
  notice_period_calculation text,
  severance_required boolean DEFAULT false,
  severance_calculation text,
  leave_accrual_method text,
  leave_carry_forward_allowed boolean DEFAULT true,
  max_leave_carry_forward_days integer,
  probation_allowed boolean DEFAULT true,
  max_probation_days integer,
  probation_notice_period_days integer,
  requires_health_checkup boolean DEFAULT false,
  requires_background_check boolean DEFAULT false,
  requires_drug_test boolean DEFAULT false,
  effective_from date NOT NULL,
  effective_to date,
  description text,
  legal_reference text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_labor_laws_country ON country_labor_laws(country_code);

-- =====================================================
-- COUNTRY HOLIDAYS
-- =====================================================

CREATE TABLE IF NOT EXISTS country_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text REFERENCES countries(country_code) ON DELETE CASCADE NOT NULL,
  holiday_name text NOT NULL,
  holiday_date date NOT NULL,
  holiday_type text DEFAULT 'public',
  is_recurring boolean DEFAULT true,
  recurrence_type text,
  is_regional boolean DEFAULT false,
  regions text[],
  is_paid boolean DEFAULT true,
  pay_multiplier numeric(3,2) DEFAULT 1.0,
  requires_work_permission boolean DEFAULT false,
  is_active boolean DEFAULT true,
  description text,
  local_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_holidays_country ON country_holidays(country_code);
CREATE INDEX IF NOT EXISTS idx_country_holidays_date ON country_holidays(holiday_date);

-- =====================================================
-- COUNTRY PAYROLL SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS country_payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text REFERENCES countries(country_code) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  payroll_frequency text DEFAULT 'monthly',
  payroll_cutoff_day integer,
  payment_day integer,
  payment_currency_code text NOT NULL,
  allow_multi_currency boolean DEFAULT false,
  bank_transfer_days integer DEFAULT 1,
  payment_method text DEFAULT 'bank_transfer',
  rounding_method text DEFAULT 'nearest',
  rounding_precision integer DEFAULT 2,
  auto_calculate_tax boolean DEFAULT true,
  tax_filing_frequency text DEFAULT 'monthly',
  requires_electronic_filing boolean DEFAULT false,
  filing_system_name text,
  filing_system_url text,
  allows_split_payment boolean DEFAULT false,
  max_split_accounts integer DEFAULT 1,
  has_13th_month boolean DEFAULT false,
  month_13th_payment integer,
  has_14th_month boolean DEFAULT false,
  month_14th_payment integer,
  allows_salary_advance boolean DEFAULT false,
  max_advance_percentage numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_code, company_id)
);

CREATE INDEX IF NOT EXISTS idx_country_payroll_settings_country ON country_payroll_settings(country_code);
CREATE INDEX IF NOT EXISTS idx_country_payroll_settings_company ON country_payroll_settings(company_id);

-- =====================================================
-- EMPLOYEE WORK LOCATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_work_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  country_code text REFERENCES countries(country_code) ON DELETE RESTRICT NOT NULL,
  city text,
  office_name text,
  address text,
  is_primary boolean DEFAULT true,
  start_date date NOT NULL,
  end_date date,
  is_tax_resident boolean DEFAULT true,
  tax_id_number text,
  requires_work_permit boolean DEFAULT false,
  work_permit_id uuid,
  payroll_country_code text,
  payment_currency_code text,
  cost_center_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_work_locations_employee ON employee_work_locations(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_work_locations_country ON employee_work_locations(country_code);

-- =====================================================
-- EXPATRIATES
-- =====================================================

CREATE TABLE IF NOT EXISTS expatriates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  home_country_code text REFERENCES countries(country_code) ON DELETE RESTRICT NOT NULL,
  host_country_code text REFERENCES countries(country_code) ON DELETE RESTRICT NOT NULL,
  assignment_type expatriate_type NOT NULL,
  assignment_start_date date NOT NULL,
  assignment_end_date date,
  expected_return_date date,
  base_salary_currency text,
  base_salary_amount numeric(15,2),
  housing_allowance numeric(15,2) DEFAULT 0,
  transportation_allowance numeric(15,2) DEFAULT 0,
  education_allowance numeric(15,2) DEFAULT 0,
  relocation_allowance numeric(15,2) DEFAULT 0,
  hardship_allowance numeric(15,2) DEFAULT 0,
  cost_of_living_adjustment numeric(15,2) DEFAULT 0,
  tax_equalization boolean DEFAULT false,
  tax_protection boolean DEFAULT false,
  home_country_tax_liability boolean DEFAULT true,
  host_country_tax_liability boolean DEFAULT true,
  home_leave_frequency text,
  home_leave_tickets integer DEFAULT 0,
  dependent_tickets integer DEFAULT 0,
  international_health_insurance boolean DEFAULT true,
  insurance_policy_number text,
  relocation_assistance_provided boolean DEFAULT false,
  moving_cost_covered boolean DEFAULT false,
  temporary_accommodation_days integer,
  status text DEFAULT 'active',
  assignment_reason text,
  special_conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expatriates_employee ON expatriates(employee_id);
CREATE INDEX IF NOT EXISTS idx_expatriates_home_country ON expatriates(home_country_code);
CREATE INDEX IF NOT EXISTS idx_expatriates_host_country ON expatriates(host_country_code);

-- =====================================================
-- WORK PERMITS
-- =====================================================

CREATE TABLE IF NOT EXISTS work_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  country_code text REFERENCES countries(country_code) ON DELETE RESTRICT NOT NULL,
  permit_type text NOT NULL,
  permit_number text,
  issuing_authority text,
  issuing_country_code text,
  issue_date date,
  expiry_date date NOT NULL,
  status work_permit_status DEFAULT 'pending',
  application_date date,
  application_reference text,
  approval_date date,
  work_restrictions text,
  employer_restrictions text,
  location_restrictions text,
  is_renewable boolean DEFAULT true,
  renewal_required_before_days integer DEFAULT 30,
  renewal_application_date date,
  requires_sponsorship boolean DEFAULT false,
  sponsor_name text,
  sponsor_id text,
  document_urls jsonb,
  alert_sent boolean DEFAULT false,
  alert_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_permits_employee ON work_permits(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_permits_country ON work_permits(country_code);
CREATE INDEX IF NOT EXISTS idx_work_permits_expiry ON work_permits(expiry_date);

-- =====================================================
-- GLOBAL PAYROLL RUNS
-- =====================================================

CREATE TABLE IF NOT EXISTS global_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  payroll_month integer NOT NULL,
  payroll_year integer NOT NULL,
  countries text[],
  status text DEFAULT 'draft',
  total_gross_salary numeric(18,2) DEFAULT 0,
  total_net_salary numeric(18,2) DEFAULT 0,
  total_tax numeric(18,2) DEFAULT 0,
  total_deductions numeric(18,2) DEFAULT 0,
  total_employer_costs numeric(18,2) DEFAULT 0,
  total_employees integer DEFAULT 0,
  employees_by_country jsonb,
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_date date,
  payment_initiated boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, payroll_year, payroll_month)
);

CREATE INDEX IF NOT EXISTS idx_global_payroll_runs_company ON global_payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_global_payroll_runs_period ON global_payroll_runs(payroll_year, payroll_month);

-- =====================================================
-- CROSS BORDER TRANSFERS
-- =====================================================

CREATE TABLE IF NOT EXISTS cross_border_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  transfer_type text NOT NULL,
  source_country_code text NOT NULL,
  source_currency_code text NOT NULL,
  source_amount numeric(15,2) NOT NULL,
  destination_country_code text NOT NULL,
  destination_currency_code text NOT NULL,
  destination_amount numeric(15,2) NOT NULL,
  exchange_rate numeric(18,6) NOT NULL,
  exchange_rate_date date NOT NULL,
  transfer_fee numeric(15,2) DEFAULT 0,
  bank_charges numeric(15,2) DEFAULT 0,
  source_bank_account text,
  destination_bank_account text,
  swift_code text,
  iban text,
  transfer_reference text,
  transfer_date date,
  expected_arrival_date date,
  actual_arrival_date date,
  status text DEFAULT 'pending',
  purpose_of_transfer text,
  requires_documentation boolean DEFAULT false,
  documentation_urls jsonb,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  tracking_number text,
  payment_method text,
  notes text,
  failure_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cross_border_transfers_company ON cross_border_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_cross_border_transfers_employee ON cross_border_transfers(employee_id);

-- =====================================================
-- TAX CALCULATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS tax_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  country_code text REFERENCES countries(country_code) ON DELETE RESTRICT NOT NULL,
  calculation_year integer NOT NULL,
  calculation_month integer NOT NULL,
  gross_income numeric(15,2) NOT NULL,
  taxable_income numeric(15,2) NOT NULL,
  personal_allowance numeric(15,2) DEFAULT 0,
  dependent_allowances numeric(15,2) DEFAULT 0,
  other_deductions numeric(15,2) DEFAULT 0,
  income_tax numeric(15,2) DEFAULT 0,
  social_security_employee numeric(15,2) DEFAULT 0,
  social_security_employer numeric(15,2) DEFAULT 0,
  pension_employee numeric(15,2) DEFAULT 0,
  pension_employer numeric(15,2) DEFAULT 0,
  health_insurance_employee numeric(15,2) DEFAULT 0,
  health_insurance_employer numeric(15,2) DEFAULT 0,
  unemployment_insurance numeric(15,2) DEFAULT 0,
  other_taxes numeric(15,2) DEFAULT 0,
  total_employee_tax numeric(15,2) DEFAULT 0,
  total_employer_tax numeric(15,2) DEFAULT 0,
  net_income numeric(15,2) NOT NULL,
  tax_rules_applied jsonb,
  calculation_method text,
  calculation_date timestamptz DEFAULT now(),
  calculated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  currency_code text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_calculations_employee ON tax_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_country ON tax_calculations(country_code);

-- =====================================================
-- COUNTRY COMPLIANCE CHECKLIST
-- =====================================================

CREATE TABLE IF NOT EXISTS country_compliance_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  country_code text REFERENCES countries(country_code) ON DELETE CASCADE NOT NULL,
  compliance_category text NOT NULL,
  requirement_name text NOT NULL,
  description text,
  frequency text,
  due_date date,
  next_due_date date,
  status text DEFAULT 'pending',
  completion_date date,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  required_documents text[],
  uploaded_documents jsonb,
  has_penalty boolean DEFAULT false,
  penalty_amount numeric(15,2),
  penalty_currency text,
  notes text,
  legal_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_compliance_company ON country_compliance_checklist(company_id);
CREATE INDEX IF NOT EXISTS idx_country_compliance_country ON country_compliance_checklist(country_code);

-- =====================================================
-- GLOBAL REPORTS
-- =====================================================

CREATE TABLE IF NOT EXISTS global_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  report_type text NOT NULL,
  report_name text NOT NULL,
  countries text[],
  report_year integer,
  report_month integer,
  report_quarter integer,
  from_date date,
  to_date date,
  report_data jsonb NOT NULL,
  summary jsonb,
  status text DEFAULT 'generated',
  generated_at timestamptz DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url text,
  file_format text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_reports_company ON global_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_global_reports_type ON global_reports(report_type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_labor_laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_work_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expatriates ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_compliance_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_reports ENABLE ROW LEVEL SECURITY;

-- Public tables (read by all)
CREATE POLICY "Anyone can view countries" ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage countries" ON countries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY "Anyone can view currencies" ON currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage currencies" ON currencies FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY "Anyone can view exchange rates" ON exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance can manage exchange rates" ON exchange_rates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'finance_manager')));

CREATE POLICY "Anyone can view tax rules" ON country_tax_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tax rules" ON country_tax_rules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'finance_manager')));

CREATE POLICY "Anyone can view labor laws" ON country_labor_laws FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage labor laws" ON country_labor_laws FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Anyone can view holidays" ON country_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage holidays" ON country_holidays FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_manager')));

-- Company-scoped tables
CREATE POLICY "Users can view company payroll settings" ON country_payroll_settings FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage payroll settings" ON country_payroll_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = country_payroll_settings.company_id AND role IN ('super_admin', 'admin', 'finance_manager', 'hr_manager')));

CREATE POLICY "Users can view work locations" ON employee_work_locations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = employee_work_locations.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "HR can manage work locations" ON employee_work_locations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = employee_work_locations.employee_id AND ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view expatriates" ON expatriates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = expatriates.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "HR can manage expatriates" ON expatriates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = expatriates.employee_id AND ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view work permits" ON work_permits FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = work_permits.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "HR can manage work permits" ON work_permits FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = work_permits.employee_id AND ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view global payroll" ON global_payroll_runs FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Finance can manage global payroll" ON global_payroll_runs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = global_payroll_runs.company_id AND role IN ('super_admin', 'admin', 'finance_manager')));

CREATE POLICY "Users can view transfers" ON cross_border_transfers FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Finance can manage transfers" ON cross_border_transfers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = cross_border_transfers.company_id AND role IN ('super_admin', 'admin', 'finance_manager')));

CREATE POLICY "Users can view tax calculations" ON tax_calculations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = tax_calculations.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "Finance can manage tax calculations" ON tax_calculations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = tax_calculations.employee_id AND ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin', 'finance_manager')));

CREATE POLICY "Users can view compliance" ON country_compliance_checklist FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage compliance" ON country_compliance_checklist FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = country_compliance_checklist.company_id AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view reports" ON global_reports FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Managers can create reports" ON global_reports FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = global_reports.company_id AND role IN ('super_admin', 'admin', 'hr_manager', 'finance_manager')));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_exchange_rate(
  p_from_currency text,
  p_to_currency text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate numeric;
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN 1.0;
  END IF;

  SELECT rate INTO v_rate
  FROM exchange_rates
  WHERE from_currency_code = p_from_currency
  AND to_currency_code = p_to_currency
  AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    SELECT 1.0 / rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency_code = p_to_currency
    AND to_currency_code = p_from_currency
    AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_rate, 1.0);
END;
$$;

CREATE OR REPLACE FUNCTION convert_currency(
  p_amount numeric,
  p_from_currency text,
  p_to_currency text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate numeric;
BEGIN
  v_rate := get_exchange_rate(p_from_currency, p_to_currency, p_date);
  RETURN ROUND(p_amount * v_rate, 2);
END;
$$;

CREATE OR REPLACE FUNCTION update_global_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_countries_timestamp BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION update_global_timestamp();
CREATE TRIGGER update_country_payroll_settings_timestamp BEFORE UPDATE ON country_payroll_settings FOR EACH ROW EXECUTE FUNCTION update_global_timestamp();
CREATE TRIGGER update_employee_work_locations_timestamp BEFORE UPDATE ON employee_work_locations FOR EACH ROW EXECUTE FUNCTION update_global_timestamp();
CREATE TRIGGER update_expatriates_timestamp BEFORE UPDATE ON expatriates FOR EACH ROW EXECUTE FUNCTION update_global_timestamp();
CREATE TRIGGER update_work_permits_timestamp BEFORE UPDATE ON work_permits FOR EACH ROW EXECUTE FUNCTION update_global_timestamp();
CREATE TRIGGER update_global_payroll_runs_timestamp BEFORE UPDATE ON global_payroll_runs FOR EACH ROW EXECUTE FUNCTION update_global_timestamp();
CREATE TRIGGER update_cross_border_transfers_timestamp BEFORE UPDATE ON cross_border_transfers FOR EACH ROW EXECUTE FUNCTION update_global_timestamp();
CREATE TRIGGER update_country_compliance_timestamp BEFORE UPDATE ON country_compliance_checklist FOR EACH ROW EXECUTE FUNCTION update_global_timestamp();
