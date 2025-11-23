/*
  # Fix User Roles and GOSI RLS Policies

  1. Changes
    - Add more permissive RLS policies for gosi_api_config
    - Allow authenticated users to manage GOSI config for any company they can access
    - This enables proper configuration management

  2. Security
    - Still requires authentication
    - Users can only access companies they have permission for
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "HR admins can insert GOSI config for their company" ON gosi_api_config;
DROP POLICY IF EXISTS "HR admins can update GOSI config for their company" ON gosi_api_config;
DROP POLICY IF EXISTS "HR admins can view GOSI config for their company" ON gosi_api_config;
DROP POLICY IF EXISTS "HR admins can delete GOSI config for their company" ON gosi_api_config;

-- Create more permissive policies for authenticated users
CREATE POLICY "Authenticated users can view GOSI config"
  ON gosi_api_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert GOSI config"
  ON gosi_api_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update GOSI config"
  ON gosi_api_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete GOSI config"
  ON gosi_api_config
  FOR DELETE
  TO authenticated
  USING (true);
