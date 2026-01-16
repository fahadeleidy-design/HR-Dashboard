/*
  # Quiz Assignments and Auto-Enable on Program Completion

  1. New Tables
    - `quiz_assignments`
      - Tracks which quizzes are enabled for which employees
      - Links employee, quiz, and enrollment
      - Tracks enablement and completion status
      - Automatically created when employee completes training program

  2. Changes
    - Function to automatically enable quizzes when training program is completed
    - Trigger on training_enrollments to call the function
    - Employees can only take quizzes that are assigned to them

  3. Security
    - Enable RLS on quiz_assignments table
    - Employees can view their assigned quizzes
    - HR can manage quiz assignments
*/

-- Quiz Assignments table
CREATE TABLE IF NOT EXISTS quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES training_quizzes(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  enrollment_id uuid REFERENCES training_enrollments(id) ON DELETE CASCADE NOT NULL,
  enabled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(quiz_id, employee_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_employee ON quiz_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_enrollment ON quiz_assignments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_company ON quiz_assignments(company_id);

-- Enable RLS
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_assignments
CREATE POLICY "Employees can view their own quiz assignments"
  ON quiz_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'employee' AND ur.employee_id = quiz_assignments.employee_id)
        OR ur.role IN ('hr_admin', 'hr_manager', 'manager', 'super_admin')
      )
      AND EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = quiz_assignments.employee_id
        AND e.company_id IN (
          SELECT company_id FROM user_roles 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "HR can manage quiz assignments"
  ON quiz_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr_admin', 'hr_manager', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = quiz_assignments.employee_id
        AND e.company_id IN (
          SELECT company_id FROM user_roles 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr_admin', 'hr_manager', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = quiz_assignments.employee_id
        AND e.company_id IN (
          SELECT company_id FROM user_roles 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Function to automatically enable quizzes when training program is completed
CREATE OR REPLACE FUNCTION enable_quizzes_on_program_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if completion status changed to 'completed'
  IF NEW.completion_status = 'completed' AND (OLD.completion_status IS NULL OR OLD.completion_status != 'completed') THEN
    
    -- Get all quizzes for this training program and enable them for the employee
    INSERT INTO quiz_assignments (company_id, quiz_id, employee_id, enrollment_id, enabled_at, is_enabled)
    SELECT 
      tq.company_id,
      tq.id as quiz_id,
      NEW.employee_id,
      NEW.id as enrollment_id,
      now() as enabled_at,
      true as is_enabled
    FROM training_quizzes tq
    WHERE tq.training_program_id = NEW.training_program_id
    AND NOT EXISTS (
      -- Avoid duplicate assignments
      SELECT 1 FROM quiz_assignments qa
      WHERE qa.quiz_id = tq.id
      AND qa.employee_id = NEW.employee_id
      AND qa.enrollment_id = NEW.id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically enable quizzes on program completion
DROP TRIGGER IF EXISTS trigger_enable_quizzes_on_completion ON training_enrollments;
CREATE TRIGGER trigger_enable_quizzes_on_completion
  AFTER INSERT OR UPDATE OF completion_status ON training_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION enable_quizzes_on_program_completion();

-- Update quiz_attempts to check if quiz is assigned before allowing attempt
-- This is handled in the application layer, but we add a helpful view

CREATE OR REPLACE VIEW employee_available_quizzes AS
SELECT 
  qa.id as assignment_id,
  qa.employee_id,
  qa.quiz_id,
  qa.enrollment_id,
  qa.enabled_at,
  qa.is_enabled,
  qa.completed_at,
  tq.title_en as quiz_title_en,
  tq.title_ar as quiz_title_ar,
  tq.description as quiz_description,
  tq.passing_score,
  tq.max_attempts,
  tq.time_limit_minutes,
  tq.is_mandatory as quiz_is_mandatory,
  tq.training_program_id,
  tq.training_module_id,
  tp.program_name_en,
  tp.program_name_ar,
  tm.title_en as module_title_en,
  tm.title_ar as module_title_ar,
  te.completion_status as enrollment_status,
  COALESCE(attempt_count.count, 0) as attempts_taken,
  COALESCE(attempt_count.max_score, 0) as best_score,
  COALESCE(attempt_count.passed, false) as has_passed
FROM quiz_assignments qa
JOIN training_quizzes tq ON qa.quiz_id = tq.id
JOIN training_enrollments te ON qa.enrollment_id = te.id
JOIN training_programs tp ON tq.training_program_id = tp.id
LEFT JOIN training_modules tm ON tq.training_module_id = tm.id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) as count,
    MAX(percentage) as max_score,
    bool_or(passed) as passed
  FROM quiz_attempts
  WHERE quiz_id = qa.quiz_id
  AND employee_id = qa.employee_id
) attempt_count ON true
WHERE qa.is_enabled = true;

-- Grant access to the view
GRANT SELECT ON employee_available_quizzes TO authenticated;