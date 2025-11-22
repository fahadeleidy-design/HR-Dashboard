/*
  # Update Employment Type for Saudi Labor Law Compliance

  This migration updates the employment_type field to align with Saudi Labor Law contract types.

  ## Changes
  
  1. Updates `employees` table
    - Changes employment_type CHECK constraint to support Saudi labor law contract types:
      - `indefinite` - Indefinite/permanent contract (عقد غير محدد المدة)
      - `fixed_term` - Fixed-term contract (عقد محدد المدة)
      - `temporary` - Temporary/project-based contract (عقد مؤقت)
      - `part_time` - Part-time contract (عقد دوام جزئي)
      - `seasonal` - Seasonal contract (عقد موسمي)
    
  2. Data Migration
    - Converts existing 'full_time' values to 'indefinite'
    - Converts existing 'contract' values to 'fixed_term'
    - Keeps 'part_time' as is

  ## Saudi Labor Law Reference
  
  According to Saudi Labor Law, employment contracts are categorized as:
  - Indefinite contracts: No fixed end date
  - Fixed-term contracts: Specific duration, maximum 4 years renewable
  - Temporary/seasonal: For specific projects or seasonal work
*/

-- Step 1: Drop the old constraint first
ALTER TABLE employees 
DROP CONSTRAINT IF EXISTS employees_employment_type_check;

-- Step 2: Update existing data to match new contract types
UPDATE employees 
SET employment_type = 'indefinite' 
WHERE employment_type = 'full_time';

UPDATE employees 
SET employment_type = 'fixed_term' 
WHERE employment_type = 'contract';

-- Step 3: Add new constraint with Saudi labor law contract types
ALTER TABLE employees 
ADD CONSTRAINT employees_employment_type_check 
CHECK (employment_type IN ('indefinite', 'fixed_term', 'temporary', 'part_time', 'seasonal'));

-- Step 4: Update the default value
ALTER TABLE employees 
ALTER COLUMN employment_type SET DEFAULT 'indefinite';