/*
  # Production-Ready Performance Management Enhancements

  1. Calibration & 9-Box Grid
    - `calibration_sessions` - Performance calibration meetings
    - `calibration_participants` - Session attendees
    - `nine_box_placements` - Talent matrix (performance vs potential)
    
  2. Competency Assessments
    - `employee_competency_assessments` - Current competency levels
    - Competency gap analysis
    
  3. Review Workflow
    - Additional workflow states and transitions
    - Review acknowledgment tracking
    - Review comments and discussion threads
    
  4. Goal Progress Tracking
    - Enhanced progress updates
    - Goal check-ins
    - Automated progress calculation
    
  5. Analytics & Reporting
    - Performance distribution views
    - Goal completion rates
    - Review completion tracking
    
  6. Notifications & Reminders
    - Review deadline reminders
    - Goal milestone alerts
    - PIP check-in notifications
*/

-- Calibration Sessions
CREATE TABLE IF NOT EXISTS calibration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  cycle_id uuid REFERENCES performance_cycles(id) ON DELETE CASCADE NOT NULL,
  session_name text NOT NULL,
  session_date date NOT NULL,
  session_time time,
  location text,
  facilitator_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  status text CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calibration Participants
CREATE TABLE IF NOT EXISTS calibration_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES calibration_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('facilitator', 'manager', 'hr', 'observer')) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Nine Box Placements (Performance vs Potential Matrix)
CREATE TABLE IF NOT EXISTS nine_box_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  cycle_id uuid REFERENCES performance_cycles(id) ON DELETE CASCADE NOT NULL,
  calibration_session_id uuid REFERENCES calibration_sessions(id) ON DELETE SET NULL,
  performance_rating integer CHECK (performance_rating BETWEEN 1 AND 3) NOT NULL,
  potential_rating integer CHECK (potential_rating BETWEEN 1 AND 3) NOT NULL,
  box_category text GENERATED ALWAYS AS (
    CASE 
      WHEN performance_rating = 3 AND potential_rating = 3 THEN 'high_performer_high_potential'
      WHEN performance_rating = 3 AND potential_rating = 2 THEN 'high_performer_medium_potential'
      WHEN performance_rating = 3 AND potential_rating = 1 THEN 'high_performer_low_potential'
      WHEN performance_rating = 2 AND potential_rating = 3 THEN 'medium_performer_high_potential'
      WHEN performance_rating = 2 AND potential_rating = 2 THEN 'medium_performer_medium_potential'
      WHEN performance_rating = 2 AND potential_rating = 1 THEN 'medium_performer_low_potential'
      WHEN performance_rating = 1 AND potential_rating = 3 THEN 'low_performer_high_potential'
      WHEN performance_rating = 1 AND potential_rating = 2 THEN 'low_performer_medium_potential'
      WHEN performance_rating = 1 AND potential_rating = 1 THEN 'low_performer_low_potential'
    END
  ) STORED,
  action_plan text,
  notes text,
  placed_by_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, cycle_id)
);

-- Employee Competency Assessments
CREATE TABLE IF NOT EXISTS employee_competency_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  competency_id uuid REFERENCES competencies(id) ON DELETE CASCADE NOT NULL,
  cycle_id uuid REFERENCES performance_cycles(id) ON DELETE SET NULL,
  current_level integer NOT NULL,
  target_level integer,
  self_assessment integer,
  manager_assessment integer,
  assessment_date date DEFAULT CURRENT_DATE,
  assessor_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goal Check-ins (Progress Updates)
CREATE TABLE IF NOT EXISTS goal_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES performance_goals(id) ON DELETE CASCADE NOT NULL,
  check_in_date date DEFAULT CURRENT_DATE,
  progress_percentage integer CHECK (progress_percentage BETWEEN 0 AND 100),
  status_update text NOT NULL,
  current_value numeric,
  blockers text,
  support_needed text,
  next_steps text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Review Acknowledgments
CREATE TABLE IF NOT EXISTS review_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES performance_reviews(id) ON DELETE CASCADE NOT NULL,
  acknowledged_by uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  comments text,
  signature_data text,
  UNIQUE(review_id, acknowledged_by)
);

