/*
  # Enterprise Employee Management System Enhancement

  ## Overview
  Transforms the employee module into a comprehensive enterprise-grade system

  ## 1. New Tables

  ### employee_lifecycle_stages
  Track employee journey from recruitment to exit

  ### employee_onboarding
  Structured onboarding process with tasks and checklists

  ### employee_offboarding
  Exit process management with clearance workflow

  ### employee_skills
  Skills matrix and competency tracking

  ### employee_certifications
  Professional certifications and licenses

  ### employee_education
  Educational background and qualifications

  ### employee_emergency_contacts
  Emergency contact information

  ### employee_dependents
  Family and dependent information

  ### employee_assessments
  Performance reviews and assessments

  ### employee_goals
  Goal setting and tracking (OKRs/KPIs)

  ### employee_recognitions
  Awards, achievements, and recognition

  ### employee_disciplinary_actions
  Disciplinary records and warnings

  ### employee_transfers
  Internal transfers and movements

  ### employee_promotions
  Promotion history and career progression

  ### employee_salary_reviews
  Salary review cycles and increments

  ### employee_benefits_enrollment
  Benefits package enrollment and management

  ### employee_time_off_policies
  Assigned leave policies per employee

  ### employee_work_schedules
  Shift patterns and work schedules

  ### employee_equipment
  Company assets and equipment assigned

  ### employee_access_logs
  System access and activity logs

  ## 2. Security
  - Enhanced RLS policies
  - Self-service access controls
  - Manager access rules

  ## 3. Automation
  - Lifecycle triggers
  - Notification system ready
  - Auto-status updates
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- EMPLOYEE LIFECYCLE STAGES
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_lifecycle_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  stage text NOT NULL CHECK (stage IN (
    'applicant', 'offer_made', 'offer_accepted', 
    'onboarding', 'probation', 'active', 
    'notice_period', 'offboarding', 'terminated', 'resigned', 'retired'
  )),
  
  stage_start_date date NOT NULL,
  stage_end_date date,
  expected_end_date date,
  
  notes text,
  metadata jsonb DEFAULT '{}',
  
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE ONBOARDING
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_onboarding (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  start_date date NOT NULL,
  expected_completion_date date NOT NULL,
  actual_completion_date date,
  
  buddy_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  hr_coordinator_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Checklist tracking
  checklist jsonb DEFAULT '[]',
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  
  -- Documents
  documents_submitted boolean DEFAULT false,
  documents_verified boolean DEFAULT false,
  
  -- IT Setup
  email_created boolean DEFAULT false,
  equipment_assigned boolean DEFAULT false,
  system_access_granted boolean DEFAULT false,
  
  -- Training
  orientation_completed boolean DEFAULT false,
  training_scheduled boolean DEFAULT false,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE OFFBOARDING
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_offboarding (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  termination_date date NOT NULL,
  last_working_day date NOT NULL,
  
  termination_type text NOT NULL CHECK (termination_type IN (
    'resignation', 'retirement', 'termination', 'contract_end', 'mutual_agreement'
  )),
  
  termination_reason text,
  eligible_for_rehire boolean DEFAULT true,
  
  -- Exit interview
  exit_interview_scheduled boolean DEFAULT false,
  exit_interview_completed boolean DEFAULT false,
  exit_interview_date date,
  exit_interview_notes text,
  
  -- Clearance
  equipment_returned boolean DEFAULT false,
  access_revoked boolean DEFAULT false,
  final_payroll_processed boolean DEFAULT false,
  clearance_certificate_issued boolean DEFAULT false,
  
  -- End of Service
  eos_calculated boolean DEFAULT false,
  eos_amount decimal(12,2),
  eos_paid boolean DEFAULT false,
  
  status text DEFAULT 'initiated' CHECK (status IN ('initiated', 'in_progress', 'completed')),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE SKILLS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_skills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  skill_name text NOT NULL,
  skill_category text,
  proficiency_level text CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  
  years_of_experience integer,
  last_used_date date,
  
  verified_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  verified_date date,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE CERTIFICATIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_certifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  certification_name text NOT NULL,
  issuing_organization text NOT NULL,
  certification_number text,
  
  issue_date date NOT NULL,
  expiry_date date,
  
  is_active boolean DEFAULT true,
  requires_renewal boolean DEFAULT false,
  
  document_url text,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE EDUCATION
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_education (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  degree_type text NOT NULL,
  field_of_study text NOT NULL,
  institution_name text NOT NULL,
  
  start_date date,
  end_date date,
  is_current boolean DEFAULT false,
  
  grade_gpa text,
  
  country text,
  city text,
  
  notes text,
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE EMERGENCY CONTACTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  contact_name text NOT NULL,
  relationship text NOT NULL,
  
  phone_primary text NOT NULL,
  phone_secondary text,
  email text,
  
  address text,
  
  is_primary boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE DEPENDENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_dependents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  dependent_name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date NOT NULL,
  gender text,
  
  national_id text,
  
  is_beneficiary boolean DEFAULT false,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE ASSESSMENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  assessment_type text NOT NULL CHECK (assessment_type IN (
    'annual_review', 'probation_review', 'quarterly_review', 'project_review', '360_feedback'
  )),
  
  assessment_date date NOT NULL,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  
  reviewer_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  
  overall_rating decimal(3,2) CHECK (overall_rating BETWEEN 1 AND 5),
  
  strengths text,
  areas_for_improvement text,
  goals_achieved text,
  
  comments text,
  
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged', 'finalized')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE GOALS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  goal_title text NOT NULL,
  goal_description text,
  goal_type text CHECK (goal_type IN ('performance', 'development', 'project', 'behavioral')),
  
  target_date date NOT NULL,
  
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'deferred')),
  
  set_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE RECOGNITIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_recognitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  recognition_type text NOT NULL CHECK (recognition_type IN (
    'award', 'employee_of_month', 'achievement', 'milestone', 'appreciation'
  )),
  
  title text NOT NULL,
  description text,
  
  recognition_date date NOT NULL,
  
  awarded_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  
  is_public boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE DISCIPLINARY ACTIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_disciplinary_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  action_type text NOT NULL CHECK (action_type IN (
    'verbal_warning', 'written_warning', 'final_warning', 'suspension', 'termination'
  )),
  
  issue_date date NOT NULL,
  incident_date date NOT NULL,
  
  violation_description text NOT NULL,
  action_taken text NOT NULL,
  
  issued_by uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  
  is_active boolean DEFAULT true,
  expiry_date date,
  
  employee_comments text,
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE TRANSFERS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  from_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  to_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  
  from_position text,
  to_position text,
  
  from_location text,
  to_location text,
  
  transfer_date date NOT NULL,
  effective_date date NOT NULL,
  
  transfer_type text CHECK (transfer_type IN ('permanent', 'temporary', 'promotion', 'lateral')),
  
  reason text,
  
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE PROMOTIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_promotions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  from_position text NOT NULL,
  to_position text NOT NULL,
  
  from_salary decimal(10,2),
  to_salary decimal(10,2),
  
  promotion_date date NOT NULL,
  effective_date date NOT NULL,
  
  reason text,
  
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE SALARY REVIEWS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_salary_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  review_date date NOT NULL,
  effective_date date NOT NULL,
  
  current_salary decimal(10,2) NOT NULL,
  proposed_salary decimal(10,2) NOT NULL,
  approved_salary decimal(10,2),
  
  increase_percentage decimal(5,2),
  
  review_type text CHECK (review_type IN ('annual', 'promotion', 'performance', 'market_adjustment', 'other')),
  
  justification text,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  
  reviewed_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE EQUIPMENT
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_equipment (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  equipment_type text NOT NULL CHECK (equipment_type IN (
    'laptop', 'desktop', 'mobile', 'tablet', 'monitor', 'keyboard', 'mouse', 
    'headset', 'other'
  )),
  
  brand text,
  model text,
  serial_number text,
  
  assigned_date date NOT NULL,
  return_date date,
  
  condition text CHECK (condition IN ('new', 'good', 'fair', 'poor')),
  
  notes text,
  
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'returned', 'damaged', 'lost')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- INDEXES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_employee ON employee_lifecycle_stages(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_stage ON employee_lifecycle_stages(stage);
CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_dates ON employee_lifecycle_stages(stage_start_date, stage_end_date);

CREATE INDEX IF NOT EXISTS idx_employee_onboarding_employee ON employee_onboarding(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_status ON employee_onboarding(status);

CREATE INDEX IF NOT EXISTS idx_employee_offboarding_employee ON employee_offboarding(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_offboarding_dates ON employee_offboarding(last_working_day);

CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_category ON employee_skills(skill_category);

CREATE INDEX IF NOT EXISTS idx_employee_certifications_employee ON employee_certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiry ON employee_certifications(expiry_date);

CREATE INDEX IF NOT EXISTS idx_employee_education_employee ON employee_education(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_emergency_contacts_employee ON employee_emergency_contacts(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_dependents_employee ON employee_dependents(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_assessments_employee ON employee_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_assessments_date ON employee_assessments(assessment_date);

CREATE INDEX IF NOT EXISTS idx_employee_goals_employee ON employee_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_status ON employee_goals(status);

CREATE INDEX IF NOT EXISTS idx_employee_recognitions_employee ON employee_recognitions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_recognitions_date ON employee_recognitions(recognition_date);

CREATE INDEX IF NOT EXISTS idx_employee_disciplinary_employee ON employee_disciplinary_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_disciplinary_active ON employee_disciplinary_actions(is_active);

CREATE INDEX IF NOT EXISTS idx_employee_transfers_employee ON employee_transfers(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_date ON employee_transfers(effective_date);

CREATE INDEX IF NOT EXISTS idx_employee_promotions_employee ON employee_promotions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_promotions_date ON employee_promotions(effective_date);

CREATE INDEX IF NOT EXISTS idx_employee_salary_reviews_employee ON employee_salary_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_reviews_status ON employee_salary_reviews(status);

CREATE INDEX IF NOT EXISTS idx_employee_equipment_employee ON employee_equipment(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_equipment_status ON employee_equipment(status);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE employee_lifecycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_disciplinary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_equipment ENABLE ROW LEVEL SECURITY;

-- Company-based access policies
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'employee_lifecycle_stages',
      'employee_onboarding',
      'employee_offboarding',
      'employee_skills',
      'employee_certifications',
      'employee_education',
      'employee_dependents',
      'employee_assessments',
      'employee_goals',
      'employee_recognitions',
      'employee_disciplinary_actions',
      'employee_transfers',
      'employee_promotions',
      'employee_salary_reviews',
      'employee_equipment'
    ])
  LOOP
    EXECUTE format('
      CREATE POLICY "Users can view own company data" ON %I
        FOR SELECT TO authenticated
        USING (
          company_id IN (
            SELECT company_id FROM user_roles
            WHERE user_id = auth.uid()
          )
        )
    ', table_name);

    EXECUTE format('
      CREATE POLICY "Managers can manage data" ON %I
        FOR ALL TO authenticated
        USING (
          company_id IN (
            SELECT company_id FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN (''super_admin'', ''admin'', ''hr_manager'')
          )
        )
    ', table_name);
  END LOOP;
END $$;

-- Emergency contacts - employees can view their own
CREATE POLICY "Employees can view own emergency contacts"
  ON employee_emergency_contacts FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Auto-update onboarding completion percentage
CREATE OR REPLACE FUNCTION update_onboarding_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_items integer := 8;
  completed_items integer := 0;
BEGIN
  IF NEW.documents_submitted THEN completed_items := completed_items + 1; END IF;
  IF NEW.documents_verified THEN completed_items := completed_items + 1; END IF;
  IF NEW.email_created THEN completed_items := completed_items + 1; END IF;
  IF NEW.equipment_assigned THEN completed_items := completed_items + 1; END IF;
  IF NEW.system_access_granted THEN completed_items := completed_items + 1; END IF;
  IF NEW.orientation_completed THEN completed_items := completed_items + 1; END IF;
  IF NEW.training_scheduled THEN completed_items := completed_items + 1; END IF;
  
  NEW.completion_percentage := (completed_items * 100) / total_items;
  
  IF NEW.completion_percentage = 100 AND NEW.status != 'completed' THEN
    NEW.status := 'completed';
    NEW.actual_completion_date := CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_completion
  BEFORE UPDATE ON employee_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_completion();

-- Auto-create lifecycle stage on employee status change
CREATE OR REPLACE FUNCTION track_employee_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO employee_lifecycle_stages (
      employee_id,
      company_id,
      stage,
      stage_start_date
    ) VALUES (
      NEW.id,
      NEW.company_id,
      NEW.status,
      CURRENT_DATE
    );
    
    IF OLD.id IS NOT NULL THEN
      UPDATE employee_lifecycle_stages
      SET stage_end_date = CURRENT_DATE
      WHERE employee_id = OLD.id
        AND stage = OLD.status
        AND stage_end_date IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_employee_lifecycle
  AFTER INSERT OR UPDATE OF status ON employees
  FOR EACH ROW
  EXECUTE FUNCTION track_employee_lifecycle();
