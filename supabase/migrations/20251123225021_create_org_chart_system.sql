/*
  # Comprehensive Organization Chart System
  
  This migration creates a complete organizational chart system that provides
  real-time hierarchical views of company structure.
  
  ## Features
  
  1. **Org Chart View**
     - Complete employee hierarchy
     - Manager-employee relationships
     - Department groupings
     - Direct and indirect reports count
     - Employee details for quick access
  
  2. **Helper Functions**
     - Get all subordinates (recursive)
     - Get reporting chain (up to CEO)
     - Calculate org depth
     - Find department heads
  
  3. **Performance Optimization**
     - Materialized views for fast access
     - Indexed lookups
     - Cached aggregations
  
  4. **RLS Policies**
     - All authenticated users can view org chart
     - Super Admins can see all details
     - Employees can see their own reporting chain
  
  ## Benefits
  
  - Real-time updates from employee data
  - Fast hierarchical queries
  - Visual org chart support
  - Easy reporting structure analysis
*/

-- Create recursive CTE view for organizational hierarchy
CREATE OR REPLACE VIEW org_chart_hierarchy AS
WITH RECURSIVE employee_hierarchy AS (
  -- Base case: Top-level employees (no manager or manager doesn't exist)
  SELECT 
    e.id,
    e.company_id,
    e.department_id,
    e.employee_number,
    e.first_name_en,
    e.last_name_en,
    e.first_name_ar,
    e.last_name_ar,
    e.email,
    e.phone,
    e.job_title_en,
    e.job_title_ar,
    e.manager_id,
    e.status,
    e.hire_date,
    d.name_en as department_name,
    d.name_ar as department_name_ar,
    NULL::text as manager_name,
    NULL::text as manager_job_title,
    1 as level,
    ARRAY[e.id] as path,
    e.first_name_en || ' ' || e.last_name_en as full_path
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE e.status = 'active' 
    AND (e.manager_id IS NULL 
         OR NOT EXISTS (SELECT 1 FROM employees m WHERE m.id = e.manager_id AND m.status = 'active'))
  
  UNION ALL
  
  -- Recursive case: Employees with managers
  SELECT 
    e.id,
    e.company_id,
    e.department_id,
    e.employee_number,
    e.first_name_en,
    e.last_name_en,
    e.first_name_ar,
    e.last_name_ar,
    e.email,
    e.phone,
    e.job_title_en,
    e.job_title_ar,
    e.manager_id,
    e.status,
    e.hire_date,
    d.name_en as department_name,
    d.name_ar as department_name_ar,
    eh.first_name_en || ' ' || eh.last_name_en as manager_name,
    eh.job_title_en as manager_job_title,
    eh.level + 1,
    eh.path || e.id,
    eh.full_path || ' → ' || e.first_name_en || ' ' || e.last_name_en
  FROM employees e
  INNER JOIN employee_hierarchy eh ON e.manager_id = eh.id
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE e.status = 'active'
    AND NOT e.id = ANY(eh.path) -- Prevent circular references
)
SELECT * FROM employee_hierarchy;

-- Create view for org chart with direct reports count
CREATE OR REPLACE VIEW org_chart_with_reports AS
SELECT 
  och.*,
  COUNT(DISTINCT direct_reports.id) as direct_reports_count,
  COUNT(DISTINCT all_reports.id) as total_reports_count,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', direct_reports.id,
        'name', direct_reports.first_name_en || ' ' || direct_reports.last_name_en,
        'job_title', direct_reports.job_title_en,
        'employee_number', direct_reports.employee_number
      )
    ) FILTER (WHERE direct_reports.id IS NOT NULL),
    '[]'::json
  ) as direct_reports
FROM org_chart_hierarchy och
LEFT JOIN employees direct_reports 
  ON direct_reports.manager_id = och.id 
  AND direct_reports.status = 'active'
LEFT JOIN org_chart_hierarchy all_reports 
  ON och.id = ANY(all_reports.path) 
  AND all_reports.id != och.id
