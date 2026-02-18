/*
  # Organizational Management & Workforce Planning System

  1. New Tables
    - `workforce_plans` - Headcount planning and forecasting data
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key)
      - `plan_name` (text) - Name of the workforce plan
      - `fiscal_year` (integer) - Fiscal year for the plan
      - `plan_type` (text) - growth, restructuring, downsizing, maintenance
      - `status` (text) - draft, active, approved, archived
      - Department headcount targets by quarter
      - Budget allocations
    - `workforce_demand_forecasts` - Demand modeling by department/role
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key)
      - `department` (text) - Target department
      - `job_family` (text) - Job family/role category
      - `forecast_period` (text) - Q1, Q2, Q3, Q4
      - Demand counts and justifications
    - `org_change_requests` - Track reorganizations
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key)
      - `change_type` (text) - reorg, merger, split, new_unit, elimination
      - `affected_units`, `affected_positions` (jsonb)
      - Approval workflow fields
    - `matrix_assignments` - Matrix organization support
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `primary_manager_id`, `secondary_manager_id` (uuid)
      - `project_name`, `allocation_percentage`
    - `job_profiles` - Standardized job descriptions
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key)
      - `profile_code`, `job_title`, `job_family`, `job_level`
      - `summary`, `responsibilities`, `qualifications`, `competencies`
      - Salary range fields

  2. Security
    - RLS enabled on all tables
    - Policies for authenticated users based on company_id and role

  3. Important Notes
    - Uses existing `positions`, `org_structure`, `workforce_scenarios`, `position_budgets` tables
    - Adds new tables for workforce planning, change management, matrix orgs, and job profiles
    - All tables link to companies via company_id
*/

-- Workforce Plans table
CREATE TABLE IF NOT EXISTS workforce_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  fiscal_year integer NOT NULL,
  plan_type text NOT NULL DEFAULT 'growth',
  status text NOT NULL DEFAULT 'draft',
  description text,
  current_headcount integer NOT NULL DEFAULT 0,
  target_headcount integer NOT NULL DEFAULT 0,
  q1_target integer DEFAULT 0,
  q2_target integer DEFAULT 0,
  q3_target integer DEFAULT 0,
  q4_target integer DEFAULT 0,
  total_budget numeric(15,2) DEFAULT 0,
  allocated_budget numeric(15,2) DEFAULT 0,
  assumptions jsonb DEFAULT '[]'::jsonb,
  risks text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workforce_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workforce_plans_select" ON workforce_plans FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "workforce_plans_insert" ON workforce_plans FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'finance')
  ));

CREATE POLICY "workforce_plans_update" ON workforce_plans FOR UPDATE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'finance')
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'finance')
  ));

CREATE POLICY "workforce_plans_delete" ON workforce_plans FOR DELETE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ));


-- Workforce Demand Forecasts table
CREATE TABLE IF NOT EXISTS workforce_demand_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES workforce_plans(id) ON DELETE CASCADE,
  department text NOT NULL,
  job_family text,
  job_level text,
  forecast_year integer NOT NULL,
  forecast_period text NOT NULL DEFAULT 'annual',
  current_count integer NOT NULL DEFAULT 0,
  demand_count integer NOT NULL DEFAULT 0,
  supply_count integer NOT NULL DEFAULT 0,
  gap integer NOT NULL DEFAULT 0,
  attrition_forecast integer DEFAULT 0,
  retirement_forecast integer DEFAULT 0,
  internal_mobility integer DEFAULT 0,
  external_hire_need integer DEFAULT 0,
  justification text,
  priority text DEFAULT 'medium',
  estimated_cost numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workforce_demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wdf_select" ON workforce_demand_forecasts FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "wdf_insert" ON workforce_demand_forecasts FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'finance')
  ));

CREATE POLICY "wdf_update" ON workforce_demand_forecasts FOR UPDATE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'finance')
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'finance')
  ));

CREATE POLICY "wdf_delete" ON workforce_demand_forecasts FOR DELETE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ));


-- Org Change Requests table
CREATE TABLE IF NOT EXISTS org_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  change_name text NOT NULL,
  description text NOT NULL,
  effective_date date NOT NULL,
  affected_units jsonb DEFAULT '[]'::jsonb,
  affected_positions jsonb DEFAULT '[]'::jsonb,
  affected_employee_count integer DEFAULT 0,
  from_structure jsonb DEFAULT '{}'::jsonb,
  to_structure jsonb DEFAULT '{}'::jsonb,
  cost_impact numeric(15,2) DEFAULT 0,
  risk_assessment text,
  communication_plan text,
  status text NOT NULL DEFAULT 'draft',
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE org_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ocr_select" ON org_change_requests FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "ocr_insert" ON org_change_requests FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ));

CREATE POLICY "ocr_update" ON org_change_requests FOR UPDATE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ));

CREATE POLICY "ocr_delete" ON org_change_requests FOR DELETE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  ));


-- Matrix Assignments table
CREATE TABLE IF NOT EXISTS matrix_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  primary_manager_id uuid REFERENCES employees(id),
  secondary_manager_id uuid REFERENCES employees(id),
  project_name text,
  project_role text,
  allocation_percentage numeric(5,2) DEFAULT 100,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matrix_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_select" ON matrix_assignments FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "ma_insert" ON matrix_assignments FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'manager')
  ));

CREATE POLICY "ma_update" ON matrix_assignments FOR UPDATE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'manager')
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr', 'manager')
  ));

CREATE POLICY "ma_delete" ON matrix_assignments FOR DELETE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ));


-- Job Profiles table
CREATE TABLE IF NOT EXISTS job_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_code text NOT NULL,
  job_title text NOT NULL,
  job_family text NOT NULL,
  job_level text NOT NULL,
  summary text,
  key_responsibilities text,
  required_qualifications text,
  preferred_qualifications text,
  competencies jsonb DEFAULT '[]'::jsonb,
  min_salary numeric(15,2),
  mid_salary numeric(15,2),
  max_salary numeric(15,2),
  min_experience_years integer DEFAULT 0,
  education_requirement text,
  certifications_required jsonb DEFAULT '[]'::jsonb,
  physical_requirements text,
  travel_requirement text DEFAULT 'none',
  remote_eligible boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, profile_code)
);

ALTER TABLE job_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jp_select" ON job_profiles FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "jp_insert" ON job_profiles FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ));

CREATE POLICY "jp_update" ON job_profiles FOR UPDATE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
  ));

CREATE POLICY "jp_delete" ON job_profiles FOR DELETE TO authenticated
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  ));


-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workforce_plans_company ON workforce_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_workforce_plans_year ON workforce_plans(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_wdf_company ON workforce_demand_forecasts(company_id);
CREATE INDEX IF NOT EXISTS idx_wdf_plan ON workforce_demand_forecasts(plan_id);
CREATE INDEX IF NOT EXISTS idx_wdf_dept ON workforce_demand_forecasts(department);
CREATE INDEX IF NOT EXISTS idx_ocr_company ON org_change_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_ocr_status ON org_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_ma_company ON matrix_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_ma_employee ON matrix_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_jp_company ON job_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_jp_family ON job_profiles(job_family);
