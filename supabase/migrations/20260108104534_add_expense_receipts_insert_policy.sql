/*
  # Add INSERT Policy for Expense Receipts

  1. Security Changes
    - Add policy allowing employees to insert their own expense receipts
    - Employees can upload receipts for expenses they submitted
    - Ensures data security by validating ownership through expense_claims

  2. Notes
    - This enables employees to attach invoice/receipt documents when submitting expense claims
    - The policy checks that the expense_claim belongs to the employee before allowing receipt upload
*/

-- Add policy for employees to insert their own expense receipts
CREATE POLICY "Employees can insert receipts for their own expenses"
  ON expense_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
    AND expense_claim_id IN (
      SELECT ec.id FROM expense_claims ec
      JOIN user_roles ur ON ur.employee_id = ec.employee_id
      WHERE ur.user_id = auth.uid()
    )
  );

-- Add policy for HR/Finance to insert receipts for any expense
CREATE POLICY "HR and Finance can insert expense receipts"
  ON expense_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'company_admin', 'hr_manager', 'finance_manager')
    )
  );
