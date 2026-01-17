/*
  # Enforce Cross-Restrictions Between Loans and Advances + Yearly Loan Limit

  ## Overview
  Implements stricter policies:
  1. Employees cannot apply for an advance if they have an active loan
  2. Employees cannot apply for a loan if they have an active advance
  3. Employees can only request a loan once per calendar year
  
  ## Changes
  1. Update advance validation function to check for active loans
  2. Update loan validation function to check for active advances
  3. Add yearly loan limit check to loan validation
  4. Update eligibility views to reflect cross-restrictions
  
  ## Business Rules
  - No concurrent loans and advances allowed
  - Loan requests limited to once per calendar year
  - "Active" means status IN ('pending', 'approved', 'active')
*/

-- =============================================
-- 1. UPDATE ADVANCE VALIDATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION validate_advance_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_advance_amount numeric;
  v_active_advances_count integer;
  v_total_outstanding_advances numeric;
  v_active_loans_count integer;
  v_total_outstanding_loans numeric;
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
  INTO v_active_advances_count, v_total_outstanding_advances
  FROM advances
  WHERE employee_id = NEW.employee_id
    AND status IN ('pending', 'approved')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Only one active advance allowed at a time
  IF v_active_advances_count > 0 THEN
    RAISE EXCEPTION 'Advance policy violation: Employee already has an active advance (Outstanding: %)', 
      ROUND(v_total_outstanding_advances, 2);
  END IF;

  -- Check for existing active loans (CROSS-RESTRICTION)
  SELECT COUNT(*), COALESCE(SUM(remaining_amount), 0)
  INTO v_active_loans_count, v_total_outstanding_loans
  FROM loans
  WHERE employee_id = NEW.employee_id
    AND status IN ('pending', 'approved', 'active')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Cannot request advance if there's an active loan
  IF v_active_loans_count > 0 THEN
    RAISE EXCEPTION 'Advance policy violation: Employee has an active loan (Outstanding: %). Cannot request advance while loan is active.', 
      ROUND(v_total_outstanding_loans, 2);
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

COMMENT ON FUNCTION validate_advance_request IS 'Validates advance requests: max amount, no concurrent advances, no active loans';

-- =============================================
-- 2. UPDATE LOAN VALIDATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION validate_loan_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_loan_amount numeric;
  v_calculated_installment numeric;
  v_total_outstanding numeric;
  v_active_advances_count integer;
  v_total_outstanding_advances numeric;
  v_loans_this_year integer;
BEGIN
  -- Calculate max eligible loan amount
  v_max_loan_amount := calculate_max_loan_amount(NEW.employee_id);

  -- Check if number of installments exceeds 6 months
  IF NEW.number_of_installments > 6 THEN
    RAISE EXCEPTION 'Loan policy violation: Maximum repayment period is 6 months. Requested: % months', NEW.number_of_installments;
  END IF;

  IF NEW.number_of_installments < 1 THEN
    RAISE EXCEPTION 'Loan policy violation: Number of installments must be at least 1';
  END IF;

  -- Check for existing active advances (CROSS-RESTRICTION)
  SELECT COUNT(*), COALESCE(SUM(remaining_amount), 0)
  INTO v_active_advances_count, v_total_outstanding_advances
  FROM advances
  WHERE employee_id = NEW.employee_id
    AND status IN ('pending', 'approved')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Cannot request loan if there's an active advance
  IF v_active_advances_count > 0 THEN
    RAISE EXCEPTION 'Loan policy violation: Employee has an active advance (Outstanding: %). Cannot request loan while advance is active.', 
      ROUND(v_total_outstanding_advances, 2);
  END IF;

  -- Check yearly loan limit (YEARLY RESTRICTION)
  -- Count loans created this calendar year for this employee
  SELECT COUNT(*)
  INTO v_loans_this_year
  FROM loans
  WHERE employee_id = NEW.employee_id
    AND EXTRACT(YEAR FROM COALESCE(start_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Only one loan per calendar year allowed
  IF v_loans_this_year > 0 THEN
    RAISE EXCEPTION 'Loan policy violation: Employee has already requested a loan this year (%). Only one loan per calendar year is allowed.', 
      EXTRACT(YEAR FROM CURRENT_DATE);
  END IF;

  -- Calculate total outstanding loans for this employee
  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO v_total_outstanding
  FROM loans
  WHERE employee_id = NEW.employee_id
    AND status = 'active'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Check if new loan + outstanding loans exceed max loan amount
  IF (NEW.loan_amount + v_total_outstanding) > v_max_loan_amount THEN
    RAISE EXCEPTION 'Loan policy violation: Total loan amount (%) exceeds 50%% of End of Service benefits (%). Current outstanding: %', 
      ROUND(NEW.loan_amount + v_total_outstanding, 2),
      ROUND(v_max_loan_amount, 2),
      ROUND(v_total_outstanding, 2);
  END IF;

  -- Calculate and set equal monthly installment
  v_calculated_installment := ROUND(NEW.loan_amount / NEW.number_of_installments, 2);
  NEW.monthly_installment := v_calculated_installment;

  -- Set remaining amount if not set
  IF NEW.remaining_amount IS NULL OR NEW.remaining_amount = 0 THEN
    NEW.remaining_amount := NEW.loan_amount;
  END IF;

  -- Calculate end date based on start date and number of installments
  IF NEW.start_date IS NOT NULL THEN
    NEW.end_date := NEW.start_date + (NEW.number_of_installments || ' months')::interval;
  END IF;

  -- Set default status if not provided
  IF NEW.status IS NULL THEN
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_loan_request IS 'Validates loan requests: max amount, max 6 months, no concurrent loans/advances, once per year';

-- =============================================
-- 3. UPDATE ELIGIBILITY VIEWS
-- =============================================

-- Drop and recreate Advance Eligibility View with new columns
DROP VIEW IF EXISTS advance_eligibility;

CREATE VIEW advance_eligibility AS
SELECT 
  e.id as employee_id,
  e.company_id,
  CONCAT(e.first_name_en, ' ', e.last_name_en) as full_name,
  e.employee_number,
  e.basic_salary,
  e.hire_date,
  calculate_max_advance_amount(e.id) as max_advance_amount,
  COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) as outstanding_advances,
  COALESCE(SUM(l.remaining_amount) FILTER (WHERE l.status IN ('pending', 'approved', 'active')), 0) as outstanding_loans,
  CASE 
    WHEN COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) > 0 
    THEN false
    WHEN COALESCE(SUM(l.remaining_amount) FILTER (WHERE l.status IN ('pending', 'approved', 'active')), 0) > 0 
    THEN false
    WHEN e.basic_salary > 0 
    THEN true
    ELSE false
  END as is_eligible,
  CASE 
    WHEN COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) > 0 
    THEN 'Has active advance'
    WHEN COALESCE(SUM(l.remaining_amount) FILTER (WHERE l.status IN ('pending', 'approved', 'active')), 0) > 0 
    THEN 'Has active loan'
    WHEN e.basic_salary = 0 OR e.basic_salary IS NULL
    THEN 'No salary defined'
    ELSE 'Eligible'
  END as eligibility_status
