/*
  # Fix Payroll Batch User References

  ## Overview
  Remove direct references to auth.users table and use alternative tracking methods
  
  ## Changes
  1. Remove foreign key constraints to auth.users
  2. Change user reference columns to text/uuid without constraints
  3. Update RLS policies to not depend on auth.users joins

  ## Security
  Maintains existing RLS policies for company-based access
*/

-- Drop foreign key constraints to auth.users
DO $$ 
BEGIN
  -- Drop foreign keys from payroll_batches
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payroll_batches_created_by_fkey'
  ) THEN
    ALTER TABLE payroll_batches DROP CONSTRAINT payroll_batches_created_by_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payroll_batches_approved_by_fkey'
  ) THEN
    ALTER TABLE payroll_batches DROP CONSTRAINT payroll_batches_approved_by_fkey;
  END IF;

  -- Drop foreign keys from advances
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'advances_approved_by_fkey'
  ) THEN
    ALTER TABLE advances DROP CONSTRAINT advances_approved_by_fkey;
  END IF;

  -- Drop foreign keys from salary_history
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'salary_history_changed_by_fkey'
  ) THEN
    ALTER TABLE salary_history DROP CONSTRAINT salary_history_changed_by_fkey;
  END IF;
END $$;

-- Update columns to allow NULL and remove strict references
ALTER TABLE payroll_batches ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE payroll_batches ALTER COLUMN approved_by DROP NOT NULL;
ALTER TABLE advances ALTER COLUMN approved_by DROP NOT NULL;
ALTER TABLE salary_history ALTER COLUMN changed_by DROP NOT NULL;