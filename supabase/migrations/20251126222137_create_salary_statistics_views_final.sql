/*
  # Salary Statistics Views and Functions (Final)

  Create comprehensive views and functions to calculate salary statistics from actual
  employee data including minimum, average, maximum, salary range spread, and position coverage.
*/

-- Drop existing views if they exist
DROP VIEW IF EXISTS company_salary_statistics CASCADE;
DROP VIEW IF EXISTS grade_salary_statistics CASCADE;
DROP VIEW IF EXISTS department_salary_statistics CASCADE;
DROP VIEW IF EXISTS position_coverage_analysis CASCADE;
DROP FUNCTION IF EXISTS calculate_salary_range_spread(numeric, numeric);
DROP FUNCTION IF EXISTS calculate_position_in_range(numeric, numeric, numeric);
DROP FUNCTION IF EXISTS get_salary_statistics(uuid, uuid, uuid);

-- Company-wide salary statistics view
CREATE VIEW company_salary_statistics AS
SELECT 
  e.company_id,
  COUNT(e.id) as total_employees,
  
  MIN(e.basic_salary) as min_basic_salary,
  AVG(e.basic_salary) as avg_basic_salary,
  MAX(e.basic_salary) as max_basic_salary,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.basic_salary) as median_basic_salary,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY e.basic_salary) as q1_basic_salary,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY e.basic_salary) as q3_basic_salary,
  
  MIN(e.total_compensation) as min_total_comp,
  AVG(e.total_compensation) as avg_total_comp,
  MAX(e.total_compensation) as max_total_comp,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.total_compensation) as median_total_comp,
  
  CASE 
    WHEN MIN(e.basic_salary) > 0 THEN 
      ROUND(((MAX(e.basic_salary) - MIN(e.basic_salary)) / MIN(e.basic_salary) * 100)::numeric, 2)
    ELSE 0
  END as salary_range_spread_pct,
  
  SUM(e.basic_salary) as total_basic_payroll,
  SUM(e.housing_allowance) as total_housing_allowance,
  SUM(e.transport_allowance) as total_transport_allowance,
  SUM(e.total_compensation) as total_payroll,
  
  AVG(e.housing_allowance) as avg_housing_allowance,
  AVG(e.transport_allowance) as avg_transport_allowance,
  AVG(e.food_allowance) as avg_food_allowance,
  
  AVG(CASE 
    WHEN sb.midpoint_salary > 0 THEN (e.basic_salary / sb.midpoint_salary) * 100
    ELSE NULL
  END) as avg_compa_ratio,
  
  COUNT(CASE WHEN e.basic_salary > 0 THEN 1 END) as employees_with_salary,
  COUNT(CASE WHEN e.job_grade_id IS NOT NULL THEN 1 END) as employees_with_grade,
  COUNT(CASE WHEN e.salary_band_id IS NOT NULL THEN 1 END) as employees_with_band

FROM employees e
LEFT JOIN salary_bands sb ON e.salary_band_id = sb.id
WHERE e.status = 'active' AND e.basic_salary > 0
GROUP BY e.company_id;

-- Grade-level salary statistics
CREATE VIEW grade_salary_statistics AS
SELECT 
  e.company_id,
  jg.id as grade_id,
  jg.grade_code,
  jg.grade_name,
  jg.grade_level,
  jf.family_name,
  
  COUNT(e.id) as employee_count,
  COUNT(CASE WHEN e.salary_band_id IS NOT NULL THEN 1 END) as employees_with_band,
  
  MIN(e.basic_salary) as actual_min_salary,
  AVG(e.basic_salary) as actual_avg_salary,
  MAX(e.basic_salary) as actual_max_salary,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.basic_salary) as actual_median_salary,
  
  AVG(sb.minimum_salary) as band_minimum,
  AVG(sb.midpoint_salary) as band_midpoint,
  AVG(sb.maximum_salary) as band_maximum,
  
  CASE 
    WHEN MIN(e.basic_salary) > 0 THEN 
      ROUND(((MAX(e.basic_salary) - MIN(e.basic_salary)) / MIN(e.basic_salary) * 100)::numeric, 2)
    ELSE 0
  END as actual_range_spread_pct,
  
  CASE 
    WHEN AVG(sb.minimum_salary) > 0 THEN 
      ROUND(((AVG(sb.maximum_salary) - AVG(sb.minimum_salary)) / AVG(sb.minimum_salary) * 100)::numeric, 2)
    ELSE 0
  END as band_range_spread_pct,
  
  COUNT(CASE WHEN e.basic_salary < sb.minimum_salary THEN 1 END) as below_band_count,
  COUNT(CASE 
    WHEN e.basic_salary >= sb.minimum_salary AND e.basic_salary <= sb.maximum_salary THEN 1 
  END) as within_band_count,
  COUNT(CASE WHEN e.basic_salary > sb.maximum_salary THEN 1 END) as above_band_count,
  
  ROUND((COUNT(CASE 
    WHEN e.basic_salary >= sb.minimum_salary AND e.basic_salary <= sb.maximum_salary THEN 1 
  END)::numeric / NULLIF(COUNT(e.id), 0) * 100)::numeric, 2) as position_coverage_pct,
  
  AVG(CASE 
    WHEN sb.midpoint_salary > 0 THEN (e.basic_salary / sb.midpoint_salary) * 100
    ELSE NULL
  END) as avg_compa_ratio,
  
  SUM(e.basic_salary) as total_basic_salary,
  SUM(e.total_compensation) as total_compensation,
  AVG(e.total_compensation) as avg_total_compensation

