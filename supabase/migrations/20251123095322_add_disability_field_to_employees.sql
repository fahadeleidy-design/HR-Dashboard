/*
  # Add disability field to employees table

  1. Changes
    - Add `has_disability` boolean column to employees table with default false
    - This supports the Nitaqat compliance calculation where disabled Saudi employees
      earning SAR 4,000+ count as 4.0 employees for Saudization quota

  2. Notes
    - Default value is false (not disabled)
    - This field is used for accurate Nitaqat calculations per 2024-2025 regulations
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'has_disability'
  ) THEN
    ALTER TABLE employees ADD COLUMN has_disability boolean DEFAULT false;
  END IF;
END $$;
