/*
  # Enhanced Talent Management System
  
  1. New Tables
    - **talent_reviews** - Annual talent review cycles
    - **talent_assessments** - 9-box grid placements
    - **succession_candidates** - Successor pools with readiness
    - **career_paths** - Career progression frameworks
    - **career_path_steps** - Individual career steps
    - **employee_career_plans** - Individual career development
    - **high_potential_programs** - HiPo identification
    - **talent_pool_segments** - Segmented talent groups
    - **retention_risk_tracking** - Flight risk tracking
    
  2. Features
    - 9-box grid talent assessment
    - Enhanced succession planning
    - Career pathing framework
    - High potential programs
    - Retention risk management
*/

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE talent_review_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE performance_level AS ENUM ('low', 'medium', 'high', 'exceptional');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE potential_level AS ENUM ('limited', 'moderate', 'high', 'exceptional');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE readiness_level AS ENUM ('ready_now', 'ready_1_2_years', 'ready_3_5_years', 'not_ready');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE retention_risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE talent_segment AS ENUM ('core', 'high_potential', 'specialist', 'emerging', 'solid_performer', 'development_needed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- TALENT REVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS talent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  review_name text NOT NULL,
  review_year integer NOT NULL,
  review_date date NOT NULL,
  
  status talent_review_status DEFAULT 'draft',
  
  participants jsonb DEFAULT '[]'::jsonb,
  employees_reviewed integer DEFAULT 0,
  
  facilitator_id uuid REFERENCES employees(id),
  
  meeting_notes text,
  key_decisions text,
  action_items jsonb DEFAULT '[]'::jsonb,
  
  completed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, review_year)
);

CREATE INDEX IF NOT EXISTS idx_talent_reviews_company_v2 ON talent_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_talent_reviews_year_v2 ON talent_reviews(review_year);

-- ============================================================================
-- TALENT ASSESSMENTS (9-BOX GRID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS talent_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_id uuid REFERENCES talent_reviews(id) ON DELETE CASCADE,
  
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  
  performance_level performance_level NOT NULL,
  potential_level potential_level NOT NULL,
  nine_box_position text NOT NULL,
  
  talent_segment talent_segment,
  
  is_high_potential boolean DEFAULT false,
  is_key_talent boolean DEFAULT false,
  
  strengths text,
  development_areas text,
  career_aspirations text,
  recommended_actions text,
  
  retention_risk retention_risk_level DEFAULT 'low',
  retention_notes text,
  
  assessor_id uuid REFERENCES employees(id),
  next_review_date date,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_assessments_employee_v2 ON talent_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_talent_assessments_review_v2 ON talent_assessments(review_id);
CREATE INDEX IF NOT EXISTS idx_talent_assessments_box_v2 ON talent_assessments(nine_box_position);
CREATE INDEX IF NOT EXISTS idx_talent_assessments_hipo_v2 ON talent_assessments(is_high_potential) WHERE is_high_potential = true;

-- ============================================================================
-- SUCCESSION CANDIDATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS succession_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  succession_plan_id uuid NOT NULL REFERENCES succession_planning_v2(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  readiness_level readiness_level NOT NULL,
  rank_order integer,
  
  strengths text,
  development_gaps text,
  
  development_plan_id uuid REFERENCES development_plans_v2(id),
  exposure_assignments jsonb DEFAULT '[]'::jsonb,
  
  probability_of_success numeric(3,1),
  assessor_comments text,
  
  last_assessment_date date,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(succession_plan_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_succession_candidates_plan_v2 ON succession_candidates(succession_plan_id);
CREATE INDEX IF NOT EXISTS idx_succession_candidates_employee_v2 ON succession_candidates(employee_id);
CREATE INDEX IF NOT EXISTS idx_succession_candidates_readiness_v2 ON succession_candidates(readiness_level);

-- ============================================================================
-- CAREER PATHS
-- ============================================================================

CREATE TABLE IF NOT EXISTS career_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  path_name text NOT NULL,
  path_type text NOT NULL,
  
  department text,
  job_family text,
  
  description text NOT NULL,
  entry_requirements text,
  
  typical_duration_years integer,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, path_name)
);

CREATE INDEX IF NOT EXISTS idx_career_paths_company_v2 ON career_paths(company_id);
CREATE INDEX IF NOT EXISTS idx_career_paths_dept_v2 ON career_paths(department);

-- ============================================================================
-- CAREER PATH STEPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS career_path_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_path_id uuid NOT NULL REFERENCES career_paths(id) ON DELETE CASCADE,
  
  step_order integer NOT NULL,
  position_title text NOT NULL,
  job_level text NOT NULL,
  
  typical_duration_years numeric(3,1),
  
  key_responsibilities text,
  required_competencies jsonb DEFAULT '[]'::jsonb,
  required_skills jsonb DEFAULT '[]'::jsonb,
  
  typical_salary_range_min numeric(15,2),
  typical_salary_range_max numeric(15,2),
  
  prerequisites text,
  development_activities jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_path_steps_path_v2 ON career_path_steps(career_path_id);
CREATE INDEX IF NOT EXISTS idx_career_path_steps_order_v2 ON career_path_steps(step_order);

-- ============================================================================
-- EMPLOYEE CAREER PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_career_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  career_path_id uuid REFERENCES career_paths(id),
  current_step_id uuid REFERENCES career_path_steps(id),
  target_step_id uuid REFERENCES career_path_steps(id),
  
  career_goals text NOT NULL,
  target_position text,
  target_timeline date,
  
  development_actions jsonb DEFAULT '[]'::jsonb,
  skills_to_develop jsonb DEFAULT '[]'::jsonb,
  experience_to_gain text,
  
  mentors jsonb DEFAULT '[]'::jsonb,
  
  progress_notes text,
  
  manager_id uuid REFERENCES employees(id),
  manager_support_notes text,
  
  last_reviewed_date date,
  next_review_date date,
  
  status text DEFAULT 'active',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_career_plans_employee_v2 ON employee_career_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_career_plans_path_v2 ON employee_career_plans(career_path_id);

-- ============================================================================
-- HIGH POTENTIAL PROGRAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS high_potential_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  program_name text NOT NULL,
  program_year integer NOT NULL,
  
  program_description text,
  selection_criteria text NOT NULL,
  
  program_activities jsonb DEFAULT '[]'::jsonb,
  
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  participants jsonb DEFAULT '[]'::jsonb,
  
  program_facilitator uuid REFERENCES employees(id),
  budget_allocated numeric(15,2),
  
  success_metrics text,
  status text DEFAULT 'active',
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, program_name, program_year)
);

