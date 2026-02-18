/*
  # Seed Default Payroll Components
  
  Standard Saudi payroll components based on labor law
*/

-- Function to seed components for a company
CREATE OR REPLACE FUNCTION seed_payroll_components(p_company_id uuid)
RETURNS void AS $$
BEGIN
  -- Basic Salary (System Component)
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_system_component, is_taxable, is_gosi_applicable, affects_basic_salary, display_order)
  VALUES (p_company_id, 'BASIC', 'Basic Salary', 'الراتب الأساسي', 'earning', 'fixed', true, true, true, true, 1)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Housing Allowance
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_taxable, is_gosi_applicable, display_order)
  VALUES (p_company_id, 'HOUSING', 'Housing Allowance', 'بدل السكن', 'earning', 'fixed', true, true, 2)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Transportation Allowance
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_taxable, is_gosi_applicable, display_order)
  VALUES (p_company_id, 'TRANSPORT', 'Transportation Allowance', 'بدل النقل', 'earning', 'fixed', true, false, 3)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Food Allowance
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_taxable, is_gosi_applicable, display_order)
  VALUES (p_company_id, 'FOOD', 'Food Allowance', 'بدل الطعام', 'earning', 'fixed', true, false, 4)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Mobile Allowance
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_taxable, is_gosi_applicable, display_order)
  VALUES (p_company_id, 'MOBILE', 'Mobile Allowance', 'بدل الجوال', 'earning', 'fixed', true, false, 5)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Overtime
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_taxable, is_gosi_applicable, is_prorated, display_order)
  VALUES (p_company_id, 'OVERTIME', 'Overtime Pay', 'أجر العمل الإضافي', 'earning', 'formula', true, false, true, 6)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Performance Bonus
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_taxable, is_gosi_applicable, display_order)
  VALUES (p_company_id, 'BONUS_PERF', 'Performance Bonus', 'مكافأة الأداء', 'earning', 'fixed', true, false, 7)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Annual Bonus
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_taxable, is_gosi_applicable, display_order)
  VALUES (p_company_id, 'BONUS_ANNUAL', 'Annual Bonus', 'المكافأة السنوية', 'earning', 'fixed', true, false, 8)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- GOSI Employee Share (Deduction)
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_system_component, display_order)
  VALUES (p_company_id, 'GOSI_EMP', 'GOSI Employee Share', 'حصة الموظف في التأمينات', 'deduction', 'percentage', true, 100)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Loan Deduction
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, display_order)
  VALUES (p_company_id, 'LOAN', 'Loan Deduction', 'خصم القرض', 'deduction', 'fixed', 101)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Advance Deduction
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, display_order)
  VALUES (p_company_id, 'ADVANCE', 'Advance Deduction', 'خصم السلفة', 'deduction', 'fixed', 102)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Absence Deduction
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_prorated, display_order)
  VALUES (p_company_id, 'ABSENT', 'Absence Deduction', 'خصم الغياب', 'deduction', 'attendance_based', true, 103)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Late Deduction
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, display_order)
  VALUES (p_company_id, 'LATE', 'Late Deduction', 'خصم التأخير', 'deduction', 'attendance_based', 104)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Tax Withholding
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_system_component, display_order)
  VALUES (p_company_id, 'TAX', 'Income Tax', 'ضريبة الدخل', 'deduction', 'formula', true, 105)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- Zakat (Saudi Nationals Only)
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, default_percentage, display_order)
  VALUES (p_company_id, 'ZAKAT', 'Zakat', 'الزكاة', 'deduction', 'percentage', 2.5, 106)
  ON CONFLICT (company_id, code) DO NOTHING;
  
  -- GOSI Employer Share (Employer Cost)
  INSERT INTO payroll_components_v2 (company_id, code, name_en, name_ar, component_type, calculation_method, is_system_component, display_on_payslip, display_order)
  VALUES (p_company_id, 'GOSI_EMP_COST', 'GOSI Employer Share', 'حصة صاحب العمل في التأمينات', 'employer_cost', 'percentage', true, false, 200)
  ON CONFLICT (company_id, code) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

-- Payroll Calculation Engine Function
CREATE OR REPLACE FUNCTION calculate_payroll_cycle(p_cycle_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_cycle record;
  v_employee record;
  v_component record;
  v_total_employees integer := 0;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_working_days integer := 30;
  v_result jsonb;
BEGIN
  -- Get cycle details
  SELECT * INTO v_cycle FROM payroll_cycles_v2 WHERE id = p_cycle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cycle not found');
  END IF;
  
  -- Update cycle status
  UPDATE payroll_cycles_v2 
  SET status = 'calculating', calculated_at = now(), calculated_by = auth.uid()
  WHERE id = p_cycle_id;
  
  -- Get active employees for the company
  FOR v_employee IN 
    SELECT e.* 
    FROM employees e
    WHERE e.company_id = v_cycle.company_id
    AND e.status = 'active'
    AND e.hire_date <= v_cycle.period_end
  LOOP
    v_total_employees := v_total_employees + 1;
    
    -- Create payroll cycle employee record
    INSERT INTO payroll_cycle_employees_v2 (
      company_id, cycle_id, employee_id,
      employee_name, employee_number, department, position,
      working_days, present_days,
      basic_salary
    ) VALUES (
      v_cycle.company_id, p_cycle_id, v_employee.id,
      v_employee.full_name, v_employee.employee_number, 
      v_employee.department, v_employee.position,
      v_working_days, v_working_days, -- Will be updated with actual attendance
      COALESCE(v_employee.basic_salary, 0)
    )
    ON CONFLICT (cycle_id, employee_id) DO UPDATE
    SET basic_salary = EXCLUDED.basic_salary;
    
  END LOOP;
  
  -- Update cycle totals
  UPDATE payroll_cycles_v2
  SET 
    status = 'calculated',
    total_employees = v_total_employees,
    calculated_at = now()
  WHERE id = p_cycle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'employees_processed', v_total_employees,
    'message', 'Payroll calculation completed'
  );
  
