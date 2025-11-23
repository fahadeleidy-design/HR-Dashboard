/*
  # Comprehensive Nitaqat Configuration System

  ## Overview
  This migration creates a complete Nitaqat tracking system that supports:
  - Multiple calculation methods (26-week average vs immediate)
  - Sector-specific band thresholds
  - Size-based classifications
  - Weekly snapshot tracking
  - Historical trend analysis

  ## 1. New Tables

  ### `nitaqat_sectors`
  Defines all Saudi economic sectors with their specific characteristics.
  - `id` (uuid, primary key)
  - `name_en` (text) - Sector name in English
  - `name_ar` (text) - Sector name in Arabic
  - `code` (text, unique) - Sector code for reference
  - `description` (text) - Sector description
  - `created_at` (timestamptz)

  ### `nitaqat_size_bands`
  Defines employee count ranges for size classification.
  - `id` (uuid, primary key)
  - `sector_id` (uuid, FK to nitaqat_sectors)
  - `name` (text) - e.g., "Small", "Medium", "Large"
  - `min_employees` (integer) - Minimum employee count
  - `max_employees` (integer) - Maximum employee count (null for unlimited)
  - `uses_immediate_calculation` (boolean) - For "Small-A" grouped entities

  ### `nitaqat_bands`
  Defines the color bands (Red, Yellow, Green, Platinum) with thresholds.
  - `id` (uuid, primary key)
  - `size_band_id` (uuid, FK to nitaqat_size_bands)
  - `band_name` (text) - e.g., "Red", "Yellow", "Low Green", "Mid Green", "High Green", "Platinum"
  - `band_color` (text) - For UI display
  - `min_percentage` (numeric) - Minimum Saudi percentage
  - `max_percentage` (numeric) - Maximum Saudi percentage
  - `priority` (integer) - Sort order

  ### `nitaqat_weekly_snapshots`
  Stores weekly snapshots for 26-week average calculation.
  - `id` (uuid, primary key)
  - `company_id` (uuid, FK to companies)
  - `snapshot_date` (date) - Week ending date
  - `total_employees` (integer)
  - `saudi_employees` (integer)
  - `non_saudi_employees` (integer)
  - `effective_saudi_count` (numeric) - With multipliers applied
  - `saudi_percentage` (numeric)
  - `effective_saudi_percentage` (numeric)
  - `calculation_details` (jsonb) - Breakdown by category

  ### Updates to `companies` table
  - `nitaqat_sector_id` (uuid, FK to nitaqat_sectors)
  - `nitaqat_calculation_method` (text) - 'average_26_weeks' or 'immediate'
  - `nitaqat_qualified_for_immediate_since` (date) - When qualified for immediate method
  - `establishment_date` (date) - For new entity determination

  ### Updates to `nitaqat_tracking` table
  - `current_band_id` (uuid, FK to nitaqat_bands)
  - `calculation_method_used` (text)
  - `weeks_in_current_band` (integer)
  - `average_26_week_percentage` (numeric)

  ## 2. Security
  - Enable RLS on all new tables
  - Create policies for authenticated company users
  - Restrict access based on company membership

  ## 3. Indexes
  - Index on weekly snapshots for date range queries
  - Index on sector and size band lookups
*/

-- Create nitaqat_sectors table
CREATE TABLE IF NOT EXISTS nitaqat_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text,
  code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create nitaqat_size_bands table
CREATE TABLE IF NOT EXISTS nitaqat_size_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid REFERENCES nitaqat_sectors(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  min_employees integer NOT NULL,
  max_employees integer,
  uses_immediate_calculation boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_employee_range CHECK (max_employees IS NULL OR max_employees >= min_employees)
);

-- Create nitaqat_bands table
CREATE TABLE IF NOT EXISTS nitaqat_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size_band_id uuid REFERENCES nitaqat_size_bands(id) ON DELETE CASCADE NOT NULL,
  band_name text NOT NULL,
  band_color text NOT NULL,
  min_percentage numeric(5,2) NOT NULL,
  max_percentage numeric(5,2),
  priority integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_percentage_range CHECK (max_percentage IS NULL OR max_percentage >= min_percentage)
);

-- Create nitaqat_weekly_snapshots table
CREATE TABLE IF NOT EXISTS nitaqat_weekly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL,
  total_employees integer NOT NULL DEFAULT 0,
  saudi_employees integer NOT NULL DEFAULT 0,
  non_saudi_employees integer NOT NULL DEFAULT 0,
  effective_saudi_count numeric(10,2) NOT NULL DEFAULT 0,
  saudi_percentage numeric(5,2) NOT NULL DEFAULT 0,
  effective_saudi_percentage numeric(5,2) NOT NULL DEFAULT 0,
  calculation_details jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, snapshot_date)
);

-- Add new columns to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'nitaqat_sector_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN nitaqat_sector_id uuid REFERENCES nitaqat_sectors(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'nitaqat_calculation_method'
  ) THEN
    ALTER TABLE companies ADD COLUMN nitaqat_calculation_method text DEFAULT 'average_26_weeks' CHECK (nitaqat_calculation_method IN ('average_26_weeks', 'immediate'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'nitaqat_qualified_for_immediate_since'
  ) THEN
    ALTER TABLE companies ADD COLUMN nitaqat_qualified_for_immediate_since date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'establishment_date'
  ) THEN
    ALTER TABLE companies ADD COLUMN establishment_date date;
  END IF;
END $$;

-- Add new columns to nitaqat_tracking table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nitaqat_tracking' AND column_name = 'current_band_id'
  ) THEN
    ALTER TABLE nitaqat_tracking ADD COLUMN current_band_id uuid REFERENCES nitaqat_bands(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nitaqat_tracking' AND column_name = 'calculation_method_used'
  ) THEN
    ALTER TABLE nitaqat_tracking ADD COLUMN calculation_method_used text CHECK (calculation_method_used IN ('average_26_weeks', 'immediate'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nitaqat_tracking' AND column_name = 'weeks_in_current_band'
  ) THEN
    ALTER TABLE nitaqat_tracking ADD COLUMN weeks_in_current_band integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nitaqat_tracking' AND column_name = 'average_26_week_percentage'
  ) THEN
    ALTER TABLE nitaqat_tracking ADD COLUMN average_26_week_percentage numeric(5,2);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE nitaqat_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE nitaqat_size_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE nitaqat_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE nitaqat_weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nitaqat_sectors (public read)
CREATE POLICY "Anyone can view nitaqat sectors"
  ON nitaqat_sectors FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for nitaqat_size_bands (public read)
CREATE POLICY "Anyone can view size bands"
  ON nitaqat_size_bands FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for nitaqat_bands (public read)
CREATE POLICY "Anyone can view nitaqat bands"
  ON nitaqat_bands FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for nitaqat_weekly_snapshots
CREATE POLICY "Users can view own company snapshots"
  ON nitaqat_weekly_snapshots FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own company snapshots"
  ON nitaqat_weekly_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company snapshots"
  ON nitaqat_weekly_snapshots FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_company_date 
  ON nitaqat_weekly_snapshots(company_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_size_bands_sector 
  ON nitaqat_size_bands(sector_id);

CREATE INDEX IF NOT EXISTS idx_bands_size_band 
  ON nitaqat_bands(size_band_id, priority);

CREATE INDEX IF NOT EXISTS idx_companies_sector 
  ON companies(nitaqat_sector_id);
