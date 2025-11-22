/*
  # Saudi HR Management System - Helper Functions and Views

  ## Overview
  This migration creates SQL functions and views to support:
  - End of Service Benefits (EOSB) calculations per Saudi Labor Law
  - Nitaqat compliance calculations
  - GOSI contribution calculations
  - Leave balance calculations
  - Payroll calculations with overtime
  - Useful views for reporting

  ## 1. Functions

  ### calculate_eosb
  Calculates End of Service Benefits based on Saudi Labor Law:
  - First 5 years: half month salary per year
  - After 5 years: one month salary per year

  ### calculate_nitaqat_metrics
  Calculates Saudization percentage and determines Nitaqat color

  ### calculate_gosi_contribution
  Calculates GOSI contributions (10% employee, 12% employer for Saudi, 2% for non-Saudi)

  ### calculate_leave_balance
  Calculates remaining leave days for an employee

  ### update_updated_at
  Trigger function to auto-update updated_at timestamp

  ## 2. Views

  ### employee_summary_view
  Comprehensive employee information with department and manager details

  ### payroll_summary_view
  Current payroll information for all active employees

  ### nitaqat_current_status
  Real-time Nitaqat compliance status per company

  ### expiring_documents_view
  Documents expiring within 90 days
*/

-- Function: Calculate End of Service Benefits (EOSB)
CREATE OR REPLACE FUNCTION calculate_eosb(
  p_hire_date date,
  p_termination_date date,
  p_basic_salary decimal
)
RETURNS decimal AS $$
DECLARE
  v_years_of_service decimal;
  v_eosb decimal;
  v_first_five_years decimal;
  v_remaining_years decimal;
BEGIN
  -- Calculate years of service
  v_years_of_service := EXTRACT(YEAR FROM AGE(p_termination_date, p_hire_date)) + 
                        (EXTRACT(MONTH FROM AGE(p_termination_date, p_hire_date)) / 12.0);
  
  -- Calculate EOSB
  IF v_years_of_service <= 5 THEN
    -- First 5 years: half month salary per year
    v_eosb := (p_basic_salary / 2) * v_years_of_service;
  ELSE
    -- First 5 years: half month salary per year
    v_first_five_years := (p_basic_salary / 2) * 5;
    -- Remaining years: full month salary per year
    v_remaining_years := p_basic_salary * (v_years_of_service - 5);
    v_eosb := v_first_five_years + v_remaining_years;
  END IF;
  
  RETURN ROUND(v_eosb, 2);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate Nitaqat metrics for a company
CREATE OR REPLACE FUNCTION calculate_nitaqat_metrics(p_company_id uuid)
RETURNS TABLE(
  total_employees integer,
  saudi_employees integer,
  non_saudi_employees integer,
  saudization_percentage decimal,
  nitaqat_color text
) AS $$
DECLARE
  v_total integer;
  v_saudi integer;
  v_non_saudi integer;
  v_percentage decimal;
  v_color text;
