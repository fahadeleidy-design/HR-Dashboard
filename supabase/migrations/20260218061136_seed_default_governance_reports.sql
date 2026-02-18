/*
  # Seed Default Governance Report Definitions

  1. Payroll Reports
    - Monthly payroll summary
    - Salary expense by department
    - GOSI contributions report
    
  2. Compliance Reports
    - Document expiry tracking
    - GOSI compliance status
    - Nitaqat compliance report
    - Employee contract status
    
  3. HR Reports
    - Headcount by department
    - Leave balance summary
    - Turnover analysis
    - Employee demographics
    
  4. Finance Reports
    - Cost center analysis
    - EOS liability report
    - Loan portfolio summary
    - Expense analysis
*/

-- Monthly Payroll Summary Report
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval,
  encrypt_attachment,
  file_format,
  default_format
) VALUES (
  'payroll_monthly_summary',
  'Monthly Payroll Summary',
  'Comprehensive monthly payroll report including all salary components, deductions, and totals by department',
  'payroll',
  'payroll_batches',
  '[
    {"key": "period", "label": "Period", "type": "text"},
    {"key": "department", "label": "Department", "type": "text"},
    {"key": "employee_count", "label": "Employees", "type": "number"},
    {"key": "basic_salary", "label": "Basic Salary", "type": "currency"},
    {"key": "allowances", "label": "Allowances", "type": "currency"},
    {"key": "deductions", "label": "Deductions", "type": "currency"},
    {"key": "net_salary", "label": "Net Salary", "type": "currency"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr', 'finance'],
  'confidential',
  true,
  true,
  ARRAY['pdf', 'excel'],
  'pdf'
) ON CONFLICT (report_key) DO NOTHING;

-- Salary Expense by Department
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval,
  file_format,
  supports_charts
) VALUES (
  'salary_expense_by_department',
  'Salary Expense by Department',
  'Department-wise salary expense analysis with year-over-year comparison',
  'payroll',
  'employees',
  '[
    {"key": "department", "label": "Department", "type": "text"},
    {"key": "employee_count", "label": "Headcount", "type": "number"},
    {"key": "total_basic", "label": "Basic Salary", "type": "currency"},
    {"key": "total_allowances", "label": "Allowances", "type": "currency"},
    {"key": "total_cost", "label": "Total Cost", "type": "currency"},
    {"key": "avg_salary", "label": "Avg Salary", "type": "currency"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'finance', 'manager'],
  'confidential',
  true,
  ARRAY['pdf', 'excel', 'csv'],
  true
) ON CONFLICT (report_key) DO NOTHING;

