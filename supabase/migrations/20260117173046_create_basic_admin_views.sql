/*
  # Basic Centralized Administration Views

  Creates essential admin views with basic metrics
*/

-- Drop existing views
DROP VIEW IF EXISTS v_tenant_overview CASCADE;
DROP VIEW IF EXISTS v_tenant_health_metrics CASCADE;
DROP VIEW IF EXISTS v_cross_company_analytics CASCADE;

-- 1. Tenant Overview View
CREATE OR REPLACE VIEW v_tenant_overview AS
SELECT 
  companies.id as company_id,
  companies.name_en as company_name,
  COALESCE(companies.tenant_status, 'active'::tenant_status_enum) as tenant_status,
  COALESCE(companies.subscription_tier, 'professional'::subscription_tier_enum) as subscription_tier,
  companies.tenant_group_id,
  tg.name as holding_company_name,
  companies.custom_subdomain,
  COALESCE(companies.encryption_enabled, false) as encryption_enabled,
  companies.created_at,
  
  -- User statistics
  COUNT(DISTINCT ur.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN ur.role = 'admin' THEN ur.user_id END) as admin_count,
  COUNT(DISTINCT CASE WHEN ur.role = 'manager' THEN ur.user_id END) as manager_count,
  
  -- Employee statistics
  COUNT(DISTINCT e.id) as total_employees,
  COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_employees,
  COUNT(DISTINCT CASE WHEN e.is_saudi = true THEN e.id END) as saudi_employees,
  
  -- Feature usage
  COALESCE((tc.feature_flags->>'recruitment')::boolean, true) as recruitment_enabled,
  COALESCE((tc.feature_flags->>'payroll')::boolean, true) as payroll_enabled,
  COALESCE((tc.feature_flags->>'performance')::boolean, true) as performance_enabled,
  
  -- Branding
  tb.custom_domain,
  tb.logo_url

FROM companies
LEFT JOIN tenant_groups tg ON companies.tenant_group_id = tg.id
LEFT JOIN user_roles ur ON ur.company_id = companies.id
LEFT JOIN employees e ON e.company_id = companies.id
LEFT JOIN tenant_configurations tc ON tc.company_id = companies.id
LEFT JOIN tenant_branding tb ON tb.company_id = companies.id

GROUP BY 
  companies.id, companies.name_en, companies.tenant_status, companies.subscription_tier, companies.tenant_group_id,
  tg.name, companies.custom_subdomain, companies.encryption_enabled, companies.created_at,
  tc.feature_flags, tb.custom_domain, tb.logo_url;

-- 2. Tenant Health Metrics View  
CREATE OR REPLACE VIEW v_tenant_health_metrics AS
SELECT 
  companies.id as company_id,
  companies.name_en as company_name,
  companies.tenant_status,
  COUNT(DISTINCT e.id) as total_employees,
  COUNT(DISTINCT ur.user_id) as total_users

FROM companies
LEFT JOIN employees e ON e.company_id = companies.id
LEFT JOIN user_roles ur ON ur.company_id = companies.id

GROUP BY companies.id, companies.name_en, companies.tenant_status;

-- 3. Cross-Company Analytics View
CREATE OR REPLACE VIEW v_cross_company_analytics AS
SELECT 
  tg.id as tenant_group_id,
  tg.name as holding_company_name,
  
  COUNT(DISTINCT companies.id) as total_companies,
  COUNT(DISTINCT CASE WHEN COALESCE(companies.tenant_status, 'active'::tenant_status_enum) = 'active' THEN companies.id END) as active_companies,
  
  COUNT(DISTINCT e.id) as total_employees_all_companies,
  COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_employees_all_companies,
  COUNT(DISTINCT CASE WHEN e.is_saudi = true THEN e.id END) as saudi_employees_all_companies,
  
  COUNT(DISTINCT lr.id) as total_leave_requests,
  COUNT(DISTINCT CASE WHEN lr.status = 'pending' THEN lr.id END) as pending_leave_requests,
  
  COUNT(DISTINCT ur.user_id) as total_users,
  
  tg.created_at

FROM tenant_groups tg
LEFT JOIN companies ON companies.tenant_group_id = tg.id
LEFT JOIN employees e ON e.company_id = companies.id
LEFT JOIN leave_requests lr ON lr.employee_id = e.id
LEFT JOIN user_roles ur ON ur.company_id = companies.id

GROUP BY tg.id, tg.name, tg.created_at;

GRANT SELECT ON v_tenant_overview TO authenticated;
GRANT SELECT ON v_tenant_health_metrics TO authenticated;
GRANT SELECT ON v_cross_company_analytics TO authenticated;
