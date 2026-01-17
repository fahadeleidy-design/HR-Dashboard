/*
  # Basic Performance Indexes

  Add indexes for the most critical query patterns:
  - Foreign keys (company_id, employee_id)
  - List sorting (created_at)
*/

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at DESC);

-- Leave Requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON leave_requests(created_at DESC);

-- Leave Balances
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_company ON leave_balances(company_id);

-- Loans
CREATE INDEX IF NOT EXISTS idx_loans_employee ON loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_loans_company ON loans(company_id);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at DESC);

-- Advances
CREATE INDEX IF NOT EXISTS idx_advances_employee ON advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_company ON advances(company_id);
CREATE INDEX IF NOT EXISTS idx_advances_created_at ON advances(created_at DESC);

-- Expense Claims
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_company ON expense_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_created_at ON expense_claims(created_at DESC);

-- System Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON system_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON system_notifications(created_at DESC);

-- User Roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company ON user_roles(company_id);

-- Update statistics
ANALYZE employees;
ANALYZE leave_requests;
ANALYZE loans;
ANALYZE advances;
ANALYZE expense_claims;
