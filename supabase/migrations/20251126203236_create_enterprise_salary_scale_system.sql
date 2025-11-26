/*
  # Enterprise Salary Scale Management System
  
  1. Job Architecture
    - `job_families` - Groups of related jobs (Engineering, Finance, HR, etc.)
    - `job_grades` - Hierarchical levels (Grade 1-15)
    - `job_positions` - Specific roles with requirements
    
  2. Salary Structure
    - `salary_scales` - Company-wide salary scales
    - `salary_bands` - Salary ranges per grade/position
    - `salary_components` - Basic, housing, transport, allowances
    
  3. Market Benchmarking
    - `market_surveys` - Salary survey data
    - `market_data_points` - Industry benchmark data
    - `competitor_mapping` - Position comparison
    
  4. Salary Progression
    - `salary_progression_rules` - Annual increment rules
    - `merit_increase_matrix` - Performance-based increases
    - `promotion_increases` - Promotion salary adjustments
    
  5. Salary Reviews
    - `salary_review_cycles` - Annual/periodic reviews
    - `salary_adjustments` - Individual adjustments
    - `salary_proposals` - Manager proposals
    
  6. Cost Analysis
    - `budget_allocations` - Department budgets
    - `cost_impact_analysis` - Financial impact tracking
    
  Saudi Market Compliance:
  - Minimum wage requirements
  - Saudization salary requirements
  - Industry standards
  - Expatriate vs Saudi national considerations
*/

-- Job Families
CREATE TABLE IF NOT EXISTS job_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  family_code text NOT NULL,
  family_name text NOT NULL,
  description text,
  icon text,
  color_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, family_code)
);

-- Job Grades
CREATE TABLE IF NOT EXISTS job_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  grade_code text NOT NULL,
  grade_level integer NOT NULL,
  grade_name text NOT NULL,
  description text,
  minimum_years_experience integer,
  education_requirement text,
  is_leadership boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, grade_code)
);

-- Job Positions
CREATE TABLE IF NOT EXISTS job_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  job_family_id uuid REFERENCES job_families(id) ON DELETE SET NULL,
  grade_id uuid REFERENCES job_grades(id) ON DELETE SET NULL NOT NULL,
  position_code text NOT NULL,
  position_title text NOT NULL,
  position_title_ar text,
  description text,
  responsibilities text,
  qualifications text,
  skills_required text,
  reports_to_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
  is_critical_role boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, position_code)
);

-- Salary Scales
CREATE TABLE IF NOT EXISTS salary_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  scale_name text NOT NULL,
  scale_code text NOT NULL,
  description text,
  effective_date date NOT NULL,
  end_date date,
  currency text DEFAULT 'SAR',
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, scale_code)
);

-- Salary Bands (Ranges per Grade)
CREATE TABLE IF NOT EXISTS salary_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_scale_id uuid REFERENCES salary_scales(id) ON DELETE CASCADE NOT NULL,
  grade_id uuid REFERENCES job_grades(id) ON DELETE CASCADE NOT NULL,
  position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
  nationality_type text CHECK (nationality_type IN ('saudi', 'non_saudi', 'all')) DEFAULT 'all',
  minimum_salary decimal(12,2) NOT NULL,
  midpoint_salary decimal(12,2) NOT NULL,
  maximum_salary decimal(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Salary Components Definition
CREATE TABLE IF NOT EXISTS salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  component_code text NOT NULL,
  component_name text NOT NULL,
  component_name_ar text,
  component_type text CHECK (component_type IN ('basic', 'allowance', 'bonus', 'deduction')) NOT NULL,
  is_fixed boolean DEFAULT true,
  is_taxable boolean DEFAULT true,
  is_gosi_applicable boolean DEFAULT true,
  calculation_method text CHECK (calculation_method IN ('fixed_amount', 'percentage', 'formula')) DEFAULT 'fixed_amount',
  percentage_of_basic decimal(5,2),
  formula text,
  display_order integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, component_code)
);

-- Salary Component Bands (Component amounts per grade)
CREATE TABLE IF NOT EXISTS salary_component_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_scale_id uuid REFERENCES salary_scales(id) ON DELETE CASCADE NOT NULL,
  component_id uuid REFERENCES salary_components(id) ON DELETE CASCADE NOT NULL,
  grade_id uuid REFERENCES job_grades(id) ON DELETE CASCADE NOT NULL,
  minimum_amount decimal(12,2),
  maximum_amount decimal(12,2),
  default_amount decimal(12,2),
  percentage_of_basic decimal(5,2),
  created_at timestamptz DEFAULT now()
);

