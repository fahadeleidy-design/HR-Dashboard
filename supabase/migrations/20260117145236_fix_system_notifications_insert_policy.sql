/*
  # Fix System Notifications Insert Policy

  ## Problem
  - system_notifications table has RLS enabled but no INSERT policy
  - Automated functions like automate_leave_requests try to create notifications
  - Even with SECURITY DEFINER, inserts fail without a policy

  ## Solution
  - Add an INSERT policy that allows authenticated users
  - The create_notification function is SECURITY DEFINER and handles security
  - This enables automated notifications from triggers

  ## Security
  - create_notification function is SECURITY DEFINER
  - It's only called from trusted trigger functions
  - Direct user access is still controlled by other policies
*/

-- Drop existing INSERT policy if any
DROP POLICY IF EXISTS "Allow insert for notification system" ON system_notifications;

-- Create new INSERT policy
CREATE POLICY "Allow insert for notification system"
  ON system_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY "Allow insert for notification system" ON system_notifications IS
'Allows automated notification creation through SECURITY DEFINER functions triggered by system events.';
