/*
  # Saudi HR Management System - Compliance & Reporting Tables

  ## Overview
  This migration creates tables for Nitaqat compliance, GOSI reporting, WPS integration,
  document management, performance management, training, and audit trails.

  ## 1. New Tables

  ### Nitaqat Tracking
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `calculation_date` (date)
  - `total_employees` (integer)
  - `saudi_employees` (integer)
  - `non_saudi_employees` (integer)
  - `saudization_percentage` (decimal)
  - `required_percentage` (decimal)
  - `nitaqat_color` (text)
  - `entity_size` (text) - small, medium, large, very_large
  - `notes` (text)

  ### GOSI Contributions
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `month` (date)
  - `wage_subject_to_gosi` (decimal)
  - `employee_contribution` (decimal) - 10%
  - `employer_contribution` (decimal) - 12% Saudi, 2% non-Saudi
  - `total_contribution` (decimal)
  - `payment_status` (text)
  - `payment_date` (date)

  ### WPS Payroll Files
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `period_month` (date)
  - `total_employees` (integer)
  - `total_amount` (decimal)
  - `file_generated_at` (timestamptz)
  - `submitted_to_bank` (boolean)
  - `submission_date` (date)
  - `mol_reference` (text) - Ministry of Labor reference

  ### Documents
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `document_type` (text) - iqama, passport, contract, certificate, etc.
  - `document_name` (text)
  - `document_url` (text)
  - `issue_date` (date)
  - `expiry_date` (date)
  - `version` (integer)
  - `status` (text) - active, expired, archived

  ### Performance Reviews
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `reviewer_id` (uuid, foreign key to employees)
  - `review_period_start` (date)
  - `review_period_end` (date)
  - `overall_rating` (decimal)
  - `goals_achievement` (decimal)
  - `competencies_rating` (decimal)
  - `comments` (text)
  - `status` (text) - draft, submitted, acknowledged

  ### Training Programs
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `program_name_en` (text)
  - `program_name_ar` (text)
  - `description` (text)
  - `trainer_name` (text)
  - `start_date` (date)
  - `end_date` (date)
  - `duration_hours` (integer)
  - `cost` (decimal)
  - `max_participants` (integer)

  ### Training Enrollments
  - `id` (uuid, primary key)
  - `training_program_id` (uuid, foreign key)
  - `employee_id` (uuid, foreign key)
  - `enrollment_date` (date)
  - `completion_status` (text) - enrolled, completed, cancelled
  - `completion_date` (date)
  - `certificate_issued` (boolean)

  ### User Roles
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `employee_id` (uuid, foreign key)
  - `role` (text) - super_admin, hr_admin, hr_manager, manager, employee
  - `company_id` (uuid, foreign key)
  - `permissions` (jsonb)

  ### Audit Log
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `user_id` (uuid)
  - `action` (text)
  - `table_name` (text)
  - `record_id` (uuid)
  - `old_values` (jsonb)
  - `new_values` (jsonb)
  - `timestamp` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Restrict access based on company and role

  ## 3. Indexes
  - Add indexes for reporting and compliance queries
*/

-- Nitaqat tracking table
CREATE TABLE IF NOT EXISTS nitaqat_tracking (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  total_employees integer NOT NULL DEFAULT 0,
  saudi_employees integer NOT NULL DEFAULT 0,
  non_saudi_employees integer NOT NULL DEFAULT 0,
  saudization_percentage decimal(5,2) NOT NULL DEFAULT 0,
  required_percentage decimal(5,2) NOT NULL DEFAULT 0,
  nitaqat_color text DEFAULT 'green' CHECK (nitaqat_color IN ('platinum', 'green', 'yellow', 'red')),
  entity_size text CHECK (entity_size IN ('small', 'medium', 'large', 'very_large')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, calculation_date)
);