-- Market Surveys
CREATE TABLE IF NOT EXISTS market_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  survey_name text NOT NULL,
  survey_provider text,
  survey_date date NOT NULL,
  industry text,
  region text,
  currency text DEFAULT 'SAR',
  exchange_rate decimal(10,4) DEFAULT 1.0,
  participant_count integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Market Data Points
CREATE TABLE IF NOT EXISTS market_data_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES market_surveys(id) ON DELETE CASCADE NOT NULL,
  job_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
  position_title text NOT NULL,
  percentile_10 decimal(12,2),
  percentile_25 decimal(12,2),
  percentile_50 decimal(12,2),
  percentile_75 decimal(12,2),
  percentile_90 decimal(12,2),
  average_salary decimal(12,2),
  sample_size integer,
  created_at timestamptz DEFAULT now()
);

-- Salary Progression Rules
CREATE TABLE IF NOT EXISTS salary_progression_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  salary_scale_id uuid REFERENCES salary_scales(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  effective_date date NOT NULL,
  end_date date,
  progression_type text CHECK (progression_type IN ('annual', 'merit', 'promotion', 'cost_of_living')) NOT NULL,
  minimum_increase_percentage decimal(5,2),
  maximum_increase_percentage decimal(5,2),
  default_increase_percentage decimal(5,2),
  requires_performance_rating boolean DEFAULT false,
  minimum_performance_rating decimal(3,2),
  requires_time_in_grade boolean DEFAULT false,
  minimum_months_in_grade integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Merit Increase Matrix
CREATE TABLE IF NOT EXISTS merit_increase_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  matrix_name text NOT NULL,
  effective_date date NOT NULL,
  performance_rating_min decimal(3,2) NOT NULL,
  performance_rating_max decimal(3,2) NOT NULL,
  position_in_range_min decimal(5,2) NOT NULL,
  position_in_range_max decimal(5,2) NOT NULL,
  increase_percentage decimal(5,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Promotion Increases
CREATE TABLE IF NOT EXISTS promotion_increases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  from_grade_id uuid REFERENCES job_grades(id) ON DELETE CASCADE NOT NULL,
  to_grade_id uuid REFERENCES job_grades(id) ON DELETE CASCADE NOT NULL,
  minimum_increase_percentage decimal(5,2) NOT NULL,
  recommended_increase_percentage decimal(5,2),
  maximum_increase_percentage decimal(5,2),
  created_at timestamptz DEFAULT now()
);

-- Salary Review Cycles
CREATE TABLE IF NOT EXISTS salary_review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  cycle_name text NOT NULL,
  cycle_year integer NOT NULL,
  review_type text CHECK (review_type IN ('annual', 'mid_year', 'promotion', 'special')) NOT NULL,
  budget_amount decimal(15,2),
  budget_percentage decimal(5,2),
  start_date date NOT NULL,
  end_date date NOT NULL,
  manager_submission_deadline date,
  hr_review_deadline date,
  approval_deadline date,
  effective_date date NOT NULL,
  status text CHECK (status IN ('planning', 'open', 'review', 'approved', 'completed', 'cancelled')) DEFAULT 'planning',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Salary Proposals
CREATE TABLE IF NOT EXISTS salary_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_cycle_id uuid REFERENCES salary_review_cycles(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  proposed_by_id uuid REFERENCES employees(id) ON DELETE SET NULL NOT NULL,
  current_salary decimal(12,2) NOT NULL,
  proposed_salary decimal(12,2) NOT NULL,
  increase_amount decimal(12,2) NOT NULL,
  increase_percentage decimal(5,2) NOT NULL,
  proposal_reason text,
  justification text NOT NULL,
  performance_rating decimal(3,2),
  position_in_range decimal(5,2),
  market_comparison_ratio decimal(5,2),
  status text CHECK (status IN ('draft', 'submitted', 'hr_review', 'approved', 'rejected', 'implemented')) DEFAULT 'draft',
  hr_comments text,
  approval_comments text,
  submitted_date date,
  approved_date date,
  implemented_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Salary Adjustments (Historical Record)
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  review_cycle_id uuid REFERENCES salary_review_cycles(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES salary_proposals(id) ON DELETE SET NULL,
  adjustment_type text CHECK (adjustment_type IN ('merit', 'promotion', 'market_adjustment', 'cost_of_living', 'equity', 'retention', 'other')) NOT NULL,
  effective_date date NOT NULL,
  old_basic_salary decimal(12,2) NOT NULL,
  new_basic_salary decimal(12,2) NOT NULL,
  increase_amount decimal(12,2) NOT NULL,
  increase_percentage decimal(5,2) NOT NULL,
  old_grade_id uuid REFERENCES job_grades(id) ON DELETE SET NULL,
  new_grade_id uuid REFERENCES job_grades(id) ON DELETE SET NULL,
  reason text,
  approved_by_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Budget Allocations
CREATE TABLE IF NOT EXISTS salary_budget_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  review_cycle_id uuid REFERENCES salary_review_cycles(id) ON DELETE CASCADE NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
  allocated_amount decimal(15,2) NOT NULL,
  allocated_percentage decimal(5,2),
  utilized_amount decimal(15,2) DEFAULT 0,
  remaining_amount decimal(15,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cost Impact Analysis
CREATE TABLE IF NOT EXISTS cost_impact_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  review_cycle_id uuid REFERENCES salary_review_cycles(id) ON DELETE SET NULL,
  analysis_date date NOT NULL,
  analysis_type text CHECK (analysis_type IN ('proposed', 'approved', 'actual')) NOT NULL,
  total_current_payroll decimal(15,2) NOT NULL,
  total_proposed_payroll decimal(15,2) NOT NULL,
  total_increase_amount decimal(15,2) NOT NULL,
  total_increase_percentage decimal(5,2) NOT NULL,
  annual_cost_impact decimal(15,2) NOT NULL,
  headcount integer NOT NULL,
  average_increase_percentage decimal(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Salary Comparison Ratios (Employee position in range and market)
CREATE TABLE IF NOT EXISTS salary_comparison_ratios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  salary_band_id uuid REFERENCES salary_bands(id) ON DELETE SET NULL,
  market_data_point_id uuid REFERENCES market_data_points(id) ON DELETE SET NULL,
  calculation_date date NOT NULL,
  current_salary decimal(12,2) NOT NULL,
  range_minimum decimal(12,2),
  range_midpoint decimal(12,2),
  range_maximum decimal(12,2),
  compa_ratio decimal(5,2),
  position_in_range decimal(5,2),
  market_50th_percentile decimal(12,2),
  market_comparison_ratio decimal(5,2),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_families_company ON job_families(company_id);
CREATE INDEX IF NOT EXISTS idx_job_grades_company ON job_grades(company_id);
CREATE INDEX IF NOT EXISTS idx_job_grades_level ON job_grades(grade_level);
CREATE INDEX IF NOT EXISTS idx_job_positions_company ON job_positions(company_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_grade ON job_positions(grade_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_family ON job_positions(job_family_id);
CREATE INDEX IF NOT EXISTS idx_salary_scales_company ON salary_scales(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_scales_active ON salary_scales(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_bands_scale ON salary_bands(salary_scale_id);
CREATE INDEX IF NOT EXISTS idx_salary_bands_grade ON salary_bands(grade_id);
CREATE INDEX IF NOT EXISTS idx_market_surveys_company ON market_surveys(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_proposals_cycle ON salary_proposals(review_cycle_id);
CREATE INDEX IF NOT EXISTS idx_salary_proposals_employee ON salary_proposals(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_proposals_status ON salary_proposals(status);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_employee ON salary_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_date ON salary_adjustments(effective_date);

-- Enable RLS
ALTER TABLE job_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_component_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE merit_increase_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_increases ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_impact_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_comparison_ratios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view salary data for their company"
  ON salary_scales FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view job positions for their company"
  ON job_positions FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view salary bands for their company"
  ON salary_bands FOR SELECT
  TO authenticated
  USING (salary_scale_id IN (
    SELECT id FROM salary_scales WHERE company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view salary proposals for their company"
  ON salary_proposals FOR SELECT
  TO authenticated
  USING (review_cycle_id IN (
    SELECT id FROM salary_review_cycles WHERE company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view salary adjustments for their company"
  ON salary_adjustments FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));