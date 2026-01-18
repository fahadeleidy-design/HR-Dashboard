/*
  # Skills Matching and Certification Tracking

  Adds:
  1. Skill-based matching for projects, mentorship, and teams
  2. Extended certification tracking with expiry and renewal management
  3. Learning resources for skills (complements existing LMS)
*/

-- =====================================================
-- SKILL-FOCUSED LEARNING RESOURCES
-- =====================================================

CREATE TABLE IF NOT EXISTS skill_learning_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  resource_title text NOT NULL,
  resource_type text NOT NULL,
  provider text,
  description text,
  resource_url text,
  target_skills text[] NOT NULL,
  skill_level text,
  duration_hours numeric(5,1),
  cost numeric(10,2),
  is_free boolean DEFAULT false,
  rating numeric(2,1),
  is_available boolean DEFAULT true,
  external_resource boolean DEFAULT false,
  tags text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_learning_resources_company ON skill_learning_resources(company_id);
CREATE INDEX IF NOT EXISTS idx_skill_learning_resources_skills ON skill_learning_resources USING GIN(target_skills);

-- =====================================================
-- CERTIFICATIONS CATALOG
-- =====================================================

CREATE TABLE IF NOT EXISTS certifications_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_name text NOT NULL,
  certification_code text UNIQUE NOT NULL,
  issuing_organization text NOT NULL,
  description text,
  related_skills text[],
  skill_category text,
  prerequisites text[],
  exam_required boolean DEFAULT true,
  experience_required_years integer,
  has_expiry boolean DEFAULT false,
  validity_period_months integer,
  renewal_required boolean DEFAULT false,
  continuing_education_required boolean DEFAULT false,
  ce_hours_required integer,
  certification_cost numeric(10,2),
  renewal_cost numeric(10,2),
  difficulty_level text,
  certification_url text,
  exam_provider text,
  industry_standard boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certifications_catalog_org ON certifications_catalog(issuing_organization);
CREATE INDEX IF NOT EXISTS idx_certifications_catalog_skills ON certifications_catalog USING GIN(related_skills);

