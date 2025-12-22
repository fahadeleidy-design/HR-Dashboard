/*
  # Fix Employee Views RLS Policy

  1. Changes
    - Update INSERT policy for employee_views to allow users to create views for any company they can access
    - Remove dependency on user_roles table which may not have entries for all users
    - Use companies table directly since authenticated users can view all companies

  2. Security
    - Users can only create views for companies that exist (foreign key constraint)
    - Users can only set themselves as the owner (user_id check)
    - Maintains data integrity while being more user-friendly
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create views in their company" ON employee_views;

-- Create a new, more permissive policy that allows authenticated users to create views
-- for any company they can access (which is any company since SELECT is open to authenticated users)
CREATE POLICY "Users can create views for accessible companies"
  ON employee_views FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM companies WHERE id = employee_views.company_id)
  );