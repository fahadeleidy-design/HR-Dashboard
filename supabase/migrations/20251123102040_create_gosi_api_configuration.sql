/*
  # Create GOSI API Configuration Table

  1. New Tables
    - `gosi_api_config`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies) - One config per company
      - `establishment_number` (text) - GOSI establishment number
      - `username` (text) - GOSI API username
      - `api_key` (text) - Encrypted API key
      - `certificate_path` (text) - Path to certificate if needed
      - `environment` (text) - sandbox or production
      - `last_sync_date` (timestamp) - Last successful sync
      - `sync_enabled` (boolean) - Enable/disable automatic sync
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `gosi_api_config` table
    - Only authorized HR admins can view/edit GOSI credentials
    - API keys should be encrypted at rest

  3. Notes
    - GOSI (General Organization for Social Insurance) integration
    - Allows automatic employee registration and wage reporting
    - Supports fetching GOSI contribution reports
    - Important: API credentials are sensitive and must be secured
*/

CREATE TABLE IF NOT EXISTS gosi_api_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  establishment_number text,
  username text,
  api_key text,
  certificate_path text,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  last_sync_date timestamptz,
  sync_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gosi_api_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can view GOSI config for their company"
  ON gosi_api_config FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'hr_admin', 'hr_manager')
    )
  );

CREATE POLICY "HR admins can insert GOSI config for their company"
  ON gosi_api_config FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'hr_admin')
    )
  );

CREATE POLICY "HR admins can update GOSI config for their company"
  ON gosi_api_config FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'hr_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'hr_admin')
    )
  );

CREATE POLICY "HR admins can delete GOSI config for their company"
  ON gosi_api_config FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'hr_admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_gosi_config_company ON gosi_api_config(company_id);

-- Create GOSI sync logs table
CREATE TABLE IF NOT EXISTS gosi_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('employee_registration', 'wage_report', 'contribution_fetch', 'full_sync')),
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed')),
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gosi_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GOSI sync logs for their company"
  ON gosi_sync_logs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert GOSI sync logs"
  ON gosi_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_gosi_logs_company ON gosi_sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_gosi_logs_status ON gosi_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_gosi_logs_created ON gosi_sync_logs(created_at DESC);