-- Update employee_certifications if exists, or create if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'certification_id') THEN
    ALTER TABLE employee_certifications ADD COLUMN certification_id uuid REFERENCES certifications_catalog(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'certification_number') THEN
    ALTER TABLE employee_certifications ADD COLUMN certification_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'expiry_date') THEN
    ALTER TABLE employee_certifications ADD COLUMN expiry_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'last_renewed_date') THEN
    ALTER TABLE employee_certifications ADD COLUMN last_renewed_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'status') THEN
    ALTER TABLE employee_certifications ADD COLUMN status text DEFAULT 'active';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'renewal_required') THEN
    ALTER TABLE employee_certifications ADD COLUMN renewal_required boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'renewal_reminder_sent') THEN
    ALTER TABLE employee_certifications ADD COLUMN renewal_reminder_sent boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'ce_hours_completed') THEN
    ALTER TABLE employee_certifications ADD COLUMN ce_hours_completed numeric(5,1) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'ce_hours_required') THEN
    ALTER TABLE employee_certifications ADD COLUMN ce_hours_required numeric(5,1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'cost_paid') THEN
    ALTER TABLE employee_certifications ADD COLUMN cost_paid numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_certifications' AND column_name = 'reimbursed') THEN
    ALTER TABLE employee_certifications ADD COLUMN reimbursed boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_certifications_cert ON employee_certifications(certification_id);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_status ON employee_certifications(status);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiry ON employee_certifications(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================================================
-- CERTIFICATION RENEWALS
-- =====================================================

CREATE TABLE IF NOT EXISTS certification_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_certification_id uuid REFERENCES employee_certifications(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  renewal_date date NOT NULL,
  new_expiry_date date,
  renewal_type text,
  exam_passed boolean,
  ce_hours_completed numeric(5,1),
  payment_completed boolean DEFAULT false,
  renewal_cost numeric(10,2),
  status text DEFAULT 'pending',
  renewal_certificate_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_certification_renewals_employee ON certification_renewals(employee_id);
CREATE INDEX IF NOT EXISTS idx_certification_renewals_cert ON certification_renewals(employee_certification_id);

-- =====================================================
-- SKILL MATCHING REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS skill_matching_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  request_type text NOT NULL,
  request_title text NOT NULL,
  description text,
  required_skills jsonb NOT NULL,
  optional_skills jsonb,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  needed_by_date date,
  duration_weeks integer,
  commitment_hours_per_week numeric(4,1),
  status text DEFAULT 'open',
  matches_count integer DEFAULT 0,
  best_match_score numeric(3,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_matching_requests_company ON skill_matching_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_skill_matching_requests_type ON skill_matching_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_skill_matching_requests_status ON skill_matching_requests(status);

-- =====================================================
-- SKILL MATCHES
-- =====================================================

CREATE TABLE IF NOT EXISTS skill_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES skill_matching_requests(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  overall_match_score numeric(3,2) NOT NULL,
  required_skills_score numeric(3,2),
  optional_skills_score numeric(3,2),
  matched_skills jsonb,
  missing_skills jsonb,
  exceeding_skills jsonb,
  is_available boolean DEFAULT true,
  availability_notes text,
  status text DEFAULT 'suggested',
  interest_expressed_date timestamptz,
  selected_date timestamptz,
  declined_reason text,
  employee_response text,
  manager_approval_required boolean DEFAULT false,
  manager_approved boolean,
  manager_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_matches_request ON skill_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_skill_matches_employee ON skill_matches(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_matches_score ON skill_matches(overall_match_score DESC);

-- =====================================================
-- MENTORSHIP PROGRAMS
-- =====================================================

CREATE TABLE IF NOT EXISTS mentorship_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  program_name text NOT NULL,
  program_type text,
  description text,
  focus_skills text[],
  program_category text,
  program_duration_months integer,
  meeting_frequency text,
  expected_hours_per_month numeric(4,1),
  is_active boolean DEFAULT true,
  enrollment_open boolean DEFAULT true,
  start_date date,
  end_date date,
  max_participants integer,
  current_participants integer DEFAULT 0,
  program_manager uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_programs_company ON mentorship_programs(company_id);

CREATE TABLE IF NOT EXISTS mentorship_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES mentorship_programs(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  mentee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  development_skills text[],
  match_score numeric(3,2),
  matching_algorithm text,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'active',
  meetings_held integer DEFAULT 0,
  last_meeting_date date,
  next_meeting_date date,
  mentee_satisfaction integer CHECK (mentee_satisfaction BETWEEN 1 AND 5),
  mentor_satisfaction integer CHECK (mentor_satisfaction BETWEEN 1 AND 5),
  goals_achieved text[],
  skills_developed text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentor ON mentorship_matches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentee ON mentorship_matches(mentee_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE skill_learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_matching_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company skill resources" ON skill_learning_resources FOR SELECT TO authenticated 
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()) OR company_id IS NULL);
CREATE POLICY "Admins manage skill resources" ON skill_learning_resources FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (company_id = skill_learning_resources.company_id OR skill_learning_resources.company_id IS NULL) AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Anyone view certifications catalog" ON certifications_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage certifications catalog" ON certifications_catalog FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users view certification renewals" ON certification_renewals FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = certification_renewals.employee_id AND ur.user_id = auth.uid()));

CREATE POLICY "Users view company matching requests" ON skill_matching_requests FOR SELECT TO authenticated 
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Users create matching requests" ON skill_matching_requests FOR INSERT TO authenticated 
  WITH CHECK (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage matching requests" ON skill_matching_requests FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = skill_matching_requests.company_id AND role IN ('super_admin', 'admin', 'hr_manager', 'manager')));

CREATE POLICY "Users view skill matches" ON skill_matches FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = skill_matches.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "Employees manage own matches" ON skill_matches FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = skill_matches.employee_id AND ur.user_id = auth.uid() AND (ur.role IN ('super_admin', 'admin', 'hr_manager', 'manager') OR e.id = ur.employee_id)));

CREATE POLICY "Users view company mentorship programs" ON mentorship_programs FOR SELECT TO authenticated 
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage mentorship programs" ON mentorship_programs FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = mentorship_programs.company_id AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users view mentorship matches" ON mentorship_matches FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE (e.id = mentorship_matches.mentor_id OR e.id = mentorship_matches.mentee_id) AND ur.user_id = auth.uid()));
CREATE POLICY "Participants update mentorship matches" ON mentorship_matches FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE (e.id = mentorship_matches.mentor_id OR e.id = mentorship_matches.mentee_id) AND ur.user_id = auth.uid()));

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION check_certification_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_cert_expiry_trigger ON employee_certifications;
CREATE TRIGGER check_cert_expiry_trigger BEFORE INSERT OR UPDATE ON employee_certifications 
  FOR EACH ROW EXECUTE FUNCTION check_certification_expiry();
