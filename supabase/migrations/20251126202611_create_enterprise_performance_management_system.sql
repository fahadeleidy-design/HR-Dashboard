/*
  # Enterprise Performance Management System

  1. Performance Review Cycles
    - `performance_cycles` - Annual/quarterly review periods
    - `performance_review_templates` - Customizable review templates
    
  2. Goals & Objectives (OKR/KPI)
    - `performance_goals` - Employee goals and objectives
    - `goal_categories` - Goal categorization
    - `goal_milestones` - Trackable milestones
    
  3. Competencies Framework
    - `competency_frameworks` - Company competency models
    - `competencies` - Individual competencies
    - `competency_levels` - Proficiency levels
    
  4. 360-Degree Feedback
    - `feedback_requests` - Multi-rater feedback requests
    - `feedback_responses` - Anonymous feedback responses
    - `feedback_questions` - Configurable questions
    
  5. Performance Ratings
    - Enhanced `performance_reviews` table
    - `review_competency_ratings` - Detailed competency scores
    - `review_goal_ratings` - Goal achievement scores
    
  6. Performance Improvement Plans (PIP)
    - `performance_improvement_plans` - PIP tracking
    - `pip_action_items` - Action items and deadlines
    - `pip_check_ins` - Progress tracking
    
  7. Succession Planning
    - `succession_plans` - Critical role coverage
    - `talent_pool` - High potential employees
    - `development_plans` - Career development
    
  8. Recognition & Rewards
    - `employee_recognitions` - Peer recognition
    - `performance_bonuses` - Performance-based compensation
*/

-- Performance Cycles
CREATE TABLE IF NOT EXISTS performance_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  cycle_name text NOT NULL,
  cycle_type text CHECK (cycle_type IN ('annual', 'semi_annual', 'quarterly', 'monthly')) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  review_start_date date,
  review_end_date date,
  self_review_deadline date,
  manager_review_deadline date,
  calibration_date date,
  status text CHECK (status IN ('planning', 'self_review', 'manager_review', 'calibration', 'completed', 'cancelled')) DEFAULT 'planning',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance Review Templates
CREATE TABLE IF NOT EXISTS performance_review_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  template_name text NOT NULL,
  description text,
  rating_scale integer DEFAULT 5,
  include_self_review boolean DEFAULT true,
  include_peer_review boolean DEFAULT false,
  include_360_review boolean DEFAULT false,
  sections jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goal Categories
CREATE TABLE IF NOT EXISTS goal_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  category_name text NOT NULL,
  description text,
  color_code text,
  weight_percentage decimal(5,2),
  created_at timestamptz DEFAULT now()
);

-- Performance Goals (OKR/KPI style)
CREATE TABLE IF NOT EXISTS performance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  cycle_id uuid REFERENCES performance_cycles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES goal_categories(id) ON DELETE SET NULL,
  goal_title text NOT NULL,
  description text,
  goal_type text CHECK (goal_type IN ('objective', 'key_result', 'kpi', 'personal_development')) NOT NULL,
  parent_goal_id uuid REFERENCES performance_goals(id) ON DELETE CASCADE,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit_of_measure text,
  weight_percentage decimal(5,2),
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status text CHECK (status IN ('draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled')) DEFAULT 'draft',
  start_date date,
  due_date date,
  completed_date date,
  progress_percentage integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goal Milestones
CREATE TABLE IF NOT EXISTS goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES performance_goals(id) ON DELETE CASCADE NOT NULL,
  milestone_title text NOT NULL,
  description text,
  due_date date,
  completed_date date,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Competency Frameworks
CREATE TABLE IF NOT EXISTS competency_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  framework_name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Competencies
CREATE TABLE IF NOT EXISTS competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid REFERENCES competency_frameworks(id) ON DELETE CASCADE NOT NULL,
  competency_name text NOT NULL,
  description text,
  category text,
  weight_percentage decimal(5,2),
  created_at timestamptz DEFAULT now()
);

-- Competency Levels
CREATE TABLE IF NOT EXISTS competency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid REFERENCES competencies(id) ON DELETE CASCADE NOT NULL,
  level_number integer NOT NULL,
  level_name text NOT NULL,
  description text,
  behaviors text,
  created_at timestamptz DEFAULT now()
);

-- Enhanced Performance Reviews
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES performance_cycles(id) ON DELETE SET NULL;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES performance_review_templates(id) ON DELETE SET NULL;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS self_review_completed_at timestamptz;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS manager_review_completed_at timestamptz;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS self_review_comments text;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS manager_comments text;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS strengths text;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS areas_for_improvement text;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS development_goals text;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS next_review_date date;

-- Review Competency Ratings
CREATE TABLE IF NOT EXISTS review_competency_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES performance_reviews(id) ON DELETE CASCADE NOT NULL,
  competency_id uuid REFERENCES competencies(id) ON DELETE CASCADE NOT NULL,
  self_rating integer,
  manager_rating integer,
  final_rating integer,
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Review Goal Ratings
CREATE TABLE IF NOT EXISTS review_goal_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES performance_reviews(id) ON DELETE CASCADE NOT NULL,
  goal_id uuid REFERENCES performance_goals(id) ON DELETE CASCADE NOT NULL,
  achievement_percentage integer,
  self_rating integer,
  manager_rating integer,
  final_rating integer,
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Feedback Questions
CREATE TABLE IF NOT EXISTS feedback_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text CHECK (question_type IN ('rating', 'text', 'multiple_choice')) NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  display_order integer,
  created_at timestamptz DEFAULT now()
);