EXCEPTION WHEN OTHERS THEN
  UPDATE payroll_cycles_v2 
  SET status = 'draft', has_errors = true, error_count = error_count + 1
  WHERE id = p_cycle_id;
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GOSI Calculation Function
CREATE OR REPLACE FUNCTION calculate_gosi_contribution(
  p_cycle_employee_id uuid,
  p_basic_salary numeric,
  p_housing_allowance numeric,
  p_nationality text
) RETURNS jsonb AS $$
DECLARE
  v_contribution_base numeric;
  v_employee_rate numeric;
  v_employer_rate numeric;
  v_employee_contribution numeric;
  v_employer_contribution numeric;
  v_max_base numeric := 45000; -- 2024 GOSI limit
BEGIN
  -- Calculate contribution base (basic + housing, capped at max)
  v_contribution_base := LEAST(p_basic_salary + p_housing_allowance, v_max_base);
  
  -- Set rates based on nationality
  IF p_nationality = 'Saudi' THEN
    v_employee_rate := 9.75; -- 9.75% for Saudi nationals (9% pension + 0.75% unemployment)
    v_employer_rate := 12.0; -- 12% employer share
  ELSE
    v_employee_rate := 2.0;  -- 2% for non-Saudis (occupational hazards only)
    v_employer_rate := 2.0;  -- 2% employer share
  END IF;
  
  -- Calculate contributions
  v_employee_contribution := ROUND(v_contribution_base * v_employee_rate / 100, 2);
  v_employer_contribution := ROUND(v_contribution_base * v_employer_rate / 100, 2);
  
  RETURN jsonb_build_object(
    'contribution_base', v_contribution_base,
    'employee_rate', v_employee_rate,
    'employer_rate', v_employer_rate,
    'employee_contribution', v_employee_contribution,
    'employer_contribution', v_employer_contribution,
    'total_contribution', v_employee_contribution + v_employer_contribution
  );
END;
$$ LANGUAGE plpgsql;

-- Validation Rules Function
CREATE OR REPLACE FUNCTION validate_payroll_cycle(p_cycle_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_error_count integer := 0;
  v_warning_count integer := 0;
  v_employee record;
BEGIN
  -- Clear previous validations
  DELETE FROM payroll_validations_v2 WHERE cycle_id = p_cycle_id;
  
  -- Validate: Employees with zero net salary
  FOR v_employee IN
    SELECT * FROM payroll_cycle_employees_v2
    WHERE cycle_id = p_cycle_id AND net_salary <= 0
  LOOP
    INSERT INTO payroll_validations_v2 (
      company_id, cycle_id, cycle_employee_id,
      rule_code, rule_name, severity, is_valid, validation_message
    )
    SELECT 
      company_id, cycle_id, id,
      'ZERO_NET', 'Zero or Negative Net Salary', 'error', false,
      'Employee ' || employee_name || ' has zero or negative net salary'
    FROM payroll_cycle_employees_v2 WHERE id = v_employee.id;
    
    v_error_count := v_error_count + 1;
  END LOOP;
  
  -- Validate: Missing bank details
  FOR v_employee IN
    SELECT * FROM payroll_cycle_employees_v2
    WHERE cycle_id = p_cycle_id AND (iban IS NULL OR iban = '')
  LOOP
    INSERT INTO payroll_validations_v2 (
      company_id, cycle_id, cycle_employee_id,
      rule_code, rule_name, severity, is_valid, validation_message
    )
    SELECT 
      company_id, cycle_id, id,
      'MISSING_BANK', 'Missing Bank Details', 'warning', false,
      'Employee ' || employee_name || ' is missing IBAN'
    FROM payroll_cycle_employees_v2 WHERE id = v_employee.id;
    
    v_warning_count := v_warning_count + 1;
  END LOOP;
  
  -- Update cycle with validation results
  UPDATE payroll_cycles_v2
  SET 
    has_errors = (v_error_count > 0),
    error_count = v_error_count,
    status = CASE 
      WHEN v_error_count > 0 THEN 'draft'
      ELSE 'validating'
    END
  WHERE id = p_cycle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'errors', v_error_count,
    'warnings', v_warning_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;