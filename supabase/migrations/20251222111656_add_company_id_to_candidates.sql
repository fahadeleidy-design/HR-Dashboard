/*
  # Add Company ID to Candidates Table

  1. Changes
    - Add company_id column to candidates table
    - Add foreign key constraint to companies table
    - Create index for company_id
    - Update RLS policies to use company_id

  2. Security
    - Maintain existing RLS policies
    - Add company-based access control
*/

-- Add company_id column to candidates (allow NULL initially for existing records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE candidates ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_candidates_company ON candidates(company_id);

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'status'
  ) THEN
    ALTER TABLE candidates ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'hired', 'rejected', 'withdrawn', 'blacklisted'));
  END IF;
END $$;

-- Update RLS policies for candidates
DROP POLICY IF EXISTS "Users can view company candidates" ON candidates;
CREATE POLICY "Users can view company candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()) OR company_id IS NULL);

DROP POLICY IF EXISTS "Users can create candidates" ON candidates;
CREATE POLICY "Users can create candidates"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()) OR company_id IS NULL);

DROP POLICY IF EXISTS "Users can update candidates" ON candidates;  
CREATE POLICY "Users can update candidates"
  ON candidates FOR UPDATE
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()) OR company_id IS NULL);

DROP POLICY IF EXISTS "Users can delete candidates" ON candidates;
CREATE POLICY "Users can delete candidates"
  ON candidates FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()) OR company_id IS NULL);