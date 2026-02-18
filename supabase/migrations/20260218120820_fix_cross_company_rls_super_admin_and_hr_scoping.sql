/*
  # Fix Cross-Company RLS for Super Admin and HR Roles

  ## Problem
  1. `super_admin` user has a `user_roles` row tied to only ONE company. When editing
     employees in other companies, `get_user_role_for_company()` returns NULL, blocking updates.
  2. All policies need a reliable SECURITY DEFINER function to check if the current user
     is a super_admin regardless of which company_id their row is in.

  ## Solution
  - Create `is_super_admin()` SECURITY DEFINER function that checks super_admin role
    across any company (bypasses RLS safely)
  - Rebuild `employees` ALL policies to use this function
  - Rebuild `employee_bank_accounts` ALL policies to use this function
  - HR/finance/admin remain scoped to their own company
  - Super admin has unrestricted access across all companies
*/

-- ============================================================
-- Create is_super_admin() helper (SECURITY DEFINER bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  );
$$;

-- ============================================================
-- Rebuild all employees policies
-- ============================================================
DROP POLICY IF EXISTS "HR and Admin can insert employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can delete employees" ON employees;
DROP POLICY IF EXISTS "Employees can view based on role" ON employees;
DROP POLICY IF EXISTS "Employees can update based on role" ON employees;

-- SELECT: super_admin sees all, others see own company
CREATE POLICY "Employees can view based on role"
  ON employees FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = employees.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
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

-- INSERT: super_admin anywhere, others scoped to their company
CREATE POLICY "HR and Admin can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = employees.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin'])
    ))
  );

-- UPDATE: super_admin anywhere, HR/finance/admin/manager scoped to their company
CREATE POLICY "Employees can update based on role"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = employees.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employees.id
        AND ur.company_id = employees.company_id
    ))
  )
  WITH CHECK (
    is_super_admin()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = employees.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
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

-- DELETE: super_admin anywhere, HR/admin/manager scoped to their company
CREATE POLICY "HR and Admin can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = employees.company_id
        AND ur.role = ANY (ARRAY['hr','admin','manager'])
    ))
  );

-- ============================================================
-- Rebuild all employee_bank_accounts policies
-- ============================================================
DROP POLICY IF EXISTS "Own or privileged can view bank accounts" ON employee_bank_accounts;
DROP POLICY IF EXISTS "Privileged roles can insert employee bank accounts" ON employee_bank_accounts;
DROP POLICY IF EXISTS "Privileged roles can update employee bank accounts" ON employee_bank_accounts;
DROP POLICY IF EXISTS "Privileged roles can delete employee bank accounts" ON employee_bank_accounts;

-- SELECT
CREATE POLICY "Own or privileged can view bank accounts"
  ON employee_bank_accounts FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
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

-- INSERT
CREATE POLICY "Privileged roles can insert employee bank accounts"
  ON employee_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
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

-- UPDATE
CREATE POLICY "Privileged roles can update employee bank accounts"
  ON employee_bank_accounts FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
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
    is_super_admin()
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

-- DELETE
CREATE POLICY "Privileged roles can delete employee bank accounts"
  ON employee_bank_accounts FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON e.id = employee_bank_accounts.employee_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = e.company_id
        AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
    ))
  );

-- ============================================================
-- Fix salary_adjustments to also use is_super_admin()
-- ============================================================
DROP POLICY IF EXISTS "Privileged roles can insert salary adjustments" ON salary_adjustments;
DROP POLICY IF EXISTS "Privileged roles can update salary adjustments" ON salary_adjustments;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salary_adjustments') THEN
    -- Rebuild SELECT policy too if it exists
    DROP POLICY IF EXISTS "Privileged roles can view salary adjustments" ON salary_adjustments;

    CREATE POLICY "Privileged roles can view salary adjustments"
      ON salary_adjustments FOR SELECT
      TO authenticated
      USING (
        is_super_admin()
        OR
        (EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.company_id = salary_adjustments.company_id
            AND ur.role = ANY (ARRAY['hr','finance','admin','manager'])
        ))
      );

    CREATE POLICY "Privileged roles can insert salary adjustments"
      ON salary_adjustments FOR INSERT
      TO authenticated
      WITH CHECK (
        is_super_admin()
        OR
        (EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.company_id = salary_adjustments.company_id
            AND ur.role = ANY (ARRAY['hr','finance','admin'])
        ))
      );

    CREATE POLICY "Privileged roles can update salary adjustments"
      ON salary_adjustments FOR UPDATE
      TO authenticated
      USING (
        is_super_admin()
        OR
        (EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.company_id = salary_adjustments.company_id
            AND ur.role = ANY (ARRAY['hr','finance','admin'])
        ))
      )
      WITH CHECK (
        is_super_admin()
        OR
        (EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.company_id = salary_adjustments.company_id
            AND ur.role = ANY (ARRAY['hr','finance','admin'])
        ))
      );
  END IF;
END $$;
