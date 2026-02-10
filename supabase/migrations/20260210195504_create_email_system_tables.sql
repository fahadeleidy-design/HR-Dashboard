/*
  # Create Email System Tables

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK to companies)
      - `template_key` (text) - unique identifier like 'leave_approved', 'payroll_ready'
      - `name` (text) - human-readable template name
      - `subject` (text) - email subject with variable placeholders
      - `body_html` (text) - HTML body with variable placeholders
      - `body_text` (text) - plain text fallback
      - `variables` (jsonb) - list of available placeholder variables
      - `category` (text) - grouping: hr, payroll, leave, compliance, system
      - `is_active` (boolean, default true)
      - `language` (text, default 'en') - en or ar
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `email_queue`
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK to companies)
      - `template_id` (uuid, FK to email_templates, nullable)
      - `to_email` (text) - recipient email
      - `to_name` (text) - recipient display name
      - `from_email` (text) - sender email
      - `from_name` (text) - sender display name
      - `subject` (text) - rendered subject
      - `body_html` (text) - rendered HTML body
      - `body_text` (text) - rendered plain text body
      - `status` (text) - pending, sending, sent, failed, cancelled
      - `priority` (integer, default 5) - 1=highest, 10=lowest
      - `retry_count` (integer, default 0)
      - `max_retries` (integer, default 3)
      - `last_error` (text) - last error message
      - `scheduled_at` (timestamptz) - when to send
      - `sent_at` (timestamptz) - when actually sent
      - `metadata` (jsonb) - additional context
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `email_smtp_config`
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK to companies, unique)
      - `smtp_host` (text) - SMTP server hostname
      - `smtp_port` (integer) - SMTP port
      - `smtp_secure` (boolean) - use TLS
      - `smtp_user` (text) - SMTP username
      - `smtp_pass_encrypted` (text) - encrypted password via vault
      - `default_from_email` (text)
      - `default_from_name` (text)
      - `is_active` (boolean, default false)
      - `last_tested_at` (timestamptz)
      - `last_test_result` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - RLS enabled on all three tables
    - Policies restrict access to authenticated users with proper roles
    - SMTP config restricted to super_admin and admin roles only

  3. Indexes
    - email_queue: status + scheduled_at for queue processing
    - email_queue: company_id + status for dashboard queries
    - email_templates: company_id + template_key for lookups
*/

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'system',
  is_active boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, template_key, language)
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_templates_company_key
  ON email_templates(company_id, template_key);

CREATE INDEX IF NOT EXISTS idx_email_templates_category
  ON email_templates(company_id, category);

-- Email Queue Table
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  to_name text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 5,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_queue_status_check CHECK (
    status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')
  ),
  CONSTRAINT email_queue_priority_check CHECK (
    priority BETWEEN 1 AND 10
  )
);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_queue_processing
  ON email_queue(status, scheduled_at, priority)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_company_status
  ON email_queue(company_id, status);

CREATE INDEX IF NOT EXISTS idx_email_queue_retry
  ON email_queue(status, retry_count)
  WHERE status = 'failed' AND retry_count < 3;

-- Email SMTP Configuration Table
CREATE TABLE IF NOT EXISTS email_smtp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_secure boolean NOT NULL DEFAULT true,
  smtp_user text NOT NULL DEFAULT '',
  smtp_pass_encrypted text NOT NULL DEFAULT '',
  default_from_email text NOT NULL DEFAULT '',
  default_from_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  last_test_result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE email_smtp_config ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has admin role for a company
CREATE OR REPLACE FUNCTION has_email_admin_role(check_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'hr')
    AND (company_id = check_company_id OR role = 'super_admin')
  );
$$;

-- RLS Policies for email_templates
CREATE POLICY "Users with admin roles can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (has_email_admin_role(company_id));

CREATE POLICY "Users with admin roles can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (has_email_admin_role(company_id));

CREATE POLICY "Users with admin roles can update email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (has_email_admin_role(company_id))
  WITH CHECK (has_email_admin_role(company_id));

CREATE POLICY "Users with admin roles can delete email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (has_email_admin_role(company_id));

