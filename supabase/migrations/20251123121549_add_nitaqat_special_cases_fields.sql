/*
  # Add Nitaqat Special Cases Fields to Employees

  1. New Fields for Special Nitaqat Cases
    - employee_category: Type of employee for Nitaqat calculation
    - is_student: Saudi student (0.5x multiplier, max 10-40%)
    - is_part_time: Part-time worker (0.5x multiplier)
    - is_remote_worker: Remote worker (1.0x as Saudi)
    - is_former_prisoner: Former prisoner (2.0x multiplier, max 10%)
    - is_displaced_tribe: From displaced tribes (1.0x as Saudi)
    - is_gcc_national: GCC citizen (1.0x as Saudi)
    - is_athlete: Non-Saudi athlete (1.0x as Saudi)
    - is_owner: Business owner (1.0x as Saudi)
    - is_borrowed_employee: Borrowed from another establishment (1.0x as Saudi)
    - is_special_expat_family: Wife/husband of special expat (0x, no effect)
    - is_palestinian_egyptian: Palestinian with Egyptian passport (0.25x)
    - is_baluchi: Baluchi nationality (0.25x)
    - is_burmese: Myanmar/Burmese (0x except Makkah/Madinah)
    - work_region: For Burmese calculation (Makkah/Madinah vs other)
    - has_muawama_certificate: For establishments with disabled workers
    - parent_employee_id: Reference to parent employee (for son/daughter/mother/widow calculation)
    - relationship_to_parent: Type of relationship (son, daughter, mother, widow)
    
  2. Nitaqat Calculation Method
    - nitaqat_calculation_method: traditional (26-week avg) or immediate (1-week)
    
  3. Documentation
    - Comprehensive comments explaining each special case
    - References to Saudi Ministry of HR guidelines

  ## Special Case Rules Summary
  
  ### Higher Multipliers (> 1.0)
  - Disabled Saudi (< 50 employees): 4.0x (max 10% of Saudis)
  - Disabled Saudi (≥ 50 employees): 2.0x (max 10% of Saudis, needs Muawama)
  - Former prisoner: 2.0x (max 10% of employees)
  
  ### Lower Multipliers (< 1.0)
  - Saudi student: 0.5x (max 10%, or 40% in food/retail)
  - Part-time Saudi: 0.5x
  
  ### Counted as 1.0 Saudi
  - Remote Saudi worker
  - Employee's son/daughter
  - Employee's mother/widow
  - Displaced tribe members
  - GCC nationals
  - Non-Saudi athletes
  - Owners (Saudi or non-Saudi)
  - Borrowed employees
  
  ### Lower Expatriate Count
  - Palestinian with Egyptian passport: 0.25x (max 50%)
  - Baluchi: 0.25x (max 50%)
  - Burmese: 0x (except 1x in Makkah/Madinah)
  
  ### No Effect on Calculation
  - Special expat family members (wife/husband)
*/

-- Add special case fields to employees table
DO $$
BEGIN
  -- Employment special cases
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_student') THEN
    ALTER TABLE employees ADD COLUMN is_student boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_part_time') THEN
    ALTER TABLE employees ADD COLUMN is_part_time boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_remote_worker') THEN
    ALTER TABLE employees ADD COLUMN is_remote_worker boolean DEFAULT false;
  END IF;

  -- Special Saudi categories (higher multiplier)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_former_prisoner') THEN
    ALTER TABLE employees ADD COLUMN is_former_prisoner boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'has_muawama_certificate') THEN
    ALTER TABLE employees ADD COLUMN has_muawama_certificate boolean DEFAULT false;
  END IF;

  -- Counted as Saudi (1.0x multiplier)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_displaced_tribe') THEN
    ALTER TABLE employees ADD COLUMN is_displaced_tribe boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_gcc_national') THEN
    ALTER TABLE employees ADD COLUMN is_gcc_national boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_athlete') THEN
    ALTER TABLE employees ADD COLUMN is_athlete boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_owner') THEN
    ALTER TABLE employees ADD COLUMN is_owner boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_borrowed_employee') THEN
    ALTER TABLE employees ADD COLUMN is_borrowed_employee boolean DEFAULT false;
  END IF;

  -- Family relationship tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'parent_employee_id') THEN
    ALTER TABLE employees ADD COLUMN parent_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'relationship_to_parent') THEN
    ALTER TABLE employees ADD COLUMN relationship_to_parent text;
  END IF;

  -- Special expat categories (no effect or lower count)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_special_expat_family') THEN
    ALTER TABLE employees ADD COLUMN is_special_expat_family boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_palestinian_egyptian') THEN
    ALTER TABLE employees ADD COLUMN is_palestinian_egyptian boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_baluchi') THEN
    ALTER TABLE employees ADD COLUMN is_baluchi boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'is_burmese') THEN
    ALTER TABLE employees ADD COLUMN is_burmese boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'work_region') THEN
    ALTER TABLE employees ADD COLUMN work_region text;
  END IF;

  -- Nitaqat calculation tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'nitaqat_multiplier') THEN
    ALTER TABLE employees ADD COLUMN nitaqat_multiplier numeric(4,2) DEFAULT 1.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'excluded_from_nitaqat') THEN
    ALTER TABLE employees ADD COLUMN excluded_from_nitaqat boolean DEFAULT false;
  END IF;
