/*
  # Fix Employee Views SELECT Policy

  1. Changes
    - Update SELECT policy for employee_views to not depend on user_roles
    - Allow users to view their own views and shared views from accessible companies
    - Simplifies policy while maintaining security

  2. Security
    - Users can view their own views regardless of company
    - Users can view shared views from companies they can access
    - Maintains privacy for non-shared personal views
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view own and shared views in their company" ON employee_views;

-- Create a new, simpler policy
CREATE POLICY "Users can view their own and shared views"
  ON employee_views FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (is_shared = true AND EXISTS (SELECT 1 FROM companies WHERE id = employee_views.company_id))
  );