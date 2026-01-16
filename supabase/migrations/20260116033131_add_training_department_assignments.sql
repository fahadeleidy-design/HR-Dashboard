/*
  # Training Department Assignments System

  1. New Tables
    - `training_department_assignments`
      - Links training programs to departments for bulk enrollment
      - Tracks which departments are assigned to which training programs
      - Enables automatic enrollment of all department members

  2. Changes
    - Adds RLS policies for training department assignments
    - Creates indexes for performance optimization
    - Adds function to auto-enroll department employees

  3. Security
    - Enable RLS on `training_department_assignments`
    - Add policies for HR/Admin roles to manage assignments
    - Add policies for employees to view their department assignments
*/

-- Training department assignments table
CREATE TABLE IF NOT EXISTS training_department_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  is_mandatory boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_program_id, department_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_dept_assignments_program 
  ON training_department_assignments(training_program_id);
CREATE INDEX IF NOT EXISTS idx_training_dept_assignments_dept 
  ON training_department_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_training_dept_assignments_company 
  ON training_department_assignments(company_id);

-- Enable RLS
ALTER TABLE training_department_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_department_assignments
CREATE POLICY "HR and Admin can view department assignments"
  ON training_department_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = training_department_assignments.company_id
      AND ur.role IN ('super_admin', 'hr', 'admin')
    )
  );

CREATE POLICY "HR and Admin can create department assignments"
  ON training_department_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = training_department_assignments.company_id
      AND ur.role IN ('super_admin', 'hr', 'admin')
    )
  );

CREATE POLICY "HR and Admin can delete department assignments"
  ON training_department_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.company_id = training_department_assignments.company_id
      AND ur.role IN ('super_admin', 'hr', 'admin')
    )
  );

-- Function to auto-enroll all employees in a department
CREATE OR REPLACE FUNCTION enroll_department_employees(
  p_training_program_id uuid,
  p_department_id uuid
) RETURNS void AS $$
BEGIN
  INSERT INTO training_enrollments (training_program_id, employee_id, enrollment_date, completion_status)
  SELECT 
    p_training_program_id,
    e.id,
    CURRENT_DATE,
    'enrolled'
  FROM employees e
  WHERE e.department_id = p_department_id
    AND e.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM training_enrollments te
      WHERE te.training_program_id = p_training_program_id
        AND te.employee_id = e.id
    )
  ON CONFLICT (training_program_id, employee_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for training_enrollments to allow viewing across company group
DROP POLICY IF EXISTS "Users can view enrollments" ON training_enrollments;

CREATE POLICY "HR and Admin can view all enrollments in company"
  ON training_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON ur.company_id = e.company_id
      WHERE ur.user_id = auth.uid()
      AND e.id = training_enrollments.employee_id
      AND ur.role IN ('super_admin', 'hr', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.employee_id = training_enrollments.employee_id
    )
  );

CREATE POLICY "HR and Admin can create enrollments"
  ON training_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON ur.company_id = e.company_id
      WHERE ur.user_id = auth.uid()
      AND e.id = training_enrollments.employee_id
      AND ur.role IN ('super_admin', 'hr', 'admin')
    )
  );

CREATE POLICY "HR and Admin can update enrollments"
  ON training_enrollments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON ur.company_id = e.company_id
      WHERE ur.user_id = auth.uid()
      AND e.id = training_enrollments.employee_id
      AND ur.role IN ('super_admin', 'hr', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON ur.company_id = e.company_id
      WHERE ur.user_id = auth.uid()
      AND e.id = training_enrollments.employee_id
      AND ur.role IN ('super_admin', 'hr', 'admin')
    )
  );

CREATE POLICY "HR and Admin can delete enrollments"
  ON training_enrollments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN employees e ON ur.company_id = e.company_id
      WHERE ur.user_id = auth.uid()
      AND e.id = training_enrollments.employee_id
      AND ur.role IN ('super_admin', 'hr', 'admin')
    )
  );
