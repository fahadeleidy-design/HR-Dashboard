/*
  # Seed Salary Scale Data for Saudi Market
  
  Initial data reflecting Saudi market standards
*/

-- Seed Job Families
INSERT INTO job_families (company_id, family_code, family_name, description, icon, color_code)
SELECT 
  c.id,
  f.code,
  f.name,
  f.description,
  f.icon,
  f.color
FROM companies c
CROSS JOIN (VALUES
  ('ENG', 'Engineering & Technology', 'Software, IT, and technical roles', 'code', '#3B82F6'),
  ('FIN', 'Finance & Accounting', 'Financial management and accounting', 'dollar-sign', '#10B981'),
  ('HR', 'Human Resources', 'People operations and talent management', 'users', '#F59E0B'),
  ('OPS', 'Operations', 'Business operations and logistics', 'settings', '#8B5CF6'),
  ('SALES', 'Sales & Business Development', 'Revenue generation and client relations', 'trending-up', '#EF4444'),
  ('MKT', 'Marketing', 'Brand and marketing activities', 'megaphone', '#EC4899'),
  ('LEG', 'Legal & Compliance', 'Legal affairs and regulatory compliance', 'shield', '#6366F1'),
  ('ADM', 'Administration', 'Administrative and support services', 'briefcase', '#64748B')
) AS f(code, name, description, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM job_families WHERE company_id = c.id
)
ON CONFLICT (company_id, family_code) DO NOTHING;

-- Seed Job Grades
INSERT INTO job_grades (company_id, grade_code, grade_level, grade_name, description, minimum_years_experience, is_leadership)
SELECT 
  c.id,
  g.code,
  g.level,
  g.name,
  g.description,
  g.min_exp,
  g.is_leader
FROM companies c
CROSS JOIN (VALUES
  ('G01', 1, 'Entry Level', 'Entry-level positions requiring minimal experience', 0, false),
  ('G02', 2, 'Junior', 'Junior positions with basic skills', 1, false),
  ('G03', 3, 'Intermediate', 'Intermediate level with proven experience', 2, false),
  ('G04', 4, 'Senior I', 'Senior professional with specialized skills', 4, false),
  ('G05', 5, 'Senior II', 'Advanced senior professional', 6, false),
  ('G06', 6, 'Lead', 'Technical/functional lead', 8, false),
  ('G07', 7, 'Principal', 'Principal professional/expert', 10, false),
  ('G08', 8, 'Manager', 'First-level management', 8, true),
  ('G09', 9, 'Senior Manager', 'Senior management role', 10, true),
  ('G10', 10, 'Associate Director', 'Associate director level', 12, true),
  ('G11', 11, 'Director', 'Director level', 15, true),
  ('G12', 12, 'Senior Director', 'Senior director level', 18, true),
  ('G13', 13, 'Vice President', 'VP level executive', 20, true),
  ('G14', 14, 'Senior Vice President', 'Senior VP level', 22, true),
  ('G15', 15, 'C-Level Executive', 'Executive leadership', 25, true)
) AS g(code, level, name, description, min_exp, is_leader)
WHERE NOT EXISTS (
  SELECT 1 FROM job_grades WHERE company_id = c.id
)
ON CONFLICT (company_id, grade_code) DO NOTHING;

-- Seed Salary Components
INSERT INTO salary_components (company_id, component_code, component_name, component_name_ar, component_type, is_fixed, is_taxable, is_gosi_applicable, calculation_method, percentage_of_basic, display_order)
SELECT 
  c.id,
  comp.code,
  comp.name,
  comp.name_ar,
  comp.type,
  comp.is_fixed,
  comp.is_taxable,
  comp.is_gosi,
  comp.calc_method,
  comp.pct_basic,
  comp.display_order
FROM companies c
CROSS JOIN (VALUES
  ('BASIC', 'Basic Salary', 'الراتب الأساسي', 'basic', true, true, true, 'fixed_amount', NULL, 1),
  ('HOUSING', 'Housing Allowance', 'بدل السكن', 'allowance', true, false, false, 'percentage', 25.00, 2),
  ('TRANSPORT', 'Transportation Allowance', 'بدل المواصلات', 'allowance', true, false, false, 'fixed_amount', NULL, 3),
  ('FOOD', 'Food Allowance', 'بدل الطعام', 'allowance', true, false, false, 'fixed_amount', NULL, 4),
  ('MOBILE', 'Mobile Allowance', 'بدل الجوال', 'allowance', true, false, false, 'fixed_amount', NULL, 5),
  ('OVERTIME', 'Overtime Pay', 'أجر العمل الإضافي', 'allowance', false, true, true, 'fixed_amount', NULL, 6),
  ('ANNUAL_BONUS', 'Annual Bonus', 'المكافأة السنوية', 'bonus', false, true, true, 'percentage', NULL, 7),
  ('PERFORMANCE_BONUS', 'Performance Bonus', 'مكافأة الأداء', 'bonus', false, true, true, 'fixed_amount', NULL, 8)
) AS comp(code, name, name_ar, type, is_fixed, is_taxable, is_gosi, calc_method, pct_basic, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM salary_components WHERE company_id = c.id
)
ON CONFLICT (company_id, component_code) DO NOTHING;

