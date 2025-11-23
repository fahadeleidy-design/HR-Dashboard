/*
  # Fix Payroll RLS Policies - Use user_roles Table

  ## Overview
  The RLS policies are failing because they query auth.users table which requires
  explicit SELECT permission. This migration fixes all payroll-related RLS policies
  to use user_roles table instead.

  ## Changes
  1. Drop all existing problematic RLS policies
  2. Create new simplified policies using user_roles table
  3. Ensure company-based access control without auth.users queries

  ## Security
  - Maintains company-based access control
  - Uses user_roles table for user-company relationship
  - All policies remain restrictive and secure
*/

-- Drop existing policies that query auth.users
DROP POLICY IF EXISTS "Users can view own company payroll batches" ON payroll_batches;
DROP POLICY IF EXISTS "Users can create payroll batches for own company" ON payroll_batches;
DROP POLICY IF EXISTS "Users can update own company payroll batches" ON payroll_batches;

DROP POLICY IF EXISTS "Users can view own company payroll items" ON payroll_items;
DROP POLICY IF EXISTS "Users can create payroll items for own company" ON payroll_items;
DROP POLICY IF EXISTS "Users can update own company payroll items" ON payroll_items;

DROP POLICY IF EXISTS "Users can view own company earnings types" ON earnings_types;
DROP POLICY IF EXISTS "Users can manage own company earnings types" ON earnings_types;

DROP POLICY IF EXISTS "Users can view own company deduction types" ON deduction_types;
DROP POLICY IF EXISTS "Users can manage own company deduction types" ON deduction_types;

DROP POLICY IF EXISTS "Users can view own company employee earnings" ON employee_earnings;
DROP POLICY IF EXISTS "Users can manage own company employee earnings" ON employee_earnings;

DROP POLICY IF EXISTS "Users can view own company employee deductions" ON employee_deductions;
DROP POLICY IF EXISTS "Users can manage own company employee deductions" ON employee_deductions;

DROP POLICY IF EXISTS "Users can view own company loans" ON loans;
DROP POLICY IF EXISTS "Users can manage own company loans" ON loans;

DROP POLICY IF EXISTS "Users can view own company advances" ON advances;
DROP POLICY IF EXISTS "Users can manage own company advances" ON advances;

DROP POLICY IF EXISTS "Users can view own company payslips" ON payslips;
DROP POLICY IF EXISTS "Users can manage own company payslips" ON payslips;

DROP POLICY IF EXISTS "Users can view own company salary history" ON salary_history;
DROP POLICY IF EXISTS "Users can create salary history for own company" ON salary_history;

-- Create new simplified RLS policies using user_roles

-- Payroll Batches Policies
CREATE POLICY "Users can view company payroll batches"
  ON payroll_batches FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create company payroll batches"
  ON payroll_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update company payroll batches"
  ON payroll_batches FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Payroll Items Policies
CREATE POLICY "Users can view company payroll items"
  ON payroll_items FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create company payroll items"
  ON payroll_items FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update company payroll items"
  ON payroll_items FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Earnings Types Policies
CREATE POLICY "Users can view company earnings types"
  ON earnings_types FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company earnings types"
  ON earnings_types FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Deduction Types Policies
CREATE POLICY "Users can view company deduction types"
  ON deduction_types FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company deduction types"
  ON deduction_types FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Employee Earnings Policies
CREATE POLICY "Users can view company employee earnings"
  ON employee_earnings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company employee earnings"
  ON employee_earnings FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Employee Deductions Policies
CREATE POLICY "Users can view company employee deductions"
  ON employee_deductions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company employee deductions"
  ON employee_deductions FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Loans Policies
CREATE POLICY "Users can view company loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company loans"
  ON loans FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Advances Policies
CREATE POLICY "Users can view company advances"
  ON advances FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company advances"
  ON advances FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Payslips Policies
CREATE POLICY "Users can view company payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company payslips"
  ON payslips FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Salary History Policies
CREATE POLICY "Users can view company salary history"
  ON salary_history FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create company salary history"
  ON salary_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );