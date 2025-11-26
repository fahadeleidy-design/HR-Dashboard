/*
  # Create Leave Balances System

  1. New Tables
    - `leave_balances`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `employee_id` (uuid, references employees)
      - `leave_type_id` (uuid, references leave_types)
      - `year` (integer) - The calendar year for this balance
      - `total_entitlement` (integer) - Total days entitled per year
      - `used_days` (decimal) - Days already used (approved leaves)
      - `pending_days` (decimal) - Days in pending leave requests
      - `remaining_days` (decimal) - Days remaining = total - used
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `leave_balances` table
    - Add policies for authenticated users to view balances
    - HR can view all balances, employees can view their own

  3. Functions
    - Function to calculate and update leave balances
    - Trigger to update balances when leave requests change status
*/

-- Create leave_balances table
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  leave_type_id uuid REFERENCES leave_types(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  total_entitlement integer NOT NULL DEFAULT 0,
  used_days decimal(5,2) NOT NULL DEFAULT 0,
  pending_days decimal(5,2) NOT NULL DEFAULT 0,
  remaining_days decimal(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_company ON leave_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

-- Enable RLS
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view leave balances for their company"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR can insert leave balances"
  ON leave_balances FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

CREATE POLICY "HR can update leave balances"
  ON leave_balances FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

-- Function to recalculate leave balance for an employee/leave type/year
CREATE OR REPLACE FUNCTION recalculate_leave_balance(
  p_employee_id uuid,
  p_leave_type_id uuid,
  p_year integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_entitlement integer;
  v_used_days decimal;
  v_pending_days decimal;
  v_remaining_days decimal;
BEGIN
  -- Get employee's company_id and leave type entitlement
  SELECT e.company_id, lt.max_days_per_year
  INTO v_company_id, v_entitlement
  FROM employees e
  JOIN leave_types lt ON lt.id = p_leave_type_id
  WHERE e.id = p_employee_id;

  -- Calculate used days (approved leaves in the year)
  SELECT COALESCE(SUM(total_days), 0)
  INTO v_used_days
  FROM leave_requests
  WHERE employee_id = p_employee_id
    AND leave_type_id = p_leave_type_id
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;

  -- Calculate pending days (pending leaves in the year)
  SELECT COALESCE(SUM(total_days), 0)
  INTO v_pending_days
  FROM leave_requests
  WHERE employee_id = p_employee_id
    AND leave_type_id = p_leave_type_id
    AND status = 'pending'
    AND EXTRACT(YEAR FROM start_date) = p_year;

  -- Calculate remaining days
  v_remaining_days := v_entitlement - v_used_days;

  -- Upsert the balance record
  INSERT INTO leave_balances (
    company_id,
    employee_id,
    leave_type_id,
    year,
    total_entitlement,
    used_days,
    pending_days,
    remaining_days,
    updated_at
  )
  VALUES (
    v_company_id,
    p_employee_id,
    p_leave_type_id,
    p_year,
    v_entitlement,
    v_used_days,
    v_pending_days,
    v_remaining_days,
    now()
  )
  ON CONFLICT (employee_id, leave_type_id, year)
  DO UPDATE SET
    total_entitlement = EXCLUDED.total_entitlement,
    used_days = EXCLUDED.used_days,
    pending_days = EXCLUDED.pending_days,
    remaining_days = EXCLUDED.remaining_days,
    updated_at = now();
END;
$$;

-- Trigger function to update leave balance when leave request changes
CREATE OR REPLACE FUNCTION trigger_update_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Recalculate for the year of the leave request
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_leave_balance(
      OLD.employee_id,
      OLD.leave_type_id,
      EXTRACT(YEAR FROM OLD.start_date)::integer
    );
  ELSE
    PERFORM recalculate_leave_balance(
      NEW.employee_id,
      NEW.leave_type_id,
      EXTRACT(YEAR FROM NEW.start_date)::integer
    );
    
    -- If dates changed, also recalculate old year
    IF TG_OP = 'UPDATE' AND EXTRACT(YEAR FROM OLD.start_date) != EXTRACT(YEAR FROM NEW.start_date) THEN
      PERFORM recalculate_leave_balance(
        OLD.employee_id,
        OLD.leave_type_id,
        EXTRACT(YEAR FROM OLD.start_date)::integer
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on leave_requests
DROP TRIGGER IF EXISTS trg_update_leave_balance ON leave_requests;
CREATE TRIGGER trg_update_leave_balance
  AFTER INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_leave_balance();

-- Initialize balances for all active employees for current year
DO $$
DECLARE
  v_employee RECORD;
  v_leave_type RECORD;
  v_current_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
BEGIN
  FOR v_employee IN 
    SELECT id, company_id FROM employees WHERE status = 'active'
  LOOP
    FOR v_leave_type IN 
      SELECT id FROM leave_types WHERE company_id = v_employee.company_id
    LOOP
      PERFORM recalculate_leave_balance(
        v_employee.id,
        v_leave_type.id,
        v_current_year
      );
    END LOOP;
  END LOOP;
END;
$$;