END $$;

-- Add company-level Nitaqat configuration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'nitaqat_calculation_method') THEN
    ALTER TABLE companies ADD COLUMN nitaqat_calculation_method text DEFAULT 'traditional';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'nitaqat_entity_size') THEN
    ALTER TABLE companies ADD COLUMN nitaqat_entity_size text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'nitaqat_activity_code') THEN
    ALTER TABLE companies ADD COLUMN nitaqat_activity_code text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_food_or_retail') THEN
    ALTER TABLE companies ADD COLUMN is_food_or_retail boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'total_employees_count') THEN
    ALTER TABLE companies ADD COLUMN total_employees_count integer DEFAULT 0;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN employees.is_student IS 'Saudi student: 0.5x multiplier (max 10% or 40% in food/retail)';
COMMENT ON COLUMN employees.is_part_time IS 'Part-time worker: 0.5x multiplier';
COMMENT ON COLUMN employees.is_remote_worker IS 'Remote worker: counted as 1.0 Saudi';
COMMENT ON COLUMN employees.has_disability IS 'Disabled employee: 4.0x if < 50 employees, 2.0x if ≥ 50 (max 10%)';
COMMENT ON COLUMN employees.is_former_prisoner IS 'Former prisoner: 2.0x multiplier (max 10%)';
COMMENT ON COLUMN employees.is_displaced_tribe IS 'Displaced tribe member: counted as 1.0 Saudi';
COMMENT ON COLUMN employees.is_gcc_national IS 'GCC citizen: counted as 1.0 Saudi';
COMMENT ON COLUMN employees.is_athlete IS 'Non-Saudi athlete: counted as 1.0 Saudi';
COMMENT ON COLUMN employees.is_owner IS 'Business owner: counted as 1.0 Saudi';
COMMENT ON COLUMN employees.is_borrowed_employee IS 'Borrowed employee: counted as 1.0 Saudi';
COMMENT ON COLUMN employees.parent_employee_id IS 'Parent employee reference for son/daughter/mother/widow (counted as 1.0 Saudi)';
COMMENT ON COLUMN employees.relationship_to_parent IS 'Relationship type: son, daughter, mother, widow';
COMMENT ON COLUMN employees.is_special_expat_family IS 'Special expat family member: no effect on Nitaqat';
COMMENT ON COLUMN employees.is_palestinian_egyptian IS 'Palestinian with Egyptian passport: 0.25x (max 50%)';
COMMENT ON COLUMN employees.is_baluchi IS 'Baluchi: 0.25x (max 50%)';
COMMENT ON COLUMN employees.is_burmese IS 'Burmese: 0x except 1x in Makkah/Madinah';
COMMENT ON COLUMN employees.work_region IS 'Work region (for Burmese calculation)';
COMMENT ON COLUMN employees.has_muawama_certificate IS 'Muawama certificate for establishments ≥ 50 employees with disabled workers';
COMMENT ON COLUMN employees.nitaqat_multiplier IS 'Calculated Nitaqat multiplier based on special cases';
COMMENT ON COLUMN employees.excluded_from_nitaqat IS 'Exclude this employee from Nitaqat calculation entirely';

COMMENT ON COLUMN companies.nitaqat_calculation_method IS 'Calculation method: traditional (26-week avg) or immediate (1-week)';
COMMENT ON COLUMN companies.nitaqat_entity_size IS 'Entity size classification for Nitaqat (small-a, small, medium, large)';
COMMENT ON COLUMN companies.nitaqat_activity_code IS 'Primary activity code registered with Ministry';
COMMENT ON COLUMN companies.is_food_or_retail IS 'Food or retail sector (allows 40% students instead of 10%)';
COMMENT ON COLUMN companies.total_employees_count IS 'Current total employee count for Nitaqat calculation';

-- Create index for parent employee lookups
CREATE INDEX IF NOT EXISTS idx_employees_parent ON employees(parent_employee_id) WHERE parent_employee_id IS NOT NULL;

-- Create index for special case queries
CREATE INDEX IF NOT EXISTS idx_employees_nitaqat_flags ON employees(is_saudi, has_disability, is_student, is_part_time) WHERE status = 'active';
