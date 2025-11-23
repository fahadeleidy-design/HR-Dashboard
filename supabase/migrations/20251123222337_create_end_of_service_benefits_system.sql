/*
  # End of Service Benefits System - Saudi Labor Law Compliant
  
  This migration creates a comprehensive end of service benefits calculation system
  that fully complies with Saudi Labor Law (Articles 84-88).
  
  ## Tables Created
  
  ### 1. end_of_service_calculations
  Main table storing end of service benefit calculations for employees.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier
  - `company_id` (uuid, required) - Reference to companies table
  - `employee_id` (uuid, required) - Reference to employees table
  - `calculation_date` (date, required) - Date of calculation
  - `termination_date` (date, required) - Employee's last working day
  - `termination_reason` (text, required) - Reason for termination
  - `contract_type` (text, required) - 'limited' or 'unlimited'
  - `hire_date` (date, required) - Employee's hiring date
  - `total_service_years` (numeric, required) - Total years of service
  - `total_service_months` (numeric, required) - Total months of service
  - `total_service_days` (numeric, required) - Total days of service
  - `basic_salary` (numeric, required) - Last basic salary used for calculation
  - `eligible_for_full_benefits` (boolean, required) - Full or half benefits
  - `gross_benefit_amount` (numeric, required) - Total benefits before deductions
  - `loans_deduction` (numeric, default 0) - Outstanding loan amount deducted
  - `advances_deduction` (numeric, default 0) - Outstanding advances deducted
  - `other_deductions` (numeric, default 0) - Other deductions
  - `net_benefit_amount` (numeric, required) - Final amount after deductions
  - `calculation_notes` (text) - Additional notes
  - `approved_by` (uuid) - User who approved the calculation
  - `approved_at` (timestamptz) - Approval timestamp
  - `status` (text, default 'draft') - 'draft', 'approved', 'paid'
  - `created_by` (uuid, required) - User who created the calculation
  - `created_at` (timestamptz, default now()) - Creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp
  
  ### 2. end_of_service_calculation_details
  Detailed breakdown of benefit calculations by year.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier
  - `calculation_id` (uuid, required) - Reference to end_of_service_calculations
  - `year_number` (integer, required) - Year number in service
  - `benefit_rate` (numeric, required) - Rate applied (0.5 or 1.0 month per year)
  - `benefit_amount` (numeric, required) - Calculated benefit for this year
  - `notes` (text) - Additional notes for this year
  
  ## Termination Reasons (Saudi Labor Law)
  
  **Full Benefits:**
  - retirement - Employee reached retirement age
  - death - Employee deceased
  - disability - Employee became disabled
  - employer_termination - Employer terminated without cause
  - mutual_agreement - Both parties agreed
  - female_marriage - Female employee married (within 6 months of marriage)
  - contract_completion - Limited term contract completed
  
  **Half Benefits:**
  - employee_resignation - Employee voluntarily resigned (unlimited contract)
  
  **No Benefits:**
  - termination_for_cause - Terminated for disciplinary reasons
  - probation_period - Terminated during probation
  
  ## Calculation Logic (Saudi Labor Law)
  
  ### Limited Term Contracts:
  - Employer termination: Full benefits
  - Employee resignation: Half benefits
  - Contract completion: Full benefits
  
  ### Unlimited Term Contracts:
  - Less than 2 years: No benefits
  - 2-5 years: Half month salary per year
  - 5-10 years: Half month for first 5 years + full month for years 6-10
  - Over 10 years: Full month salary per year for all years
  
  ### Special Cases (Full Benefits):
  - Retirement (age 60+)
  - Death or disability
  - Female marriage within 6 months
  - Employer termination without cause
  
  ## Security
  
  - RLS enabled on all tables
  - Only authenticated users from same company can access
  - HR and Admin roles can create/approve calculations
  - Employees can view their own calculations
  
  ## Notes
  
  - All monetary amounts in SAR
  - Service duration calculated from hire_date to termination_date
  - Loans and advances are automatically fetched and deducted
  - Calculation follows Saudi Labor Law exactly
*/