FROM employees e
INNER JOIN job_grades jg ON e.job_grade_id = jg.id
LEFT JOIN job_positions jp ON e.job_position_id = jp.id
LEFT JOIN job_families jf ON jp.job_family_id = jf.id
LEFT JOIN salary_bands sb ON e.salary_band_id = sb.id AND sb.grade_id = jg.id
WHERE e.status = 'active' AND e.basic_salary > 0
GROUP BY e.company_id, jg.id, jg.grade_code, jg.grade_name, jg.grade_level, jf.family_name;

-- Department salary statistics
CREATE VIEW department_salary_statistics AS
SELECT 
  e.company_id,
  d.id as department_id,
  d.name_en as department_name,
  
  COUNT(e.id) as employee_count,
  
  MIN(e.basic_salary) as min_salary,
  AVG(e.basic_salary) as avg_salary,
  MAX(e.basic_salary) as max_salary,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.basic_salary) as median_salary,
  
  CASE 
    WHEN MIN(e.basic_salary) > 0 THEN 
      ROUND(((MAX(e.basic_salary) - MIN(e.basic_salary)) / MIN(e.basic_salary) * 100)::numeric, 2)
    ELSE 0
  END as salary_range_spread_pct,
  
  SUM(e.basic_salary) as total_basic_salary,
  SUM(e.total_compensation) as total_compensation,
  AVG(e.total_compensation) as avg_total_compensation,
  
  AVG(CASE 
    WHEN sb.midpoint_salary > 0 THEN (e.basic_salary / sb.midpoint_salary) * 100
    ELSE NULL
  END) as avg_compa_ratio

FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN salary_bands sb ON e.salary_band_id = sb.id
WHERE e.status = 'active' AND e.basic_salary > 0
GROUP BY e.company_id, d.id, d.name_en;

-- Position coverage analysis
CREATE VIEW position_coverage_analysis AS
SELECT 
  e.company_id,
  jg.id as grade_id,
  jg.grade_code,
  jg.grade_name,
  sb.id as band_id,
  sb.minimum_salary as band_min,
  sb.midpoint_salary as band_mid,
  sb.maximum_salary as band_max,
  
  COUNT(e.id) as total_employees,
  
  COUNT(CASE 
    WHEN e.basic_salary >= sb.minimum_salary 
    AND e.basic_salary < (sb.minimum_salary + (sb.midpoint_salary - sb.minimum_salary) / 2)
    THEN 1 
  END) as q1_count,
  
  COUNT(CASE 
    WHEN e.basic_salary >= (sb.minimum_salary + (sb.midpoint_salary - sb.minimum_salary) / 2)
    AND e.basic_salary < sb.midpoint_salary
    THEN 1 
  END) as q2_count,
  
  COUNT(CASE 
    WHEN e.basic_salary >= sb.midpoint_salary
    AND e.basic_salary < (sb.midpoint_salary + (sb.maximum_salary - sb.midpoint_salary) / 2)
    THEN 1 
  END) as q3_count,
  
  COUNT(CASE 
    WHEN e.basic_salary >= (sb.midpoint_salary + (sb.maximum_salary - sb.midpoint_salary) / 2)
    AND e.basic_salary <= sb.maximum_salary
    THEN 1 
  END) as q4_count,
  
  COUNT(CASE WHEN e.basic_salary < sb.minimum_salary THEN 1 END) as below_band,
  COUNT(CASE WHEN e.basic_salary > sb.maximum_salary THEN 1 END) as above_band,
  
  ROUND((COUNT(CASE 
    WHEN e.basic_salary >= sb.minimum_salary AND e.basic_salary <= sb.maximum_salary THEN 1 
  END)::numeric / NULLIF(COUNT(e.id), 0) * 100)::numeric, 2) as overall_coverage_pct,
  
  ROUND((COUNT(CASE WHEN e.basic_salary < sb.minimum_salary THEN 1 END)::numeric / 
    NULLIF(COUNT(e.id), 0) * 100)::numeric, 2) as below_band_pct,
  
  ROUND((COUNT(CASE WHEN e.basic_salary > sb.maximum_salary THEN 1 END)::numeric / 
    NULLIF(COUNT(e.id), 0) * 100)::numeric, 2) as above_band_pct,
  
  AVG(CASE 
    WHEN sb.maximum_salary > sb.minimum_salary THEN 
      ((e.basic_salary - sb.minimum_salary) / (sb.maximum_salary - sb.minimum_salary)) * 100
    ELSE NULL
  END) as avg_range_penetration

