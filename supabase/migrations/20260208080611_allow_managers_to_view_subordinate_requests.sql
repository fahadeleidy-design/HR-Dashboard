/*
  # Allow managers to view subordinate requests

  1. Changes
    - Add SELECT policies on `leave_requests`, `loans`, `expense_claims`, and `business_travel`
      so that managers can view pending requests from their direct reports
    - A manager is identified by matching their `employee_id` in `user_roles`
      to the `manager_id` on the requesting employee record
    - These are permissive policies that get ORed with existing policies,
      so existing access (employee own data, HR/finance/super_admin) is unaffected

  2. Tables affected
    - `leave_requests` - managers can now see their subordinates' leave requests
    - `loans` - managers can now see their subordinates' loan requests
    - `expense_claims` - managers can now see their subordinates' expense claims
    - `business_travel` - managers can now see their subordinates' travel requests

  3. Notes
    - `advances`, `attendance_requests`, and `employee_penalties` already have
      company-wide or open SELECT policies, so managers can already see those
    - The approve/reject functions are SECURITY DEFINER and already work for managers
    - This migration only addresses the visibility gap
*/

CREATE POLICY "Managers can view subordinate leave requests"
ON leave_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.id = leave_requests.employee_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'manager'
    AND ur.company_id = leave_requests.company_id
    AND ur.employee_id = e.manager_id
  )
);

CREATE POLICY "Managers can view subordinate loans"
ON loans FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.id = loans.employee_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'manager'
    AND ur.company_id = loans.company_id
    AND ur.employee_id = e.manager_id
  )
);

CREATE POLICY "Managers can view subordinate expense claims"
ON expense_claims FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.id = expense_claims.employee_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'manager'
    AND ur.company_id = expense_claims.company_id
    AND ur.employee_id = e.manager_id
  )
);

CREATE POLICY "Managers can view subordinate travel requests"
ON business_travel FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN employees e ON e.id = business_travel.employee_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'manager'
    AND ur.company_id = business_travel.company_id
    AND ur.employee_id = e.manager_id
  )
);
