/*
  # Remove Duplicate Indexes
  
  This migration removes duplicate indexes that are identical to existing indexes.
  Duplicate indexes waste storage space and slow down write operations.
  
  ## Duplicate indexes to be removed:
  - advances table: keeping idx_advances_company, idx_advances_manager_id
  - employee_recognitions table: keeping idx_recognitions_employee
  - employees table: keeping idx_employees_job_position
  - expense_claims table: keeping idx_expenses_status, idx_expenses_company, idx_expenses_employee
  - leave_requests table: keeping idx_leave_requests_company, idx_leave_requests_manager_id
  - loans table: keeping idx_loans_company, idx_loans_manager_id
  - system_notifications table: keeping idx_system_notifications_created, idx_system_notifications_user
  - user_roles table: keeping idx_user_roles_company
*/

-- advances table - drop duplicates
DROP INDEX IF EXISTS public.idx_advances_company_id;
DROP INDEX IF EXISTS public.idx_advances_employee;

-- employee_recognitions table - drop duplicate
DROP INDEX IF EXISTS public.idx_employee_recognitions_employee;

-- employees table - drop duplicate
DROP INDEX IF EXISTS public.idx_employees_salary_band;

-- expense_claims table - drop duplicates
DROP INDEX IF EXISTS public.idx_expense_claims_status;
DROP INDEX IF EXISTS public.idx_expense_claims_company;
DROP INDEX IF EXISTS public.idx_expense_claims_employee;

-- leave_requests table - drop duplicates
DROP INDEX IF EXISTS public.idx_leave_requests_company_id;
DROP INDEX IF EXISTS public.idx_leave_requests_employee;

-- loans table - drop duplicates
DROP INDEX IF EXISTS public.idx_loans_company_id;
DROP INDEX IF EXISTS public.idx_loans_employee;

-- system_notifications table - drop duplicates
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_notifications_user;

-- user_roles table - drop duplicate
DROP INDEX IF EXISTS public.idx_user_roles_company_id;
