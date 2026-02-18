/*
  # Comprehensive Compensation & Benefits System
  
  1. Core Tables
    - **compensation_plans** - Annual compensation planning
    - **compensation_changes** - Salary adjustments and promotions
    - **bonus_plans** - Bonus program definitions
    - **bonus_allocations** - Individual bonus awards
    - **equity_grants** - Stock options and RSUs
    - **benefits_plans** - Benefit program definitions
    - **employee_benefits** - Employee benefit enrollments
    - **total_rewards_statements** - Annual compensation statements
    - **market_data** - Salary benchmarking
    - **pay_equity_analysis** - Equity monitoring
    
  2. Features
    - Compensation planning and budgeting
    - Merit increase management
    - Bonus allocation
    - Equity management
    - Benefits administration
    - Total rewards statements
    - Pay equity analysis
*/

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE compensation_change_type AS ENUM ('merit_increase', 'promotion', 'market_adjustment', 'equity_adjustment', 'demotion', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE bonus_type AS ENUM ('performance', 'discretionary', 'retention', 'signing', 'referral', 'spot');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE equity_type AS ENUM ('stock_options', 'rsu', 'espp', 'phantom_stock');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE vesting_schedule AS ENUM ('immediate', 'monthly', 'quarterly', 'annual', 'cliff');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE benefit_type AS ENUM ('health', 'dental', 'vision', 'life', 'disability', 'retirement', 'wellness', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- COMPENSATION PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS compensation_plans_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  plan_name text NOT NULL,
  plan_year integer NOT NULL,
  
  budget_total numeric(15,2) NOT NULL,
  budget_allocated numeric(15,2) DEFAULT 0,
  budget_remaining numeric(15,2),
  
  merit_increase_budget_pct numeric(5,2),
  promotion_budget_pct numeric(5,2),
  market_adjustment_budget_pct numeric(5,2),
  
  effective_date date NOT NULL,
  
  planning_status text DEFAULT 'draft',
  
  guidelines text,
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, plan_year)
);

CREATE INDEX idx_comp_plans_v2_company ON compensation_plans_v2(company_id);
CREATE INDEX idx_comp_plans_v2_year ON compensation_plans_v2(plan_year);

-- ============================================================================
-- COMPENSATION CHANGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS compensation_changes_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES compensation_plans_v2(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  change_type compensation_change_type NOT NULL,
  
  effective_date date NOT NULL,
  
  current_salary numeric(15,2) NOT NULL,
  new_salary numeric(15,2) NOT NULL,
  salary_change numeric(15,2) NOT NULL,
  change_percentage numeric(5,2) NOT NULL,
  
  current_title text,
  new_title text,
  
  current_job_level text,
  new_job_level text,
  
  reason text NOT NULL,
  justification text,
  
  performance_rating text,
  
  prorated_amount numeric(15,2),
  annual_cost_impact numeric(15,2),
  
  budget_impact numeric(15,2),
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  processed boolean DEFAULT false,
  processed_at timestamptz,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_comp_changes_v2_employee ON compensation_changes_v2(employee_id);
CREATE INDEX idx_comp_changes_v2_plan ON compensation_changes_v2(plan_id);
CREATE INDEX idx_comp_changes_v2_effective_date ON compensation_changes_v2(effective_date);

-- ============================================================================
-- BONUS PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bonus_plans_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  plan_name text NOT NULL,
  bonus_type bonus_type NOT NULL,
  
  plan_year integer NOT NULL,
  
  eligibility_criteria text NOT NULL,
  
  target_bonus_pct numeric(5,2),
  min_bonus_pct numeric(5,2),
  max_bonus_pct numeric(5,2),
  
  performance_multipliers jsonb DEFAULT '{}'::jsonb,
  
  total_budget numeric(15,2),
  allocated_amount numeric(15,2) DEFAULT 0,
  
  payout_date date,
  
  is_active boolean DEFAULT true,
  
  plan_details text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, plan_name, plan_year)
);

CREATE INDEX idx_bonus_plans_v2_company ON bonus_plans_v2(company_id);
CREATE INDEX idx_bonus_plans_v2_year ON bonus_plans_v2(plan_year);

-- ============================================================================
-- BONUS ALLOCATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bonus_allocations_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES bonus_plans_v2(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  target_bonus numeric(15,2) NOT NULL,
  actual_bonus numeric(15,2) NOT NULL,
  
  performance_rating text,
  performance_multiplier numeric(5,2),
  
  individual_goals_achievement numeric(5,2),
  company_goals_achievement numeric(5,2),
  
  calculation_details jsonb DEFAULT '{}'::jsonb,
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  paid_date date,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(plan_id, employee_id)
);

CREATE INDEX idx_bonus_alloc_v2_plan ON bonus_allocations_v2(plan_id);
CREATE INDEX idx_bonus_alloc_v2_employee ON bonus_allocations_v2(employee_id);

-- ============================================================================
-- EQUITY GRANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS equity_grants_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  grant_number text NOT NULL,
  equity_type equity_type NOT NULL,
  
  grant_date date NOT NULL,
  
  shares_granted numeric(15,2) NOT NULL,
  strike_price numeric(15,2),
  grant_value numeric(15,2),
  
  vesting_schedule vesting_schedule NOT NULL,
  vesting_start_date date NOT NULL,
  vesting_duration_months integer NOT NULL,
  cliff_months integer DEFAULT 0,
  
  shares_vested numeric(15,2) DEFAULT 0,
  shares_exercised numeric(15,2) DEFAULT 0,
  shares_forfeited numeric(15,2) DEFAULT 0,
  shares_remaining numeric(15,2),
  
  expiration_date date,
  
  vesting_details jsonb DEFAULT '[]'::jsonb,
  
  is_active boolean DEFAULT true,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, grant_number)
);

