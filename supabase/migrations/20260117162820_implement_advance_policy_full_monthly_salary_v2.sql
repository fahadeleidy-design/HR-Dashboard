/*
  # Implement Advance Policy - Full Monthly Salary, Full Deduction

  ## Overview
  Enforces the advance policy rules:
  1. Maximum advance amount = Employee's monthly salary (basic salary)
  2. Full deduction from next month's salary
  3. Single payment advance (not installments)

  ## Changes
  1. Create function to calculate maximum eligible advance amount
  2. Create function to validate advance requests
  3. Add trigger to enforce advance policy on INSERT/UPDATE
  4. Add helper view for advance eligibility

  ## Advance Policy Rules
  - Max Advance Amount: Full monthly salary (basic_salary)
  - Deduction: Full amount deducted from next month's salary
  - Only one active advance allowed at a time
  
  ## Note
  Existing advances are grandfathered in. The policy only applies to new advances.
*/

-- =============================================
-- 1. FUNCTION: Calculate Maximum Advance Amount
-- =============================================
CREATE OR REPLACE FUNCTION calculate_max_advance_amount(p_employee_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_basic_salary numeric;
BEGIN
  -- Get employee's basic salary
  SELECT basic_salary INTO v_basic_salary
  FROM employees
  WHERE id = p_employee_id
    AND status = 'active';

  -- Maximum advance is the full monthly salary
  RETURN COALESCE(v_basic_salary, 0);
END;
$$;

COMMENT ON FUNCTION calculate_max_advance_amount IS 'Calculates maximum advance amount (full monthly salary) for an employee';

-- =============================================
-- 2. UPDATE EXISTING ADVANCES (BEFORE TRIGGER)
-- =============================================
-- Set deduction_amount for existing advances if not set properly
UPDATE advances
SET deduction_amount = amount
WHERE deduction_amount IS NULL 
   OR deduction_amount = 0 
   OR deduction_amount != amount;

-- =============================================
-- 3. FUNCTION: Validate Advance Request
-- =============================================
CREATE OR REPLACE FUNCTION validate_advance_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_advance_amount numeric;
  v_active_advances_count integer;
  v_total_outstanding numeric;
BEGIN
  -- Calculate max eligible advance amount
  v_max_advance_amount := calculate_max_advance_amount(NEW.employee_id);

  -- Check if amount exceeds monthly salary
  IF NEW.amount > v_max_advance_amount THEN
    RAISE EXCEPTION 'Advance policy violation: Advance amount (%) exceeds monthly salary (%)', 
      ROUND(NEW.amount, 2),
      ROUND(v_max_advance_amount, 2);
  END IF;

  -- Check for existing active advances
  SELECT COUNT(*), COALESCE(SUM(remaining_amount), 0)
  INTO v_active_advances_count, v_total_outstanding
  FROM advances
  WHERE employee_id = NEW.employee_id
    AND status IN ('pending', 'approved')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Only one active advance allowed at a time
  IF v_active_advances_count > 0 THEN
    RAISE EXCEPTION 'Advance policy violation: Employee already has an active advance (Outstanding: %)', 
      ROUND(v_total_outstanding, 2);
  END IF;

  -- Set deduction amount to full advance amount (deducted fully from next month)
  NEW.deduction_amount := NEW.amount;

  -- Set remaining amount if not set
  IF NEW.remaining_amount IS NULL OR NEW.remaining_amount = 0 THEN
    NEW.remaining_amount := NEW.amount;
  END IF;

  -- Set default status if not provided
  IF NEW.status IS NULL THEN
    NEW.status := 'pending';
  END IF;

  -- Set request date if not provided
  IF NEW.request_date IS NULL THEN
    NEW.request_date := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_advance_request IS 'Trigger function to validate and auto-calculate advance details based on policy';

-- =============================================
-- 4. CREATE TRIGGER
-- =============================================
DROP TRIGGER IF EXISTS enforce_advance_policy ON advances;

CREATE TRIGGER enforce_advance_policy
  BEFORE INSERT OR UPDATE ON advances
  FOR EACH ROW
  EXECUTE FUNCTION validate_advance_request();

-- =============================================
-- 5. CREATE ADVANCE ELIGIBILITY VIEW
-- =============================================
CREATE OR REPLACE VIEW advance_eligibility AS
SELECT 
  e.id as employee_id,
  e.company_id,
  CONCAT(e.first_name_en, ' ', e.last_name_en) as full_name,
  e.employee_number,
  e.basic_salary,
  e.hire_date,
  calculate_max_advance_amount(e.id) as max_advance_amount,
  COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) as outstanding_advances,
  CASE 
    WHEN COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) = 0 
      AND e.basic_salary > 0 
    THEN true
    ELSE false
  END as is_eligible,
  CASE 
    WHEN COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) > 0 
    THEN 'Has active advance'
    WHEN e.basic_salary = 0 OR e.basic_salary IS NULL
    THEN 'No salary defined'
    ELSE 'Eligible'
  END as eligibility_status
FROM employees e
LEFT JOIN advances a ON a.employee_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, e.company_id, e.first_name_en, e.last_name_en, e.employee_number, e.basic_salary, e.hire_date;

COMMENT ON VIEW advance_eligibility IS 'Shows advance eligibility and status for all active employees';

-- =============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_advances_employee_status 
ON advances(employee_id, status) 
WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_advances_remaining_amount 
ON advances(employee_id, remaining_amount) 
WHERE remaining_amount > 0;