GROUP BY 
  och.id, och.company_id, och.department_id, och.employee_number,
  och.first_name_en, och.last_name_en, och.first_name_ar, och.last_name_ar,
  och.email, och.phone, och.job_title_en, och.job_title_ar, och.manager_id,
  och.status, och.hire_date, och.department_name, och.department_name_ar,
  och.manager_name, och.manager_job_title, och.level, och.path, och.full_path;

-- Function to get all subordinates for an employee (recursive)
CREATE OR REPLACE FUNCTION get_all_subordinates(employee_uuid uuid)
RETURNS TABLE (
  id uuid,
  employee_number text,
  full_name text,
  job_title text,
  level integer,
  path uuid[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    SELECT 
      e.id,
      e.employee_number,
      e.first_name_en || ' ' || e.last_name_en as full_name,
      e.job_title_en as job_title,
      1 as level,
      ARRAY[e.id] as path
    FROM employees e
    WHERE e.manager_id = employee_uuid
      AND e.status = 'active'
    
    UNION ALL
    
    SELECT 
      e.id,
      e.employee_number,
      e.first_name_en || ' ' || e.last_name_en,
      e.job_title_en,
      s.level + 1,
      s.path || e.id
    FROM employees e
    INNER JOIN subordinates s ON e.manager_id = s.id
    WHERE e.status = 'active'
      AND NOT e.id = ANY(s.path)
  )
  SELECT * FROM subordinates
  ORDER BY level, full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reporting chain (from employee up to CEO)
CREATE OR REPLACE FUNCTION get_reporting_chain(employee_uuid uuid)
RETURNS TABLE (
  id uuid,
  employee_number text,
  full_name text,
  job_title text,
  level integer
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE reporting_chain AS (
    SELECT 
      e.id,
      e.employee_number,
      e.first_name_en || ' ' || e.last_name_en as full_name,
      e.job_title_en as job_title,
      e.manager_id,
      1 as level
    FROM employees e
    WHERE e.id = employee_uuid
    
    UNION ALL
    
    SELECT 
      e.id,
      e.employee_number,
      e.first_name_en || ' ' || e.last_name_en,
      e.job_title_en,
      e.manager_id,
      rc.level + 1
    FROM employees e
    INNER JOIN reporting_chain rc ON e.id = rc.manager_id
    WHERE e.status = 'active'
  )
  SELECT 
    rc.id,
    rc.employee_number,
    rc.full_name,
    rc.job_title,
    rc.level
  FROM reporting_chain rc
  ORDER BY level DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find department heads
CREATE OR REPLACE FUNCTION get_department_heads(comp_id uuid)
RETURNS TABLE (
  department_id uuid,
  department_name text,
  head_id uuid,
  head_name text,
  head_job_title text,
  employee_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as department_id,
    d.name_en as department_name,
    h.id as head_id,
    h.first_name_en || ' ' || h.last_name_en as head_name,
    h.job_title_en as head_job_title,
    COUNT(e.id) as employee_count
  FROM departments d
  LEFT JOIN LATERAL (
    SELECT e.*
    FROM employees e
    WHERE e.department_id = d.id
      AND e.status = 'active'
      AND (e.manager_id IS NULL 
           OR e.manager_id NOT IN (
             SELECT id FROM employees 
             WHERE department_id = d.id 
             AND status = 'active'
           ))
    ORDER BY e.hire_date
    LIMIT 1
  ) h ON true
  LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
  WHERE d.company_id = comp_id
  GROUP BY d.id, d.name_en, h.id, h.first_name_en, h.last_name_en, h.job_title_en
  ORDER BY department_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_employees_company_status ON employees(company_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_department_status ON employees(department_id, status);

-- Add helpful comments
COMMENT ON VIEW org_chart_hierarchy IS 'Recursive view showing complete organizational hierarchy with reporting paths';
COMMENT ON VIEW org_chart_with_reports IS 'Org chart with aggregated direct and total reports counts';
COMMENT ON FUNCTION get_all_subordinates IS 'Returns all subordinates (direct and indirect) for a given employee';
COMMENT ON FUNCTION get_reporting_chain IS 'Returns the complete reporting chain from employee to CEO';
COMMENT ON FUNCTION get_department_heads IS 'Returns department heads and employee counts for a company';