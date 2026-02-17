/*
  # Add missing INSERT, UPDATE, DELETE policies for vehicle_assignments and vehicle_maintenance

  1. Problem
    - Both tables only have SELECT policies
    - Users cannot create assignments or log maintenance due to missing RLS policies

  2. Changes
    - Add INSERT, UPDATE, DELETE policies for vehicle_assignments
    - Add INSERT, UPDATE, DELETE policies for vehicle_maintenance
    - All policies enforce company_id ownership through user_roles

  3. Security
    - Only privileged roles (hr, finance, manager, admin, super_admin) can modify data
    - Company isolation enforced via company_id
*/

-- vehicle_assignments INSERT
CREATE POLICY "Privileged roles can insert vehicle assignments"
  ON vehicle_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_assignments.company_id)
        )
    )
  );

-- vehicle_assignments UPDATE
CREATE POLICY "Privileged roles can update vehicle assignments"
  ON vehicle_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_assignments.company_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_assignments.company_id)
        )
    )
  );

-- vehicle_assignments DELETE
CREATE POLICY "Privileged roles can delete vehicle assignments"
  ON vehicle_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_assignments.company_id)
        )
    )
  );

-- vehicle_maintenance INSERT
CREATE POLICY "Privileged roles can insert vehicle maintenance"
  ON vehicle_maintenance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_maintenance.company_id)
        )
    )
  );

-- vehicle_maintenance UPDATE
CREATE POLICY "Privileged roles can update vehicle maintenance"
  ON vehicle_maintenance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_maintenance.company_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_maintenance.company_id)
        )
    )
  );

-- vehicle_maintenance DELETE
CREATE POLICY "Privileged roles can delete vehicle maintenance"
  ON vehicle_maintenance
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicle_maintenance.company_id)
        )
    )
  );
