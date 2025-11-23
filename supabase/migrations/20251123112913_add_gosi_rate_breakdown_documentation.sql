/*
  # Add GOSI Rate Breakdown Documentation

  1. New Tables
    - `gosi_contribution_breakdown` - Detailed breakdown of GOSI contributions by type
  
  2. Changes
    - Create breakdown table to document official GOSI contribution structure
    - Add detailed breakdown for Saudi and Non-Saudi employees
    - Update documentation with official rates
  
  3. GOSI Breakdown (Official KSA Rates)
    
    **Saudi Nationals:**
    - Annuity (Pension): 9% employee + 9% employer = 18%
    - Unemployment: 0.75% employee + 0.75% employer = 1.5%
    - Occupational Hazards: 0% employee + 2% employer = 2%
    - **Total: 9.75% employee + 11.75% employer = 21.5%**
    
    **Non-Saudi Nationals:**
    - Occupational Hazards: 0% employee + 2% employer = 2%
    - **Total: 0% employee + 2% employer = 2%**
    
  4. Important Notes
    - All rates calculated on: Basic Salary + Housing Allowance only
    - Maximum wage ceiling: 45,000 SAR per month
    - Does NOT include transportation or other allowances
*/

-- Create GOSI contribution breakdown reference table
CREATE TABLE IF NOT EXISTS gosi_contribution_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_type text NOT NULL CHECK (contributor_type IN ('saudi', 'non_saudi')),
  contribution_category text NOT NULL CHECK (contribution_category IN ('annuity_pension', 'unemployment', 'occupational_hazards')),
  employee_rate numeric(5,4) NOT NULL DEFAULT 0 CHECK (employee_rate >= 0 AND employee_rate <= 1),
  employer_rate numeric(5,4) NOT NULL DEFAULT 0 CHECK (employer_rate >= 0 AND employer_rate <= 1),
  description text,
  is_active boolean DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contributor_type, contribution_category, effective_from)
);

-- Enable RLS
ALTER TABLE gosi_contribution_breakdown ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view GOSI breakdown"
  ON gosi_contribution_breakdown
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify GOSI breakdown"
  ON gosi_contribution_breakdown
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert official Saudi GOSI breakdown
INSERT INTO gosi_contribution_breakdown (contributor_type, contribution_category, employee_rate, employer_rate, description, effective_from) VALUES
('saudi', 'annuity_pension', 0.0900, 0.0900, 'Annuity (Pension) contribution for Saudi nationals', '2024-01-01'),
('saudi', 'unemployment', 0.0075, 0.0075, 'Unemployment insurance contribution for Saudi nationals', '2024-01-01'),
('saudi', 'occupational_hazards', 0.0000, 0.0200, 'Occupational hazards insurance for Saudi nationals', '2024-01-01'),
('non_saudi', 'occupational_hazards', 0.0000, 0.0200, 'Occupational hazards insurance only for non-Saudi nationals', '2024-01-01')
ON CONFLICT (contributor_type, contribution_category, effective_from) DO UPDATE SET
  employee_rate = EXCLUDED.employee_rate,
  employer_rate = EXCLUDED.employer_rate,
  description = EXCLUDED.description,
  updated_at = now();

-- Add comments
COMMENT ON TABLE gosi_contribution_breakdown IS 'Official breakdown of GOSI contributions by category. Rates are applied to Basic Salary + Housing Allowance only, capped at 45,000 SAR/month.';

COMMENT ON COLUMN gosi_contribution_breakdown.contribution_category IS 'Type of contribution: annuity_pension (9%+9%), unemployment (0.75%+0.75%), occupational_hazards (0%+2% for all, Saudi gets additional)';

COMMENT ON COLUMN gosi_contribution_breakdown.employee_rate IS 'Employee contribution rate as decimal (e.g., 0.0900 = 9%)';

COMMENT ON COLUMN gosi_contribution_breakdown.employer_rate IS 'Employer contribution rate as decimal (e.g., 0.0900 = 9%)';

-- Create view for easy rate lookup
CREATE OR REPLACE VIEW gosi_rates_summary AS
SELECT 
  contributor_type,
  SUM(employee_rate) as total_employee_rate,
  SUM(employer_rate) as total_employer_rate,
  SUM(employee_rate + employer_rate) as total_rate,
  jsonb_agg(
    jsonb_build_object(
      'category', contribution_category,
      'employee_rate', employee_rate,
      'employer_rate', employer_rate,
      'description', description
    ) ORDER BY contribution_category
  ) as breakdown
FROM gosi_contribution_breakdown
WHERE is_active = true
GROUP BY contributor_type;

COMMENT ON VIEW gosi_rates_summary IS 'Summary of GOSI rates with detailed breakdown by contribution type. Saudi: 9.75% employee + 11.75% employer = 21.5%. Non-Saudi: 0% employee + 2% employer = 2%.';
