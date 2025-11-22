/*
  # Remove Unique Constraint on Email Field

  1. Changes
    - Drop the unique constraint on the `email` column in the `employees` table
    
  2. Reasoning
    - Not all employees have email addresses
    - Multiple employees may have NULL emails, which causes constraint violations
    - Email uniqueness is not a business requirement for HR systems
    - Employees can be identified by employee_number which is already unique per company
*/

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_key;