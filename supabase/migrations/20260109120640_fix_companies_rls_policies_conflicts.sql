/*
  # Fix Companies RLS Policies Conflicts

  This migration removes conflicting RLS policies on the companies table.

  ## Changes

  1. RLS Policies
    - Remove old conflicting policies that allowed all authenticated users to view all companies
    - Keep only the new policy that properly restricts access based on roles

  ## Security

  - Maintains security for employee role (restricted to assigned companies only)
  - Grants access to all companies for super_admin, hr, and finance roles
*/

-- Drop conflicting old policies
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON companies;

-- Ensure RLS is enabled on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