FROM employees e
LEFT JOIN advances a ON a.employee_id = e.id
LEFT JOIN loans l ON l.employee_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, e.company_id, e.first_name_en, e.last_name_en, e.employee_number, e.basic_salary, e.hire_date;

COMMENT ON VIEW advance_eligibility IS 'Shows advance eligibility (checks for active advances and loans)';

-- Drop and recreate Loan Eligibility View with new columns
DROP VIEW IF EXISTS loan_eligibility;

CREATE VIEW loan_eligibility AS
SELECT 
  e.id as employee_id,
  e.company_id,
  CONCAT(e.first_name_en, ' ', e.last_name_en) as full_name,
  e.employee_number,
  e.basic_salary,
  e.hire_date,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) as years_of_service,
  calculate_max_loan_amount(e.id) as max_loan_amount,
  COALESCE(SUM(l.remaining_amount) FILTER (WHERE l.status = 'active'), 0) as outstanding_loans,
  COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) as outstanding_advances,
  calculate_max_loan_amount(e.id) - COALESCE(SUM(l.remaining_amount) FILTER (WHERE l.status = 'active'), 0) as available_loan_amount,
  COUNT(l.id) FILTER (WHERE EXTRACT(YEAR FROM COALESCE(l.start_date, l.created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)) as loans_this_year,
  CASE 
    WHEN COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) > 0 
    THEN false
    WHEN COUNT(l.id) FILTER (WHERE EXTRACT(YEAR FROM COALESCE(l.start_date, l.created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)) > 0
    THEN false
    WHEN calculate_max_loan_amount(e.id) > 0 
    THEN true
    ELSE false
  END as is_eligible,
  CASE 
    WHEN COALESCE(SUM(a.remaining_amount) FILTER (WHERE a.status IN ('pending', 'approved')), 0) > 0 
    THEN 'Has active advance'
    WHEN COUNT(l.id) FILTER (WHERE EXTRACT(YEAR FROM COALESCE(l.start_date, l.created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)) > 0
    THEN 'Already requested loan this year'
    WHEN calculate_max_loan_amount(e.id) = 0
    THEN 'Insufficient service period'
    ELSE 'Eligible'
  END as eligibility_status
FROM employees e
LEFT JOIN loans l ON l.employee_id = e.id
LEFT JOIN advances a ON a.employee_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, e.company_id, e.first_name_en, e.last_name_en, e.employee_number, e.basic_salary, e.hire_date;

COMMENT ON VIEW loan_eligibility IS 'Shows loan eligibility (checks for active loans, advances, and yearly limit)';
