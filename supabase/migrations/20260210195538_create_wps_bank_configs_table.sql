/*
  # Create WPS Bank Configuration Table

  1. New Tables
    - `wps_bank_configs`
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK to companies)
      - `bank_code` (text) - SAMA bank code
      - `bank_name_en` (text) - bank name in English
      - `bank_name_ar` (text) - bank name in Arabic
      - `mol_establishment_id` (text) - Ministry of Labor establishment ID
      - `employer_iban` (text) - company IBAN for salary disbursement
      - `file_format` (text) - WPS file format: standard, rajhi, ncb, riyadh, etc.
      - `header_template` (jsonb) - bank-specific header fields
      - `record_template` (jsonb) - bank-specific record fields
      - `footer_template` (jsonb) - bank-specific footer fields
      - `is_active` (boolean, default true)
      - `is_default` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - RLS enabled
    - Policies restrict to admin and finance roles
    - Only one default bank config per company enforced via trigger

  3. Indexes
    - company_id + bank_code for lookups
    - company_id + is_default for default bank resolution
*/

CREATE TABLE IF NOT EXISTS wps_bank_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_code text NOT NULL,
  bank_name_en text NOT NULL,
  bank_name_ar text NOT NULL DEFAULT '',
  mol_establishment_id text NOT NULL DEFAULT '',
  employer_iban text NOT NULL DEFAULT '',
  file_format text NOT NULL DEFAULT 'standard',
  header_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  footer_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wps_bank_configs_format_check CHECK (
    file_format IN ('standard', 'rajhi', 'ncb', 'riyadh', 'sabb', 'bsf', 'anb', 'sib', 'custom')
  ),
  UNIQUE(company_id, bank_code)
);

ALTER TABLE wps_bank_configs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wps_bank_configs_company
  ON wps_bank_configs(company_id);

CREATE INDEX IF NOT EXISTS idx_wps_bank_configs_default
  ON wps_bank_configs(company_id, is_default)
  WHERE is_default = true;

-- Ensure only one default bank per company
CREATE OR REPLACE FUNCTION enforce_single_default_bank()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE wps_bank_configs
    SET is_default = false
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wps_bank_configs_single_default
  BEFORE INSERT OR UPDATE ON wps_bank_configs
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_bank();

-- Updated_at trigger
CREATE TRIGGER wps_bank_configs_updated_at
  BEFORE UPDATE ON wps_bank_configs
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

-- RLS Policies
CREATE POLICY "Finance and admin roles can view WPS bank configs"
  ON wps_bank_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr', 'finance')
      AND (company_id = wps_bank_configs.company_id OR role = 'super_admin')
    )
  );

CREATE POLICY "Admin roles can insert WPS bank configs"
  ON wps_bank_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
      AND (company_id = wps_bank_configs.company_id OR role = 'super_admin')
    )
  );

CREATE POLICY "Admin roles can update WPS bank configs"
  ON wps_bank_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
      AND (company_id = wps_bank_configs.company_id OR role = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
      AND (company_id = wps_bank_configs.company_id OR role = 'super_admin')
    )
  );

CREATE POLICY "Admin roles can delete WPS bank configs"
  ON wps_bank_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND (company_id = wps_bank_configs.company_id OR role = 'super_admin')
    )
  );