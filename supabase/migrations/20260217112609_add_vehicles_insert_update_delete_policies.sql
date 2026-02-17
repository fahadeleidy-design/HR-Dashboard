/*
  # Add missing INSERT, UPDATE, DELETE policies for vehicles table

  1. Problem
    - The vehicles table only has a SELECT policy
    - Users cannot add, edit, or remove vehicles due to missing RLS policies

  2. Changes
    - Add INSERT policy for privileged roles (hr, finance, manager, super_admin)
    - Add UPDATE policy for privileged roles
    - Add DELETE policy for privileged roles
    - All policies enforce company_id ownership through user_roles

  3. Security
    - Only authenticated users with hr, finance, manager, or super_admin roles can modify vehicles
    - Company isolation is enforced via company_id matching in user_roles
*/

CREATE POLICY "Privileged roles can insert vehicles"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicles.company_id)
        )
    )
  );

CREATE POLICY "Privileged roles can update vehicles"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicles.company_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicles.company_id)
        )
    )
  );

CREATE POLICY "Privileged roles can delete vehicles"
  ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role IN ('super_admin')
          OR (ur.role IN ('hr', 'finance', 'manager', 'admin') AND ur.company_id = vehicles.company_id)
        )
    )
  );
