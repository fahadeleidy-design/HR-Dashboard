/*
  # Comprehensive Learning Management System (LMS) - Fixed

  ## Overview
  Advanced LMS features with proper RLS policies
*/

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

DO $$ BEGIN
  CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE course_format AS ENUM ('self_paced', 'instructor_led', 'blended', 'workshop', 'webinar');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('video', 'document', 'presentation', 'audio', 'interactive', 'scorm', 'external_link', 'quiz', 'assignment');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE compliance_status AS ENUM ('not_started', 'in_progress', 'completed', 'expired', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'essay', 'fill_in_blank', 'matching', 'ordering', 'hotspot');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES course_categories(id) ON DELETE SET NULL,
  icon text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  course_code text UNIQUE NOT NULL,
  title text NOT NULL,
  short_description text,
  full_description text,
  category_id uuid REFERENCES course_categories(id) ON DELETE SET NULL,
  level course_level DEFAULT 'beginner',
  format course_format DEFAULT 'self_paced',
  estimated_duration_minutes integer,
  language text DEFAULT 'en',
  thumbnail_url text,
  trailer_video_url text,
  instructor_names text[],
  instructor_ids uuid[],
  has_prerequisites boolean DEFAULT false,
  max_enrollments integer,
  enrollment_start_date date,
  enrollment_end_date date,
  is_paid boolean DEFAULT false,
  price numeric(10,2),
  currency text,
  awards_certificate boolean DEFAULT false,
  certificate_template_id uuid,
  certificate_validity_days integer,
  cpd_credits numeric(4,2),
  cpe_credits numeric(4,2),
  is_published boolean DEFAULT false,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public boolean DEFAULT true,
  restricted_to_departments uuid[],
  restricted_to_roles text[],
  is_active boolean DEFAULT true,
  learning_objectives text[],
  target_audience text,
  prerequisites_description text,
  completion_criteria text,
  total_enrollments integer DEFAULT 0,
  total_completions integer DEFAULT 0,
  average_rating numeric(3,2),
  total_reviews integer DEFAULT 0,
  version integer DEFAULT 1,
  previous_version_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name text UNIQUE NOT NULL,
  tag_color text,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_tag_mappings (
  course_id uuid REFERENCES course_catalog(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES course_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, tag_id)
);

