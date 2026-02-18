/*
  # Add test email field to SMTP configuration

  1. Changes
    - Add test_email field to email_smtp_config table
    - This field stores an email address for sending test emails
    - Optional field that defaults to null
    - Used for testing email configuration without sending to real users

  2. Purpose
    - Allow administrators to specify a test email address
    - Useful for testing SMTP configuration safely
    - Prevents accidental emails to users during testing
*/

-- Add test_email field to email_smtp_config table
ALTER TABLE email_smtp_config
ADD COLUMN IF NOT EXISTS test_email text;

-- Add comment for documentation
COMMENT ON COLUMN email_smtp_config.test_email IS 'Email address to use for testing SMTP configuration (optional)';