-- Seed Default Salary Scale
INSERT INTO salary_scales (company_id, scale_name, scale_code, description, effective_date, is_active, is_default)
SELECT 
  c.id,
  '2025 Salary Scale',
  'SCALE_2025',
  'Standard salary scale for 2025 aligned with Saudi market rates',
  DATE '2025-01-01',
  true,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM salary_scales WHERE company_id = c.id AND is_default = true
)
ON CONFLICT (company_id, scale_code) DO NOTHING;

-- Seed Salary Bands
WITH scale_data AS (
  SELECT ss.id as scale_id, jg.id as grade_id, jg.grade_level
  FROM salary_scales ss
  JOIN companies c ON ss.company_id = c.id
  JOIN job_grades jg ON jg.company_id = c.id
  WHERE ss.is_default = true
)
INSERT INTO salary_bands (salary_scale_id, grade_id, nationality_type, minimum_salary, midpoint_salary, maximum_salary)
SELECT 
  sd.scale_id,
  sd.grade_id,
  'all',
  CASE sd.grade_level
    WHEN 1 THEN 4000 WHEN 2 THEN 5000 WHEN 3 THEN 7000 WHEN 4 THEN 10000 WHEN 5 THEN 14000
    WHEN 6 THEN 18000 WHEN 7 THEN 23000 WHEN 8 THEN 20000 WHEN 9 THEN 25000 WHEN 10 THEN 32000
    WHEN 11 THEN 40000 WHEN 12 THEN 50000 WHEN 13 THEN 65000 WHEN 14 THEN 85000 WHEN 15 THEN 110000
  END,
  CASE sd.grade_level
    WHEN 1 THEN 5000 WHEN 2 THEN 6500 WHEN 3 THEN 9000 WHEN 4 THEN 13000 WHEN 5 THEN 18000
    WHEN 6 THEN 23000 WHEN 7 THEN 29000 WHEN 8 THEN 26000 WHEN 9 THEN 32000 WHEN 10 THEN 40000
    WHEN 11 THEN 50000 WHEN 12 THEN 62000 WHEN 13 THEN 80000 WHEN 14 THEN 105000 WHEN 15 THEN 135000
  END,
  CASE sd.grade_level
    WHEN 1 THEN 6000 WHEN 2 THEN 8000 WHEN 3 THEN 11000 WHEN 4 THEN 16000 WHEN 5 THEN 22000
    WHEN 6 THEN 28000 WHEN 7 THEN 35000 WHEN 8 THEN 32000 WHEN 9 THEN 39000 WHEN 10 THEN 48000
    WHEN 11 THEN 60000 WHEN 12 THEN 74000 WHEN 13 THEN 95000 WHEN 14 THEN 125000 WHEN 15 THEN 160000
  END
FROM scale_data sd
WHERE NOT EXISTS (
  SELECT 1 FROM salary_bands WHERE salary_scale_id = sd.scale_id AND grade_id = sd.grade_id
)
ON CONFLICT DO NOTHING;

-- Seed Progression Rules
INSERT INTO salary_progression_rules (
  company_id, rule_name, effective_date, progression_type, 
  minimum_increase_percentage, maximum_increase_percentage, default_increase_percentage,
  requires_performance_rating, minimum_performance_rating,
  requires_time_in_grade, minimum_months_in_grade
)
SELECT 
  c.id,
  'Annual Merit Increase 2025',
  DATE '2025-01-01',
  'annual',
  2.0, 8.0, 4.0,
  true, 3.0,
  true, 12
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM salary_progression_rules WHERE company_id = c.id)
UNION ALL
SELECT 
  c.id,
  'Cost of Living Adjustment 2025',
  DATE '2025-01-01',
  'cost_of_living',
  2.5, 3.5, 3.0,
  false, NULL,
  false, NULL
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM salary_progression_rules WHERE company_id = c.id)
UNION ALL
SELECT 
  c.id,
  'Promotion Standard',
  DATE '2025-01-01',
  'promotion',
  8.0, 20.0, 12.0,
  false, NULL,
  false, NULL
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM salary_progression_rules WHERE company_id = c.id)
ON CONFLICT DO NOTHING;

-- Seed Merit Matrix
INSERT INTO merit_increase_matrix (
  company_id, matrix_name, effective_date,
  performance_rating_min, performance_rating_max,
  position_in_range_min, position_in_range_max,
  increase_percentage
)
SELECT 
  c.id,
  '2025 Merit Matrix',
  DATE '2025-01-01',
  m.perf_min, m.perf_max,
  m.range_min, m.range_max,
  m.increase_pct
FROM companies c
CROSS JOIN (VALUES
  (4.5, 5.0, 0, 80, 8.0), (4.5, 5.0, 80, 100, 6.0), (4.5, 5.0, 100, 120, 4.0),
  (3.5, 4.5, 0, 80, 6.0), (3.5, 4.5, 80, 100, 5.0), (3.5, 4.5, 100, 120, 3.0),
  (2.5, 3.5, 0, 80, 4.0), (2.5, 3.5, 80, 100, 3.0), (2.5, 3.5, 100, 120, 2.0),
  (0.0, 2.5, 0, 120, 0.0)
) AS m(perf_min, perf_max, range_min, range_max, increase_pct)
WHERE NOT EXISTS (SELECT 1 FROM merit_increase_matrix WHERE company_id = c.id)
ON CONFLICT DO NOTHING;