/*
  # Enterprise Employee Management System Enhancement

  1. Enhanced Employee Table Columns
  2. New Supporting Tables for Employee Management
  3. Saudi Labor Law Compliance Features
  4. Security with RLS
*/

-- Add missing columns to employees table
DO $$
BEGIN
  -- Address and location
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'address_en') THEN
    ALTER TABLE employees ADD COLUMN address_en text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'address_ar') THEN
    ALTER TABLE employees ADD COLUMN address_ar text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'city') THEN
    ALTER TABLE employees ADD COLUMN city text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'country') THEN
    ALTER TABLE employees ADD COLUMN country text DEFAULT 'Saudi Arabia';
  END IF;
  
  -- Work permit and visa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'work_permit_number') THEN
    ALTER TABLE employees ADD COLUMN work_permit_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'work_permit_expiry') THEN
    ALTER TABLE employees ADD COLUMN work_permit_expiry date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_number') THEN
    ALTER TABLE employees ADD COLUMN visa_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_expiry') THEN
    ALTER TABLE employees ADD COLUMN visa_expiry date;
  END IF;
  
  -- Contract details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'contract_end_date') THEN
    ALTER TABLE employees ADD COLUMN contract_end_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'contract_type') THEN
    ALTER TABLE employees ADD COLUMN contract_type text;
  END IF;
  
  -- Marital and family
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'marital_status') THEN
    ALTER TABLE employees ADD COLUMN marital_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'number_of_dependents') THEN
    ALTER TABLE employees ADD COLUMN number_of_dependents integer DEFAULT 0;
  END IF;
  
  -- Blood type and medical
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'blood_type') THEN
    ALTER TABLE employees ADD COLUMN blood_type text;
  END IF;
  
  -- Religion (for Saudi labor law compliance - optional data)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'religion') THEN
    ALTER TABLE employees ADD COLUMN religion text;
  END IF;
  
  -- Profile photo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'photo_url') THEN
    ALTER TABLE employees ADD COLUMN photo_url text;
  END IF;
  
  -- Sponsorship (for non-Saudi employees)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'sponsor_name') THEN
    ALTER TABLE employees ADD COLUMN sponsor_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'sponsor_id') THEN
    ALTER TABLE employees ADD COLUMN sponsor_id text;
  END IF;
END $$;

-- Create employee_emergency_contacts table
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
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

-- Create employee_beneficiaries table
CREATE TABLE IF NOT EXISTS employee_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  beneficiary_name text NOT NULL,
  relationship text NOT NULL,
  id_number text,
  phone text,
  percentage decimal(5,2) DEFAULT 100.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_qualifications table
CREATE TABLE IF NOT EXISTS employee_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  qualification_type text NOT NULL,
  institution_name text NOT NULL,
  degree_title text NOT NULL,
  field_of_study text,
  start_date date,
  end_date date,
  grade text,
  certificate_url text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_skills table
CREATE TABLE IF NOT EXISTS employee_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  skill_category text,
  proficiency_level text,
  years_of_experience integer,
  last_used_date date,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_medical_records table
CREATE TABLE IF NOT EXISTS employee_medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  record_type text NOT NULL,
  record_date date NOT NULL,
  description text,
  diagnosis text,
  treatment text,
  doctor_name text,
  hospital_name text,
  file_url text,
  follow_up_date date,
  is_work_related boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_bank_accounts table
CREATE TABLE IF NOT EXISTS employee_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  iban text NOT NULL,
  account_holder_name text NOT NULL,
  is_primary boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_dependents table
CREATE TABLE IF NOT EXISTS employee_dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  dependent_name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date,
  id_number text,
  gender text,
  is_covered_by_insurance boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_status_history table
CREATE TABLE IF NOT EXISTS employee_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  change_date date NOT NULL,
  reason text,
  notes text,
  changed_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create employee_promotions table
CREATE TABLE IF NOT EXISTS employee_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  previous_position text,
  new_position text NOT NULL,
  previous_salary decimal(10,2),
  new_salary decimal(10,2),
  effective_date date NOT NULL,
  reason text,
  notes text,
  approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create employee_transfers table
CREATE TABLE IF NOT EXISTS employee_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  from_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  to_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  from_location text,
  to_location text,
  transfer_date date NOT NULL,
  reason text,
  notes text,
  approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create employee_warnings table
CREATE TABLE IF NOT EXISTS employee_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  warning_type text NOT NULL,
  severity text DEFAULT 'medium',
  issue_date date NOT NULL,
  violation_description text NOT NULL,
  action_taken text,
  acknowledged_by_employee boolean DEFAULT false,
  acknowledged_date date,
  expiry_date date,
  issued_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create employee_achievements table
CREATE TABLE IF NOT EXISTS employee_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  achievement_type text NOT NULL,
  title text NOT NULL,
  description text,
  date_received date NOT NULL,
  awarded_by text,
  certificate_url text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employee_emergency_contacts_employee ON employee_emergency_contacts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_beneficiaries_employee ON employee_beneficiaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_qualifications_employee ON employee_qualifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_medical_records_employee ON employee_medical_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_bank_accounts_employee ON employee_bank_accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_dependents_employee ON employee_dependents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_status_history_employee ON employee_status_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_promotions_employee ON employee_promotions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_employee ON employee_transfers(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_employee ON employee_warnings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_employee ON employee_achievements(employee_id);

-- Enable RLS
ALTER TABLE employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_achievements ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (allow authenticated users to view)
CREATE POLICY "Authenticated users can view emergency contacts"
  ON employee_emergency_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view beneficiaries"
  ON employee_beneficiaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view qualifications"
  ON employee_qualifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view skills"
  ON employee_skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view medical records"
  ON employee_medical_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view bank accounts"
  ON employee_bank_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view dependents"
  ON employee_dependents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view status history"
  ON employee_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view promotions"
  ON employee_promotions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view transfers"
  ON employee_transfers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view warnings"
  ON employee_warnings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view achievements"
  ON employee_achievements FOR SELECT
  TO authenticated
  USING (true);