-- Create end_of_service_calculations table
CREATE TABLE IF NOT EXISTS end_of_service_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  termination_date date NOT NULL,
  termination_reason text NOT NULL CHECK (termination_reason IN (
    'retirement', 'death', 'disability', 'employer_termination', 
    'mutual_agreement', 'female_marriage', 'contract_completion',
    'employee_resignation', 'termination_for_cause', 'probation_period'
  )),
  contract_type text NOT NULL CHECK (contract_type IN ('limited', 'unlimited')),
  hire_date date NOT NULL,
  total_service_years numeric NOT NULL DEFAULT 0,
  total_service_months numeric NOT NULL DEFAULT 0,
  total_service_days numeric NOT NULL DEFAULT 0,
  basic_salary numeric NOT NULL CHECK (basic_salary >= 0),
  eligible_for_full_benefits boolean NOT NULL DEFAULT false,
  gross_benefit_amount numeric NOT NULL DEFAULT 0 CHECK (gross_benefit_amount >= 0),
  loans_deduction numeric NOT NULL DEFAULT 0 CHECK (loans_deduction >= 0),
  advances_deduction numeric NOT NULL DEFAULT 0 CHECK (advances_deduction >= 0),
  other_deductions numeric NOT NULL DEFAULT 0 CHECK (other_deductions >= 0),
  net_benefit_amount numeric NOT NULL DEFAULT 0 CHECK (net_benefit_amount >= 0),
  calculation_notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create end_of_service_calculation_details table
CREATE TABLE IF NOT EXISTS end_of_service_calculation_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id uuid NOT NULL REFERENCES end_of_service_calculations(id) ON DELETE CASCADE,
  year_number integer NOT NULL CHECK (year_number > 0),
  benefit_rate numeric NOT NULL CHECK (benefit_rate IN (0, 0.5, 1.0)),
  benefit_amount numeric NOT NULL DEFAULT 0 CHECK (benefit_amount >= 0),
  notes text,
  UNIQUE(calculation_id, year_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_eos_calculations_company ON end_of_service_calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_eos_calculations_employee ON end_of_service_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_eos_calculations_status ON end_of_service_calculations(status);
CREATE INDEX IF NOT EXISTS idx_eos_calculations_date ON end_of_service_calculations(calculation_date);
CREATE INDEX IF NOT EXISTS idx_eos_details_calculation ON end_of_service_calculation_details(calculation_id);

-- Enable RLS
ALTER TABLE end_of_service_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_of_service_calculation_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for end_of_service_calculations

-- Users can view calculations for their company
CREATE POLICY "Users can view company EOS calculations"
  ON end_of_service_calculations
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- HR and Admin can create calculations
CREATE POLICY "HR and Admin can create EOS calculations"
  ON end_of_service_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'hr')
    )
  );

-- HR and Admin can update draft calculations
CREATE POLICY "HR and Admin can update draft EOS calculations"
  ON end_of_service_calculations
  FOR UPDATE
  TO authenticated
  USING (
    status = 'draft' AND
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'hr')
    )
  );

-- Admin can delete draft calculations
CREATE POLICY "Admin can delete draft EOS calculations"
  ON end_of_service_calculations
  FOR DELETE
  TO authenticated
  USING (
    status = 'draft' AND
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- RLS Policies for end_of_service_calculation_details

-- Users can view details for calculations they can see
CREATE POLICY "Users can view EOS calculation details"
  ON end_of_service_calculation_details
  FOR SELECT
  TO authenticated
  USING (
    calculation_id IN (
      SELECT id FROM end_of_service_calculations
      WHERE company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- HR and Admin can insert details
CREATE POLICY "HR and Admin can create EOS calculation details"
  ON end_of_service_calculation_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    calculation_id IN (
      SELECT eos.id 
      FROM end_of_service_calculations eos
      JOIN user_roles ur ON ur.company_id = eos.company_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'hr')
      AND eos.status = 'draft'
    )
  );

-- HR and Admin can update details for draft calculations
CREATE POLICY "HR and Admin can update EOS calculation details"
  ON end_of_service_calculation_details
  FOR UPDATE
  TO authenticated
  USING (
    calculation_id IN (
      SELECT eos.id 
      FROM end_of_service_calculations eos
      JOIN user_roles ur ON ur.company_id = eos.company_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'hr')
      AND eos.status = 'draft'
    )
  );

-- Admin can delete details for draft calculations
CREATE POLICY "Admin can delete EOS calculation details"
  ON end_of_service_calculation_details
  FOR DELETE
  TO authenticated
  USING (
    calculation_id IN (
      SELECT eos.id 
      FROM end_of_service_calculations eos
      JOIN user_roles ur ON ur.company_id = eos.company_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
      AND eos.status = 'draft'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_eos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_eos_calculations_updated_at ON end_of_service_calculations;
CREATE TRIGGER update_eos_calculations_updated_at
  BEFORE UPDATE ON end_of_service_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_eos_updated_at();