CREATE INDEX IF NOT EXISTS idx_hipo_programs_company_v2 ON high_potential_programs(company_id);
CREATE INDEX IF NOT EXISTS idx_hipo_programs_year_v2 ON high_potential_programs(program_year);

-- ============================================================================
-- TALENT POOL SEGMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS talent_pool_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  segment_type talent_segment NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  
  segment_criteria text,
  development_focus text,
  investment_priority text,
  
  review_frequency text DEFAULT 'annual',
  
  last_reviewed_date date,
  next_review_date date,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_pools_company_v2 ON talent_pool_segments(company_id);
CREATE INDEX IF NOT EXISTS idx_talent_pools_employee_v2 ON talent_pool_segments(employee_id);
CREATE INDEX IF NOT EXISTS idx_talent_pools_segment_v2 ON talent_pool_segments(segment_type);

-- ============================================================================
-- RETENTION RISK TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_risk_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  risk_level retention_risk_level NOT NULL,
  
  risk_factors jsonb DEFAULT '[]'::jsonb,
  flight_risk_indicators text,
  
  impact_of_loss text NOT NULL,
  
  retention_actions jsonb DEFAULT '[]'::jsonb,
  action_owner_id uuid REFERENCES employees(id),
  
  last_assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  next_review_date date,
  
  resolution_date date,
  resolution_notes text,
  
  status text DEFAULT 'active',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retention_risk_company_v2 ON retention_risk_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_retention_risk_employee_v2 ON retention_risk_tracking(employee_id);
CREATE INDEX IF NOT EXISTS idx_retention_risk_level_v2 ON retention_risk_tracking(risk_level);
CREATE INDEX IF NOT EXISTS idx_retention_risk_active_v2 ON retention_risk_tracking(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE talent_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE succession_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_career_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_potential_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_pool_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_risk_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view company talent reviews" ON talent_reviews FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr', 'manager')));

CREATE POLICY "HR manages talent reviews" ON talent_reviews FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Managers view talent assessments" ON talent_assessments FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages talent assessments" ON talent_assessments FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Employees view career paths" ON career_paths FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages career paths" ON career_paths FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Employees view own career plans" ON employee_career_plans FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Employees manage own career plans" ON employee_career_plans FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));