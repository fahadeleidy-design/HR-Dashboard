/*
  # Advanced Employee Management Features

  ## Overview
  Additional enterprise features for comprehensive employee management

  ## New Tables

  ### employee_documents
  Document management with categories and versioning

  ### employee_notes
  Manager notes and observations

  ### employee_succession_planning
  Succession planning and backup identification

  ### employee_time_tracking
  Time and attendance tracking

  ### employee_projects
  Project assignments and history

  ### employee_training_records
  Training completion and certifications

  ### employee_surveys
  Employee engagement and satisfaction surveys

  ### employee_referrals
  Employee referral program

  ### employee_exit_surveys
  Exit survey responses

  ### employee_rehire_requests
  Rehire application tracking

  ## Automation & Intelligence
  - Auto-notifications
  - Smart recommendations
  - Predictive analytics
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- EMPLOYEE DOCUMENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  document_type text NOT NULL CHECK (document_type IN (
    'id_proof', 'passport', 'visa', 'iqama', 'contract', 
    'resume', 'certificate', 'offer_letter', 'termination_letter',
    'performance_review', 'warning_letter', 'other'
  )),
  
  document_name text NOT NULL,
  document_category text,
  
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  
  version integer DEFAULT 1,
  is_current_version boolean DEFAULT true,
  
  issue_date date,
  expiry_date date,
  
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  is_sensitive boolean DEFAULT false,
  requires_signature boolean DEFAULT false,
  is_signed boolean DEFAULT false,
  signed_date date,
  
  notes text,
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE NOTES
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  note_type text CHECK (note_type IN ('general', 'performance', 'behavior', 'development', 'confidential')),
  
  title text,
  content text NOT NULL,
  
  is_private boolean DEFAULT false,
  is_flagged boolean DEFAULT false,
  
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE SUCCESSION PLANNING
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_succession_planning (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  critical_position text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  
  current_incumbent_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  
  successor_1_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  successor_1_readiness text CHECK (successor_1_readiness IN ('ready_now', 'ready_1year', 'ready_2years', 'ready_3plus')),
  successor_1_development_plan text,
  
  successor_2_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  successor_2_readiness text CHECK (successor_2_readiness IN ('ready_now', 'ready_1year', 'ready_2years', 'ready_3plus')),
  successor_2_development_plan text,
  
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  last_reviewed_date date,
  next_review_date date,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE TIME TRACKING
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_time_tracking (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  date date NOT NULL,
  
  clock_in timestamptz,
  clock_out timestamptz,
  
  break_start timestamptz,
  break_end timestamptz,
  
  total_hours decimal(5,2),
  regular_hours decimal(5,2),
  overtime_hours decimal(5,2),
  break_hours decimal(5,2),
  
  work_location text,
  is_remote boolean DEFAULT false,
  
  status text DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, date)
);

-- =====================================================================
-- EMPLOYEE PROJECTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  project_name text NOT NULL,
  project_code text,
  
  role text NOT NULL,
  allocation_percentage integer CHECK (allocation_percentage BETWEEN 1 AND 100),
  
  start_date date NOT NULL,
  end_date date,
  
  project_status text CHECK (project_status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  
  billable boolean DEFAULT false,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE TRAINING RECORDS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_training_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  training_name text NOT NULL,
  training_type text CHECK (training_type IN ('onboarding', 'technical', 'soft_skills', 'compliance', 'leadership', 'other')),
  
  training_provider text,
  
  start_date date NOT NULL,
  end_date date,
  
  duration_hours decimal(5,2),
  
  completion_status text DEFAULT 'enrolled' CHECK (completion_status IN ('enrolled', 'in_progress', 'completed', 'failed', 'cancelled')),
  completion_date date,
  
  score decimal(5,2),
  passing_score decimal(5,2),
  
  certificate_issued boolean DEFAULT false,
  certificate_url text,
  
  cost decimal(10,2),
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE SURVEYS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_surveys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  survey_name text NOT NULL,
  survey_type text CHECK (survey_type IN ('engagement', 'satisfaction', 'pulse', 'onboarding', 'exit', 'custom')),
  
  description text,
  
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  is_anonymous boolean DEFAULT true,
  is_active boolean DEFAULT true,
  
  questions jsonb NOT NULL DEFAULT '[]',
  
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_survey_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id uuid NOT NULL REFERENCES employee_surveys(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  responses jsonb NOT NULL DEFAULT '{}',
  
  completed_at timestamptz DEFAULT now(),
  
  UNIQUE(survey_id, employee_id)
);

-- =====================================================================
-- EMPLOYEE REFERRALS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  candidate_name text NOT NULL,
  candidate_email text NOT NULL,
  candidate_phone text,
  
  position_applied text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  
  resume_url text,
  
  status text DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'screening', 'interviewing', 'offer_made', 
    'hired', 'rejected', 'withdrawn'
  )),
  
  hired_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  hired_date date,
  
  bonus_amount decimal(10,2),
  bonus_paid boolean DEFAULT false,
  bonus_paid_date date,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE EXIT SURVEYS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_exit_surveys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  exit_reason text NOT NULL,
  
  overall_experience_rating integer CHECK (overall_experience_rating BETWEEN 1 AND 5),
  
  would_recommend boolean,
  would_return boolean,
  
  liked_most text,
  liked_least text,
  suggestions text,
  
  manager_feedback text,
  work_environment_feedback text,
  compensation_feedback text,
  
  new_employer_industry text,
  new_role text,
  
  responses jsonb DEFAULT '{}',
  
  completed_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE REHIRE REQUESTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_rehire_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  former_employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  
  position_applied text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  
  reason_for_return text NOT NULL,
  
  previous_exit_reason text,
  previous_exit_date date,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'hired')),
  
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_date date,
  review_notes text,
  
  rehire_date date,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- EMPLOYEE ANALYTICS SUMMARY
-- =====================================================================

CREATE TABLE IF NOT EXISTS employee_analytics_summary (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  
  total_employees integer DEFAULT 0,
  active_employees integer DEFAULT 0,
  new_hires integer DEFAULT 0,
  terminations integer DEFAULT 0,
  
  turnover_rate decimal(5,2),
  
  avg_tenure_months integer,
  avg_age integer,
  
  gender_distribution jsonb DEFAULT '{}',
  nationality_distribution jsonb DEFAULT '{}',
  department_distribution jsonb DEFAULT '{}',
  
  promotion_count integer DEFAULT 0,
  transfer_count integer DEFAULT 0,
  
  training_hours_total decimal(10,2) DEFAULT 0,
  avg_training_hours decimal(5,2) DEFAULT 0,
  
  calculated_at timestamptz DEFAULT now(),
  
  UNIQUE(company_id, period_year, period_month)
);

-- =====================================================================
-- INDEXES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry ON employee_documents(expiry_date);

CREATE INDEX IF NOT EXISTS idx_employee_notes_employee ON employee_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_type ON employee_notes(note_type);

CREATE INDEX IF NOT EXISTS idx_employee_succession_position ON employee_succession_planning(critical_position);
CREATE INDEX IF NOT EXISTS idx_employee_succession_incumbent ON employee_succession_planning(current_incumbent_id);

CREATE INDEX IF NOT EXISTS idx_employee_time_tracking_employee_date ON employee_time_tracking(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employee_time_tracking_date ON employee_time_tracking(date);

CREATE INDEX IF NOT EXISTS idx_employee_projects_employee ON employee_projects(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_projects_status ON employee_projects(project_status);

CREATE INDEX IF NOT EXISTS idx_employee_training_employee ON employee_training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_training_status ON employee_training_records(completion_status);

CREATE INDEX IF NOT EXISTS idx_employee_survey_responses_survey ON employee_survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_employee_survey_responses_employee ON employee_survey_responses(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_referrals_referrer ON employee_referrals(referrer_employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_status ON employee_referrals(status);

CREATE INDEX IF NOT EXISTS idx_employee_exit_surveys_employee ON employee_exit_surveys(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_rehire_former_employee ON employee_rehire_requests(former_employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_rehire_status ON employee_rehire_requests(status);

CREATE INDEX IF NOT EXISTS idx_employee_analytics_company_period ON employee_analytics_summary(company_id, period_year, period_month);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_succession_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_exit_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_rehire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Company-based policies
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'employee_documents',
      'employee_notes',
      'employee_succession_planning',
      'employee_time_tracking',
      'employee_projects',
      'employee_training_records',
      'employee_referrals',
      'employee_exit_surveys',
      'employee_rehire_requests',
      'employee_analytics_summary'
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

-- Surveys
CREATE POLICY "Users can view active surveys"
  ON employee_surveys FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    ) AND is_active = true
  );

CREATE POLICY "Users can submit survey responses"
  ON employee_survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Employees can view their own documents
CREATE POLICY "Employees can view own documents"
  ON employee_documents FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Employees can view their own time tracking
CREATE POLICY "Employees can view own time tracking"
  ON employee_time_tracking FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- =====================================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================================

-- Auto-calculate time tracking hours
CREATE OR REPLACE FUNCTION calculate_time_tracking_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
    
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      NEW.break_hours := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 3600;
      NEW.total_hours := NEW.total_hours - NEW.break_hours;
    END IF;
    
    IF NEW.total_hours > 8 THEN
      NEW.regular_hours := 8;
      NEW.overtime_hours := NEW.total_hours - 8;
    ELSE
      NEW.regular_hours := NEW.total_hours;
      NEW.overtime_hours := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_time_tracking_hours
  BEFORE INSERT OR UPDATE ON employee_time_tracking
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_tracking_hours();

-- Auto-update document version
CREATE OR REPLACE FUNCTION manage_document_versions()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE employee_documents
    SET is_current_version = false
    WHERE employee_id = NEW.employee_id
      AND document_type = NEW.document_type
      AND id != NEW.id
      AND is_current_version = true;
      
    NEW.version := COALESCE(
      (SELECT MAX(version) + 1 
       FROM employee_documents 
       WHERE employee_id = NEW.employee_id 
       AND document_type = NEW.document_type),
      1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manage_document_versions
  BEFORE INSERT ON employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION manage_document_versions();

-- Generate employee analytics
CREATE OR REPLACE FUNCTION generate_employee_analytics(p_company_id uuid, p_year integer, p_month integer)
RETURNS void AS $$
DECLARE
  v_start_date date;
  v_end_date date;
BEGIN
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;
  
  INSERT INTO employee_analytics_summary (
    company_id, period_year, period_month,
    total_employees, active_employees, new_hires, terminations,
    avg_tenure_months
  )
  SELECT
    p_company_id,
    p_year,
    p_month,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE hire_date >= v_start_date AND hire_date <= v_end_date),
    COUNT(*) FILTER (WHERE termination_date >= v_start_date AND termination_date <= v_end_date),
    AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, hire_date)) * 12 + 
        EXTRACT(MONTH FROM age(CURRENT_DATE, hire_date)))::integer
  FROM employees
  WHERE company_id = p_company_id
  ON CONFLICT (company_id, period_year, period_month)
  DO UPDATE SET
    total_employees = EXCLUDED.total_employees,
    active_employees = EXCLUDED.active_employees,
    new_hires = EXCLUDED.new_hires,
    terminations = EXCLUDED.terminations,
    avg_tenure_months = EXCLUDED.avg_tenure_months,
    calculated_at = now();
END;
$$ LANGUAGE plpgsql;
