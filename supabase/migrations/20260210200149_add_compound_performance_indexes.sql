/*
  # Add Compound Performance Indexes

  Adds targeted compound indexes for frequently queried patterns across
  the HR system to improve dashboard load times and list views.

  1. Employee Queries - company + status, department, nationality, manager
  2. Leave & Attendance - status filtering, date-based queries
  3. Payroll - company + date range queries
  4. Expenses & Loans - approval status filtering
  5. Approvals & Workflow - pending request dashboards
  6. Notifications - unread notification lookups
  7. Documents - type and expiry filtering
  8. Training - enrollment tracking
*/

CREATE INDEX IF NOT EXISTS idx_employees_company_status
  ON employees(company_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_company_department
  ON employees(company_id, department_id);

CREATE INDEX IF NOT EXISTS idx_employees_company_nationality
  ON employees(company_id, nationality);

CREATE INDEX IF NOT EXISTS idx_leave_requests_company_status_date
  ON leave_requests(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status
  ON leave_requests(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_company_date
  ON attendance(company_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
  ON attendance(employee_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_company_effective
  ON payroll(company_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_employee
  ON payroll(employee_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_expense_claims_company_approval
  ON expense_claims(company_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_loans_company_status
  ON loans(company_id, status);

CREATE INDEX IF NOT EXISTS idx_loans_employee_status
  ON loans(employee_id, status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_requests' AND table_schema = 'public') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_requests_company_status_date ON approval_requests(company_id, status, created_at DESC)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_notifications' AND table_schema = 'public') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON system_notifications(user_id, is_read, created_at DESC) WHERE is_read = false';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_company_recent ON system_notifications(company_id, created_at DESC)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_company_type
  ON documents(company_id, document_type);

CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee
  ON training_enrollments(employee_id, completion_status);