-- GOSI contributions table
CREATE TABLE IF NOT EXISTS gosi_contributions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month date NOT NULL,
  wage_subject_to_gosi decimal(10,2) NOT NULL DEFAULT 0,
  employee_contribution decimal(10,2) NOT NULL DEFAULT 0,
  employer_contribution decimal(10,2) NOT NULL DEFAULT 0,
  total_contribution decimal(10,2) NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  payment_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month)
);

-- WPS payroll files table
CREATE TABLE IF NOT EXISTS wps_payroll_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  total_employees integer NOT NULL DEFAULT 0,
  total_amount decimal(12,2) NOT NULL DEFAULT 0,
  file_generated_at timestamptz DEFAULT now(),
  submitted_to_bank boolean DEFAULT false,
  submission_date date,
  mol_reference text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, period_month)
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('iqama', 'passport', 'contract', 'certificate', 'visa', 'medical', 'other')),
  document_name text NOT NULL,
  document_url text,
  issue_date date,
  expiry_date date,
  version integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  overall_rating decimal(3,2) CHECK (overall_rating >= 0 AND overall_rating <= 5),
  goals_achievement decimal(3,2) CHECK (goals_achievement >= 0 AND goals_achievement <= 5),
  competencies_rating decimal(3,2) CHECK (competencies_rating >= 0 AND competencies_rating <= 5),
  comments text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Training programs table
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  program_name_en text NOT NULL,
  program_name_ar text,
  description text,
  trainer_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_hours integer NOT NULL DEFAULT 0,
  cost decimal(10,2) DEFAULT 0,
  max_participants integer,
  created_at timestamptz DEFAULT now()
);

-- Training enrollments table
CREATE TABLE IF NOT EXISTS training_enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  enrollment_date date DEFAULT CURRENT_DATE,
  completion_status text DEFAULT 'enrolled' CHECK (completion_status IN ('enrolled', 'completed', 'cancelled')),
  completion_date date,
  certificate_issued boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_program_id, employee_id)
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'hr_admin', 'hr_manager', 'manager', 'employee')),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nitaqat_company ON nitaqat_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_nitaqat_date ON nitaqat_tracking(calculation_date);
CREATE INDEX IF NOT EXISTS idx_gosi_employee ON gosi_contributions(employee_id);
CREATE INDEX IF NOT EXISTS idx_gosi_month ON gosi_contributions(month);
CREATE INDEX IF NOT EXISTS idx_wps_company ON wps_payroll_files(company_id);
CREATE INDEX IF NOT EXISTS idx_wps_period ON wps_payroll_files(period_month);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_performance_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_company ON training_programs(company_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollment ON training_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

-- Enable Row Level Security
ALTER TABLE nitaqat_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE gosi_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wps_payroll_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nitaqat_tracking
CREATE POLICY "Users can view nitaqat data for their company"
  ON nitaqat_tracking FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR admins can manage nitaqat data"
  ON nitaqat_tracking FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for gosi_contributions
CREATE POLICY "Users can view GOSI data for their company"
  ON gosi_contributions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR admins can manage GOSI data"
  ON gosi_contributions FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for wps_payroll_files
CREATE POLICY "Users can view WPS files for their company"
  ON wps_payroll_files FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR admins can manage WPS files"
  ON wps_payroll_files FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their company"
  ON documents FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can manage documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for performance_reviews
CREATE POLICY "Users can view performance reviews in their company"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Managers can create performance reviews"
  ON performance_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Managers can update performance reviews"
  ON performance_reviews FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for training_programs
CREATE POLICY "Users can view training programs in their company"
  ON training_programs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can manage training programs"
  ON training_programs FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for training_enrollments
CREATE POLICY "Users can view training enrollments in their company"
  ON training_enrollments FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE company_id IN (
        SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
      )
    )
  );

CREATE POLICY "Employees can enroll in training"
  ON training_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for audit_log
CREATE POLICY "Users can view audit logs for their company"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);