/*
  # Workforce Analytics & Organizational Management System
  
  1. Core Tables
    - **workforce_metrics** - Key HR metrics tracking
    - **predictive_models** - AI/ML model predictions
    - **turnover_predictions** - Employee flight risk scores
    - **headcount_forecasts** - Future workforce planning
    - **benchmarking_data** - External market comparisons
    - **org_structure** - Organizational hierarchy
    - **positions** - Position management
    - **position_budgets** - Budget planning for positions
    - **workforce_scenarios** - What-if planning scenarios
    - **diversity_metrics** - DEI tracking
    
  2. Features
    - Real-time HR dashboards
    - Predictive analytics (turnover, performance)
    - Workforce planning and forecasting
    - Benchmarking reports
    - Visual org chart
    - Position management and budgeting
    - Diversity and inclusion metrics
*/

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE metric_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'annual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE position_status AS ENUM ('active', 'budgeted', 'proposed', 'frozen', 'eliminated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE scenario_type AS ENUM ('growth', 'restructuring', 'cost_reduction', 'merger', 'expansion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- WORKFORCE METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workforce_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  metric_date date NOT NULL,
  metric_period text NOT NULL,
  
  total_headcount integer NOT NULL,
  total_fte numeric(10,2) NOT NULL,
  
  new_hires integer DEFAULT 0,
  terminations integer DEFAULT 0,
  voluntary_turnover integer DEFAULT 0,
  involuntary_turnover integer DEFAULT 0,
  
  turnover_rate numeric(5,2),
  voluntary_turnover_rate numeric(5,2),
  retention_rate numeric(5,2),
  
  time_to_fill_avg numeric(5,1),
  time_to_hire_avg numeric(5,1),
  
  open_positions integer DEFAULT 0,
  
  avg_tenure_years numeric(5,2),
  
  span_of_control_avg numeric(5,2),
  
  total_compensation numeric(15,2),
  avg_compensation numeric(15,2),
  
  benefits_cost_per_employee numeric(15,2),
  
  training_hours_total numeric(10,1),
  training_hours_per_employee numeric(5,1),
  
  performance_rating_avg numeric(3,1),
  
  engagement_score numeric(3,1),
  satisfaction_score numeric(3,1),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_workforce_metrics_company ON workforce_metrics(company_id);
CREATE INDEX idx_workforce_metrics_date ON workforce_metrics(metric_date);
CREATE INDEX idx_workforce_metrics_period ON workforce_metrics(metric_period);

-- ============================================================================
-- PREDICTIVE MODELS
-- ============================================================================

CREATE TABLE IF NOT EXISTS predictive_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  model_name text NOT NULL,
  model_type text NOT NULL,
  
  description text,
  
  features jsonb DEFAULT '[]'::jsonb,
  
  accuracy_score numeric(5,2),
  precision_score numeric(5,2),
  recall_score numeric(5,2),
  
  training_date date NOT NULL,
  training_data_size integer,
  
  model_version text,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_predictive_models_company ON predictive_models(company_id);
CREATE INDEX idx_predictive_models_type ON predictive_models(model_type);

-- ============================================================================
-- TURNOVER PREDICTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS turnover_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  model_id uuid REFERENCES predictive_models(id),
  
  prediction_date date NOT NULL DEFAULT CURRENT_DATE,
  
  turnover_risk_score numeric(5,2) NOT NULL,
  risk_category text NOT NULL,
  
  contributing_factors jsonb DEFAULT '[]'::jsonb,
  
  confidence_level numeric(5,2),
  
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  
  prediction_horizon_days integer DEFAULT 180,
  
  actual_outcome text,
  actual_outcome_date date,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_turnover_predictions_employee ON turnover_predictions(employee_id);
CREATE INDEX idx_turnover_predictions_date ON turnover_predictions(prediction_date);
CREATE INDEX idx_turnover_predictions_risk ON turnover_predictions(risk_category);

-- ============================================================================
-- HEADCOUNT FORECASTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS headcount_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  forecast_name text NOT NULL,
  forecast_date date NOT NULL,
  
  forecast_period_start date NOT NULL,
  forecast_period_end date NOT NULL,
  
  department text,
  
  current_headcount integer NOT NULL,
  
  forecasted_headcount integer NOT NULL,
  forecasted_hires integer,
  forecasted_terminations integer,
  
  assumptions text,
  
  confidence_level text,
  
  scenario_type scenario_type,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_headcount_forecasts_company ON headcount_forecasts(company_id);
CREATE INDEX idx_headcount_forecasts_period ON headcount_forecasts(forecast_period_start, forecast_period_end);

-- ============================================================================
-- BENCHMARKING DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS benchmarking_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  benchmark_name text NOT NULL,
  benchmark_category text NOT NULL,
  
  metric_name text NOT NULL,
  
  company_value numeric(15,2) NOT NULL,
  
  industry_avg numeric(15,2),
  industry_p25 numeric(15,2),
  industry_p50 numeric(15,2),
  industry_p75 numeric(15,2),
  industry_p90 numeric(15,2),
  
  best_in_class numeric(15,2),
  
  data_source text NOT NULL,
  survey_year integer NOT NULL,
  
  industry text,
  company_size_category text,
  region text,
  
  variance_from_avg numeric(15,2),
  percentile_rank numeric(5,2),
  
  recommendations text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_benchmarking_company ON benchmarking_data(company_id);
CREATE INDEX idx_benchmarking_category ON benchmarking_data(benchmark_category);
CREATE INDEX idx_benchmarking_metric ON benchmarking_data(metric_name);

-- ============================================================================
-- ORG STRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  org_unit_name text NOT NULL,
  org_unit_type text NOT NULL,
  
  parent_unit_id uuid REFERENCES org_structure(id),
  
  org_level integer NOT NULL,
  
  head_of_unit_id uuid REFERENCES employees(id),
  
  headcount integer DEFAULT 0,
  budgeted_headcount integer DEFAULT 0,
  
  cost_center text,
  
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_org_structure_company ON org_structure(company_id);
CREATE INDEX idx_org_structure_parent ON org_structure(parent_unit_id);
CREATE INDEX idx_org_structure_head ON org_structure(head_of_unit_id);

-- ============================================================================
-- POSITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  position_number text NOT NULL,
  position_title text NOT NULL,
  
  department text NOT NULL,
  org_unit_id uuid REFERENCES org_structure(id),
  
  job_level text,
  job_family text,
  
  reports_to_position_id uuid REFERENCES positions(id),
  
  fte numeric(3,2) DEFAULT 1.0,
  
  status position_status NOT NULL DEFAULT 'active',
  
  current_incumbent_id uuid REFERENCES employees(id),
  
  min_salary numeric(15,2),
  mid_salary numeric(15,2),
  max_salary numeric(15,2),
  
  key_responsibilities text,
  required_qualifications text,
  
  location text,
  
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, position_number)
);

