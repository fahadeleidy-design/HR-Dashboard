/*
  # Create governmental subscriptions management table

  1. New Tables
    - `governmental_subscriptions`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `platform_name` (text) - Name of the government platform (Qiwa, Mudad, Muqeem, etc.)
      - `platform_name_ar` (text) - Arabic name of the platform
      - `subscription_type` (text) - Type/tier of subscription
      - `username` (text) - Login username for the platform
      - `account_number` (text) - Account or entity number
      - `subscription_status` (text) - active, expired, suspended
      - `start_date` (date) - Subscription start date
      - `expiry_date` (date) - Subscription expiry date
      - `annual_cost` (numeric) - Annual subscription cost in SAR
      - `payment_frequency` (text) - monthly, quarterly, annual
      - `contact_person` (text) - Person responsible for this subscription
      - `contact_phone` (text) - Contact phone number
      - `contact_email` (text) - Contact email
      - `api_key` (text) - API key if applicable (encrypted)
      - `notes` (text) - Additional notes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `governmental_subscriptions` table
    - Add policies for authenticated users to manage subscriptions for their company

  3. Notes
    - Covers major Saudi government platforms like Qiwa (labor), Mudad (employee services), 
      Muqeem (immigration), GOSI, Zakat, Tax Authority, Chamber of Commerce, etc.
    - Helps companies track all government platform subscriptions in one place
    - Important for compliance and operational continuity
*/

CREATE TABLE IF NOT EXISTS governmental_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  platform_name text NOT NULL,
  platform_name_ar text,
  subscription_type text,
  username text,
  account_number text,
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'suspended', 'cancelled')),
  start_date date,
  expiry_date date,
  annual_cost numeric DEFAULT 0,
  payment_frequency text DEFAULT 'annual' CHECK (payment_frequency IN ('monthly', 'quarterly', 'annual', 'one_time')),
  contact_person text,
  contact_phone text,
  contact_email text,
  api_key text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE governmental_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscriptions for their company"
  ON governmental_subscriptions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert subscriptions for their company"
  ON governmental_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update subscriptions for their company"
  ON governmental_subscriptions FOR UPDATE
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

CREATE POLICY "Users can delete subscriptions for their company"
  ON governmental_subscriptions FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_gov_subscriptions_company ON governmental_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_gov_subscriptions_status ON governmental_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_gov_subscriptions_expiry ON governmental_subscriptions(expiry_date);