-- RLS Policies for email_queue
CREATE POLICY "Users with admin roles can view email queue"
  ON email_queue FOR SELECT
  TO authenticated
  USING (has_email_admin_role(company_id));

CREATE POLICY "Authenticated users can queue emails via functions"
  ON email_queue FOR INSERT
  TO authenticated
  WITH CHECK (has_email_admin_role(company_id));

CREATE POLICY "Users with admin roles can update email queue"
  ON email_queue FOR UPDATE
  TO authenticated
  USING (has_email_admin_role(company_id))
  WITH CHECK (has_email_admin_role(company_id));

CREATE POLICY "Users with admin roles can delete from email queue"
  ON email_queue FOR DELETE
  TO authenticated
  USING (has_email_admin_role(company_id));

-- RLS Policies for email_smtp_config (restricted to super_admin and admin only)
CREATE POLICY "Only admins can view SMTP config"
  ON email_smtp_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND (company_id = email_smtp_config.company_id OR role = 'super_admin')
    )
  );

CREATE POLICY "Only admins can insert SMTP config"
  ON email_smtp_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND (company_id = email_smtp_config.company_id OR role = 'super_admin')
    )
  );

CREATE POLICY "Only admins can update SMTP config"
  ON email_smtp_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND (company_id = email_smtp_config.company_id OR role = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND (company_id = email_smtp_config.company_id OR role = 'super_admin')
    )
  );

CREATE POLICY "Only admins can delete SMTP config"
  ON email_smtp_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND (company_id = email_smtp_config.company_id OR role = 'super_admin')
    )
  );

-- Function to queue an email from a template
CREATE OR REPLACE FUNCTION queue_template_email(
  p_company_id uuid,
  p_template_key text,
  p_to_email text,
  p_to_name text DEFAULT '',
  p_variables jsonb DEFAULT '{}'::jsonb,
  p_priority integer DEFAULT 5,
  p_scheduled_at timestamptz DEFAULT now(),
  p_language text DEFAULT 'en'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template email_templates%ROWTYPE;
  v_smtp email_smtp_config%ROWTYPE;
  v_subject text;
  v_body_html text;
  v_body_text text;
  v_queue_id uuid;
  v_key text;
  v_value text;
BEGIN
  SELECT * INTO v_template
  FROM email_templates
  WHERE company_id = p_company_id
    AND template_key = p_template_key
    AND language = p_language
    AND is_active = true
  LIMIT 1;

  IF v_template.id IS NULL THEN
    SELECT * INTO v_template
    FROM email_templates
    WHERE company_id = p_company_id
      AND template_key = p_template_key
      AND language = 'en'
      AND is_active = true
    LIMIT 1;
  END IF;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Email template not found: %', p_template_key;
  END IF;

  SELECT * INTO v_smtp
  FROM email_smtp_config
  WHERE company_id = p_company_id
    AND is_active = true
  LIMIT 1;

  v_subject := v_template.subject;
  v_body_html := v_template.body_html;
  v_body_text := v_template.body_text;

  FOR v_key, v_value IN SELECT key, value #>> '{}' FROM jsonb_each(p_variables)
  LOOP
    v_subject := replace(v_subject, '{{' || v_key || '}}', v_value);
    v_body_html := replace(v_body_html, '{{' || v_key || '}}', v_value);
    v_body_text := replace(v_body_text, '{{' || v_key || '}}', v_value);
  END LOOP;

  INSERT INTO email_queue (
    company_id, template_id, to_email, to_name,
    from_email, from_name, subject, body_html, body_text,
    status, priority, scheduled_at
  ) VALUES (
    p_company_id, v_template.id, p_to_email, p_to_name,
    COALESCE(v_smtp.default_from_email, ''),
    COALESCE(v_smtp.default_from_name, ''),
    v_subject, v_body_html, v_body_text,
    'pending', p_priority, p_scheduled_at
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_email_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();

CREATE TRIGGER email_smtp_config_updated_at
  BEFORE UPDATE ON email_smtp_config
  FOR EACH ROW EXECUTE FUNCTION update_email_updated_at();