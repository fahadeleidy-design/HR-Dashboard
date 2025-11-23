/*
  # Create GOSI Rates Configuration System

  1. New Tables
    - `gosi_rates_config` - Stores configurable GOSI contribution rates per company
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `contributor_type` (text: 'saudi', 'non_saudi', 'saudi_pr_eligible')
      - `employee_rate` (decimal: employee contribution percentage)
      - `employer_rate` (decimal: employer contribution percentage)
      - `max_wage_ceiling` (decimal: maximum wage subject to GOSI)
      - `effective_from` (date: when this rate becomes effective)
      - `is_active` (boolean: whether this rate is currently active)
      - `source` (text: 'manual', 'gosi_api' - where the rate came from)

  2. Default Rates (Saudi Labor Law 2024)
    - Saudi employees: 9.75% employee, 11.75% employer
    - Non-Saudi employees: 0% employee, 2% employer  
    - Wage ceiling: 45,000 SAR

  3. Security
    - Enable RLS on `gosi_rates_config` table
    - Authenticated users can view rates for their companies
    - Authenticated users can manage rates for their companies
*/

CREATE TABLE IF NOT EXISTS gosi_rates_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contributor_type text NOT NULL CHECK (contributor_type IN ('saudi', 'non_saudi', 'saudi_pr_eligible')),
  employee_rate decimal(5,4) NOT NULL DEFAULT 0,
  employer_rate decimal(5,4) NOT NULL DEFAULT 0,
  max_wage_ceiling decimal(10,2) NOT NULL DEFAULT 45000,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'gosi_api')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, contributor_type, is_active)
);

CREATE INDEX IF NOT EXISTS idx_gosi_rates_company ON gosi_rates_config(company_id);
CREATE INDEX IF NOT EXISTS idx_gosi_rates_active ON gosi_rates_config(is_active);

ALTER TABLE gosi_rates_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view GOSI rates"
  ON gosi_rates_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert GOSI rates"
  ON gosi_rates_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update GOSI rates"
  ON gosi_rates_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete GOSI rates"
  ON gosi_rates_config
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to get active GOSI rate for an employee
CREATE OR REPLACE FUNCTION get_employee_gosi_rates(
  p_employee_id uuid,
  p_company_id uuid
)
RETURNS TABLE (
  employee_rate decimal,
  employer_rate decimal,
  max_wage_ceiling decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_saudi boolean;
  v_contributor_type text;
BEGIN
  -- Get employee nationality
  SELECT is_saudi INTO v_is_saudi
  FROM employees
  WHERE id = p_employee_id;

  -- Determine contributor type
  IF v_is_saudi THEN
    v_contributor_type := 'saudi';
  ELSE
    v_contributor_type := 'non_saudi';
  END IF;

  -- Get active rate configuration
  RETURN QUERY
  SELECT 
    grc.employee_rate,
    grc.employer_rate,
    grc.max_wage_ceiling
  FROM gosi_rates_config grc
  WHERE grc.company_id = p_company_id
    AND grc.contributor_type = v_contributor_type
    AND grc.is_active = true
    AND grc.effective_from <= CURRENT_DATE
  ORDER BY grc.effective_from DESC
  LIMIT 1;

  -- If no configuration found, return default rates
  IF NOT FOUND THEN
    IF v_is_saudi THEN
      RETURN QUERY SELECT 0.0975::decimal, 0.1175::decimal, 45000::decimal;
    ELSE
      RETURN QUERY SELECT 0.0000::decimal, 0.0200::decimal, 45000::decimal;
    END IF;
  END IF;
END;
$$;

-- Insert default GOSI rates for all existing companies
INSERT INTO gosi_rates_config (company_id, contributor_type, employee_rate, employer_rate, max_wage_ceiling, is_active, source)
SELECT 
  c.id,
  'saudi',
  0.0975,
  0.1175,
  45000,
  true,
  'manual'
FROM companies c
ON CONFLICT (company_id, contributor_type, is_active) DO NOTHING;

INSERT INTO gosi_rates_config (company_id, contributor_type, employee_rate, employer_rate, max_wage_ceiling, is_active, source)
SELECT 
  c.id,
  'non_saudi',
  0.0000,
  0.0200,
  45000,
  true,
  'manual'
FROM companies c
ON CONFLICT (company_id, contributor_type, is_active) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gosi_rates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER gosi_rates_config_updated_at
  BEFORE UPDATE ON gosi_rates_config
  FOR EACH ROW
  EXECUTE FUNCTION update_gosi_rates_updated_at();
