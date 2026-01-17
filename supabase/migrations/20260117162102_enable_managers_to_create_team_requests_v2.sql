/*
  # Enable Managers to Create Requests for Their Team

  ## Purpose
  Allow managers to create various requests (leave, loans, advances, expenses, training) 
  on behalf of their direct reports. This enables managers to act as proxies for their team.

  ## Changes
  Update INSERT policies for the following tables to include manager permissions:
  1. leave_requests - Allow managers to submit leave requests for their team
  2. loans - Allow managers to create loan requests for their team
  3. advances - Allow managers to create advance requests for their team
  4. expense_claims - Allow managers to submit expense claims for their team
  5. training_enrollments - Allow managers to enroll their team in training

  ## Manager Logic
  A user is considered a manager of an employee if:
  - The user's employee_id matches the employee's manager_id field
  - Both are in the same company
*/

-- =============================================
-- 1. UPDATE LEAVE REQUESTS POLICY
-- =============================================
DROP POLICY IF EXISTS "Employees can create leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees, managers, and staff can create leave requests" ON leave_requests;

CREATE POLICY "Employees, managers, and staff can create leave requests"
  ON leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
    AND (
      -- Employees can create their own leave requests
      employee_id IN (
        SELECT ur.employee_id
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.company_id = leave_requests.company_id
      )
      -- OR Managers can create leave requests for their direct reports
      OR employee_id IN (
        SELECT e.id
        FROM employees e
        JOIN user_roles ur ON ur.employee_id = e.manager_id
        WHERE ur.user_id = auth.uid()
        AND e.company_id = leave_requests.company_id
      )
      -- OR Privileged roles can create for anyone
      OR EXISTS (
        SELECT 1
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('hr', 'admin', 'super_admin')
        AND ur.company_id = leave_requests.company_id
      )
    )
  );

-- =============================================
-- 2. UPDATE LOANS POLICY
-- =============================================
DROP POLICY IF EXISTS "Employees and staff can create loans" ON loans;
DROP POLICY IF EXISTS "Employees, managers, and staff can create loans" ON loans;

CREATE POLICY "Employees, managers, and staff can create loans"
  ON loans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
    AND (
      -- Employees can create their own loan requests
      employee_id IN (
        SELECT ur.employee_id
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.company_id = loans.company_id
      )
      -- OR Managers can create loan requests for their direct reports
      OR employee_id IN (
        SELECT e.id
        FROM employees e
        JOIN user_roles ur ON ur.employee_id = e.manager_id
        WHERE ur.user_id = auth.uid()
        AND e.company_id = loans.company_id
      )
      -- OR Privileged roles can create for anyone
      OR EXISTS (
        SELECT 1
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
        AND ur.company_id = loans.company_id
      )
    )
  );

-- =============================================
-- 3. UPDATE ADVANCES POLICY
-- =============================================
DROP POLICY IF EXISTS "Employees and staff can create advances" ON advances;
DROP POLICY IF EXISTS "Employees, managers, and staff can create advances" ON advances;

CREATE POLICY "Employees, managers, and staff can create advances"
  ON advances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
    AND (
      -- Employees can create their own advance requests
      employee_id IN (
        SELECT ur.employee_id
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'employee'
        AND ur.company_id = advances.company_id
      )
      -- OR Managers can create advance requests for their direct reports
      OR employee_id IN (
        SELECT e.id
        FROM employees e
        JOIN user_roles ur ON ur.employee_id = e.manager_id
        WHERE ur.user_id = auth.uid()
        AND e.company_id = advances.company_id
      )
      -- OR Privileged roles can create for anyone
      OR EXISTS (
        SELECT 1
        FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('hr', 'finance', 'admin', 'super_admin')
        AND ur.company_id = advances.company_id
      )
    )
  );

-- =============================================
-- 4. UPDATE EXPENSE CLAIMS POLICY
-- =============================================
DROP POLICY IF EXISTS "Employees can create expense claims" ON expense_claims;
DROP POLICY IF EXISTS "Employees, managers, and staff can create expense claims" ON expense_claims;

CREATE POLICY "Employees, managers, and staff can create expense claims"
  ON expense_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        -- Employees can create their own expense claims
        (
          ur.role = 'employee'
          AND ur.employee_id = expense_claims.employee_id
          AND ur.company_id = expense_claims.company_id
        )
        -- OR Managers can create expense claims for their direct reports
        OR (
          ur.employee_id IN (
            SELECT e.manager_id
            FROM employees e
            WHERE e.id = expense_claims.employee_id
            AND e.company_id = expense_claims.company_id
          )
        )
        -- OR Privileged roles can create for anyone
        OR (
          ur.role IN ('hr', 'finance', 'admin', 'super_admin')
          AND ur.company_id = expense_claims.company_id
        )
      )
    )
  );

-- =============================================
-- 5. UPDATE TRAINING ENROLLMENTS POLICY
-- =============================================
DROP POLICY IF EXISTS "Employees can enroll in training" ON training_enrollments;
DROP POLICY IF EXISTS "Employees, managers, and staff can enroll in training" ON training_enrollments;

CREATE POLICY "Employees, managers, and staff can enroll in training"
  ON training_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Employees can enroll themselves
    employee_id IN (
      SELECT ur.employee_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'employee'
    )
    -- OR Managers can enroll their direct reports
    OR employee_id IN (
      SELECT e.id
      FROM employees e
      JOIN user_roles ur ON ur.employee_id = e.manager_id
      WHERE ur.user_id = auth.uid()
    )
    -- OR Privileged roles can enroll anyone (check via employee's company)
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN employees e ON e.id = training_enrollments.employee_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
      AND ur.company_id = e.company_id
    )
  );
