/*
  # Fix Employees and Employee Bank Accounts UPDATE/INSERT RLS Policies

  ## Problem
  1. `employees` UPDATE policy missing `manager` role and missing company_id scoping
     for privileged roles — HR from company A could fail to update employees in same company
     due to RLS subquery issues.
  2. `employee_bank_accounts` INSERT/UPDATE uses incorrect JOIN logic:
     `JOIN employees e ON e.company_id = ur.company_id` matches ALL employees in the company,
     not just the specific employee being modified. This can cause policy failures.

  ## Changes
  - Rebuild `employees` UPDATE policy using `get_user_role_for_company` (SECURITY DEFINER)
    which bypasses RLS for reliable role lookup, scoped to the employee's company
  - Add `manager` role to employees UPDATE policy
  - Rebuild `employee_bank_accounts` INSERT/UPDATE/DELETE policies with correct employee lookup
  - All policies properly scope access to the user's own company
*/

-- ============================================================
-- Fix employees UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "Employees can update based on role" ON employees;

CREATE POLICY "Employees can update based on role"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    -- Privileged roles can update employees in their own company
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    -- Super admin can update any employee
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
    OR
    -- Employees can update their own record (limited fields enforced at app level)
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employees.id
        AND ur.company_id = employees.company_id
    ))
  )
  WITH CHECK (
    (get_user_role_for_company(company_id) = ANY (ARRAY['hr','finance','admin','manager','super_admin']))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employees.id
        AND ur.company_id = employees.company_id
    ))
  );

-- ============================================================
-- Fix employee_bank_accounts INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Privileged roles can insert employee bank accounts" ON employee_bank_accounts;

CREATE POLICY "Privileged roles can insert employee bank accounts"
  ON employee_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can insert for any employee
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
    OR
    -- Privileged roles can insert for employees in their company
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.id = employee_bank_accounts.employee_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = e.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
    ))
    OR
    -- Employees can insert their own bank account
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employee_bank_accounts.employee_id
    ))
  );

-- ============================================================
-- Fix employee_bank_accounts UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "Privileged roles can update employee bank accounts" ON employee_bank_accounts;

CREATE POLICY "Privileged roles can update employee bank accounts"
  ON employee_bank_accounts FOR UPDATE
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.id = employee_bank_accounts.employee_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = e.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employee_bank_accounts.employee_id
    ))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.id = employee_bank_accounts.employee_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = e.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employee_bank_accounts.employee_id
    ))
  );

-- ============================================================
-- Fix employee_bank_accounts DELETE policy
-- ============================================================
DROP POLICY IF EXISTS "Privileged roles can delete employee bank accounts" ON employee_bank_accounts;

CREATE POLICY "Privileged roles can delete employee bank accounts"
  ON employee_bank_accounts FOR DELETE
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.id = employee_bank_accounts.employee_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = e.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
    ))
  );