-- Feedback Requests (360-degree)
CREATE TABLE IF NOT EXISTS feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  review_id uuid REFERENCES performance_reviews(id) ON DELETE CASCADE,
  subject_employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  reviewer_employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  relationship_type text CHECK (relationship_type IN ('manager', 'peer', 'direct_report', 'self', 'other')) NOT NULL,
  request_date date DEFAULT CURRENT_DATE,
  due_date date,
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')) DEFAULT 'pending',
  completed_date date,
  is_anonymous boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Feedback Responses
CREATE TABLE IF NOT EXISTS feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_request_id uuid REFERENCES feedback_requests(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES feedback_questions(id) ON DELETE CASCADE NOT NULL,
  rating_value integer,
  text_response text,
  created_at timestamptz DEFAULT now()
);

-- Performance Improvement Plans (PIP)
CREATE TABLE IF NOT EXISTS performance_improvement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL NOT NULL,
  review_id uuid REFERENCES performance_reviews(id) ON DELETE SET NULL,
  plan_title text NOT NULL,
  reason text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  expected_outcomes text,
  consequences text,
  status text CHECK (status IN ('active', 'successful', 'unsuccessful', 'extended', 'cancelled')) DEFAULT 'active',
  final_outcome text,
  completed_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PIP Action Items
CREATE TABLE IF NOT EXISTS pip_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pip_id uuid REFERENCES performance_improvement_plans(id) ON DELETE CASCADE NOT NULL,
  action_item text NOT NULL,
  description text,
  due_date date NOT NULL,
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')) DEFAULT 'pending',
  completed_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- PIP Check-ins
CREATE TABLE IF NOT EXISTS pip_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pip_id uuid REFERENCES performance_improvement_plans(id) ON DELETE CASCADE NOT NULL,
  check_in_date date NOT NULL,
  progress_summary text NOT NULL,
  manager_feedback text,
  employee_feedback text,
  next_steps text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Succession Plans
CREATE TABLE IF NOT EXISTS succession_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  critical_role_title text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  current_incumbent_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  time_to_fill_estimate text,
  required_competencies text,
  status text CHECK (status IN ('active', 'filled', 'archived')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Talent Pool (Successors)
CREATE TABLE IF NOT EXISTS talent_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  succession_plan_id uuid REFERENCES succession_plans(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  readiness_level text CHECK (readiness_level IN ('ready_now', 'ready_1_year', 'ready_2_3_years', 'future_potential')) NOT NULL,
  development_needs text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Development Plans
CREATE TABLE IF NOT EXISTS development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  plan_title text NOT NULL,
  career_aspiration text,
  development_areas text,
  target_position text,
  target_timeframe text,
  status text CHECK (status IN ('active', 'completed', 'on_hold')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Development Activities
CREATE TABLE IF NOT EXISTS development_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  development_plan_id uuid REFERENCES development_plans(id) ON DELETE CASCADE NOT NULL,
  activity_type text CHECK (activity_type IN ('training', 'mentoring', 'project', 'job_rotation', 'certification', 'other')) NOT NULL,
  activity_description text NOT NULL,
  start_date date,
  end_date date,
  status text CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
  completion_notes text,
  created_at timestamptz DEFAULT now()
);

-- Employee Recognitions
CREATE TABLE IF NOT EXISTS employee_recognitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  recognized_by_id uuid REFERENCES employees(id) ON DELETE SET NULL NOT NULL,
  recognition_type text CHECK (recognition_type IN ('peer', 'manager', 'company', 'customer')) NOT NULL,
  category text,
  title text NOT NULL,
  description text NOT NULL,
  recognition_date date DEFAULT CURRENT_DATE,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Performance Bonuses
CREATE TABLE IF NOT EXISTS performance_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  review_id uuid REFERENCES performance_reviews(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES performance_cycles(id) ON DELETE SET NULL,
  bonus_type text CHECK (bonus_type IN ('annual', 'quarterly', 'project', 'spot', 'other')) NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'SAR',
  reason text,
  payment_date date,
  status text CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_performance_cycles_company ON performance_cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_cycles_dates ON performance_cycles(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_performance_goals_employee ON performance_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_goals_cycle ON performance_goals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_goals_status ON performance_goals(status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_subject ON feedback_requests(subject_employee_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_reviewer ON feedback_requests(reviewer_employee_id);
CREATE INDEX IF NOT EXISTS idx_pip_employee ON performance_improvement_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_succession_plans_company ON succession_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_employee ON talent_pool(employee_id);
CREATE INDEX IF NOT EXISTS idx_development_plans_employee ON development_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_employee ON employee_recognitions(employee_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_employee ON performance_bonuses(employee_id);

-- Enable RLS
ALTER TABLE performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_competency_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_goal_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_improvement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE succession_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view performance data for their company"
  ON performance_cycles FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view goals for their company"
  ON performance_goals FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view feedback for their company"
  ON feedback_requests FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view PIPs for their company"
  ON performance_improvement_plans FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view succession plans for their company"
  ON succession_plans FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view development plans for their company"
  ON development_plans FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view recognitions for their company"
  ON employee_recognitions FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));