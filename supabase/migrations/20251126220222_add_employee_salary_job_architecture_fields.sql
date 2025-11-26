/*
  # Employee Salary and Job Architecture Integration

  ## Overview
  Add salary and job architecture fields to employees table to enable complete integration
  with the salary scale management system.

  ## Changes
  
  1. **New Fields Added to Employees Table**
     - `job_position_id` - Links to job_positions table
     - `job_grade_id` - Links to job_grades table  
     - `job_family_id` - Links to job_families table
     - `salary_band_id` - Links to salary_bands table
     - `basic_salary` - Current basic salary amount
     - `housing_allowance` - Housing allowance amount
     - `transport_allowance` - Transport allowance amount
     - `food_allowance` - Food allowance amount
     - `mobile_allowance` - Mobile allowance amount
     - `other_allowances` - Other miscellaneous allowances
     - `total_compensation` - Total compensation (calculated)
     - `salary_currency` - Salary currency (default SAR)
     - `salary_effective_date` - Date when current salary became effective
     - `last_salary_review_date` - Date of last salary review
     - `next_salary_review_date` - Scheduled date for next review
     - `compensation_notes` - Notes about compensation

  2. **Foreign Key Constraints**
     - Link to job_positions, job_grades, job_families, salary_bands

  3. **Indexes**
     - Index on job_position_id for fast lookups
     - Index on job_grade_id for grade-based queries
     - Index on salary_band_id for band compliance checks
     - Index on basic_salary for salary analytics

  4. **Security**
     - RLS policies already in place for employees table
*/

-- Add job architecture fields to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS job_position_id uuid REFERENCES job_positions(id),
ADD COLUMN IF NOT EXISTS job_grade_id uuid REFERENCES job_grades(id),
ADD COLUMN IF NOT EXISTS job_family_id uuid REFERENCES job_families(id),
ADD COLUMN IF NOT EXISTS salary_band_id uuid REFERENCES salary_bands(id);

-- Add salary fields to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS basic_salary numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS housing_allowance numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transport_allowance numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS food_allowance numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS mobile_allowance numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_allowances numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_compensation numeric(12,2) GENERATED ALWAYS AS (
  basic_salary + housing_allowance + transport_allowance + food_allowance + mobile_allowance + other_allowances
) STORED,
ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'SAR',
ADD COLUMN IF NOT EXISTS salary_effective_date date,
ADD COLUMN IF NOT EXISTS last_salary_review_date date,
ADD COLUMN IF NOT EXISTS next_salary_review_date date,
ADD COLUMN IF NOT EXISTS compensation_notes text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_job_position ON employees(job_position_id);
CREATE INDEX IF NOT EXISTS idx_employees_job_grade ON employees(job_grade_id);
CREATE INDEX IF NOT EXISTS idx_employees_job_family ON employees(job_family_id);
CREATE INDEX IF NOT EXISTS idx_employees_salary_band ON employees(job_position_id);
CREATE INDEX IF NOT EXISTS idx_employees_basic_salary ON employees(basic_salary);
CREATE INDEX IF NOT EXISTS idx_employees_total_compensation ON employees(total_compensation);

-- Create function to validate salary within band
CREATE OR REPLACE FUNCTION validate_employee_salary_in_band()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if both salary_band_id and basic_salary are set
  IF NEW.salary_band_id IS NOT NULL AND NEW.basic_salary IS NOT NULL THEN
    -- Check if salary is within the band range
    IF NOT EXISTS (
      SELECT 1 FROM salary_bands
      WHERE id = NEW.salary_band_id
      AND NEW.basic_salary BETWEEN minimum_salary AND maximum_salary
    ) THEN
      RAISE WARNING 'Employee salary % is outside the assigned salary band range', NEW.basic_salary;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate salary on insert/update
DROP TRIGGER IF EXISTS trigger_validate_employee_salary ON employees;
CREATE TRIGGER trigger_validate_employee_salary
  BEFORE INSERT OR UPDATE OF basic_salary, salary_band_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION validate_employee_salary_in_band();

-- Create view for employee compensation summary
CREATE OR REPLACE VIEW employee_compensation_view AS
SELECT 
  e.id,
  e.employee_number,
  e.first_name_en || ' ' || e.last_name_en as full_name,
  e.job_title_en,
  jf.family_name as job_family,
  jf.color_code as family_color,
  jg.grade_code,
  jg.grade_name,
  jg.grade_level,
  jp.position_title,
  jp.position_code,
  sb.minimum_salary as band_minimum,
  sb.midpoint_salary as band_midpoint,
  sb.maximum_salary as band_maximum,
  e.basic_salary,
  e.housing_allowance,
  e.transport_allowance,
  e.food_allowance,
  e.mobile_allowance,
  e.other_allowances,
  e.total_compensation,
  e.salary_currency,
  e.salary_effective_date,
  e.last_salary_review_date,
  e.next_salary_review_date,
  -- Calculate position in range (compa-ratio)
  CASE 
    WHEN sb.midpoint_salary > 0 THEN 
      ROUND((e.basic_salary / sb.midpoint_salary) * 100, 2)
    ELSE 0
  END as compa_ratio,
  -- Calculate range penetration
  CASE 
    WHEN sb.maximum_salary > sb.minimum_salary THEN 
      ROUND(((e.basic_salary - sb.minimum_salary) / (sb.maximum_salary - sb.minimum_salary)) * 100, 2)
    ELSE 0
  END as range_penetration,
  e.company_id,
  e.department_id,
  e.status
FROM employees e
LEFT JOIN job_families jf ON e.job_family_id = jf.id
LEFT JOIN job_grades jg ON e.job_grade_id = jg.id
LEFT JOIN job_positions jp ON e.job_position_id = jp.id
LEFT JOIN salary_bands sb ON e.salary_band_id = sb.id
WHERE e.status = 'active';

-- Grant access to the view
GRANT SELECT ON employee_compensation_view TO authenticated;
