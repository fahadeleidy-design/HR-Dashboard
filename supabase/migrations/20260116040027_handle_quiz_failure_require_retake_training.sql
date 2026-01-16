/*
  # Handle Quiz Failures - Require Training Retake

  1. Changes
    - Function to check quiz attempts after each submission
    - If employee fails all attempts, disable quiz assignment
    - Reset training enrollment to "enrolled" status (requires retaking)
    - Add fields to track quiz failure and retake requirements
    - Function for HR to manually re-enable quizzes

  2. New Fields
    - `quiz_assignments.attempts_used` - tracks number of attempts
    - `quiz_assignments.failed_at` - timestamp when all attempts failed
    - `quiz_assignments.requires_retake` - boolean flag for retake requirement

  3. Security
    - Maintain existing RLS policies
    - HR can manually re-enable failed quizzes
*/

-- Add new fields to quiz_assignments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' AND column_name = 'attempts_used'
  ) THEN
    ALTER TABLE quiz_assignments ADD COLUMN attempts_used integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' AND column_name = 'failed_at'
  ) THEN
    ALTER TABLE quiz_assignments ADD COLUMN failed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_assignments' AND column_name = 'requires_retake'
  ) THEN
    ALTER TABLE quiz_assignments ADD COLUMN requires_retake boolean DEFAULT false;
  END IF;
END $$;

-- Function to handle quiz attempt completion
CREATE OR REPLACE FUNCTION handle_quiz_attempt_completion()
RETURNS TRIGGER AS $$
DECLARE
  max_attempts integer;
  total_attempts integer;
  has_passed boolean;
  assignment_record record;
BEGIN
  -- Only process completed attempts
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the quiz's max attempts
  SELECT tq.max_attempts INTO max_attempts
  FROM training_quizzes tq
  WHERE tq.id = NEW.quiz_id;

  -- Count total attempts for this employee and quiz
  SELECT COUNT(*), bool_or(qa.passed) INTO total_attempts, has_passed
  FROM quiz_attempts qa
  WHERE qa.quiz_id = NEW.quiz_id
  AND qa.employee_id = NEW.employee_id
  AND qa.completed_at IS NOT NULL;

  -- Get the quiz assignment
  SELECT * INTO assignment_record
  FROM quiz_assignments qa
  WHERE qa.quiz_id = NEW.quiz_id
  AND qa.employee_id = NEW.employee_id
  AND qa.enrollment_id IN (
    SELECT id FROM training_enrollments te
    WHERE te.employee_id = NEW.employee_id
    AND te.training_program_id = (
      SELECT training_program_id FROM training_quizzes WHERE id = NEW.quiz_id
    )
    ORDER BY te.enrollment_date DESC
    LIMIT 1
  )
  LIMIT 1;

  -- If assignment exists, update attempts used
  IF assignment_record.id IS NOT NULL THEN
    UPDATE quiz_assignments
    SET attempts_used = total_attempts,
        updated_at = now()
    WHERE id = assignment_record.id;

    -- If employee has used all attempts and hasn't passed
    IF total_attempts >= max_attempts AND NOT COALESCE(has_passed, false) THEN
      -- Disable the quiz assignment and mark as requiring retake
      UPDATE quiz_assignments
      SET 
        is_enabled = false,
        failed_at = now(),
        requires_retake = true,
        updated_at = now()
      WHERE id = assignment_record.id;

      -- Reset the training enrollment to require retaking the training
      UPDATE training_enrollments
      SET 
        completion_status = 'enrolled',
        completion_date = NULL,
        certificate_issued = false,
        updated_at = now()
      WHERE id = assignment_record.enrollment_id;

      -- Mark this quiz as completed (but failed) to track completion
      UPDATE quiz_assignments
      SET completed_at = now()
      WHERE id = assignment_record.id;
    END IF;

    -- If employee passed, mark quiz as completed
    IF NEW.passed = true THEN
      UPDATE quiz_assignments
      SET completed_at = now(),
          updated_at = now()
      WHERE id = assignment_record.id
      AND completed_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on quiz_attempts after insert or update
DROP TRIGGER IF EXISTS trigger_handle_quiz_attempt_completion ON quiz_attempts;
CREATE TRIGGER trigger_handle_quiz_attempt_completion
  AFTER INSERT OR UPDATE OF completed_at, passed ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION handle_quiz_attempt_completion();

-- Function for HR to manually re-enable a quiz without requiring full training retake
CREATE OR REPLACE FUNCTION hr_reenable_quiz(
  p_quiz_assignment_id uuid,
  p_reset_attempts boolean DEFAULT true
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  assignment_record record;
BEGIN
  -- Get the assignment
  SELECT * INTO assignment_record
  FROM quiz_assignments
  WHERE id = p_quiz_assignment_id;

  IF assignment_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quiz assignment not found'
    );
  END IF;

  -- Re-enable the quiz
  UPDATE quiz_assignments
  SET 
    is_enabled = true,
    requires_retake = false,
    failed_at = NULL,
    attempts_used = CASE WHEN p_reset_attempts THEN 0 ELSE attempts_used END,
    updated_at = now()
  WHERE id = p_quiz_assignment_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Quiz re-enabled successfully',
    'attempts_reset', p_reset_attempts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the employee_available_quizzes view to include failure information
DROP VIEW IF EXISTS employee_available_quizzes;
CREATE OR REPLACE VIEW employee_available_quizzes AS
SELECT 
  qa.id as assignment_id,
  qa.employee_id,
  qa.quiz_id,
  qa.enrollment_id,
  qa.enabled_at,
  qa.is_enabled,
  qa.completed_at,
  qa.attempts_used,
  qa.failed_at,
  qa.requires_retake,
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
  COALESCE(attempt_count.passed, false) as has_passed,
  CASE 
    WHEN qa.requires_retake = true THEN 'retake_required'
    WHEN qa.is_enabled = false THEN 'disabled'
    WHEN COALESCE(attempt_count.passed, false) = true THEN 'passed'
    WHEN COALESCE(attempt_count.count, 0) >= tq.max_attempts THEN 'max_attempts_reached'
    ELSE 'available'
  END as quiz_status
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
  AND completed_at IS NOT NULL
) attempt_count ON true;

-- Grant access to the updated view
GRANT SELECT ON employee_available_quizzes TO authenticated;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_requires_retake ON quiz_assignments(requires_retake) WHERE requires_retake = true;
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_failed_at ON quiz_assignments(failed_at) WHERE failed_at IS NOT NULL;