-- GOSI Contributions Report
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval,
  encrypt_attachment
) VALUES (
  'gosi_contributions_report',
  'GOSI Contributions Report',
  'Monthly GOSI contributions by employee with employer and employee shares',
  'compliance',
  'gosi_submissions',
  '[
    {"key": "employee_name", "label": "Employee", "type": "text"},
    {"key": "national_id", "label": "National ID", "type": "text"},
    {"key": "basic_salary", "label": "Basic Salary", "type": "currency"},
    {"key": "employee_share", "label": "Employee Share (9%)", "type": "currency"},
    {"key": "employer_share", "label": "Employer Share (12%)", "type": "currency"},
    {"key": "total_contribution", "label": "Total", "type": "currency"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr', 'finance'],
  'confidential',
  true,
  true
) ON CONFLICT (report_key) DO NOTHING;

-- Document Expiry Tracking
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval
) VALUES (
  'document_expiry_tracking',
  'Document Expiry Tracking Report',
  'Comprehensive tracking of all employee documents with expiry dates and renewal status',
  'compliance',
  'employee_documents',
  '[
    {"key": "employee_name", "label": "Employee", "type": "text"},
    {"key": "document_type", "label": "Document Type", "type": "text"},
    {"key": "document_number", "label": "Document Number", "type": "text"},
    {"key": "issue_date", "label": "Issue Date", "type": "date"},
    {"key": "expiry_date", "label": "Expiry Date", "type": "date"},
    {"key": "days_until_expiry", "label": "Days Until Expiry", "type": "number"},
    {"key": "status", "label": "Status", "type": "text"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr'],
  'internal',
  false
) ON CONFLICT (report_key) DO NOTHING;

-- Nitaqat Compliance Report
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval
) VALUES (
  'nitaqat_compliance_report',
  'Nitaqat Compliance Report',
  'Saudization compliance report showing current status, target, and gap analysis',
  'compliance',
  'nitaqat_tracking',
  '[
    {"key": "company_name", "label": "Company", "type": "text"},
    {"key": "sector", "label": "Sector", "type": "text"},
    {"key": "total_employees", "label": "Total Employees", "type": "number"},
    {"key": "saudi_employees", "label": "Saudi Employees", "type": "number"},
    {"key": "effective_saudi", "label": "Effective Saudi Count", "type": "number"},
    {"key": "saudization_rate", "label": "Saudization %", "type": "percentage"},
    {"key": "target_rate", "label": "Target %", "type": "percentage"},
    {"key": "current_band", "label": "Current Band", "type": "text"},
    {"key": "gap_to_target", "label": "Gap", "type": "number"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr'],
  'internal',
  false
) ON CONFLICT (report_key) DO NOTHING;

-- Employee Contract Status
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval
) VALUES (
  'employee_contract_status',
  'Employee Contract Status Report',
  'Status of all employee contracts including expiration dates and renewal requirements',
  'compliance',
  'employees',
  '[
    {"key": "employee_name", "label": "Employee", "type": "text"},
    {"key": "employee_id", "label": "Employee ID", "type": "text"},
    {"key": "department", "label": "Department", "type": "text"},
    {"key": "contract_type", "label": "Contract Type", "type": "text"},
    {"key": "contract_start", "label": "Start Date", "type": "date"},
    {"key": "contract_end", "label": "End Date", "type": "date"},
    {"key": "days_remaining", "label": "Days Remaining", "type": "number"},
    {"key": "renewal_status", "label": "Status", "type": "text"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr'],
  'internal',
  false
) ON CONFLICT (report_key) DO NOTHING;

-- Headcount by Department
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  file_format,
  supports_charts
) VALUES (
  'headcount_by_department',
  'Headcount by Department',
  'Employee headcount breakdown by department with contract type analysis',
  'hr',
  'employees',
  '[
    {"key": "department", "label": "Department", "type": "text"},
    {"key": "total_count", "label": "Total", "type": "number"},
    {"key": "saudi_count", "label": "Saudi", "type": "number"},
    {"key": "non_saudi_count", "label": "Non-Saudi", "type": "number"},
    {"key": "permanent_count", "label": "Permanent", "type": "number"},
    {"key": "contract_count", "label": "Contract", "type": "number"},
    {"key": "probation_count", "label": "Probation", "type": "number"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr', 'manager'],
  'internal',
  ARRAY['pdf', 'excel', 'csv'],
  true
) ON CONFLICT (report_key) DO NOTHING;

-- Leave Balance Summary
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity
) VALUES (
  'leave_balance_summary',
  'Leave Balance Summary',
  'Summary of leave balances by employee and leave type',
  'hr',
  'leave_balances',
  '[
    {"key": "employee_name", "label": "Employee", "type": "text"},
    {"key": "department", "label": "Department", "type": "text"},
    {"key": "leave_type", "label": "Leave Type", "type": "text"},
    {"key": "total_entitled", "label": "Entitled", "type": "number"},
    {"key": "used", "label": "Used", "type": "number"},
    {"key": "pending", "label": "Pending", "type": "number"},
    {"key": "available", "label": "Available", "type": "number"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr', 'manager'],
  'internal'
) ON CONFLICT (report_key) DO NOTHING;

-- Turnover Analysis
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  supports_charts
) VALUES (
  'turnover_analysis',
  'Employee Turnover Analysis',
  'Analysis of employee turnover rates by department and reason',
  'hr',
  'employees',
  '[
    {"key": "period", "label": "Period", "type": "text"},
    {"key": "department", "label": "Department", "type": "text"},
    {"key": "headcount_start", "label": "Start Headcount", "type": "number"},
    {"key": "new_hires", "label": "New Hires", "type": "number"},
    {"key": "separations", "label": "Separations", "type": "number"},
    {"key": "headcount_end", "label": "End Headcount", "type": "number"},
    {"key": "turnover_rate", "label": "Turnover Rate", "type": "percentage"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr'],
  'internal',
  true
) ON CONFLICT (report_key) DO NOTHING;

-- Employee Demographics
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  supports_charts
) VALUES (
  'employee_demographics',
  'Employee Demographics Report',
  'Workforce demographics including age, gender, nationality, and tenure analysis',
  'hr',
  'employees',
  '[
    {"key": "category", "label": "Category", "type": "text"},
    {"key": "segment", "label": "Segment", "type": "text"},
    {"key": "count", "label": "Count", "type": "number"},
    {"key": "percentage", "label": "Percentage", "type": "percentage"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'hr'],
  'internal',
  true
) ON CONFLICT (report_key) DO NOTHING;