CREATE TABLE IF NOT EXISTS course_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES course_catalog(id) ON DELETE CASCADE NOT NULL,
  prerequisite_course_id uuid REFERENCES course_catalog(id) ON DELETE CASCADE NOT NULL,
  is_mandatory boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  path_code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  estimated_duration_hours integer,
  difficulty_level course_level DEFAULT 'beginner',
  thumbnail_url text,
  completion_criteria text,
  minimum_completion_percentage integer,
  awards_certificate boolean DEFAULT false,
  is_public boolean DEFAULT true,
  is_active boolean DEFAULT true,
  total_enrollments integer DEFAULT 0,
  total_completions integer DEFAULT 0,
  average_completion_days integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_path_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id uuid REFERENCES learning_paths(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES course_catalog(id) ON DELETE CASCADE NOT NULL,
  sequence_order integer NOT NULL,
  is_mandatory boolean DEFAULT true,
  requires_previous_completion boolean DEFAULT true,
  unlock_after_days integer,
  unlock_after_course_id uuid REFERENCES course_catalog(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(learning_path_id, course_id)
);

CREATE TABLE IF NOT EXISTS learning_path_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id uuid REFERENCES learning_paths(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  enrolled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_completion_date date,
  actual_completion_date date,
  status text DEFAULT 'in_progress',
  progress_percentage integer DEFAULT 0,
  completed_courses_count integer DEFAULT 0,
  total_courses_count integer,
  certificate_issued boolean DEFAULT false,
  certificate_url text,
  certificate_issued_at timestamptz,
  notes text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(learning_path_id, employee_id)
);

CREATE TABLE IF NOT EXISTS compliance_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  requirement_code text NOT NULL,
  title text NOT NULL,
  description text,
  requirement_type text,
  course_id uuid REFERENCES course_catalog(id) ON DELETE SET NULL,
  learning_path_id uuid REFERENCES learning_paths(id) ON DELETE SET NULL,
  is_recurring boolean DEFAULT false,
  recurrence_frequency_days integer,
  grace_period_days integer DEFAULT 30,
  applies_to_all boolean DEFAULT false,
  applies_to_departments uuid[],
  applies_to_roles text[],
  applies_to_locations text[],
  pass_score_required integer,
  attempts_allowed integer,
  is_active boolean DEFAULT true,
  effective_from date,
  effective_until date,
  regulatory_body text,
  regulation_reference text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_requirement_id uuid REFERENCES compliance_requirements(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date NOT NULL,
  completed_at timestamptz,
  completion_status compliance_status DEFAULT 'not_started',
  certificate_issued_at timestamptz,
  certificate_expiry_date date,
  certificate_url text,
  reminder_sent boolean DEFAULT false,
  last_reminder_sent_at timestamptz,
  notes text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(compliance_requirement_id, employee_id)
);

CREATE TABLE IF NOT EXISTS assessment_question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type question_type NOT NULL,
  options jsonb,
  correct_answer text,
  correct_answers text[],
  points numeric(5,2) DEFAULT 1,
  explanation text,
  image_url text,
  video_url text,
  category text,
  difficulty_level course_level DEFAULT 'beginner',
  tags text[],
  times_used integer DEFAULT 0,
  average_score numeric(5,2),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  description text,
  total_questions integer,
  passing_score integer NOT NULL,
  time_limit_minutes integer,
  randomize_questions boolean DEFAULT false,
  randomize_options boolean DEFAULT false,
  questions_from_bank boolean DEFAULT false,
  max_attempts integer DEFAULT 3,
  cooldown_period_hours integer,
  show_correct_answers boolean DEFAULT true,
  show_answers_after_submission boolean DEFAULT true,
  questions jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_module_id uuid,
  assessment_template_id uuid REFERENCES assessment_templates(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  attempt_number integer NOT NULL,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  responses jsonb,
  total_questions integer,
  correct_answers integer,
  score_percentage numeric(5,2),
  passing_score integer,
  passed boolean,
  time_spent_minutes integer,
  status text DEFAULT 'in_progress',
  graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_at timestamptz,
  grader_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_type text NOT NULL,
  api_key text,
  api_secret text,
  api_endpoint text,
  oauth_token text,
  oauth_refresh_token text,
  oauth_expires_at timestamptz,
  auto_sync boolean DEFAULT false,
  sync_frequency_hours integer,
  last_synced_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES external_content_sources(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES course_catalog(id) ON DELETE CASCADE,
  external_id text,
  external_url text NOT NULL,
  title text NOT NULL,
  description text,
  content_type content_type,
  duration_minutes integer,
  embed_code text,
  can_embed boolean DEFAULT true,
  tracks_completion boolean DEFAULT false,
  completion_webhook_url text,
  is_available boolean DEFAULT true,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  analytics_date date NOT NULL,
  department_id uuid,
  role text,
  location text,
  active_learners integer DEFAULT 0,
  new_enrollments integer DEFAULT 0,
  course_completions integer DEFAULT 0,
  average_completion_rate numeric(5,2),
  average_assessment_score numeric(5,2),
  total_learning_hours numeric(10,2),
  average_time_per_learner_minutes integer,
  courses_per_learner numeric(5,2),
  compliance_completion_rate numeric(5,2),
  overdue_compliance_count integer,
  most_enrolled_courses jsonb,
  highest_rated_courses jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learner_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  course_id uuid REFERENCES course_catalog(id) ON DELETE CASCADE,
  training_module_id uuid,
  activity_data jsonb,
  duration_minutes integer,
  completion_percentage integer,
  ip_address text,
  user_agent text,
  device_type text,
  activity_timestamp timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_ratings_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES course_catalog(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  review_title text,
  review_text text,
  content_quality integer CHECK (content_quality BETWEEN 1 AND 5),
  instructor_quality integer CHECK (instructor_quality BETWEEN 1 AND 5),
  relevance integer CHECK (relevance BETWEEN 1 AND 5),
  is_approved boolean DEFAULT true,
  moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id, employee_id)
);

CREATE TABLE IF NOT EXISTS learning_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES course_catalog(id) ON DELETE CASCADE NOT NULL,
  recommendation_type text,
  confidence_score numeric(3,2),
  reason text,
  is_active boolean DEFAULT true,
  dismissed_at timestamptz,
  enrolled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_course_categories_parent ON course_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_course_catalog_company ON course_catalog(company_id);
CREATE INDEX IF NOT EXISTS idx_course_catalog_category ON course_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_course_catalog_published ON course_catalog(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_course_tag_mappings_course ON course_tag_mappings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course ON course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_company ON learning_paths(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_path ON learning_path_courses(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_enrollments_path ON learning_path_enrollments(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_enrollments_employee ON learning_path_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_company ON compliance_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assignments_requirement ON compliance_assignments(compliance_requirement_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assignments_employee ON compliance_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assessment_question_bank_company ON assessment_question_bank(company_id);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_company ON assessment_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_employee ON assessment_attempts(employee_id);
CREATE INDEX IF NOT EXISTS idx_external_content_sources_company ON external_content_sources(company_id);
CREATE INDEX IF NOT EXISTS idx_external_content_items_source ON external_content_items(source_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_company ON learning_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_learner_activity_log_employee ON learner_activity_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_reviews_course ON course_ratings_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_recommendations_employee ON learning_recommendations(employee_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_tag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_ratings_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON course_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON course_categories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Anyone can view tags" ON course_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tags" ON course_tags FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Anyone can view tag mappings" ON course_tag_mappings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view published courses" ON course_catalog FOR SELECT TO authenticated USING (is_published = true OR company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage courses" ON course_catalog FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = course_catalog.company_id AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view prerequisites" ON course_prerequisites FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view learning paths" ON learning_paths FOR SELECT TO authenticated USING (is_public = true OR company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage learning paths" ON learning_paths FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = learning_paths.company_id AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view path courses" ON learning_path_courses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view enrollments" ON learning_path_enrollments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = learning_path_enrollments.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "Admins can manage enrollments" ON learning_path_enrollments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = learning_path_enrollments.employee_id AND ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view compliance" ON compliance_requirements FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage compliance" ON compliance_requirements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = compliance_requirements.company_id AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view assignments" ON compliance_assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = compliance_assignments.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "Admins can manage assignments" ON compliance_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = compliance_assignments.employee_id AND ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view question bank" ON assessment_question_bank FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()) OR company_id IS NULL);
CREATE POLICY "Admins can manage questions" ON assessment_question_bank FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (company_id = assessment_question_bank.company_id OR assessment_question_bank.company_id IS NULL) AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view templates" ON assessment_templates FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage templates" ON assessment_templates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = assessment_templates.company_id AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view attempts" ON assessment_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = assessment_attempts.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "Employees can create attempts" ON assessment_attempts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = assessment_attempts.employee_id AND ur.user_id = auth.uid()));

CREATE POLICY "Users can view external sources" ON external_content_sources FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage external sources" ON external_content_sources FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = external_content_sources.company_id AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "Users can view external content" ON external_content_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view analytics" ON learning_analytics FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "System can insert analytics" ON learning_analytics FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view activity" ON learner_activity_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = learner_activity_log.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "Employees can log activity" ON learner_activity_log FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = learner_activity_log.employee_id AND ur.user_id = auth.uid()));

CREATE POLICY "Users can view reviews" ON course_ratings_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employees can create reviews" ON course_ratings_reviews FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = course_ratings_reviews.employee_id AND ur.user_id = auth.uid()));

CREATE POLICY "Users can view recommendations" ON learning_recommendations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = learning_recommendations.employee_id AND ur.user_id = auth.uid()));

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_lms_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_course_catalog_timestamp BEFORE UPDATE ON course_catalog FOR EACH ROW EXECUTE FUNCTION update_lms_timestamp();
CREATE TRIGGER update_learning_paths_timestamp BEFORE UPDATE ON learning_paths FOR EACH ROW EXECUTE FUNCTION update_lms_timestamp();
CREATE TRIGGER update_compliance_requirements_timestamp BEFORE UPDATE ON compliance_requirements FOR EACH ROW EXECUTE FUNCTION update_lms_timestamp();
CREATE TRIGGER update_external_content_sources_timestamp BEFORE UPDATE ON external_content_sources FOR EACH ROW EXECUTE FUNCTION update_lms_timestamp();

CREATE OR REPLACE FUNCTION update_course_rating_average()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE course_catalog
  SET 
    average_rating = (
      SELECT AVG(rating)::numeric(3,2)
      FROM course_ratings_reviews
      WHERE course_id = NEW.course_id AND is_approved = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM course_ratings_reviews
      WHERE course_id = NEW.course_id AND is_approved = true
    )
  WHERE id = NEW.course_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_course_rating_on_review
  AFTER INSERT OR UPDATE ON course_ratings_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_course_rating_average();
