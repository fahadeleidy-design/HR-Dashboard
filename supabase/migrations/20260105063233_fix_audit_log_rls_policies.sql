/*
  # Fix Audit Log RLS Policies

  1. Purpose
    - Add RLS policies to audit_log table to allow the audit trigger to function
    - The audit trigger fails when it tries to insert into audit_log due to missing policies

  2. Changes
    - Add INSERT policy for authenticated users (used by audit trigger)
    - Add SELECT policy for super_admin and authorized users
    - Ensure audit logging works for all operations

  3. Security
    - Only authenticated users can create audit logs (via triggers)
    - Only super_admin can view all audit logs
    - Users can view audit logs for their own company
*/

-- Drop any existing policies on audit_log
DROP POLICY IF EXISTS "Allow audit trigger inserts" ON audit_log;
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON audit_log;
DROP POLICY IF EXISTS "Users can view company audit logs" ON audit_log;

-- Allow all authenticated users to insert audit logs (needed for triggers)
-- The trigger function is SECURITY DEFINER so it runs with elevated privileges
-- But the insert still happens in the context of the authenticated user
CREATE POLICY "Allow audit trigger inserts"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Super admin can view all audit logs
CREATE POLICY "Super admin can view all audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- Users can view audit logs for their own company
CREATE POLICY "Users can view company audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'super_admin')
    )
  );
