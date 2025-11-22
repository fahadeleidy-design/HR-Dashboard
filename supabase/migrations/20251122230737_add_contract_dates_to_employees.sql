/*
  # Add Contract Date Fields to Employees Table

  1. Changes
    - Add `contract_start_date` column to store when employment contract starts
    - Add `contract_end_date` column to store when employment contract ends (for fixed-term contracts)
    - Both fields are optional (nullable) as indefinite contracts don't have end dates

  2. Notes
    - Contract start date typically matches hire date but can differ
    - Contract end date only applies to fixed-term, temporary, seasonal contracts
    - Indefinite contracts will have NULL contract_end_date
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'contract_start_date'
  ) THEN
    ALTER TABLE employees ADD COLUMN contract_start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'contract_end_date'
  ) THEN
    ALTER TABLE employees ADD COLUMN contract_end_date date;
  END IF;
END $$;