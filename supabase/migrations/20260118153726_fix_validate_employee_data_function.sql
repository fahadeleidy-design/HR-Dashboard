/*
  # Fix validate_employee_data function

  1. Issue
    - The function has a type mismatch: (hire_date - date_of_birth) returns integer, not interval
    - Should use age() function or cast to date arithmetic

  2. Fix
    - Replace the age validation with correct date arithmetic
*/

CREATE OR REPLACE FUNCTION validate_employee_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION 'Date of birth cannot be in the future';
  END IF;

  IF NEW.hire_date IS NOT NULL AND NEW.hire_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Hire date cannot be in the future';
  END IF;

  -- Fix: Check age properly using date subtraction (returns integer days)
  IF NEW.date_of_birth IS NOT NULL AND NEW.hire_date IS NOT NULL THEN
    IF (NEW.hire_date - NEW.date_of_birth) < (18 * 365) THEN
      RAISE EXCEPTION 'Employee must be at least 18 years old at hire date';
    END IF;
  END IF;

  IF NEW.basic_salary IS NOT NULL AND NEW.basic_salary < 0 THEN
    RAISE EXCEPTION 'Basic salary cannot be negative';
  END IF;

  RETURN NEW;
END;
$$;
