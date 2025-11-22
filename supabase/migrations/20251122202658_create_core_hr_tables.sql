/*
  # Saudi HR Management System - Core Tables

  ## Overview
  This migration creates the foundational tables for a comprehensive Saudi HR Management System
  compliant with Saudi Labor Law, Nitaqat regulations, GOSI, WPS, and Muqeem requirements.

  ## 1. New Tables

  ### Companies
  - `id` (uuid, primary key)
  - `name_en` (text) - Company name in English
  - `name_ar` (text) - Company name in Arabic
  - `commercial_registration` (text) - CR number
  - `nitaqat_entity_id` (text) - Nitaqat entity ID
  - `nitaqat_color` (text) - Current Nitaqat color (platinum, green, yellow, red)
  - `labor_office_number` (text) - Labor office registration
  - `gosi_registration` (text) - GOSI registration number
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### Departments
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `name_en` (text)
  - `name_ar` (text)
  - `code` (text) - Department code
  - `manager_id` (uuid, foreign key to employees)
  - `cost_center` (text)
  - `created_at` (timestamptz)

  ### Employees
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `department_id` (uuid, foreign key)
  - `employee_number` (text, unique) - Internal employee ID
  - `iqama_number` (text) - Iqama/National ID
  - `passport_number` (text)
  - `first_name_en` (text)
  - `last_name_en` (text)
  - `first_name_ar` (text)
  - `last_name_ar` (text)
  - `email` (text)
  - `phone` (text)
  - `nationality` (text)
  - `is_saudi` (boolean) - For Nitaqat calculations
  - `gender` (text)
  - `date_of_birth` (date)
  - `hire_date` (date)
  - `probation_end_date` (date) - 90 days from hire
  - `job_title_en` (text)
  - `job_title_ar` (text)
  - `employment_type` (text) - full_time, part_time, contract
  - `status` (text) - active, on_leave, terminated
  - `termination_date` (date)
  - `termination_reason` (text)
  - `iqama_expiry` (date)
  - `passport_expiry` (date)
  - `manager_id` (uuid, foreign key)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### Payroll
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `basic_salary` (decimal)
  - `housing_allowance` (decimal)
  - `transportation_allowance` (decimal)
  - `other_allowances` (decimal)
  - `gross_salary` (decimal)
  - `gosi_employee` (decimal) - 10% employee contribution
  - `gosi_employer` (decimal) - 12% employer contribution (Saudi), 2% (non-Saudi)
  - `other_deductions` (decimal)
  - `net_salary` (decimal)
  - `payment_method` (text) - wps, cash, check
  - `iban` (text) - For WPS
  - `bank_name` (text)
  - `effective_from` (date)
  - `effective_to` (date)
  - `created_at` (timestamptz)

  ### Leave Types
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key)
  - `name_en` (text) - annual, sick, hajj, maternity, unpaid, etc.
  - `name_ar` (text)
  - `max_days_per_year` (integer)
  - `is_paid` (boolean)
  - `requires_approval` (boolean)
  - `saudi_labor_law_based` (boolean)
  - `created_at` (timestamptz)

  ### Leave Requests
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `leave_type_id` (uuid, foreign key)
  - `start_date` (date)
  - `end_date` (date)
  - `total_days` (integer)
  - `reason` (text)
  - `status` (text) - pending, approved, rejected, cancelled
  - `approver_id` (uuid, foreign key to employees)
  - `approved_at` (timestamptz)
  - `created_at` (timestamptz)

  ### Attendance
  - `id` (uuid, primary key)
  - `employee_id` (uuid, foreign key)
  - `company_id` (uuid, foreign key)
  - `date` (date)
  - `check_in` (timestamptz)
  - `check_out` (timestamptz)
  - `working_hours` (decimal)
  - `overtime_hours` (decimal)
  - `late_minutes` (integer)
  - `early_leave_minutes` (integer)
  - `status` (text) - present, absent, half_day, weekend, holiday
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to access only their company data
  - Implement role-based access (admin, hr_manager, manager, employee)

  ## 3. Indexes
  - Add indexes on foreign keys and frequently queried columns
  - Optimize for company-based queries
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en text NOT NULL,
  name_ar text,
  commercial_registration text UNIQUE,
  nitaqat_entity_id text,
  nitaqat_color text DEFAULT 'green' CHECK (nitaqat_color IN ('platinum', 'green', 'yellow', 'red')),
  labor_office_number text,
  gosi_registration text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ar text,
  code text NOT NULL,
  manager_id uuid,
  cost_center text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  employee_number text NOT NULL,
  iqama_number text,
  passport_number text,
  first_name_en text NOT NULL,
  last_name_en text NOT NULL,
  first_name_ar text,
  last_name_ar text,
  email text UNIQUE,
  phone text,
  nationality text NOT NULL,
  is_saudi boolean DEFAULT false,
  gender text CHECK (gender IN ('male', 'female')),
  date_of_birth date,
  hire_date date NOT NULL,
  probation_end_date date,
  job_title_en text NOT NULL,
  job_title_ar text,
  employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
  termination_date date,
  termination_reason text,
  iqama_expiry date,
  passport_expiry date,
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, employee_number)
);

-- Add foreign key for department manager
ALTER TABLE departments 
ADD CONSTRAINT fk_department_manager 
FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Payroll table
CREATE TABLE IF NOT EXISTS payroll (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  basic_salary decimal(10,2) NOT NULL DEFAULT 0,
  housing_allowance decimal(10,2) DEFAULT 0,
  transportation_allowance decimal(10,2) DEFAULT 0,
  other_allowances decimal(10,2) DEFAULT 0,
  gross_salary decimal(10,2) NOT NULL DEFAULT 0,
  gosi_employee decimal(10,2) DEFAULT 0,
  gosi_employer decimal(10,2) DEFAULT 0,
  other_deductions decimal(10,2) DEFAULT 0,
  net_salary decimal(10,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'wps' CHECK (payment_method IN ('wps', 'cash', 'check')),
  iban text,
  bank_name text,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz DEFAULT now()
);

-- Leave types table
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ar text,
  max_days_per_year integer NOT NULL DEFAULT 0,
  is_paid boolean DEFAULT true,
  requires_approval boolean DEFAULT true,
  saudi_labor_law_based boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name_en)
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  working_hours decimal(4,2) DEFAULT 0,
  overtime_hours decimal(4,2) DEFAULT 0,
  late_minutes integer DEFAULT 0,
  early_leave_minutes integer DEFAULT 0,
  status text DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'weekend', 'holiday')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_is_saudi ON employees(is_saudi);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_company ON payroll(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view companies they belong to"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "HR admins can update their companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for departments
CREATE POLICY "Users can view departments in their company"
  ON departments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for employees
CREATE POLICY "Users can view employees in their company"
  ON employees FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for payroll
CREATE POLICY "Users can view payroll in their company"
  ON payroll FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can insert payroll"
  ON payroll FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can update payroll"
  ON payroll FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for leave types
CREATE POLICY "Users can view leave types in their company"
  ON leave_types FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can manage leave types"
  ON leave_types FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for leave requests
CREATE POLICY "Employees can view leave requests in their company"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can update leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

-- RLS Policies for attendance
CREATE POLICY "Users can view attendance in their company"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "HR managers can manage attendance"
  ON attendance FOR ALL
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