BEGIN
  -- Count employees
  SELECT COUNT(*), 
         COUNT(*) FILTER (WHERE is_saudi = true),
         COUNT(*) FILTER (WHERE is_saudi = false)
  INTO v_total, v_saudi, v_non_saudi
  FROM employees
  WHERE company_id = p_company_id AND status = 'active';
  
  -- Calculate percentage
  IF v_total > 0 THEN
    v_percentage := ROUND((v_saudi::decimal / v_total::decimal) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;
  
  -- Determine Nitaqat color (simplified logic - actual logic varies by sector and size)
  IF v_percentage >= 40 THEN
    v_color := 'platinum';
  ELSIF v_percentage >= 30 THEN
    v_color := 'green';
  ELSIF v_percentage >= 20 THEN
    v_color := 'yellow';
  ELSE
    v_color := 'red';
  END IF;
  
  RETURN QUERY SELECT v_total, v_saudi, v_non_saudi, v_percentage, v_color;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate GOSI contribution
CREATE OR REPLACE FUNCTION calculate_gosi_contribution(
  p_wage decimal,
  p_is_saudi boolean
)
RETURNS TABLE(
  employee_contribution decimal,
  employer_contribution decimal,
  total_contribution decimal
) AS $$
DECLARE
  v_employee_contrib decimal;
  v_employer_contrib decimal;
  v_total_contrib decimal;
BEGIN
  -- Employee contribution: 10% for Saudis, 0% for non-Saudis
  IF p_is_saudi THEN
    v_employee_contrib := ROUND(p_wage * 0.10, 2);
    v_employer_contrib := ROUND(p_wage * 0.12, 2);
  ELSE
    v_employee_contrib := 0;
    v_employer_contrib := ROUND(p_wage * 0.02, 2);
  END IF;
  
  v_total_contrib := v_employee_contrib + v_employer_contrib;
  
  RETURN QUERY SELECT v_employee_contrib, v_employer_contrib, v_total_contrib;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate leave balance
CREATE OR REPLACE FUNCTION calculate_leave_balance(
  p_employee_id uuid,
  p_leave_type_id uuid,
  p_year integer
)
RETURNS decimal AS $$
DECLARE
  v_max_days integer;
  v_used_days integer;
  v_balance decimal;
BEGIN
  -- Get max days for leave type
  SELECT max_days_per_year INTO v_max_days
  FROM leave_types
  WHERE id = p_leave_type_id;
  
  -- Calculate used days in the year
  SELECT COALESCE(SUM(total_days), 0) INTO v_used_days
  FROM leave_requests
  WHERE employee_id = p_employee_id
    AND leave_type_id = p_leave_type_id
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;
  
  v_balance := v_max_days - v_used_days;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_performance_reviews_updated_at ON performance_reviews;
CREATE TRIGGER update_performance_reviews_updated_at
  BEFORE UPDATE ON performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- View: Employee Summary
CREATE OR REPLACE VIEW employee_summary_view AS
SELECT 
  e.id,
  e.employee_number,
  e.first_name_en || ' ' || e.last_name_en AS full_name_en,
  e.first_name_ar || ' ' || e.last_name_ar AS full_name_ar,
  e.email,
  e.phone,
  e.nationality,
  e.is_saudi,
  e.job_title_en,
  e.job_title_ar,
  e.status,
  e.hire_date,
  e.iqama_expiry,
  e.passport_expiry,
  d.name_en AS department_name,
  c.name_en AS company_name,
  m.first_name_en || ' ' || m.last_name_en AS manager_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN companies c ON e.company_id = c.id
LEFT JOIN employees m ON e.manager_id = m.id;

-- View: Current Payroll Summary
CREATE OR REPLACE VIEW payroll_summary_view AS
SELECT 
  p.id,
  p.employee_id,
  e.employee_number,
  e.first_name_en || ' ' || e.last_name_en AS employee_name,
  p.basic_salary,
  p.housing_allowance,
  p.transportation_allowance,
  p.other_allowances,
  p.gross_salary,
  p.gosi_employee,
  p.gosi_employer,
  p.other_deductions,
  p.net_salary,
  p.payment_method,
  p.iban,
  d.name_en AS department_name,
  c.name_en AS company_name
FROM payroll p
JOIN employees e ON p.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN companies c ON e.company_id = c.id
WHERE p.effective_to IS NULL OR p.effective_to > CURRENT_DATE;

-- View: Nitaqat Current Status
CREATE OR REPLACE VIEW nitaqat_current_status AS
SELECT 
  c.id AS company_id,
  c.name_en AS company_name,
  c.nitaqat_color,
  COUNT(e.id) AS total_employees,
  COUNT(e.id) FILTER (WHERE e.is_saudi = true) AS saudi_employees,
  COUNT(e.id) FILTER (WHERE e.is_saudi = false) AS non_saudi_employees,
  CASE 
    WHEN COUNT(e.id) > 0 
    THEN ROUND((COUNT(e.id) FILTER (WHERE e.is_saudi = true)::decimal / COUNT(e.id)::decimal) * 100, 2)
    ELSE 0 
  END AS saudization_percentage
FROM companies c
LEFT JOIN employees e ON c.id = e.company_id AND e.status = 'active'
GROUP BY c.id, c.name_en, c.nitaqat_color;

-- View: Expiring Documents (within 90 days)
CREATE OR REPLACE VIEW expiring_documents_view AS
SELECT 
  d.id,
  d.document_type,
  d.document_name,
  d.expiry_date,
  d.expiry_date - CURRENT_DATE AS days_until_expiry,
  e.employee_number,
  e.first_name_en || ' ' || e.last_name_en AS employee_name,
  e.email AS employee_email,
  c.name_en AS company_name
FROM documents d
JOIN employees e ON d.employee_id = e.id
JOIN companies c ON d.company_id = c.id
WHERE d.expiry_date IS NOT NULL
  AND d.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  AND d.status = 'active'
ORDER BY d.expiry_date ASC;

-- View: Leave Balance Summary
CREATE OR REPLACE VIEW leave_balance_view AS
SELECT 
  e.id AS employee_id,
  e.employee_number,
  e.first_name_en || ' ' || e.last_name_en AS employee_name,
  lt.id AS leave_type_id,
  lt.name_en AS leave_type_name,
  lt.max_days_per_year,
  COALESCE(SUM(lr.total_days) FILTER (
    WHERE lr.status = 'approved' 
    AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ), 0) AS days_used,
  lt.max_days_per_year - COALESCE(SUM(lr.total_days) FILTER (
    WHERE lr.status = 'approved' 
    AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ), 0) AS days_remaining
FROM employees e
CROSS JOIN leave_types lt
LEFT JOIN leave_requests lr ON e.id = lr.employee_id AND lt.id = lr.leave_type_id
WHERE e.status = 'active' AND e.company_id = lt.company_id
GROUP BY e.id, e.employee_number, e.first_name_en, e.last_name_en, 
         lt.id, lt.name_en, lt.max_days_per_year;

-- View: Monthly Attendance Summary
CREATE OR REPLACE VIEW monthly_attendance_summary AS
SELECT 
  e.id AS employee_id,
  e.employee_number,
  e.first_name_en || ' ' || e.last_name_en AS employee_name,
  d.name_en AS department_name,
  DATE_TRUNC('month', a.date) AS month,
  COUNT(*) FILTER (WHERE a.status = 'present') AS days_present,
  COUNT(*) FILTER (WHERE a.status = 'absent') AS days_absent,
  COUNT(*) FILTER (WHERE a.status = 'half_day') AS days_half_day,
  COALESCE(SUM(a.working_hours), 0) AS total_working_hours,
  COALESCE(SUM(a.overtime_hours), 0) AS total_overtime_hours,
  COALESCE(SUM(a.late_minutes), 0) AS total_late_minutes
FROM employees e
LEFT JOIN attendance a ON e.id = a.employee_id
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.status = 'active'
GROUP BY e.id, e.employee_number, e.first_name_en, e.last_name_en, 
         d.name_en, DATE_TRUNC('month', a.date);