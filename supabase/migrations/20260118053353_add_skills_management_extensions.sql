/*
  # Skills Management Extensions

  Extends existing skills tables with:
  - Centralized skills catalog
  - Skills categories
  - Gap analysis
  - Development plans
  - Role requirements
*/

-- =====================================================
-- SKILL CATEGORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS skill_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_category_id uuid,
  icon text,
  color text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skill_categories ADD CONSTRAINT fk_skill_category_parent 
  FOREIGN KEY (parent_category_id) REFERENCES skill_categories(id) ON DELETE SET NULL;

-- =====================================================
-- SKILLS CATALOG
-- =====================================================

CREATE TABLE IF NOT EXISTS skills_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  skill_code text UNIQUE NOT NULL,
  skill_name text NOT NULL,
  description text,
  category_id uuid REFERENCES skill_categories(id) ON DELETE SET NULL,
  skill_type text DEFAULT 'technical',
  is_core_skill boolean DEFAULT false,
  is_certifiable boolean DEFAULT false,
  certification_body text,
  industry_standard boolean DEFAULT false,
  keywords text[],
  total_employees integer DEFAULT 0,
  average_proficiency numeric(3,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_catalog_company ON skills_catalog(company_id);
CREATE INDEX IF NOT EXISTS idx_skills_catalog_category ON skills_catalog(category_id);

-- =====================================================
-- ROLE SKILL REQUIREMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS role_skill_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  job_title text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  required_proficiency text NOT NULL,
  is_mandatory boolean DEFAULT true,
  importance integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_skill_req_company ON role_skill_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_role_skill_req_title ON role_skill_requirements(job_title);

-- =====================================================
-- SKILL DEVELOPMENT PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS skill_development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  current_level text,
  target_level text NOT NULL,
  priority text DEFAULT 'medium',
  start_date date DEFAULT CURRENT_DATE,
  target_completion_date date NOT NULL,
  actual_completion_date date,
  learning_activities jsonb,
  progress_percentage integer DEFAULT 0,
  status text DEFAULT 'planned',
  notes text,
  manager_comments text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_dev_plans_employee ON skill_development_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_dev_plans_status ON skill_development_plans(status);

-- =====================================================
-- SKILL GAP ANALYSIS
-- =====================================================

CREATE TABLE IF NOT EXISTS skill_gap_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  analysis_name text NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  job_title text,
  skill_name text NOT NULL,
  current_level text,
  required_level text NOT NULL,
  gap_size integer,
  priority text DEFAULT 'medium',
  gap_status text DEFAULT 'open',
  recommended_actions text[],
  analysis_date date DEFAULT CURRENT_DATE,
  target_close_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_gap_company ON skill_gap_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_skill_gap_employee ON skill_gap_analysis(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_gap_priority ON skill_gap_analysis(priority);

-- =====================================================
-- SKILL ENDORSEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS skill_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  endorser_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  endorser_relationship text,
  endorsed_proficiency text,
  endorsement_comment text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_endorsements_employee ON skill_endorsements(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_endorser ON skill_endorsements(endorser_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_skill_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_gap_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skill categories" ON skill_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage categories" ON skill_categories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "View skills catalog" ON skills_catalog FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()) OR company_id IS NULL);
CREATE POLICY "Admins manage skills catalog" ON skills_catalog FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND (company_id = skills_catalog.company_id OR skills_catalog.company_id IS NULL) AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "View role requirements" ON role_skill_requirements FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage role requirements" ON role_skill_requirements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = role_skill_requirements.company_id AND role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "View development plans" ON skill_development_plans FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Manage development plans" ON skill_development_plans FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = skill_development_plans.company_id AND role IN ('super_admin', 'admin', 'hr_manager', 'manager', 'employee')));

CREATE POLICY "View gap analysis" ON skill_gap_analysis FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Managers manage gap analysis" ON skill_gap_analysis FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND company_id = skill_gap_analysis.company_id AND role IN ('super_admin', 'admin', 'hr_manager', 'manager')));

CREATE POLICY "View endorsements" ON skill_endorsements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = skill_endorsements.employee_id AND ur.user_id = auth.uid()));
CREATE POLICY "Create endorsements" ON skill_endorsements FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM employees e INNER JOIN user_roles ur ON ur.company_id = e.company_id WHERE e.id = skill_endorsements.endorser_id AND ur.user_id = auth.uid()));

-- =====================================================
-- SEED DATA
-- =====================================================

INSERT INTO skill_categories (name, description, icon, color, display_order) VALUES
  ('Technical Skills', 'Software, IT, and technical competencies', '💻', '#3B82F6', 1),
  ('Leadership', 'Leadership and management capabilities', '👔', '#8B5CF6', 2),
  ('Communication', 'Communication and interpersonal skills', '💬', '#10B981', 3),
  ('Business', 'Business acumen and domain knowledge', '💼', '#F59E0B', 4),
  ('Creative', 'Design, creativity, and innovation', '🎨', '#EC4899', 5),
  ('Analytical', 'Data analysis and problem-solving', '📊', '#06B6D4', 6)
ON CONFLICT DO NOTHING;
