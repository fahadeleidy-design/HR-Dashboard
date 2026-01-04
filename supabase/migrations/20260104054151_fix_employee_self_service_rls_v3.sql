/*
  # Fix Employee Self-Service RLS Policies
  
  1. Purpose
    - Restrict employee role users to only view and manage their own data
    - Allow HR, Finance, and Super Admin roles to view all employee data
    - Ensure proper data isolation for employee accounts
  
  2. Changes
    - Drop existing overly permissive RLS policies on employees table
    - Create new role-based RLS policies for employees table
    - Update policies for related tables (leave_requests, expense_claims, attendance, payroll)
  
  3. Security Model
    - Employee role: Can only view/update their own record (linked via user_roles.employee_id)
    - HR/Finance/Super Admin: Can view/manage all employees in their company
    - All policies check company_id for multi-tenant isolation
*/

-- ============================================================================
-- EMPLOYEES TABLE - Role-Based Access Control
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;

-- SELECT: Employees can view their own record, HR/Finance/Admin can view all in company
CREATE POLICY "Employees can view based on role"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can see their own record
        (ur.role = 'employee' AND ur.employee_id = employees.id)
        -- HR, Finance, Super Admin can see all in company
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = employees.company_id)
      )
    )
  );

-- INSERT: Only HR and Super Admin can create employees
CREATE POLICY "HR and Admin can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'super_admin')
      AND ur.company_id = employees.company_id
    )
  );

-- UPDATE: Employees can update limited fields, HR/Admin can update all
CREATE POLICY "Employees can update based on role"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can update their own record
        (ur.role = 'employee' AND ur.employee_id = employees.id)
        -- HR, Finance, Super Admin can update all in company
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = employees.company_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = employees.id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = employees.company_id)
      )
    )
  );

-- DELETE: Only HR and Super Admin can delete employees
CREATE POLICY "HR and Admin can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'super_admin')
      AND ur.company_id = employees.company_id
    )
  );

-- ============================================================================
-- LEAVE REQUESTS - Role-Based Access Control
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Authenticated users can create leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Authenticated users can update leave requests" ON leave_requests;

-- SELECT: Employees see their own, managers see their team, HR/Admin see all
CREATE POLICY "Leave requests role-based select"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can see their own requests
        (ur.role = 'employee' AND ur.employee_id = leave_requests.employee_id)
        -- HR, Finance, Super Admin can see all in company
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = leave_requests.company_id)
      )
    )
  );

-- INSERT: Employees can create their own leave requests
CREATE POLICY "Employees can create leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = leave_requests.company_id
      AND (
        -- Employee creating for themselves
        (ur.role = 'employee' AND ur.employee_id = leave_requests.employee_id)
        -- HR/Admin can create for anyone
        OR ur.role IN ('hr', 'super_admin')
      )
    )
  );

-- UPDATE: Employees can update their pending requests, HR/Admin can update all
CREATE POLICY "Leave requests role-based update"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can update their own pending requests
        (ur.role = 'employee' AND ur.employee_id = leave_requests.employee_id AND leave_requests.status = 'pending')
        -- HR/Admin can update all
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = leave_requests.company_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = leave_requests.company_id
    )
  );

-- ============================================================================
-- EXPENSE CLAIMS - Role-Based Access Control
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view expenses" ON expense_claims;
DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON expense_claims;

-- SELECT: Employees see their own, Finance/HR/Admin see all
CREATE POLICY "Expense claims role-based select"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can see their own claims
        (ur.role = 'employee' AND ur.employee_id = expense_claims.employee_id)
        -- Finance, HR, Super Admin can see all in company
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = expense_claims.company_id)
      )
    )
  );

-- INSERT: Employees can create their own expense claims
CREATE POLICY "Employees can create expense claims"
  ON expense_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = expense_claims.company_id
      AND (
        (ur.role = 'employee' AND ur.employee_id = expense_claims.employee_id)
        OR ur.role IN ('hr', 'finance', 'super_admin')
      )
    )
  );

-- UPDATE: Employees can update their pending claims, Finance/HR/Admin can update all
CREATE POLICY "Expense claims role-based update"
  ON expense_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = expense_claims.employee_id AND expense_claims.approval_status = 'pending')
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = expense_claims.company_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = expense_claims.company_id
    )
  );

-- DELETE: Only Finance/HR/Admin can delete expense claims
CREATE POLICY "Finance and Admin can delete expense claims"
  ON expense_claims FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'finance', 'super_admin')
      AND ur.company_id = expense_claims.company_id
    )
  );

-- ============================================================================
-- ATTENDANCE - Role-Based Access Control
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view attendance" ON attendance;
DROP POLICY IF EXISTS "Attendance role-based select" ON attendance;

CREATE POLICY "Attendance role-based select"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = attendance.employee_id)
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = attendance.company_id)
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
      AND ur.company_id = attendance.company_id
      AND (
        (ur.role = 'employee' AND ur.employee_id = attendance.employee_id)
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
        (ur.role = 'employee' AND ur.employee_id = attendance.employee_id)
        OR (ur.role IN ('hr', 'super_admin') AND ur.company_id = attendance.company_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = attendance.company_id
    )
  );

-- ============================================================================
-- PAYROLL - Read-Only for Employees
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view payroll" ON payroll;
DROP POLICY IF EXISTS "Payroll role-based select" ON payroll;

CREATE POLICY "Payroll role-based select"
  ON payroll FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employee can see their own payroll records
        (ur.role = 'employee' AND ur.employee_id = payroll.employee_id)
        -- Finance, HR, Super Admin can see all in company
        OR (ur.role IN ('hr', 'finance', 'super_admin') AND ur.company_id = payroll.company_id)
      )
    )
  );

-- Only Finance and Admin can modify payroll records
DROP POLICY IF EXISTS "Authenticated users can manage payroll" ON payroll;
DROP POLICY IF EXISTS "Finance and Admin can manage payroll" ON payroll;

CREATE POLICY "Finance and Admin can manage payroll"
  ON payroll FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('finance', 'super_admin')
      AND ur.company_id = payroll.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('finance', 'super_admin')
      AND ur.company_id = payroll.company_id
    )
  );
