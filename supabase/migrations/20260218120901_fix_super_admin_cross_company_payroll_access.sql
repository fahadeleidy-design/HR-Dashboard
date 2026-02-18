/*
  # Fix Super Admin Cross-Company Access for Payroll and Related Tables

  ## Problem
  Super admin has only ONE user_roles row (for Special Offices Company).
  Policies using `company_id IN (SELECT ur.company_id FROM user_roles WHERE ...)` 
  only return the one company, blocking super_admin from managing payroll 
  in other companies.

  ## Solution
  Use the new `is_super_admin()` SECURITY DEFINER function which checks for 
  super_admin role across ANY company, granting unrestricted cross-company access.

  ## Tables Fixed
  - payroll_batches (INSERT, UPDATE, DELETE)
  - payroll_batch_items (all policies)
  - payroll_components (ALL)
*/

-- ============================================================
-- Fix payroll_batches policies
-- ============================================================
DROP POLICY IF EXISTS "Finance roles can create payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Finance roles can update draft payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Super Admin can delete draft payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Finance roles can view payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Authorized roles can view payroll batches" ON payroll_batches;

-- Rebuild SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payroll_batches' AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Finance roles can view payroll batches"
      ON payroll_batches FOR SELECT
      TO authenticated
      USING (
        is_super_admin()
        OR
        company_id IN (
          SELECT ur.company_id FROM user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = ANY (ARRAY['admin','hr','finance','manager'])
        )
      );
  END IF;
END $$;

-- INSERT
CREATE POLICY "Finance roles can create payroll batches"
  ON payroll_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (ARRAY['admin','hr','finance','finance_manager','payroll_manager','manager'])
    )
  );

-- UPDATE
CREATE POLICY "Finance roles can update draft payroll batches"
  ON payroll_batches FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR
    (
      company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = ANY (ARRAY['admin','hr','finance','finance_manager','payroll_manager','manager'])
      )
      AND status = 'draft'
    )
  )
  WITH CHECK (
    is_super_admin()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (ARRAY['admin','hr','finance','finance_manager','payroll_manager','manager'])
    )
  );

-- DELETE
CREATE POLICY "Super Admin can delete draft payroll batches"
  ON payroll_batches FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR
    (
      company_id IN (
        SELECT ur.company_id FROM user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = ANY (ARRAY['admin','finance'])
      )
      AND status = 'draft'
    )
  );

-- ============================================================
-- Fix payroll_components policies
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own company components" ON payroll_components;
DROP POLICY IF EXISTS "Authenticated users can view payroll components" ON payroll_components;

CREATE POLICY "Users can manage own company components"
  ON payroll_components FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (ARRAY['admin','hr','finance','finance_manager','payroll_manager','manager'])
    )
  )
  WITH CHECK (
    is_super_admin()
    OR
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (ARRAY['admin','hr','finance','finance_manager','payroll_manager','manager'])
    )
  );

-- ============================================================
-- Fix payroll_batch_items policies if they exist
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_batch_items') THEN
    DROP POLICY IF EXISTS "Finance roles can view batch items" ON payroll_batch_items;
    DROP POLICY IF EXISTS "Finance roles can insert batch items" ON payroll_batch_items;
    DROP POLICY IF EXISTS "Finance roles can update batch items" ON payroll_batch_items;
    DROP POLICY IF EXISTS "Finance roles can delete batch items" ON payroll_batch_items;
    DROP POLICY IF EXISTS "Authorized roles can view payroll batch items" ON payroll_batch_items;
    DROP POLICY IF EXISTS "Authorized roles can manage payroll batch items" ON payroll_batch_items;

    CREATE POLICY "Finance roles can view batch items"
      ON payroll_batch_items FOR SELECT
      TO authenticated
      USING (
        is_super_admin()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = ANY (ARRAY['admin','hr','finance','manager'])
        )
      );

    CREATE POLICY "Finance roles can insert batch items"
      ON payroll_batch_items FOR INSERT
      TO authenticated
      WITH CHECK (
        is_super_admin()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = ANY (ARRAY['admin','hr','finance','manager'])
        )
      );

    CREATE POLICY "Finance roles can update batch items"
      ON payroll_batch_items FOR UPDATE
      TO authenticated
      USING (
        is_super_admin()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = ANY (ARRAY['admin','hr','finance','manager'])
        )
      )
      WITH CHECK (
        is_super_admin()
        OR
        EXISTS (
          SELECT 1 FROM payroll_batches pb
          JOIN user_roles ur ON ur.company_id = pb.company_id
          WHERE pb.id = payroll_batch_items.batch_id
            AND ur.user_id = auth.uid()
            AND ur.role = ANY (ARRAY['admin','hr','finance','manager'])
        )
      );
  END IF;
END $$;
