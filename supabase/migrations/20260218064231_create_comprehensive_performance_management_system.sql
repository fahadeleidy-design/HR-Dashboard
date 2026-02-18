/*
  # Comprehensive Performance Management System
  
  1. Core Tables
    - **performance_review_cycles** - Annual/quarterly review periods
    - **performance_reviews** - Employee reviews
    - **performance_goals** - SMART goals and OKRs
    - **goal_progress** - Goal tracking and updates
    - **feedback_360** - 360-degree feedback
    - **feedback_requests** - Feedback request management
    - **performance_calibration** - Calibration sessions
    - **performance_ratings** - Rating scales
    - **development_plans** - Individual development plans
    - **succession_planning** - Talent pipeline
    
  2. Features
    - Goal setting and tracking (OKR/MBO)
    - 360-degree feedback system
    - Performance calibration
    - Development planning
    - Succession planning
    - Continuous feedback
*/

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE review_cycle_status AS ENUM ('draft', 'active', 'calibration', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('not_started', 'self_review', 'manager_review', 'calibration', 'completed', 'acknowledged');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE goal_type AS ENUM ('individual', 'team', 'company', 'development');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE goal_status AS ENUM ('draft', 'active', 'at_risk', 'achieved', 'not_achieved', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_type AS ENUM ('self', 'manager', 'peer', 'direct_report', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_request_status AS ENUM ('pending', 'submitted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- PERFORMANCE REVIEW CYCLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_review_cycles_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  cycle_name text NOT NULL,
  cycle_type text NOT NULL DEFAULT 'annual',
  
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  
  self_review_deadline date,
  manager_review_deadline date,
  calibration_deadline date,
  
  status review_cycle_status NOT NULL DEFAULT 'draft',
  
  total_employees integer DEFAULT 0,
  completed_reviews integer DEFAULT 0,
  
  instructions text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, cycle_name)
);

CREATE INDEX idx_review_cycles_v2_company ON performance_review_cycles_v2(company_id);
CREATE INDEX idx_review_cycles_v2_status ON performance_review_cycles_v2(status);

-- ============================================================================
-- PERFORMANCE REVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_reviews_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES performance_review_cycles_v2(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES employees(id),
  
  status review_status NOT NULL DEFAULT 'not_started',
  
  self_review_text text,
  self_review_submitted_at timestamptz,
  
  manager_review_text text,
  manager_review_submitted_at timestamptz,
  
  achievements text,
  areas_of_improvement text,
  development_needs text,
  
  competency_ratings jsonb DEFAULT '[]'::jsonb,
  
  overall_rating numeric(3,1),
  performance_rating text,
  
  calibrated_rating numeric(3,1),
  calibration_notes text,
  calibrated_by uuid REFERENCES auth.users(id),
  calibrated_at timestamptz,
  
  employee_acknowledged_at timestamptz,
  employee_comments text,
  
  goals_achieved integer DEFAULT 0,
  goals_total integer DEFAULT 0,
  
  recommended_salary_increase numeric(5,2),
  recommended_bonus numeric(15,2),
  recommended_promotion boolean DEFAULT false,
  
  next_steps text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(cycle_id, employee_id)
);

CREATE INDEX idx_reviews_v2_cycle ON performance_reviews_v2(cycle_id);
CREATE INDEX idx_reviews_v2_employee ON performance_reviews_v2(employee_id);
CREATE INDEX idx_reviews_v2_status ON performance_reviews_v2(status);

-- ============================================================================
-- PERFORMANCE GOALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_goals_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  goal_type goal_type NOT NULL DEFAULT 'individual',
  
  goal_title text NOT NULL,
  goal_description text NOT NULL,
  
  target_date date NOT NULL,
  
  measurement_criteria text NOT NULL,
  target_value text,
  current_value text,
  
  weight numeric(5,2) DEFAULT 100,
  
  status goal_status NOT NULL DEFAULT 'draft',
  
  progress_percentage numeric(5,2) DEFAULT 0,
  
  aligned_to_goal_id uuid REFERENCES performance_goals_v2(id),
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  achieved_date date,
  achievement_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_goals_v2_employee ON performance_goals_v2(employee_id);
CREATE INDEX idx_goals_v2_status ON performance_goals_v2(status);
CREATE INDEX idx_goals_v2_target_date ON performance_goals_v2(target_date);

-- ============================================================================
-- GOAL PROGRESS UPDATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS goal_progress_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES performance_goals_v2(id) ON DELETE CASCADE,
  
  update_date date NOT NULL DEFAULT CURRENT_DATE,
  
  progress_percentage numeric(5,2) NOT NULL,
  current_value text,
  
  update_notes text NOT NULL,
  challenges text,
  support_needed text,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_goal_progress_v2_goal ON goal_progress_v2(goal_id);
CREATE INDEX idx_goal_progress_v2_date ON goal_progress_v2(update_date);

-- ============================================================================
-- 360-DEGREE FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_360_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  feedback_provider_id uuid NOT NULL REFERENCES employees(id),
  
  feedback_type feedback_type NOT NULL,
  
  review_cycle_id uuid REFERENCES performance_review_cycles_v2(id),
  
  competencies jsonb DEFAULT '[]'::jsonb,
  
  strengths text,
  development_areas text,
  specific_examples text,
  
  overall_rating numeric(3,1),
  
  is_anonymous boolean DEFAULT false,
  
  submitted_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, feedback_provider_id, review_cycle_id)
);

