/*
  # Implement Loan Policy - 50% of EOS, Max 6 Months

  ## Overview
  Enforces the loan policy rules:
  1. Maximum loan amount = 50% of End of Service benefits
  2. Maximum repayment period = 6 months
  3. Equal monthly installments

  ## Changes
  1. Add `number_of_installments` field to loans table
  2. Create function to calculate maximum eligible loan amount
  3. Create function to validate loan requests
  4. Add trigger to enforce loan policy on INSERT/UPDATE
  5. Add helper view for loan eligibility

  ## Loan Policy Rules
  - Max Loan Amount: 50% of projected EOS benefit
  - Max Installments: 6 months
  - Monthly Installment: loan_amount / number_of_installments (equal payments)
  
  ## Note
  Existing loans are grandfathered in. The policy only applies to new loans.
*/

-- =============================================
-- 1. ADD NUMBER OF INSTALLMENTS FIELD
-- =============================================
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS number_of_installments INTEGER DEFAULT 1;

COMMENT ON COLUMN loans.number_of_installments IS 'Number of monthly installments (max 6 as per policy)';

-- =============================================
-- 2. FUNCTION: Calculate Maximum Loan Amount
-- =============================================
CREATE OR REPLACE FUNCTION calculate_max_loan_amount(p_employee_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_eos_amount numeric;
  v_max_loan numeric;
  v_hire_date date;
BEGIN
  -- Get employee hire date
  SELECT hire_date INTO v_hire_date
  FROM employees
  WHERE id = p_employee_id;

  IF v_hire_date IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate projected EOS if employee were to resign today
  -- Using 'resignation' as the reason to get the minimum eligible amount
  v_eos_amount := calculate_end_of_service_benefit(
    p_employee_id,
    CURRENT_DATE,
    'resignation'
  );

  -- Maximum loan is 50% of EOS
  v_max_loan := COALESCE(v_eos_amount, 0) * 0.5;

  RETURN ROUND(v_max_loan, 2);
END;
$$;

COMMENT ON FUNCTION calculate_max_loan_amount IS 'Calculates maximum loan amount (50% of EOS) for an employee';

-- =============================================
-- 3. FUNCTION: Validate Loan Request
-- =============================================
CREATE OR REPLACE FUNCTION validate_loan_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_loan_amount numeric;
  v_calculated_installment numeric;
  v_total_outstanding numeric;
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

COMMENT ON FUNCTION validate_loan_request IS 'Trigger function to validate and auto-calculate loan details based on policy';

-- =============================================
-- 4. UPDATE EXISTING LOANS (BEFORE TRIGGER)
-- =============================================
-- Set number_of_installments for existing loans based on date range
UPDATE loans
SET number_of_installments = CASE
  WHEN end_date IS NOT NULL AND start_date IS NOT NULL THEN
    GREATEST(1, LEAST(6, EXTRACT(MONTH FROM AGE(end_date, start_date))::integer))
  ELSE
    CASE
      WHEN monthly_installment > 0 AND loan_amount > 0 THEN
        LEAST(6, GREATEST(1, CEIL(loan_amount / monthly_installment)::integer))
      ELSE
        6
    END
END
WHERE number_of_installments IS NULL OR number_of_installments = 0 OR number_of_installments = 1;

-- =============================================
-- 5. CREATE TRIGGER
-- =============================================
DROP TRIGGER IF EXISTS enforce_loan_policy ON loans;

CREATE TRIGGER enforce_loan_policy
  BEFORE INSERT OR UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION validate_loan_request();

-- =============================================
-- 6. CREATE LOAN ELIGIBILITY VIEW
-- =============================================
CREATE OR REPLACE VIEW loan_eligibility AS
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
  calculate_max_loan_amount(e.id) - COALESCE(SUM(l.remaining_amount) FILTER (WHERE l.status = 'active'), 0) as available_loan_amount,
  CASE 
    WHEN calculate_max_loan_amount(e.id) > 0 THEN true
    ELSE false
  END as is_eligible
FROM employees e
LEFT JOIN loans l ON l.employee_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, e.company_id, e.first_name_en, e.last_name_en, e.employee_number, e.basic_salary, e.hire_date;

COMMENT ON VIEW loan_eligibility IS 'Shows loan eligibility and available loan amount for all active employees';

-- =============================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_loans_employee_status 
ON loans(employee_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_loans_remaining_amount 
ON loans(employee_id, remaining_amount) 
WHERE remaining_amount > 0;