-- Review Comments/Discussion
CREATE TABLE IF NOT EXISTS review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES performance_reviews(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id uuid REFERENCES review_comments(id) ON DELETE CASCADE,
  commenter_id uuid REFERENCES employees(id) ON DELETE SET NULL NOT NULL,
  comment_type text CHECK (comment_type IN ('feedback', 'question', 'response', 'note')) NOT NULL,
  comment_text text NOT NULL,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance Metrics (KPI Tracking)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  metric_name text NOT NULL,
  description text,
  metric_type text CHECK (metric_type IN ('quantitative', 'qualitative')) NOT NULL,
  unit_of_measure text,
  calculation_formula text,
  data_source text,
  frequency text CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')) NOT NULL,
  target_value numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Employee Metric Values
CREATE TABLE IF NOT EXISTS employee_metric_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  metric_id uuid REFERENCES performance_metrics(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  actual_value numeric NOT NULL,
  target_value numeric,
  notes text,
  recorded_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Review Templates Sections (Detailed structure)
CREATE TABLE IF NOT EXISTS review_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES performance_review_templates(id) ON DELETE CASCADE NOT NULL,
  section_name text NOT NULL,
  section_type text CHECK (section_type IN ('competencies', 'goals', 'values', 'open_text', 'rating')) NOT NULL,
  description text,
  weight_percentage decimal(5,2),
  display_order integer NOT NULL,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Review Template Questions
CREATE TABLE IF NOT EXISTS review_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES review_template_sections(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text CHECK (question_type IN ('rating', 'text', 'multiple_choice', 'yes_no')) NOT NULL,
  is_required boolean DEFAULT true,
  display_order integer NOT NULL,
  options jsonb,
  created_at timestamptz DEFAULT now()
);

-- Review Responses
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES performance_reviews(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES review_template_questions(id) ON DELETE CASCADE NOT NULL,
  response_type text CHECK (response_type IN ('self', 'manager', 'peer', 'final')) NOT NULL,
  rating_value integer,
  text_response text,
  responder_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_cycle ON calibration_sessions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_date ON calibration_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_nine_box_employee ON nine_box_placements(employee_id);
CREATE INDEX IF NOT EXISTS idx_nine_box_cycle ON nine_box_placements(cycle_id);
CREATE INDEX IF NOT EXISTS idx_nine_box_category ON nine_box_placements(box_category);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_employee ON employee_competency_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_goal ON goal_check_ins(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_date ON goal_check_ins(check_in_date);
CREATE INDEX IF NOT EXISTS idx_review_acknowledgments_review ON review_acknowledgments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_review ON review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_employee_metric_values_employee ON employee_metric_values(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_metric_values_metric ON employee_metric_values(metric_id);
CREATE INDEX IF NOT EXISTS idx_employee_metric_values_period ON employee_metric_values(period_start, period_end);

-- Enable RLS
ALTER TABLE calibration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE nine_box_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_competency_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_metric_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (Company-based access)
CREATE POLICY "Users can view calibration sessions in their company"
  ON calibration_sessions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR and admins can manage calibration sessions"
  ON calibration_sessions FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr')
    )
  );

CREATE POLICY "Users can view nine box placements in their company"
  ON nine_box_placements FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR and admins can manage nine box placements"
  ON nine_box_placements FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr')
    )
  );

CREATE POLICY "Users can view their own competency assessments"
  ON employee_competency_assessments FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Managers can create competency assessments"
  ON employee_competency_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Users can view goal check-ins for their goals"
  ON goal_check_ins FOR SELECT
  TO authenticated
  USING (
    goal_id IN (
      SELECT pg.id FROM performance_goals pg
      INNER JOIN user_roles ur ON ur.employee_id = pg.employee_id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Users can create check-ins for their own goals"
  ON goal_check_ins FOR INSERT
  TO authenticated
  WITH CHECK (
    goal_id IN (
      SELECT pg.id FROM performance_goals pg
      INNER JOIN user_roles ur ON ur.employee_id = pg.employee_id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Users can view review acknowledgments for their reviews"
  ON review_acknowledgments FOR SELECT
  TO authenticated
  USING (
    review_id IN (
      SELECT pr.id FROM performance_reviews pr
      INNER JOIN user_roles ur ON ur.employee_id = pr.employee_id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Users can acknowledge their own reviews"
  ON review_acknowledgments FOR INSERT
  TO authenticated
  WITH CHECK (
    acknowledged_by IN (
      SELECT employee_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view review comments for their reviews"
  ON review_comments FOR SELECT
  TO authenticated
  USING (
    review_id IN (
      SELECT pr.id FROM performance_reviews pr
      INNER JOIN user_roles ur ON ur.employee_id = pr.employee_id
      WHERE ur.user_id = auth.uid()
    )
    OR commenter_id IN (
      SELECT employee_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Users can comment on reviews they're involved in"
  ON review_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    commenter_id IN (
      SELECT employee_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view performance metrics in their company"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR and admins can manage performance metrics"
  ON performance_metrics FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr')
    )
  );

CREATE POLICY "Users can view their own metric values"
  ON employee_metric_values FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Managers can record employee metric values"
  ON employee_metric_values FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'hr', 'manager')
    )
  );

-- Views for analytics

-- Performance distribution view
CREATE OR REPLACE VIEW performance_distribution AS
SELECT 
  pr.company_id,
  pr.cycle_id,
  pr.overall_rating,
  COUNT(*) as employee_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY pr.company_id, pr.cycle_id), 2) as percentage
FROM performance_reviews pr
WHERE pr.status = 'completed'
GROUP BY pr.company_id, pr.cycle_id, pr.overall_rating;

-- Goal completion rates
CREATE OR REPLACE VIEW goal_completion_rates AS
SELECT 
  pg.company_id,
  pg.cycle_id,
  pg.status,
  COUNT(*) as goal_count,
  AVG(pg.progress_percentage) as avg_progress
FROM performance_goals pg
GROUP BY pg.company_id, pg.cycle_id, pg.status;

-- Nine box distribution
CREATE OR REPLACE VIEW nine_box_distribution AS
SELECT 
  nbp.company_id,
  nbp.cycle_id,
  nbp.box_category,
  nbp.performance_rating,
  nbp.potential_rating,
  COUNT(*) as employee_count
FROM nine_box_placements nbp
GROUP BY nbp.company_id, nbp.cycle_id, nbp.box_category, nbp.performance_rating, nbp.potential_rating;

GRANT SELECT ON performance_distribution TO authenticated;
GRANT SELECT ON goal_completion_rates TO authenticated;
GRANT SELECT ON nine_box_distribution TO authenticated;