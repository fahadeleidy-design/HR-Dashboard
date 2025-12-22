/*
  # Create Core Recruitment Tables

  Creates essential recruitment tables for enterprise ATS
*/

-- Job Requisitions
CREATE TABLE IF NOT EXISTS job_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requisition_number text NOT NULL,
  job_title text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  employment_type text NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary', 'internship')),
  number_of_positions integer NOT NULL DEFAULT 1,
  job_description text,
  required_qualifications text,
  required_experience_years integer,
  salary_range_min decimal(12,2),
  salary_range_max decimal(12,2),
  nationality_preference text CHECK (nationality_preference IN ('saudi_only', 'non_saudi_only', 'saudi_preferred', 'no_preference')),
  requested_date date NOT NULL DEFAULT CURRENT_DATE,
  target_start_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'on_hold', 'cancelled', 'filled', 'closed')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  hiring_manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_date timestamptz,
  priority integer DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_req_num UNIQUE(company_id, requisition_number)
);

CREATE INDEX IF NOT EXISTS idx_jreq_company ON job_requisitions(company_id);
CREATE INDEX IF NOT EXISTS idx_jreq_status ON job_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_jreq_dept ON job_requisitions(department_id);

-- Interview Panels
CREATE TABLE IF NOT EXISTS interview_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  panel_name text NOT NULL,
  description text,
  panel_members jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ipanel_company ON interview_panels(company_id);

-- Interview Scorecards
CREATE TABLE IF NOT EXISTS interview_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  technical_skills_rating integer CHECK (technical_skills_rating BETWEEN 1 AND 5),
  communication_rating integer CHECK (communication_rating BETWEEN 1 AND 5),
  problem_solving_rating integer CHECK (problem_solving_rating BETWEEN 1 AND 5),
  cultural_fit_rating integer CHECK (cultural_fit_rating BETWEEN 1 AND 5),
  overall_rating decimal(3,2) CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation text CHECK (recommendation IN ('strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire')),
  strengths text,
  weaknesses text,
  detailed_feedback text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_int_scorecard UNIQUE(interview_id, interviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_iscore_interview ON interview_scorecards(interview_id);
CREATE INDEX IF NOT EXISTS idx_iscore_interviewer ON interview_scorecards(interviewer_id);

-- Offer Letters
CREATE TABLE IF NOT EXISTS offer_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_offer_id uuid NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  language text DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  letter_content text NOT NULL,
  position_title text NOT NULL,
  start_date date,
  salary decimal(12,2),
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz DEFAULT now(),
  document_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oletter_company ON offer_letters(company_id);
CREATE INDEX IF NOT EXISTS idx_oletter_offer ON offer_letters(job_offer_id);

-- Offer Negotiations
CREATE TABLE IF NOT EXISTS offer_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_offer_id uuid NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  negotiation_round integer DEFAULT 1,
  candidate_counter_salary decimal(12,2),
  candidate_notes text,
  company_revised_salary decimal(12,2),
  company_notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'countered', 'rejected', 'final_offer')),
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oneg_offer ON offer_negotiations(job_offer_id);
CREATE INDEX IF NOT EXISTS idx_oneg_status ON offer_negotiations(status);

-- Recruitment Sources
CREATE TABLE IF NOT EXISTS recruitment_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('job_board', 'social_media', 'referral_program', 'recruitment_agency', 'university', 'career_fair', 'company_website', 'other')),
  cost_per_hire decimal(12,2),
  total_applications integer DEFAULT 0,
  total_hires integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rsource_company ON recruitment_sources(company_id);
CREATE INDEX IF NOT EXISTS idx_rsource_type ON recruitment_sources(source_type, is_active);

-- Recruitment Campaigns
CREATE TABLE IF NOT EXISTS recruitment_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  description text,
  campaign_type text CHECK (campaign_type IN ('job_posting', 'employer_branding', 'talent_attraction', 'university_recruitment', 'diversity_hiring', 'seasonal_hiring')),
  start_date date NOT NULL,
  end_date date,
  budget decimal(12,2),
  actual_spend decimal(12,2) DEFAULT 0,
  applications_received integer DEFAULT 0,
  hires_made integer DEFAULT 0,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  campaign_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rcampaign_company ON recruitment_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_rcampaign_status ON recruitment_campaigns(status);

-- Background Checks
CREATE TABLE IF NOT EXISTS background_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('criminal_record', 'employment_verification', 'education_verification', 'professional_license', 'credit_check', 'reference_check', 'identity_verification')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'issues_found', 'failed')),
  requested_date date DEFAULT CURRENT_DATE,
  completed_date date,
  result text CHECK (result IN ('clear', 'flagged', 'failed')),
  findings text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bgcheck_company ON background_checks(company_id);
CREATE INDEX IF NOT EXISTS idx_bgcheck_candidate ON background_checks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_bgcheck_status ON background_checks(status);

-- Assessment Tests
CREATE TABLE IF NOT EXISTS assessment_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('technical', 'aptitude', 'personality', 'cognitive', 'language', 'skills', 'situational', 'culture_fit')),
  description text,
  duration_minutes integer,
  passing_score integer CHECK (passing_score BETWEEN 0 AND 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atest_company ON assessment_tests(company_id);
CREATE INDEX IF NOT EXISTS idx_atest_type ON assessment_tests(test_type, is_active);

-- Candidate Assessments
CREATE TABLE IF NOT EXISTS candidate_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  assessment_test_id uuid NOT NULL REFERENCES assessment_tests(id) ON DELETE CASCADE,
  scheduled_date timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'expired')),
  score integer CHECK (score BETWEEN 0 AND 100),
  passed boolean,
  evaluator_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cassess_candidate ON candidate_assessments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cassess_application ON candidate_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_cassess_test ON candidate_assessments(assessment_test_id);

-- Helper Function
CREATE OR REPLACE FUNCTION generate_requisition_number(p_company_id uuid)
RETURNS text AS $$
DECLARE
  v_count integer;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count FROM job_requisitions
  WHERE company_id = p_company_id AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  RETURN 'REQ-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;