/*
  # Saudi HR Management System - Saudi Leave Types Seed Data

  ## Overview
  This migration seeds the default leave types according to Saudi Labor Law.

  ## Leave Types (Per Saudi Labor Law)

  ### Annual Leave
  - 21 days per year (after 1 year of service)
  - 30 days per year (after 5 years of service)

  ### Sick Leave
  - First 30 days: Full pay
  - Next 60 days: 75% pay
  - Next 30 days: Unpaid

  ### Hajj Leave
  - Once per employment period
  - 10 days (unpaid but job-protected)

  ### Maternity Leave
  - 10 weeks (70 days)
  - Full pay for first 4 weeks
  - Half pay for next 6 weeks

  ### Paternity Leave
  - 3 days (paid)

  ### Study Leave
  - As per company policy

  ### Unpaid Leave
  - Subject to approval

  ### Emergency Leave
  - Up to 5 days per year (paid)

  ### Bereavement Leave
  - 3-5 days (paid)

  Note: This is seed data that will be inserted for each company.
  Companies can customize these leave types as needed.
*/

-- Function to create default Saudi leave types for a company
CREATE OR REPLACE FUNCTION create_default_leave_types(p_company_id uuid)
RETURNS void AS $$
BEGIN
  -- Annual Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Annual Leave', 'إجازة سنوية', 21, true, true, true)
  ON CONFLICT (company_id, name_en) DO NOTHING;

  -- Sick Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Sick Leave', 'إجازة مرضية', 120, true, true, true)
  ON CONFLICT (company_id, name_en) DO NOTHING;

  -- Hajj Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Hajj Leave', 'إجازة حج', 10, false, true, true)
  ON CONFLICT (company_id, name_en) DO NOTHING;

  -- Maternity Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Maternity Leave', 'إجازة أمومة', 70, true, true, true)
  ON CONFLICT (company_id, name_en) DO NOTHING;

  -- Paternity Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Paternity Leave', 'إجازة أبوة', 3, true, true, true)
  ON CONFLICT (company_id, name_en) DO NOTHING;

  -- Emergency Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Emergency Leave', 'إجازة طارئة', 5, true, true, false)
  ON CONFLICT (company_id, name_en) DO NOTHING;

  -- Bereavement Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Bereavement Leave', 'إجازة عزاء', 5, true, true, false)
  ON CONFLICT (company_id, name_en) DO NOTHING;

  -- Unpaid Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Unpaid Leave', 'إجازة بدون راتب', 365, false, true, false)
  ON CONFLICT (company_id, name_en) DO NOTHING;

  -- Study Leave
  INSERT INTO leave_types (company_id, name_en, name_ar, max_days_per_year, is_paid, requires_approval, saudi_labor_law_based)
  VALUES (p_company_id, 'Study Leave', 'إجازة دراسية', 30, false, true, false)
  ON CONFLICT (company_id, name_en) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create leave types when a new company is added
CREATE OR REPLACE FUNCTION trigger_create_leave_types()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_leave_types(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_leave_types ON companies;
CREATE TRIGGER auto_create_leave_types
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_leave_types();