/*
  # Candidate Screening System

  1. New Tables
    - `screening_criteria`
      - Defines evaluation criteria for screening candidates
      - Weighted scoring system
      
    - `candidate_screenings`
      - Main screening records linking candidates to evaluations
      - Overall scores and recommendations
      
    - `screening_evaluations`
      - Individual criteria scores for each screening

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated HR users
*/

-- =====================================================================
-- SCREENING CRITERIA TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS screening_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  criteria_name text NOT NULL,
  description text,
  criteria_type text NOT NULL CHECK (criteria_type IN ('rating', 'boolean', 'text', 'score')),
  weight integer DEFAULT 5 CHECK (weight BETWEEN 1 AND 10),
  
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screening_criteria_company ON screening_criteria(company_id);
CREATE INDEX IF NOT EXISTS idx_screening_criteria_active ON screening_criteria(company_id, is_active);

ALTER TABLE screening_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company screening criteria"
  ON screening_criteria FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage screening criteria"
  ON screening_criteria FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- =====================================================================
-- CANDIDATE SCREENINGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS candidate_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  job_posting_id uuid REFERENCES job_postings(id) ON DELETE SET NULL,
  
  screened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  screening_status text DEFAULT 'pending' CHECK (screening_status IN (
    'pending', 'in_progress', 'passed', 'failed', 'on_hold'
  )),
  
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  calculated_score decimal(5,2),
  
  screening_notes text,
  strengths text,
  weaknesses text,
  
  screened_at timestamptz,
  recommendation text CHECK (recommendation IN (
    'reject', 'interview', 'fast_track', 'further_review'
  )),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(candidate_id, job_posting_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_screenings_company ON candidate_screenings(company_id);
CREATE INDEX IF NOT EXISTS idx_candidate_screenings_candidate ON candidate_screenings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_screenings_posting ON candidate_screenings(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_candidate_screenings_status ON candidate_screenings(company_id, screening_status);

ALTER TABLE candidate_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company screenings"
  ON candidate_screenings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage screenings"
  ON candidate_screenings FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager', 'hr_specialist')
    )
  );

-- =====================================================================
-- SCREENING EVALUATIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS screening_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid REFERENCES candidate_screenings(id) ON DELETE CASCADE NOT NULL,
  criteria_id uuid REFERENCES screening_criteria(id) ON DELETE CASCADE NOT NULL,
  
  score integer CHECK (score BETWEEN 0 AND 10),
  rating text CHECK (rating IN ('poor', 'fair', 'good', 'excellent', 'outstanding')),
  meets_requirement boolean,
  
  evaluator_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(screening_id, criteria_id)
);

CREATE INDEX IF NOT EXISTS idx_screening_evaluations_screening ON screening_evaluations(screening_id);
CREATE INDEX IF NOT EXISTS idx_screening_evaluations_criteria ON screening_evaluations(criteria_id);

ALTER TABLE screening_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view screening evaluations"
  ON screening_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidate_screenings cs
      JOIN user_roles ur ON ur.company_id = cs.company_id
      WHERE cs.id = screening_id AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage evaluations"
  ON screening_evaluations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM candidate_screenings cs
      JOIN user_roles ur ON ur.company_id = cs.company_id
      WHERE cs.id = screening_id 
      AND ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr_manager', 'hr_specialist')
    )
  );

-- =====================================================================
-- SEED DEFAULT SCREENING CRITERIA
-- =====================================================================
INSERT INTO screening_criteria (company_id, criteria_name, description, criteria_type, weight, is_required, display_order)
SELECT 
  c.id,
  'Education Match',
  'Does the candidate meet the education requirements?',
  'rating',
  8,
  true,
  1
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM screening_criteria WHERE company_id = c.id AND criteria_name = 'Education Match'
);

INSERT INTO screening_criteria (company_id, criteria_name, description, criteria_type, weight, is_required, display_order)
SELECT 
  c.id,
  'Experience Level',
  'Does the candidate have sufficient relevant experience?',
  'rating',
  9,
  true,
  2
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM screening_criteria WHERE company_id = c.id AND criteria_name = 'Experience Level'
);

INSERT INTO screening_criteria (company_id, criteria_name, description, criteria_type, weight, is_required, display_order)
SELECT 
  c.id,
  'Skills Match',
  'Does the candidate possess required technical skills?',
  'rating',
  9,
  true,
  3
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM screening_criteria WHERE company_id = c.id AND criteria_name = 'Skills Match'
);

INSERT INTO screening_criteria (company_id, criteria_name, description, criteria_type, weight, is_required, display_order)
SELECT 
  c.id,
  'Communication Skills',
  'Assessment of written and verbal communication',
  'rating',
  7,
  false,
  4
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM screening_criteria WHERE company_id = c.id AND criteria_name = 'Communication Skills'
);

INSERT INTO screening_criteria (company_id, criteria_name, description, criteria_type, weight, is_required, display_order)
SELECT 
  c.id,
  'Cultural Fit',
  'Alignment with company values and culture',
  'rating',
  6,
  false,
  5
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM screening_criteria WHERE company_id = c.id AND criteria_name = 'Cultural Fit'
);

INSERT INTO screening_criteria (company_id, criteria_name, description, criteria_type, weight, is_required, display_order)
SELECT 
  c.id,
  'Salary Expectations',
  'Are salary expectations within budget?',
  'boolean',
  7,
  false,
  6
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM screening_criteria WHERE company_id = c.id AND criteria_name = 'Salary Expectations'
);

INSERT INTO screening_criteria (company_id, criteria_name, description, criteria_type, weight, is_required, display_order)
SELECT 
  c.id,
  'Availability',
  'Can the candidate start within required timeframe?',
  'boolean',
  6,
  false,
  7
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM screening_criteria WHERE company_id = c.id AND criteria_name = 'Availability'
);