FROM employees e
INNER JOIN job_grades jg ON e.job_grade_id = jg.id
INNER JOIN salary_bands sb ON e.salary_band_id = sb.id AND sb.grade_id = jg.id
WHERE e.status = 'active' AND e.basic_salary > 0
GROUP BY e.company_id, jg.id, jg.grade_code, jg.grade_name, sb.id, 
         sb.minimum_salary, sb.midpoint_salary, sb.maximum_salary;

-- Functions
CREATE OR REPLACE FUNCTION calculate_salary_range_spread(
  p_min_salary numeric,
  p_max_salary numeric
)
RETURNS numeric AS $$
BEGIN
  IF p_min_salary > 0 THEN
    RETURN ROUND(((p_max_salary - p_min_salary) / p_min_salary * 100)::numeric, 2);
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_position_in_range(
  p_salary numeric,
  p_min_salary numeric,
  p_max_salary numeric
)
RETURNS numeric AS $$
BEGIN
  IF p_max_salary > p_min_salary THEN
    RETURN ROUND(((p_salary - p_min_salary) / (p_max_salary - p_min_salary) * 100)::numeric, 2);
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_salary_statistics(
  p_company_id uuid,
  p_grade_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL
)
RETURNS TABLE(
  metric_name text,
  metric_value numeric,
  metric_label text
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_employees AS (
    SELECT 
      e.basic_salary,
      e.total_compensation,
      sb.midpoint_salary
    FROM employees e
    LEFT JOIN salary_bands sb ON e.salary_band_id = sb.id
    WHERE e.company_id = p_company_id
      AND e.status = 'active'
      AND e.basic_salary > 0
      AND (p_grade_id IS NULL OR e.job_grade_id = p_grade_id)
      AND (p_department_id IS NULL OR e.department_id = p_department_id)
  )
  SELECT * FROM (
    SELECT 
      'min_salary'::text,
      MIN(basic_salary),
      'Minimum Salary'::text
    FROM filtered_employees
    UNION ALL
    SELECT 
      'avg_salary'::text,
      ROUND(AVG(basic_salary)::numeric, 2),
      'Average Salary'::text
    FROM filtered_employees
    UNION ALL
    SELECT 
      'max_salary'::text,
      MAX(basic_salary),
      'Maximum Salary'::text
    FROM filtered_employees
    UNION ALL
    SELECT 
      'median_salary'::text,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY basic_salary),
      'Median Salary'::text
    FROM filtered_employees
    UNION ALL
    SELECT 
      'range_spread'::text,
      CASE 
        WHEN MIN(basic_salary) > 0 THEN 
          ROUND(((MAX(basic_salary) - MIN(basic_salary)) / MIN(basic_salary) * 100)::numeric, 2)
        ELSE 0
      END,
      'Salary Range Spread %'::text
    FROM filtered_employees
    UNION ALL
    SELECT 
      'avg_compa_ratio'::text,
      ROUND(AVG(CASE 
        WHEN midpoint_salary > 0 THEN (basic_salary / midpoint_salary) * 100
        ELSE NULL
      END)::numeric, 2),
      'Average Compa-Ratio %'::text
    FROM filtered_employees
  ) subquery;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON company_salary_statistics TO authenticated;
GRANT SELECT ON grade_salary_statistics TO authenticated;
GRANT SELECT ON department_salary_statistics TO authenticated;
GRANT SELECT ON position_coverage_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_salary_range_spread TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_position_in_range TO authenticated;
GRANT EXECUTE ON FUNCTION get_salary_statistics TO authenticated;