-- Cost Center Analysis
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval,
  supports_charts
) VALUES (
  'cost_center_analysis',
  'Cost Center Analysis',
  'Detailed cost center expense analysis with budget comparison',
  'finance',
  'cost_centers',
  '[
    {"key": "cost_center", "label": "Cost Center", "type": "text"},
    {"key": "description", "label": "Description", "type": "text"},
    {"key": "budget", "label": "Budget", "type": "currency"},
    {"key": "actual", "label": "Actual Expense", "type": "currency"},
    {"key": "variance", "label": "Variance", "type": "currency"},
    {"key": "variance_pct", "label": "Variance %", "type": "percentage"},
    {"key": "utilization", "label": "Utilization %", "type": "percentage"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'finance', 'manager'],
  'confidential',
  true,
  true
) ON CONFLICT (report_key) DO NOTHING;

-- EOS Liability Report
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval,
  encrypt_attachment
) VALUES (
  'eos_liability_report',
  'End of Service Liability Report',
  'Calculated end of service benefits liability by employee and total company exposure',
  'finance',
  'employees',
  '[
    {"key": "employee_name", "label": "Employee", "type": "text"},
    {"key": "department", "label": "Department", "type": "text"},
    {"key": "hire_date", "label": "Hire Date", "type": "date"},
    {"key": "service_years", "label": "Service Years", "type": "number"},
    {"key": "last_basic_salary", "label": "Basic Salary", "type": "currency"},
    {"key": "eos_liability", "label": "EOS Liability", "type": "currency"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'finance'],
  'confidential',
  true,
  true
) ON CONFLICT (report_key) DO NOTHING;

-- Loan Portfolio Summary
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  requires_approval
) VALUES (
  'loan_portfolio_summary',
  'Employee Loan Portfolio Summary',
  'Summary of all active employee loans with outstanding balances and repayment schedules',
  'finance',
  'loans',
  '[
    {"key": "employee_name", "label": "Employee", "type": "text"},
    {"key": "loan_amount", "label": "Loan Amount", "type": "currency"},
    {"key": "disbursed_date", "label": "Disbursed Date", "type": "date"},
    {"key": "monthly_deduction", "label": "Monthly Deduction", "type": "currency"},
    {"key": "paid_amount", "label": "Paid Amount", "type": "currency"},
    {"key": "outstanding_balance", "label": "Outstanding Balance", "type": "currency"},
    {"key": "remaining_months", "label": "Remaining Months", "type": "number"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'finance'],
  'confidential',
  true
) ON CONFLICT (report_key) DO NOTHING;

-- Expense Analysis Report
INSERT INTO report_definitions (
  report_key,
  name,
  description,
  category,
  data_source,
  columns,
  allowed_roles,
  sensitivity,
  supports_charts
) VALUES (
  'expense_analysis_report',
  'Expense Analysis Report',
  'Detailed analysis of employee expenses by category, department, and approval status',
  'finance',
  'expenses',
  '[
    {"key": "period", "label": "Period", "type": "text"},
    {"key": "department", "label": "Department", "type": "text"},
    {"key": "expense_category", "label": "Category", "type": "text"},
    {"key": "total_amount", "label": "Total Amount", "type": "currency"},
    {"key": "approved_amount", "label": "Approved", "type": "currency"},
    {"key": "pending_amount", "label": "Pending", "type": "currency"},
    {"key": "rejected_amount", "label": "Rejected", "type": "currency"}
  ]'::jsonb,
  ARRAY['super_admin', 'admin', 'finance', 'manager'],
  'internal',
  true
) ON CONFLICT (report_key) DO NOTHING;