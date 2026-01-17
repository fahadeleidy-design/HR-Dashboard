/*
  # Minimal Data Validation System

  1. Validation Functions
    - Saudi National ID validation
    - IBAN validation
    - Email validation
    - Date range validation

  2. Core Constraints
    - Employees: email format, salary positive, hire date not future
    - Leave requests: date range valid, days positive

  3. Validation Triggers
    - Employee data validation
    - Leave request validation
*/

-- Function to validate Saudi National ID format
CREATE OR REPLACE FUNCTION validate_saudi_national_id(id_number text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN id_number ~ '^[12]\d{9}$';
END;
$$;

-- Function to validate Saudi IBAN format
CREATE OR REPLACE FUNCTION validate_saudi_iban(iban text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN iban ~ '^SA\d{22}$';
END;
$$;

-- Function to validate email format
CREATE OR REPLACE FUNCTION validate_email(email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Function to validate date range
CREATE OR REPLACE FUNCTION validate_date_range(start_date date, end_date date)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN end_date >= start_date;
END;
$$;

-- Add constraints to employees table
DO $$ BEGIN
  ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_valid;
  ALTER TABLE employees ADD CONSTRAINT employees_email_valid
    CHECK (email IS NULL OR validate_email(email));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_basic_salary_positive;
  ALTER TABLE employees ADD CONSTRAINT employees_basic_salary_positive
    CHECK (basic_salary IS NULL OR basic_salary > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_hire_date_not_future;
  ALTER TABLE employees ADD CONSTRAINT employees_hire_date_not_future
    CHECK (hire_date <= CURRENT_DATE);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add constraints to leave_requests table
DO $$ BEGIN
  ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_date_range_valid;
  ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_date_range_valid
    CHECK (validate_date_range(start_date, end_date));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_days_positive;
  ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_days_positive
    CHECK (total_days > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Validation trigger function for employees
CREATE OR REPLACE FUNCTION validate_employee_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION 'Date of birth cannot be in the future';
  END IF;

  IF NEW.date_of_birth IS NOT NULL AND NEW.hire_date IS NOT NULL THEN
    IF (NEW.hire_date - NEW.date_of_birth) < interval '18 years' THEN
      RAISE EXCEPTION 'Employee must be at least 18 years old at hire date';
    END IF;
  END IF;

  IF NEW.termination_date IS NOT NULL AND NEW.hire_date IS NOT NULL THEN
    IF NEW.termination_date < NEW.hire_date THEN
      RAISE EXCEPTION 'Termination date cannot be before hire date';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_employee_data_trigger ON employees;
CREATE TRIGGER validate_employee_data_trigger
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION validate_employee_data();

-- Validation trigger function for leave requests
CREATE OR REPLACE FUNCTION validate_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_available_balance numeric;
  v_employee_hire_date date;
BEGIN
  SELECT hire_date INTO v_employee_hire_date
  FROM employees
  WHERE id = NEW.employee_id;

  IF v_employee_hire_date IS NOT NULL AND NEW.start_date < v_employee_hire_date THEN
    RAISE EXCEPTION 'Leave start date cannot be before employee hire date';
  END IF;

  SELECT available_days INTO v_available_balance
  FROM leave_balances
  WHERE employee_id = NEW.employee_id
  AND leave_type_id = NEW.leave_type_id;

  IF v_available_balance IS NOT NULL AND NEW.total_days > v_available_balance THEN
    RAISE EXCEPTION 'Insufficient leave balance: % days requested but only % available',
      NEW.total_days, v_available_balance;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_leave_request_trigger ON leave_requests;
CREATE TRIGGER validate_leave_request_trigger
  BEFORE INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_leave_request();
