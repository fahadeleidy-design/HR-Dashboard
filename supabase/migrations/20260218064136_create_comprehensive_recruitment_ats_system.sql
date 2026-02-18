/*
  # Comprehensive Recruitment & ATS System
  
  1. Core Tables
    - **job_requisitions** - Job openings and requirements
    - **job_postings** - External job advertisements
    - **candidates** - Candidate profiles
    - **candidate_applications** - Application tracking
    - **candidate_pipeline** - Pipeline stage management
    - **interviews** - Interview scheduling and tracking
    - **interview_feedback** - Interviewer assessments
    - **offer_letters** - Job offers
    - **candidate_assessments** - Skills and tests
    - **talent_pool** - Future opportunities
    
  2. Features
    - Full applicant tracking system
    - Multi-stage pipeline management
    - Interview scheduling and feedback
    - Offer management
    - Talent pool for future hiring
    - Integration with job boards
*/

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE requisition_status AS ENUM ('draft', 'pending_approval', 'approved', 'open', 'on_hold', 'filled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'temporary', 'internship');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('new', 'screening', 'phone_screen', 'interview', 'assessment', 'offer', 'hired', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE interview_type AS ENUM ('phone', 'video', 'in_person', 'technical', 'panel', 'behavioral');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE interview_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- JOB REQUISITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_requisitions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  requisition_number text NOT NULL,
  job_title text NOT NULL,
  department text NOT NULL,
  location text NOT NULL,
  
  employment_type employment_type NOT NULL DEFAULT 'full_time',
  num_positions integer NOT NULL DEFAULT 1,
  
  hiring_manager_id uuid REFERENCES employees(id),
  recruiter_id uuid REFERENCES employees(id),
  
  salary_min numeric(15,2),
  salary_max numeric(15,2),
  currency text DEFAULT 'SAR',
  
  job_description text NOT NULL,
  responsibilities text,
  requirements text,
  qualifications text,
  benefits text,
  
  status requisition_status NOT NULL DEFAULT 'draft',
  priority text DEFAULT 'medium',
  
  target_start_date date,
  approval_date date,
  approved_by uuid REFERENCES auth.users(id),
  
  filled_positions integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, requisition_number)
);

CREATE INDEX idx_job_reqs_v2_company ON job_requisitions_v2(company_id);
CREATE INDEX idx_job_reqs_v2_status ON job_requisitions_v2(status);
CREATE INDEX idx_job_reqs_v2_hiring_mgr ON job_requisitions_v2(hiring_manager_id);

-- ============================================================================
-- JOB POSTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_postings_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requisition_id uuid NOT NULL REFERENCES job_requisitions_v2(id) ON DELETE CASCADE,
  
  posting_title text NOT NULL,
  posting_url text,
  
  is_internal boolean DEFAULT false,
  is_external boolean DEFAULT true,
  
  posting_channels jsonb DEFAULT '[]'::jsonb,
  
  posted_date date,
  closing_date date,
  
  application_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_job_postings_v2_req ON job_postings_v2(requisition_id);
CREATE INDEX idx_job_postings_v2_active ON job_postings_v2(is_active) WHERE is_active = true;

-- ============================================================================
-- CANDIDATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidates_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  
  linkedin_url text,
  portfolio_url text,
  
  resume_path text,
  resume_url text,
  
  current_company text,
  current_title text,
  current_salary numeric(15,2),
  expected_salary numeric(15,2),
  
  years_experience integer,
  education_level text,
  
  location text,
  willing_to_relocate boolean DEFAULT false,
  
  skills jsonb DEFAULT '[]'::jsonb,
  languages jsonb DEFAULT '[]'::jsonb,
  
  source text,
  referrer_id uuid REFERENCES employees(id),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(company_id, email)
);

CREATE INDEX idx_candidates_v2_company ON candidates_v2(company_id);
CREATE INDEX idx_candidates_v2_email ON candidates_v2(email);
CREATE INDEX idx_candidates_v2_source ON candidates_v2(source);

-- ============================================================================
-- CANDIDATE APPLICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidate_applications_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requisition_id uuid NOT NULL REFERENCES job_requisitions_v2(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates_v2(id) ON DELETE CASCADE,
  
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  
  status application_status NOT NULL DEFAULT 'new',
  current_stage text NOT NULL DEFAULT 'applied',
  
  resume_path text,
  cover_letter text,
  
  screening_score numeric(5,2),
  overall_rating numeric(3,1),
  
  rejection_reason text,
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  
  hired_date date,
  
  assigned_recruiter_id uuid REFERENCES employees(id),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(candidate_id, requisition_id)
);

CREATE INDEX idx_applications_v2_req ON candidate_applications_v2(requisition_id);
CREATE INDEX idx_applications_v2_candidate ON candidate_applications_v2(candidate_id);
CREATE INDEX idx_applications_v2_status ON candidate_applications_v2(status);

-- ============================================================================
-- CANDIDATE PIPELINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidate_pipeline_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES candidate_applications_v2(id) ON DELETE CASCADE,
  
  stage_name text NOT NULL,
  stage_order integer NOT NULL,
  
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  
  duration_days integer,
  
  status text DEFAULT 'active',
  
  notes text,
  
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_pipeline_v2_application ON candidate_pipeline_v2(application_id);
CREATE INDEX idx_pipeline_v2_stage ON candidate_pipeline_v2(stage_name);

