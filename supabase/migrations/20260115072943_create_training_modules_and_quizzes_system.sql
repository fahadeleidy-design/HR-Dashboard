/*
  # Training Modules and Quizzes System
  
  1. New Tables
    - `training_modules`
      - Stores training slides/lessons for each program
      - Supports different content types (slide, video, document, etc.)
      - Ordered sequence for proper flow
    
    - `training_quizzes`
      - Quizzes associated with training programs or modules
      - Can be standalone or module-specific
      - Configurable passing score and attempts
    
    - `quiz_questions`
      - Individual questions for quizzes
      - Supports multiple question types
      - Points-based scoring
    
    - `quiz_options`
      - Answer options for multiple choice questions
      - Tracks correct answers
    
    - `quiz_attempts`
      - Tracks user attempts at quizzes
      - Records scores and completion time
    
    - `quiz_answers`
      - Individual answers submitted by users
      - Links to questions and attempts
  
  2. Security
    - Enable RLS on all tables
    - HR can manage all training content
    - Employees can view and take quizzes
    - Results are visible based on role
*/

-- Training Modules (Slides/Lessons)
CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  training_program_id uuid REFERENCES training_programs(id) ON DELETE CASCADE NOT NULL,
  title_en text NOT NULL,
  title_ar text,
  content_type text NOT NULL DEFAULT 'slide',
  content text,
  content_url text,
  duration_minutes integer DEFAULT 0,
  sequence_order integer NOT NULL DEFAULT 0,
  is_mandatory boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_content_type CHECK (content_type IN ('slide', 'video', 'document', 'interactive', 'external_link'))
);

CREATE INDEX IF NOT EXISTS idx_training_modules_program ON training_modules(training_program_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_company ON training_modules(company_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_sequence ON training_modules(training_program_id, sequence_order);

-- Training Quizzes
CREATE TABLE IF NOT EXISTS training_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  training_program_id uuid REFERENCES training_programs(id) ON DELETE CASCADE NOT NULL,
  training_module_id uuid REFERENCES training_modules(id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_ar text,
  description text,
  passing_score integer NOT NULL DEFAULT 70,
  max_attempts integer DEFAULT 3,
  time_limit_minutes integer,
  is_mandatory boolean DEFAULT true,
  show_correct_answers boolean DEFAULT true,
  randomize_questions boolean DEFAULT false,
  randomize_options boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_program ON training_quizzes(training_program_id);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_module ON training_quizzes(training_module_id);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_company ON training_quizzes(company_id);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES training_quizzes(id) ON DELETE CASCADE NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  question_text text NOT NULL,
  explanation text,
  points integer NOT NULL DEFAULT 1,
  sequence_order integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_question_type CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay'))
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_sequence ON quiz_questions(quiz_id, sequence_order);

-- Quiz Options (for multiple choice and true/false)
CREATE TABLE IF NOT EXISTS quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES quiz_questions(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false,
  sequence_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON quiz_options(question_id);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES training_quizzes(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  score numeric(5,2),
  max_score integer NOT NULL,
  percentage numeric(5,2),
  passed boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  time_taken_minutes integer,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_percentage CHECK (percentage >= 0 AND percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_employee ON quiz_attempts(employee_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_company ON quiz_attempts(company_id);

-- Quiz Answers
CREATE TABLE IF NOT EXISTS quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES quiz_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES quiz_questions(id) ON DELETE CASCADE NOT NULL,
  selected_option_id uuid REFERENCES quiz_options(id) ON DELETE SET NULL,
  answer_text text,
  is_correct boolean,
  points_earned numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt ON quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id);

-- Module Completion Tracking
CREATE TABLE IF NOT EXISTS training_module_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES training_modules(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  completed_at timestamptz DEFAULT now(),
  time_spent_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(module_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_module_completions_module ON training_module_completions(module_id);
CREATE INDEX IF NOT EXISTS idx_module_completions_employee ON training_module_completions(employee_id);
CREATE INDEX IF NOT EXISTS idx_module_completions_company ON training_module_completions(company_id);

-- Enable RLS
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_module_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_modules
CREATE POLICY "Users can view training modules based on role"
  ON training_modules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        ur.role IN ('hr', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.company_id = training_modules.company_id)
      )
    )
  );

CREATE POLICY "HR can insert training modules"
  ON training_modules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  );

CREATE POLICY "HR can update training modules"
  ON training_modules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  );

CREATE POLICY "HR can delete training modules"
  ON training_modules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  );

-- RLS Policies for training_quizzes
CREATE POLICY "Users can view training quizzes based on role"
  ON training_quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        ur.role IN ('hr', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.company_id = training_quizzes.company_id)
      )
    )
  );

CREATE POLICY "HR can insert training quizzes"
  ON training_quizzes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  );

CREATE POLICY "HR can update training quizzes"
  ON training_quizzes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  );

CREATE POLICY "HR can delete training quizzes"
  ON training_quizzes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  );

-- RLS Policies for quiz_questions
CREATE POLICY "Users can view quiz questions"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_quizzes tq
      INNER JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE tq.id = quiz_questions.quiz_id
      AND (
        ur.role IN ('hr', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.company_id = tq.company_id)
      )
    )
  );

CREATE POLICY "HR can manage quiz questions"
  ON quiz_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  );

-- RLS Policies for quiz_options
CREATE POLICY "Users can view quiz options"
  ON quiz_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      INNER JOIN training_quizzes tq ON tq.id = qq.quiz_id
      INNER JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE qq.id = quiz_options.question_id
      AND (
        ur.role IN ('hr', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.company_id = tq.company_id)
      )
    )
  );

CREATE POLICY "HR can manage quiz options"
  ON quiz_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('hr', 'admin', 'super_admin')
    )
  );

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can view quiz attempts based on role"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        ur.role IN ('hr', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.user_id = quiz_attempts.user_id)
      )
    )
  );

CREATE POLICY "Employees can insert their own quiz attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Employees can update their own quiz attempts"
  ON quiz_attempts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- RLS Policies for quiz_answers
CREATE POLICY "Users can view quiz answers based on role"
  ON quiz_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      INNER JOIN user_roles ur ON ur.user_id = auth.uid()
      WHERE qa.id = quiz_answers.attempt_id
      AND (
        ur.role IN ('hr', 'admin', 'super_admin')
        OR ur.user_id = qa.user_id
      )
    )
  );

CREATE POLICY "Employees can insert their own quiz answers"
  ON quiz_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_answers.attempt_id
      AND qa.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update their own quiz answers"
  ON quiz_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_answers.attempt_id
      AND qa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      WHERE qa.id = quiz_answers.attempt_id
      AND qa.user_id = auth.uid()
    )
  );

-- RLS Policies for training_module_completions
CREATE POLICY "Users can view module completions based on role"
  ON training_module_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND (
        ur.role IN ('hr', 'admin', 'super_admin')
        OR (ur.role = 'employee' AND ur.user_id = training_module_completions.user_id)
      )
    )
  );

CREATE POLICY "Employees can insert their own module completions"
  ON training_module_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Employees can update their own module completions"
  ON training_module_completions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Update trigger for training_modules
CREATE OR REPLACE FUNCTION update_training_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_training_modules_updated_at();

-- Update trigger for training_quizzes
CREATE OR REPLACE FUNCTION update_training_quizzes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_quizzes_updated_at
  BEFORE UPDATE ON training_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_training_quizzes_updated_at();