CREATE INDEX idx_equity_grants_v2_employee ON equity_grants_v2(employee_id);
CREATE INDEX idx_equity_grants_v2_grant_date ON equity_grants_v2(grant_date);

-- ============================================================================
-- BENEFITS PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_plans_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  plan_name text NOT NULL,
  benefit_type benefit_type NOT NULL,
  
  provider_name text,
  provider_contact text,
  
  plan_details text NOT NULL,
  
  employee_cost_monthly numeric(15,2),
  employer_cost_monthly numeric(15,2),
  
  coverage_levels jsonb DEFAULT '[]'::jsonb,
  
  eligibility_criteria text,
  waiting_period_days integer DEFAULT 0,
  
  enrollment_period_start date,
  enrollment_period_end date,
  
  effective_date date NOT NULL,
  termination_date date,
  
  is_active boolean DEFAULT true,
  
  plan_documents jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_benefits_plans_v2_company ON benefits_plans_v2(company_id);
CREATE INDEX idx_benefits_plans_v2_type ON benefits_plans_v2(benefit_type);
CREATE INDEX idx_benefits_plans_v2_active ON benefits_plans_v2(is_active) WHERE is_active = true;

-- ============================================================================
-- EMPLOYEE BENEFITS ENROLLMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_benefits_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES benefits_plans_v2(id) ON DELETE CASCADE,
  
  enrollment_date date NOT NULL,
  effective_date date NOT NULL,
  termination_date date,
  
  coverage_level text,
  
  dependents jsonb DEFAULT '[]'::jsonb,
  
  employee_contribution numeric(15,2),
  employer_contribution numeric(15,2),
  
  beneficiaries jsonb DEFAULT '[]'::jsonb,
  
  enrollment_status text DEFAULT 'active',
  
  waiver_signed boolean DEFAULT false,
  waiver_reason text,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_emp_benefits_v2_employee ON employee_benefits_v2(employee_id);
CREATE INDEX idx_emp_benefits_v2_plan ON employee_benefits_v2(plan_id);
CREATE INDEX idx_emp_benefits_v2_status ON employee_benefits_v2(enrollment_status);

-- ============================================================================
-- TOTAL REWARDS STATEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS total_rewards_statements_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  statement_year integer NOT NULL,
  statement_date date NOT NULL,
  
  base_salary numeric(15,2) NOT NULL,
  allowances numeric(15,2) DEFAULT 0,
  
  annual_bonus numeric(15,2) DEFAULT 0,
  other_cash_compensation numeric(15,2) DEFAULT 0,
  
  equity_value numeric(15,2) DEFAULT 0,
  
  benefits_value numeric(15,2) DEFAULT 0,
  benefits_breakdown jsonb DEFAULT '{}'::jsonb,
  
  retirement_contribution numeric(15,2) DEFAULT 0,
  
  total_cash_compensation numeric(15,2) NOT NULL,
  total_compensation numeric(15,2) NOT NULL,
  
  statement_path text,
  
  generated_at timestamptz DEFAULT now(),
  sent_to_employee_at timestamptz,
  
  viewed_at timestamptz,
  
  UNIQUE(employee_id, statement_year)
);

CREATE INDEX idx_total_rewards_v2_employee ON total_rewards_statements_v2(employee_id);
CREATE INDEX idx_total_rewards_v2_year ON total_rewards_statements_v2(statement_year);

-- ============================================================================
-- MARKET SALARY DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_salary_data_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  job_title text NOT NULL,
  job_level text,
  
  market text NOT NULL,
  data_source text NOT NULL,
  
  survey_date date NOT NULL,
  
  currency text DEFAULT 'SAR',
  
  p10_salary numeric(15,2),
  p25_salary numeric(15,2),
  p50_salary numeric(15,2),
  p75_salary numeric(15,2),
  p90_salary numeric(15,2),
  
  avg_bonus numeric(15,2),
  avg_equity numeric(15,2),
  
  sample_size integer,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_market_data_v2_company ON market_salary_data_v2(company_id);
CREATE INDEX idx_market_data_v2_job_title ON market_salary_data_v2(job_title);

-- ============================================================================
-- PAY EQUITY ANALYSIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pay_equity_analysis_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  analysis_name text NOT NULL,
  analysis_date date NOT NULL,
  
  analysis_scope text NOT NULL,
  
  employees_analyzed integer NOT NULL,
  
  findings jsonb DEFAULT '[]'::jsonb,
  
  gender_pay_gap_pct numeric(5,2),
  nationality_pay_gap_pct numeric(5,2),
  
  recommendations text,
  action_items jsonb DEFAULT '[]'::jsonb,
  
  conducted_by uuid REFERENCES auth.users(id),
  
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  
  report_path text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pay_equity_v2_company ON pay_equity_analysis_v2(company_id);
CREATE INDEX idx_pay_equity_v2_date ON pay_equity_analysis_v2(analysis_date);

-- Enable RLS
ALTER TABLE compensation_plans_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_changes_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_plans_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_allocations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_grants_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_plans_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_benefits_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE total_rewards_statements_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_salary_data_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_equity_analysis_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view company comp plans" ON compensation_plans_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));

CREATE POLICY "HR manages comp plans" ON compensation_plans_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));

CREATE POLICY "Managers view team comp changes" ON compensation_changes_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages comp changes" ON compensation_changes_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));

CREATE POLICY "Employees view own benefits" ON employee_benefits_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages benefits" ON employee_benefits_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Employees view own total rewards" ON total_rewards_statements_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));