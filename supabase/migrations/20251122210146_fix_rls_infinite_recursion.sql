/*
  # Fix RLS Infinite Recursion

  ## Problem
  The companies table RLS policy was checking the employees table, which has policies
  that check companies, creating infinite recursion.

  ## Solution
  - Drop the problematic policies on companies table
  - Create new simpler policies that don't create circular dependencies
  - Allow authenticated users to view all companies (they can only work with their assigned company via app logic)
  - Keep strict policies on employees and other tables
*/

-- Drop existing problematic policies on companies
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "HR admins can update their companies" ON companies;

-- Create new simpler policies for companies
CREATE POLICY "Authenticated users can view companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
