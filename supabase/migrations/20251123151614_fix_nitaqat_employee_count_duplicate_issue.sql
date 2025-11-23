/*
  # Fix Nitaqat Employee Count - Eliminate Duplicate Counting
  
  ## Issue
  The get_current_nitaqat_band function was counting duplicate employees when
  joining with the payroll table, because employees with multiple payroll records
  were being counted multiple times.
  
  ## Changes
  1. Use DISTINCT e.id to count unique employees only
  2. Get the most recent basic_salary for each employee using a subquery
  3. Ensures accurate employee counts: 160 employees instead of 312 rows
  
  ## Impact
  - Total Employees: Now shows correct unique count
  - Saudi Count: Accurate count of unique Saudi employees
  - Effective Saudi Count: Calculated from unique employees with latest salary
*/

CREATE OR REPLACE FUNCTION get_current_nitaqat_band(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company RECORD;
  v_total_employees integer;
  v_saudi_count integer;
  v_non_saudi_count integer;
  v_effective_saudi_count numeric;
  v_saudi_percentage numeric;
  v_effective_percentage numeric;
  v_size_band RECORD;
  v_current_band RECORD;
  v_next_band RECORD;
  v_sector_name text;
  v_result jsonb;
BEGIN
  SELECT 
    c.id,
    c.name_en,
    c.nitaqat_sector_id,
    c.nitaqat_calculation_method,
    c.establishment_date,
    ns.name_en as sector_name
  INTO v_company
  FROM companies c
  LEFT JOIN nitaqat_sectors ns ON ns.id = c.nitaqat_sector_id
  WHERE c.id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Company not found'
    );
  END IF;

  IF v_company.nitaqat_sector_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'No Nitaqat sector configured. Please configure in Settings.'
    );
  END IF;

  -- Use subquery to get latest salary per employee, avoiding duplicates
  WITH latest_payroll AS (
    SELECT DISTINCT ON (employee_id)
      employee_id,
      basic_salary
    FROM payroll
    WHERE company_id = p_company_id
    ORDER BY employee_id, effective_from DESC
  )
  SELECT 
    COUNT(DISTINCT e.id) as total,
    COUNT(DISTINCT e.id) FILTER (WHERE is_saudi = true) as saudi,
    COUNT(DISTINCT e.id) FILTER (WHERE is_saudi = false) as non_saudi,
    COALESCE(SUM(
      CASE
        WHEN e.is_saudi AND e.has_disability AND COALESCE(lp.basic_salary, 0) >= 4000 THEN 4.0
        WHEN e.is_saudi AND COALESCE(lp.basic_salary, 0) >= 4000 THEN 1.0
        WHEN e.is_saudi AND COALESCE(lp.basic_salary, 0) > 0 AND COALESCE(lp.basic_salary, 0) < 4000 THEN 0.5
        ELSE 0
      END
    ), 0) as effective_saudi
  INTO v_total_employees, v_saudi_count, v_non_saudi_count, v_effective_saudi_count
  FROM employees e
  LEFT JOIN latest_payroll lp ON lp.employee_id = e.id
  WHERE e.company_id = p_company_id
    AND e.status = 'active';

  IF v_total_employees = 0 THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'No active employees found'
    );
  END IF;

  v_saudi_percentage := (v_saudi_count::numeric / v_total_employees::numeric) * 100;
  v_effective_percentage := (v_effective_saudi_count::numeric / v_total_employees::numeric) * 100;

  SELECT 
    sb.id,
    sb.name,
    sb.min_employees,
    sb.max_employees
  INTO v_size_band
  FROM nitaqat_size_bands sb
  WHERE sb.sector_id = v_company.nitaqat_sector_id
    AND v_total_employees >= sb.min_employees
    AND (sb.max_employees IS NULL OR v_total_employees <= sb.max_employees)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'No matching size band found for employee count: ' || v_total_employees
    );
  END IF;

  SELECT 
    nb.id,
    nb.band_name,
    nb.band_color,
    nb.min_percentage,
    nb.max_percentage,
    nb.priority
  INTO v_current_band
  FROM nitaqat_bands nb
  WHERE nb.size_band_id = v_size_band.id
    AND v_effective_percentage >= nb.min_percentage
    AND (nb.max_percentage IS NULL OR v_effective_percentage <= nb.max_percentage)
  ORDER BY nb.priority DESC
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT 
      nb.id,
      nb.band_name,
      nb.band_color,
      nb.min_percentage,
      nb.max_percentage,
      nb.priority
    INTO v_current_band
    FROM nitaqat_bands nb
    WHERE nb.size_band_id = v_size_band.id
    ORDER BY nb.priority ASC
    LIMIT 1;
  END IF;

  SELECT 
    nb.id,
    nb.band_name,
    nb.band_color,
    nb.min_percentage,
    nb.max_percentage
  INTO v_next_band
  FROM nitaqat_bands nb
  WHERE nb.size_band_id = v_size_band.id
    AND nb.priority > v_current_band.priority
  ORDER BY nb.priority ASC
  LIMIT 1;

  v_result := jsonb_build_object(
    'status', 'success',
    'band_id', v_current_band.id,
    'band_name', v_current_band.band_name,
    'band_color', v_current_band.band_color,
    'current_percentage', ROUND(v_saudi_percentage, 2),
    'effective_percentage', ROUND(v_effective_percentage, 2),
    'min_percentage', v_current_band.min_percentage,
    'max_percentage', v_current_band.max_percentage,
    'total_employees', v_total_employees,
    'saudi_count', v_saudi_count,
    'non_saudi_count', v_non_saudi_count,
    'effective_saudi_count', ROUND(v_effective_saudi_count, 2),
    'size_band_name', v_size_band.name,
    'size_band_range', v_size_band.min_employees || '-' || COALESCE(v_size_band.max_employees::text, '∞'),
    'sector_name', v_company.sector_name,
    'calculation_method', v_company.nitaqat_calculation_method,
    'company_name', v_company.name_en
  );

  IF v_next_band IS NOT NULL THEN
    v_result := v_result || jsonb_build_object(
      'next_band', jsonb_build_object(
        'band_name', v_next_band.band_name,
        'band_color', v_next_band.band_color,
        'min_percentage', v_next_band.min_percentage,
        'percentage_needed', ROUND(v_next_band.min_percentage - v_effective_percentage, 2),
        'saudi_employees_needed', CEIL((v_next_band.min_percentage / 100.0 * v_total_employees) - v_effective_saudi_count)
      )
    );
  END IF;

  RETURN v_result;
END;
$$;
