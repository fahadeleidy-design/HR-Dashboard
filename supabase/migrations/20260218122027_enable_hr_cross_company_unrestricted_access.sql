/*
  # Enable HR Role Cross-Company Unrestricted Access

  ## Purpose
  Allow HR users to edit employee data, salary, and IBAN across ALL companies
  without being restricted to only their assigned company.

  ## Approach
  Create `is_hr_or_above()` SECURITY DEFINER function that returns true if
  the current user has hr, admin, finance, or super_admin role in ANY company.
  
  Update all relevant table policies to use this function so HR users can
  act across all companies.

  ## Tables Updated
  - employees (SELECT, INSERT, UPDATE, DELETE)
  - employee_bank_accounts (SELECT, INSERT, UPDATE, DELETE)
  - salary_adjustments (SELECT, INSERT, UPDATE, DELETE)
  - payroll_batches (SELECT, INSERT, UPDATE, DELETE)
  - payroll_components (ALL)
  - payroll_batch_items (SELECT, INSERT, UPDATE)
*/

-- ============================================================
-- Create is_hr_or_above() helper (SECURITY DEFINER bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION is_hr_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['hr', 'admin', 'finance', 'super_admin'])
  );
$$;

-- ============================================================
-- Rebuild employees policies — HR unrestricted across companies
-- ============================================================
DROP POLICY IF EXISTS "Employees can view based on role" ON employees;
DROP POLICY IF EXISTS "HR and Admin can insert employees" ON employees;
DROP POLICY IF EXISTS "Employees can update based on role" ON employees;
DROP POLICY IF EXISTS "HR and Admin can delete employees" ON employees;

CREATE POLICY "Employees can view based on role"
  ON employees FOR SELECT
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = employees.company_id
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

CREATE POLICY "HR and Admin can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = employees.company_id
    ))
  );

CREATE POLICY "Employees can update based on role"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = employees.company_id
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
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = employees.company_id
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

CREATE POLICY "HR and Admin can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = employees.company_id
    ))
  );

-- ============================================================
-- Rebuild employee_bank_accounts policies — HR unrestricted
-- ============================================================
DROP POLICY IF EXISTS "Own or privileged can view bank accounts" ON employee_bank_accounts;
DROP POLICY IF EXISTS "Privileged roles can insert employee bank accounts" ON employee_bank_accounts;
DROP POLICY IF EXISTS "Privileged roles can update employee bank accounts" ON employee_bank_accounts;
DROP POLICY IF EXISTS "Privileged roles can delete employee bank accounts" ON employee_bank_accounts;

CREATE POLICY "Own or privileged can view bank accounts"
  ON employee_bank_accounts FOR SELECT
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id IN (
          SELECT e.company_id FROM employees e WHERE e.id = employee_bank_accounts.employee_id
        )
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employee_bank_accounts.employee_id
    ))
  );

CREATE POLICY "Privileged roles can insert employee bank accounts"
  ON employee_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id IN (
          SELECT e.company_id FROM employees e WHERE e.id = employee_bank_accounts.employee_id
        )
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employee_bank_accounts.employee_id
    ))
  );

CREATE POLICY "Privileged roles can update employee bank accounts"
  ON employee_bank_accounts FOR UPDATE
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id IN (
          SELECT e.company_id FROM employees e WHERE e.id = employee_bank_accounts.employee_id
        )
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
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id IN (
          SELECT e.company_id FROM employees e WHERE e.id = employee_bank_accounts.employee_id
        )
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = employee_bank_accounts.employee_id
    ))
  );

CREATE POLICY "Privileged roles can delete employee bank accounts"
  ON employee_bank_accounts FOR DELETE
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id IN (
          SELECT e.company_id FROM employees e WHERE e.id = employee_bank_accounts.employee_id
        )
    ))
  );

