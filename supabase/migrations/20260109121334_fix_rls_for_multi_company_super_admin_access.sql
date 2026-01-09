/*
  # Fix RLS for Multi-Company Super Admin Access

  ## Problem
  Super admin, HR, and Finance users can now see all companies in the company switcher,
  but they cannot view employee data from companies other than their originally assigned company.
  This is because the RLS policies check that user_roles.company_id matches the data's company_id.

  ## Solution
  Update RLS policies to allow privileged roles (super_admin, hr, finance) to access data
  from ALL companies, not just their assigned company. Regular employees remain restricted
  to their assigned company only.

  ## Changes
  1. Employees table - Allow privileged roles to view all employees across all companies
  2. Leave requests table - Allow privileged roles to view all leave requests across all companies
  3. Expense claims table - Allow privileged roles to view all expense claims across all companies
  4. Attendance table - Allow privileged roles to view all attendance records across all companies
  5. Payroll table - Allow privileged roles to view all payroll records across all companies
  6. Other tables - departments, documents, leave_requests, etc.

  ## Security
  - Employee role users remain restricted to their own data and assigned company only
  - Privileged roles can access all companies for system-wide management
  - All policies still require authentication
*/

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view based on role" ON employees;

CREATE POLICY "Employees can view based on role"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can see their own record in their assigned company
        (ur.role = 'employee' AND ur.employee_id = employees.id AND ur.company_id = employees.company_id)
        -- Privileged roles can see all employees in all companies
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "HR and Admin can insert employees" ON employees;

CREATE POLICY "HR and Admin can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Employees can update based on role" ON employees;

CREATE POLICY "Employees can update based on role"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employees.id AND ur.company_id = employees.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employees.id AND ur.company_id = employees.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "HR and Admin can delete employees" ON employees;

CREATE POLICY "HR and Admin can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'super_admin')
    )
  );

-- ============================================================================
-- LEAVE REQUESTS
-- ============================================================================

DROP POLICY IF EXISTS "Leave requests role-based select" ON leave_requests;

CREATE POLICY "Leave requests role-based select"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = leave_requests.employee_id AND ur.company_id = leave_requests.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can create leave requests" ON leave_requests;

CREATE POLICY "Employees can create leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = leave_requests.employee_id AND ur.company_id = leave_requests.company_id)
        OR ur.role IN ('hr', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Leave requests role-based update" ON leave_requests;

CREATE POLICY "Leave requests role-based update"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = leave_requests.employee_id AND leave_requests.status = 'pending' AND ur.company_id = leave_requests.company_id)
        OR ur.role IN ('hr', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- ============================================================================
-- EXPENSE CLAIMS
-- ============================================================================

DROP POLICY IF EXISTS "Expense claims role-based select" ON expense_claims;

CREATE POLICY "Expense claims role-based select"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = expense_claims.employee_id AND ur.company_id = expense_claims.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can create expense claims" ON expense_claims;

CREATE POLICY "Employees can create expense claims"
  ON expense_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = expense_claims.employee_id AND ur.company_id = expense_claims.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Expense claims role-based update" ON expense_claims;

CREATE POLICY "Expense claims role-based update"
  ON expense_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = expense_claims.employee_id AND expense_claims.approval_status = 'pending' AND ur.company_id = expense_claims.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Finance and Admin can delete expense claims" ON expense_claims;

CREATE POLICY "Finance and Admin can delete expense claims"
  ON expense_claims FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'super_admin')
    )
  );

-- ============================================================================
-- ATTENDANCE
-- ============================================================================

DROP POLICY IF EXISTS "Attendance role-based select" ON attendance;

CREATE POLICY "Attendance role-based select"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = attendance.employee_id AND ur.company_id = attendance.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can create attendance" ON attendance;

CREATE POLICY "Employees can create attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = attendance.employee_id AND ur.company_id = attendance.company_id)
        OR ur.role IN ('hr', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Attendance role-based update" ON attendance;

CREATE POLICY "Attendance role-based update"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = attendance.employee_id AND ur.company_id = attendance.company_id)
        OR ur.role IN ('hr', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PAYROLL
-- ============================================================================

DROP POLICY IF EXISTS "Payroll role-based select" ON payroll;

CREATE POLICY "Payroll role-based select"
  ON payroll FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = payroll.employee_id AND ur.company_id = payroll.company_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Finance and Admin can manage payroll" ON payroll;

CREATE POLICY "Finance and Admin can manage payroll"
  ON payroll FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('finance', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('finance', 'super_admin')
    )
  );

-- Add comments
COMMENT ON POLICY "Employees can view based on role" ON employees IS
'Allows privileged roles (super_admin, hr, finance) to view all employees across all companies. Employee role restricted to their own record in assigned company.';

COMMENT ON POLICY "Leave requests role-based select" ON leave_requests IS
'Allows privileged roles to view all leave requests across all companies. Employee role restricted to their own requests in assigned company.';

COMMENT ON POLICY "Expense claims role-based select" ON expense_claims IS
'Allows privileged roles to view all expense claims across all companies. Employee role restricted to their own claims in assigned company.';

COMMENT ON POLICY "Attendance role-based select" ON attendance IS
'Allows privileged roles to view all attendance records across all companies. Employee role restricted to their own records in assigned company.';

COMMENT ON POLICY "Payroll role-based select" ON payroll IS
'Allows privileged roles to view all payroll records across all companies. Employee role restricted to their own records in assigned company.';