-- ============================================================================
-- INTERVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS interviews_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES candidate_applications_v2(id) ON DELETE CASCADE,
  
  interview_type interview_type NOT NULL,
  interview_round integer NOT NULL DEFAULT 1,
  
  scheduled_date timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  
  location text,
  meeting_link text,
  
  interviewer_ids jsonb DEFAULT '[]'::jsonb,
  
  status interview_status NOT NULL DEFAULT 'scheduled',
  
  interview_guide text,
  questions jsonb DEFAULT '[]'::jsonb,
  
  overall_rating numeric(3,1),
  recommendation text,
  
  feedback_submitted_at timestamptz,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_interviews_v2_application ON interviews_v2(application_id);
CREATE INDEX idx_interviews_v2_date ON interviews_v2(scheduled_date);
CREATE INDEX idx_interviews_v2_status ON interviews_v2(status);

-- ============================================================================
-- INTERVIEW FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS interview_feedback_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews_v2(id) ON DELETE CASCADE,
  interviewer_id uuid NOT NULL REFERENCES employees(id),
  
  technical_skills_rating numeric(3,1),
  communication_rating numeric(3,1),
  cultural_fit_rating numeric(3,1),
  problem_solving_rating numeric(3,1),
  overall_rating numeric(3,1),
  
  strengths text,
  weaknesses text,
  concerns text,
  
  recommendation text NOT NULL,
  
  detailed_feedback text,
  
  submitted_at timestamptz DEFAULT now(),
  
  UNIQUE(interview_id, interviewer_id)
);

CREATE INDEX idx_feedback_v2_interview ON interview_feedback_v2(interview_id);
CREATE INDEX idx_feedback_v2_interviewer ON interview_feedback_v2(interviewer_id);

-- ============================================================================
-- OFFER LETTERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS offer_letters_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES candidate_applications_v2(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates_v2(id),
  
  offer_number text NOT NULL,
  
  job_title text NOT NULL,
  department text NOT NULL,
  reporting_to text,
  
  employment_type employment_type NOT NULL,
  start_date date NOT NULL,
  
  base_salary numeric(15,2) NOT NULL,
  currency text DEFAULT 'SAR',
  
  housing_allowance numeric(15,2),
  transportation_allowance numeric(15,2),
  other_allowances jsonb DEFAULT '[]'::jsonb,
  
  annual_bonus_target numeric(15,2),
  
  benefits text,
  
  probation_period_months integer DEFAULT 3,
  
  offer_valid_until date NOT NULL,
  
  status offer_status NOT NULL DEFAULT 'draft',
  
  sent_date date,
  accepted_date date,
  rejected_date date,
  
  rejection_reason text,
  
  offer_letter_path text,
  signed_offer_path text,
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(company_id, offer_number)
);

CREATE INDEX idx_offers_v2_application ON offer_letters_v2(application_id);
CREATE INDEX idx_offers_v2_candidate ON offer_letters_v2(candidate_id);
CREATE INDEX idx_offers_v2_status ON offer_letters_v2(status);

-- ============================================================================
-- CANDIDATE ASSESSMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidate_assessments_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES candidate_applications_v2(id) ON DELETE CASCADE,
  
  assessment_type text NOT NULL,
  assessment_name text NOT NULL,
  
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  completed_date date,
  
  score numeric(5,2),
  max_score numeric(5,2),
  passing_score numeric(5,2),
  
  passed boolean,
  
  assessment_url text,
  results_url text,
  
  evaluator_id uuid REFERENCES employees(id),
  evaluator_notes text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_assessments_v2_application ON candidate_assessments_v2(application_id);
CREATE INDEX idx_assessments_v2_type ON candidate_assessments_v2(assessment_type);

-- ============================================================================
-- TALENT POOL
-- ============================================================================

CREATE TABLE IF NOT EXISTS talent_pool_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates_v2(id) ON DELETE CASCADE,
  
  pool_name text NOT NULL,
  
  added_reason text,
  target_roles jsonb DEFAULT '[]'::jsonb,
  
  priority text DEFAULT 'medium',
  
  last_contacted_date date,
  next_followup_date date,
  
  status text DEFAULT 'active',
  
  notes text,
  
  added_by uuid REFERENCES auth.users(id),
  added_at timestamptz DEFAULT now(),
  
  UNIQUE(candidate_id, pool_name)
);

CREATE INDEX idx_talent_pool_v2_candidate ON talent_pool_v2(candidate_id);
CREATE INDEX idx_talent_pool_v2_pool ON talent_pool_v2(pool_name);
CREATE INDEX idx_talent_pool_v2_status ON talent_pool_v2(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE job_requisitions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_applications_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_pipeline_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_feedback_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_letters_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_assessments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_pool_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view company requisitions" ON job_requisitions_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages requisitions" ON job_requisitions_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Users view candidates" ON candidates_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages candidates" ON candidates_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));

CREATE POLICY "Users view applications" ON candidate_applications_v2 FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR manages applications" ON candidate_applications_v2 FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr')));