-- ============================================================
-- Rebuild salary_adjustments — HR unrestricted across companies
-- ============================================================
DROP POLICY IF EXISTS "Privileged roles can view salary adjustments" ON salary_adjustments;
DROP POLICY IF EXISTS "Employees can view own adjustments" ON salary_adjustments;
DROP POLICY IF EXISTS "Users can view salary adjustments for their company" ON salary_adjustments;
DROP POLICY IF EXISTS "Privileged roles can insert salary adjustments" ON salary_adjustments;
DROP POLICY IF EXISTS "Privileged roles can update salary adjustments" ON salary_adjustments;
DROP POLICY IF EXISTS "Privileged roles can delete salary adjustments" ON salary_adjustments;

CREATE POLICY "Privileged roles can view salary adjustments"
  ON salary_adjustments FOR SELECT
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = salary_adjustments.company_id
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.employee_id = salary_adjustments.employee_id
        AND ur.company_id = salary_adjustments.company_id
    ))
  );

CREATE POLICY "Privileged roles can insert salary adjustments"
  ON salary_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = salary_adjustments.company_id
    ))
  );

CREATE POLICY "Privileged roles can update salary adjustments"
  ON salary_adjustments FOR UPDATE
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = salary_adjustments.company_id
    ))
  )
  WITH CHECK (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = salary_adjustments.company_id
    ))
  );

CREATE POLICY "Privileged roles can delete salary adjustments"
  ON salary_adjustments FOR DELETE
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
        AND ur.company_id = salary_adjustments.company_id
    ))
  );

-- ============================================================
-- Rebuild payroll_batches — HR unrestricted across companies
-- ============================================================
DROP POLICY IF EXISTS "Finance roles can view payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Privileged can view payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Users can view company payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Finance roles can create payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Finance roles can update draft payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Super Admin can delete draft payroll batches" ON payroll_batches;

CREATE POLICY "Authorized roles can view payroll batches"
  ON payroll_batches FOR SELECT
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
    )
  );

CREATE POLICY "Finance roles can create payroll batches"
  ON payroll_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    is_hr_or_above()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
    )
  );

CREATE POLICY "Finance roles can update draft payroll batches"
  ON payroll_batches FOR UPDATE
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (
      company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'manager'
      )
      AND status = 'draft'
    )
  )
  WITH CHECK (
    is_hr_or_above()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
    )
  );

CREATE POLICY "Super Admin can delete draft payroll batches"
  ON payroll_batches FOR DELETE
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    (
      company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'manager'
      )
      AND status = 'draft'
    )
  );

-- ============================================================
-- Rebuild payroll_components — HR unrestricted
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own company components" ON payroll_components;
DROP POLICY IF EXISTS "Users can view own company components" ON payroll_components;
DROP POLICY IF EXISTS "Authenticated users can view payroll components" ON payroll_components;

CREATE POLICY "Users can manage own company components"
  ON payroll_components FOR ALL
  TO authenticated
  USING (
    is_hr_or_above()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
    )
  )
  WITH CHECK (
    is_hr_or_above()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'manager'
    )
  );

-- ============================================================
-- Fix payroll_batch_items — HR unrestricted
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_batch_items') THEN
    DROP POLICY IF EXISTS "Finance roles can view batch items" ON payroll_batch_items;
    DROP POLICY IF EXISTS "Finance roles can insert batch items" ON payroll_batch_items;
    DROP POLICY IF EXISTS "Finance roles can update batch items" ON payroll_batch_items;
    DROP POLICY IF EXISTS "Finance roles can delete batch items" ON payroll_batch_items;

    CREATE POLICY "Finance roles can view batch items"
      ON payroll_batch_items FOR SELECT
      TO authenticated
      USING (
        is_hr_or_above()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'manager'
        )
      );

    CREATE POLICY "Finance roles can insert batch items"
      ON payroll_batch_items FOR INSERT
      TO authenticated
      WITH CHECK (
        is_hr_or_above()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'manager'
        )
      );

    CREATE POLICY "Finance roles can update batch items"
      ON payroll_batch_items FOR UPDATE
      TO authenticated
      USING (
        is_hr_or_above()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'manager'
        )
      )
      WITH CHECK (
        is_hr_or_above()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'manager'
        )
      );

    CREATE POLICY "Finance roles can delete batch items"
      ON payroll_batch_items FOR DELETE
      TO authenticated
      USING (
        is_hr_or_above()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'manager'
        )
      );
  END IF;
END $$;
