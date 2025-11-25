/*
  # AI-Powered Contract Management System

  1. New Tables
    - `employee_contracts`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `employee_id` (uuid, references employees)
      - `contract_type` (text) - permanent, fixed_term, part_time, etc.
      - `contract_number` (text, unique)
      - `start_date` (date)
      - `end_date` (date, nullable)
      - `salary` (numeric)
      - `currency` (text, default SAR)
      - `position` (text)
      - `department` (text)
      - `work_hours` (numeric)
      - `probation_period_months` (integer)
      - `notice_period_days` (integer)
      - `benefits` (jsonb) - housing, transport, etc.
      - `pdf_url` (text) - storage path
      - `pdf_filename` (text)
      - `extracted_data` (jsonb) - AI extracted data
      - `extraction_status` (text) - pending, processing, completed, failed
      - `extraction_confidence` (numeric) - 0-100
      - `is_active` (boolean)
      - `signed_date` (date)
      - `uploaded_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `contract_amendments`
      - `id` (uuid, primary key)
      - `contract_id` (uuid, references employee_contracts)
      - `amendment_type` (text) - salary_change, position_change, etc.
      - `effective_date` (date)
      - `previous_value` (jsonb)
      - `new_value` (jsonb)
      - `reason` (text)
      - `pdf_url` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)

    - `contract_templates`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `template_name` (text)
      - `contract_type` (text)
      - `template_content` (text)
      - `variables` (jsonb) - placeholder variables
      - `is_active` (boolean)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on company access

  3. Indexes
    - Index on company_id, employee_id for fast lookups
    - Index on extraction_status for processing queue
*/

-- Employee Contracts Table
CREATE TABLE IF NOT EXISTS employee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  contract_type text NOT NULL CHECK (contract_type IN ('permanent', 'fixed_term', 'part_time', 'seasonal', 'project_based', 'internship')),
  contract_number text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date,
  salary numeric(15, 2) NOT NULL,
  currency text DEFAULT 'SAR' NOT NULL,
  position text NOT NULL,
  department text,
  work_hours numeric(5, 2) DEFAULT 40,
  probation_period_months integer DEFAULT 3,
  notice_period_days integer DEFAULT 60,
  benefits jsonb DEFAULT '{}',
  pdf_url text,
  pdf_filename text,
  extracted_data jsonb DEFAULT '{}',
  extraction_status text DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_confidence numeric(5, 2) DEFAULT 0 CHECK (extraction_confidence >= 0 AND extraction_confidence <= 100),
  is_active boolean DEFAULT true,
  signed_date date,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contract Amendments Table
CREATE TABLE IF NOT EXISTS contract_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES employee_contracts(id) ON DELETE CASCADE NOT NULL,
  amendment_type text NOT NULL CHECK (amendment_type IN ('salary_change', 'position_change', 'department_change', 'work_hours_change', 'contract_extension', 'benefits_change', 'other')),
  effective_date date NOT NULL,
  previous_value jsonb DEFAULT '{}',
  new_value jsonb DEFAULT '{}',
  reason text,
  pdf_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Contract Templates Table
CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  template_name text NOT NULL,
  contract_type text NOT NULL,
  template_content text NOT NULL,
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_contracts_company ON employee_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_employee ON employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_status ON employee_contracts(extraction_status);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_active ON employee_contracts(is_active, company_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_contract ON contract_amendments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_company ON contract_templates(company_id);

-- Enable RLS
ALTER TABLE employee_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_contracts
CREATE POLICY "Users can view contracts in their company"
  ON employee_contracts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR/Admin can insert contracts"
  ON employee_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "HR/Admin can update contracts"
  ON employee_contracts FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "HR/Admin can delete contracts"
  ON employee_contracts FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- RLS Policies for contract_amendments
CREATE POLICY "Users can view amendments in their company"
  ON contract_amendments FOR SELECT
  TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM employee_contracts 
      WHERE company_id IN (
        SELECT company_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "HR/Admin can insert amendments"
  ON contract_amendments FOR INSERT
  TO authenticated
  WITH CHECK (
    contract_id IN (
      SELECT id FROM employee_contracts 
      WHERE company_id IN (
        SELECT company_id FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

-- RLS Policies for contract_templates
CREATE POLICY "Users can view templates in their company"
  ON contract_templates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR/Admin can manage templates"
  ON contract_templates FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_contracts_updated_at
  BEFORE UPDATE ON employee_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_contracts_updated_at();

CREATE TRIGGER contract_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_contracts_updated_at();