CREATE INDEX idx_positions_company ON positions(company_id);
CREATE INDEX idx_positions_dept ON positions(department);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_incumbent ON positions(current_incumbent_id);

-- ============================================================================
-- POSITION BUDGETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS position_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  
  budget_year integer NOT NULL,
  
  budgeted_salary numeric(15,2) NOT NULL,
  budgeted_benefits numeric(15,2),
  budgeted_bonus numeric(15,2),
  
  total_budgeted_cost numeric(15,2) NOT NULL,
  
  actual_salary numeric(15,2) DEFAULT 0,
  actual_benefits numeric(15,2) DEFAULT 0,
  actual_bonus numeric(15,2) DEFAULT 0,
  
  total_actual_cost numeric(15,2) DEFAULT 0,
  
  variance numeric(15,2),
  
  notes text,
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(position_id, budget_year)
);

CREATE INDEX idx_position_budgets_position ON position_budgets(position_id);
CREATE INDEX idx_position_budgets_year ON position_budgets(budget_year);

-- ============================================================================
-- WORKFORCE SCENARIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workforce_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  scenario_name text NOT NULL,
  scenario_type scenario_type NOT NULL,
  
  description text NOT NULL,
  
  base_headcount integer NOT NULL,
  projected_headcount integer NOT NULL,
  
  timeline_months integer,
  
  assumptions jsonb DEFAULT '[]'::jsonb,
  
  cost_impact numeric(15,2),
  revenue_impact numeric(15,2),
  
  positions_affected jsonb DEFAULT '[]'::jsonb,
  
  risks text,
  opportunities text,
  
  status text DEFAULT 'draft',
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_workforce_scenarios_company ON workforce_scenarios(company_id);
CREATE INDEX idx_workforce_scenarios_type ON workforce_scenarios(scenario_type);

-- ============================================================================
-- DIVERSITY METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS diversity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  metric_date date NOT NULL,
  metric_period text NOT NULL,
  
  department text,
  job_level text,
  
  total_employees integer NOT NULL,
  
  gender_distribution jsonb DEFAULT '{}'::jsonb,
  
  nationality_distribution jsonb DEFAULT '{}'::jsonb,
  
  age_distribution jsonb DEFAULT '{}'::jsonb,
  
  disability_count integer DEFAULT 0,
  disability_percentage numeric(5,2),
  
  diversity_index numeric(5,2),
  
  female_leadership_percentage numeric(5,2),
  
  pay_equity_ratio numeric(5,2),
  
  hiring_diversity_percentage numeric(5,2),
  promotion_diversity_percentage numeric(5,2),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_diversity_metrics_company ON diversity_metrics(company_id);
CREATE INDEX idx_diversity_metrics_date ON diversity_metrics(metric_date);
CREATE INDEX idx_diversity_metrics_dept ON diversity_metrics(department);

-- Enable RLS
ALTER TABLE workforce_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnover_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE headcount_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarking_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE diversity_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "HR views workforce metrics" ON workforce_metrics FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));

CREATE POLICY "HR manages workforce metrics" ON workforce_metrics FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Users view org structure" ON org_structure FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages org structure" ON org_structure FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Users view positions" ON positions FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages positions" ON positions FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Finance views budgets" ON position_budgets FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));

CREATE POLICY "Finance manages budgets" ON position_budgets FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'finance')));