CREATE INDEX idx_feedback_360_v2_employee ON feedback_360_v2(employee_id);
CREATE INDEX idx_feedback_360_v2_provider ON feedback_360_v2(feedback_provider_id);
CREATE INDEX idx_feedback_360_v2_cycle ON feedback_360_v2(review_cycle_id);

-- ============================================================================
-- FEEDBACK REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_requests_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requested_from_id uuid NOT NULL REFERENCES employees(id),
  
  feedback_type feedback_type NOT NULL,
  
  review_cycle_id uuid REFERENCES performance_review_cycles_v2(id),
  
  requested_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  
  status feedback_request_status NOT NULL DEFAULT 'pending',
  
  request_message text,
  
  submitted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  
  reminder_sent_at timestamptz,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feedback_requests_v2_employee ON feedback_requests_v2(employee_id);
CREATE INDEX idx_feedback_requests_v2_requested_from ON feedback_requests_v2(requested_from_id);
CREATE INDEX idx_feedback_requests_v2_status ON feedback_requests_v2(status);

-- ============================================================================
-- PERFORMANCE CALIBRATION SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_calibration_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES performance_review_cycles_v2(id) ON DELETE CASCADE,
  
  session_name text NOT NULL,
  session_date date NOT NULL,
  
  department text,
  
  participants jsonb DEFAULT '[]'::jsonb,
  
  reviews_calibrated integer DEFAULT 0,
  
  rating_distribution jsonb DEFAULT '{}'::jsonb,
  
  session_notes text,
  decisions_made text,
  
  facilitator_id uuid REFERENCES employees(id),
  
  completed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_calibration_v2_cycle ON performance_calibration_v2(cycle_id);
CREATE INDEX idx_calibration_v2_date ON performance_calibration_v2(session_date);

-- ============================================================================
-- PERFORMANCE RATING SCALES
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_rating_scales_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  scale_name text NOT NULL,
  scale_type text NOT NULL,
  
  ratings jsonb NOT NULL,
  
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, scale_name)
);

CREATE INDEX idx_rating_scales_v2_company ON performance_rating_scales_v2(company_id);

-- ============================================================================
-- INDIVIDUAL DEVELOPMENT PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS development_plans_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  plan_name text NOT NULL,
  
  career_aspirations text,
  strengths text,
  development_areas text,
  
  development_actions jsonb DEFAULT '[]'::jsonb,
  
  target_completion_date date,
  
  manager_id uuid REFERENCES employees(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  progress_percentage numeric(5,2) DEFAULT 0,
  
  last_reviewed_date date,
  
  status text DEFAULT 'active',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_dev_plans_v2_employee ON development_plans_v2(employee_id);
CREATE INDEX idx_dev_plans_v2_status ON development_plans_v2(status);

-- ============================================================================
-- SUCCESSION PLANNING
-- ============================================================================

CREATE TABLE IF NOT EXISTS succession_planning_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  position_title text NOT NULL,
  department text NOT NULL,
  
  current_incumbent_id uuid REFERENCES employees(id),
  
  criticality text NOT NULL,
  risk_of_vacancy text,
  
  successors jsonb DEFAULT '[]'::jsonb,
  
  development_needs text,
  timeline text,
  
  last_reviewed_date date,
  next_review_date date,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_succession_v2_company ON succession_planning_v2(company_id);
CREATE INDEX idx_succession_v2_incumbent ON succession_planning_v2(current_incumbent_id);

-- Enable RLS
ALTER TABLE performance_review_cycles_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_360_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_calibration_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_rating_scales_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_plans_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE succession_planning_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view company review cycles" ON performance_review_cycles_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages review cycles" ON performance_review_cycles_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Users view own reviews" ON performance_reviews_v2 FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "HR manages reviews" ON performance_reviews_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Users view own goals" ON performance_goals_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Employees manage own goals" ON performance_goals_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));