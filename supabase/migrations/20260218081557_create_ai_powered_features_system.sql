/*
  # Create AI-Powered Features System

  1. New Tables
    - `ai_workflows` - Stores AI agent workflow definitions and templates
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `name` (text) - workflow name
      - `description` (text) - what the workflow does
      - `workflow_type` (text) - agent, query, automation
      - `steps` (jsonb) - ordered array of workflow steps
      - `trigger_type` (text) - manual, scheduled, event
      - `status` (text) - active, draft, archived
      - `created_by` (uuid)
      - `last_run_at` (timestamptz)
      - `run_count` (integer)

    - `ai_workflow_executions` - Logs each execution of an AI workflow
      - `id` (uuid, primary key)
      - `workflow_id` (uuid, references ai_workflows)
      - `company_id` (uuid)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `status` (text) - running, completed, failed
      - `input_data` (jsonb)
      - `output_data` (jsonb)
      - `steps_completed` (integer)
      - `error_message` (text)
      - `executed_by` (uuid)

    - `ai_nl_queries` - Natural language query history
      - `id` (uuid, primary key)
      - `company_id` (uuid)
      - `user_id` (uuid)
      - `query_text` (text) - the natural language question
      - `interpreted_intent` (text) - what AI interpreted
      - `generated_sql` (text) - the SQL or data query generated
      - `result_summary` (text) - summary of results
      - `result_data` (jsonb) - full result data
      - `confidence_score` (numeric)
      - `feedback_rating` (integer) - user feedback 1-5

    - `ai_recommendations` - Stores AI-generated recommendations
      - `id` (uuid, primary key)
      - `company_id` (uuid)
      - `recommendation_type` (text) - job, learning, career, compensation
      - `target_entity_type` (text) - employee, candidate, position
      - `target_entity_id` (uuid)
      - `title` (text)
      - `description` (text)
      - `confidence_score` (numeric)
      - `reasoning` (jsonb) - factors that led to recommendation
      - `status` (text) - pending, accepted, dismissed
      - `priority` (text) - high, medium, low

    - `ai_predictions` - Stores AI prediction results
      - `id` (uuid, primary key)
      - `company_id` (uuid)
      - `prediction_type` (text) - flight_risk, performance, skills_demand
      - `target_entity_type` (text)
      - `target_entity_id` (uuid)
      - `predicted_value` (numeric)
      - `confidence_score` (numeric)
      - `contributing_factors` (jsonb)
      - `prediction_horizon` (text) - 30d, 90d, 6m, 1y
      - `actual_outcome` (text)
      - `model_version` (text)

    - `ai_resume_analyses` - Resume parsing and matching results
      - `id` (uuid, primary key)
      - `company_id` (uuid)
      - `candidate_name` (text)
      - `resume_text` (text)
      - `extracted_data` (jsonb) - skills, experience, education
      - `match_scores` (jsonb) - scores against job positions
      - `overall_score` (numeric)
      - `recommendations` (jsonb)
      - `parsed_at` (timestamptz)

    - `ai_generated_content` - AI-generated text content (JDs, reviews, etc.)
      - `id` (uuid, primary key)
      - `company_id` (uuid)
      - `content_type` (text) - job_description, review_analysis, summary
      - `input_context` (jsonb)
      - `generated_text` (text)
      - `tone` (text) - professional, formal, casual
      - `quality_score` (numeric)
      - `status` (text) - draft, approved, published
      - `created_by` (uuid)

  2. Security
    - Enable RLS on all tables
    - Policies restrict access to authenticated users within their company
    - Admin/HR roles get broader access

  3. Indexes
    - Composite indexes on company_id + type columns for fast filtering
    - Index on status columns for active record queries
*/

CREATE TABLE IF NOT EXISTS ai_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  workflow_type text NOT NULL DEFAULT 'agent' CHECK (workflow_type IN ('agent', 'query', 'automation', 'analysis')),
  steps jsonb NOT NULL DEFAULT '[]',
  trigger_type text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'event')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  created_by uuid REFERENCES auth.users(id),
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES ai_workflows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  input_data jsonb DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  steps_completed integer NOT NULL DEFAULT 0,
  total_steps integer NOT NULL DEFAULT 0,
  error_message text,
  executed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_nl_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  query_text text NOT NULL,
  interpreted_intent text,
  generated_sql text,
  result_summary text,
  result_data jsonb DEFAULT '{}',
  confidence_score numeric(5,2) DEFAULT 0,
  feedback_rating integer CHECK (feedback_rating IS NULL OR (feedback_rating >= 1 AND feedback_rating <= 5)),
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('job', 'learning', 'career', 'compensation', 'succession', 'team_composition')),
  target_entity_type text NOT NULL CHECK (target_entity_type IN ('employee', 'candidate', 'position', 'department', 'team')),
  target_entity_id uuid,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  reasoning jsonb DEFAULT '[]',
  data_points jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'implemented')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  expires_at timestamptz,
  actioned_by uuid REFERENCES auth.users(id),
  actioned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prediction_type text NOT NULL CHECK (prediction_type IN ('flight_risk', 'performance', 'skills_demand', 'workforce_cost', 'hiring_need', 'attrition')),
  target_entity_type text NOT NULL CHECK (target_entity_type IN ('employee', 'department', 'company', 'position', 'skill')),
  target_entity_id uuid,
  target_entity_name text,
  predicted_value numeric(10,4) NOT NULL DEFAULT 0,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  contributing_factors jsonb DEFAULT '[]',
  prediction_horizon text NOT NULL DEFAULT '90d' CHECK (prediction_horizon IN ('30d', '90d', '6m', '1y', '2y')),
  actual_outcome text,
  model_version text NOT NULL DEFAULT 'v1.0',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_resume_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_name text NOT NULL,
  candidate_email text,
  resume_text text,
  extracted_data jsonb DEFAULT '{}',
  skills_found jsonb DEFAULT '[]',
  experience_years numeric(4,1) DEFAULT 0,
  education_level text,
  match_scores jsonb DEFAULT '[]',
  overall_score numeric(5,2) DEFAULT 0,
  strengths jsonb DEFAULT '[]',
  gaps jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  parsed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('job_description', 'review_analysis', 'performance_summary', 'email_draft', 'policy_draft', 'report_narrative')),
  title text NOT NULL DEFAULT '',
  input_context jsonb DEFAULT '{}',
  generated_text text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'formal', 'casual', 'technical')),
  quality_score numeric(5,2) DEFAULT 0,
  word_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_nl_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_ai_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND role IN ('super_admin', 'admin', 'hr', 'hr_admin', 'hr_manager', 'finance', 'manager')
  );
$$;

CREATE POLICY "AI workflows viewable by privileged roles"
  ON ai_workflows FOR SELECT TO authenticated
  USING (check_ai_company_access(company_id));

CREATE POLICY "AI workflows manageable by admin/hr"
  ON ai_workflows FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = ai_workflows.company_id
      AND role IN ('super_admin', 'admin', 'hr', 'hr_admin')
    )
  );

CREATE POLICY "AI workflows updatable by admin/hr"
  ON ai_workflows FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = ai_workflows.company_id
      AND role IN ('super_admin', 'admin', 'hr', 'hr_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = ai_workflows.company_id
      AND role IN ('super_admin', 'admin', 'hr', 'hr_admin')
    )
  );

CREATE POLICY "AI workflows deletable by admin"
  ON ai_workflows FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = ai_workflows.company_id
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "AI executions viewable by privileged roles"
  ON ai_workflow_executions FOR SELECT TO authenticated
  USING (check_ai_company_access(company_id));

CREATE POLICY "AI executions insertable by privileged roles"
  ON ai_workflow_executions FOR INSERT TO authenticated
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "AI executions updatable by privileged roles"
  ON ai_workflow_executions FOR UPDATE TO authenticated
  USING (check_ai_company_access(company_id))
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "NL queries viewable by own user or admin"
  ON ai_nl_queries FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR check_ai_company_access(company_id)
  );

CREATE POLICY "NL queries insertable by authenticated users"
  ON ai_nl_queries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = ai_nl_queries.company_id
    )
  );

CREATE POLICY "NL queries updatable by own user"
  ON ai_nl_queries FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "AI recommendations viewable by privileged roles"
  ON ai_recommendations FOR SELECT TO authenticated
  USING (check_ai_company_access(company_id));

CREATE POLICY "AI recommendations insertable by privileged roles"
  ON ai_recommendations FOR INSERT TO authenticated
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "AI recommendations updatable by privileged roles"
  ON ai_recommendations FOR UPDATE TO authenticated
  USING (check_ai_company_access(company_id))
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "AI recommendations deletable by admin"
  ON ai_recommendations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = ai_recommendations.company_id
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "AI predictions viewable by privileged roles"
  ON ai_predictions FOR SELECT TO authenticated
  USING (check_ai_company_access(company_id));

CREATE POLICY "AI predictions insertable by privileged roles"
  ON ai_predictions FOR INSERT TO authenticated
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "AI predictions updatable by privileged roles"
  ON ai_predictions FOR UPDATE TO authenticated
  USING (check_ai_company_access(company_id))
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "Resume analyses viewable by hr/admin"
  ON ai_resume_analyses FOR SELECT TO authenticated
  USING (check_ai_company_access(company_id));

CREATE POLICY "Resume analyses insertable by hr/admin"
  ON ai_resume_analyses FOR INSERT TO authenticated
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "Resume analyses updatable by hr/admin"
  ON ai_resume_analyses FOR UPDATE TO authenticated
  USING (check_ai_company_access(company_id))
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "Resume analyses deletable by admin"
  ON ai_resume_analyses FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = ai_resume_analyses.company_id
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Generated content viewable by privileged roles"
  ON ai_generated_content FOR SELECT TO authenticated
  USING (check_ai_company_access(company_id));

CREATE POLICY "Generated content insertable by privileged roles"
  ON ai_generated_content FOR INSERT TO authenticated
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "Generated content updatable by privileged roles"
  ON ai_generated_content FOR UPDATE TO authenticated
  USING (check_ai_company_access(company_id))
  WITH CHECK (check_ai_company_access(company_id));

CREATE POLICY "Generated content deletable by admin/hr"
  ON ai_generated_content FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND company_id = ai_generated_content.company_id
      AND role IN ('super_admin', 'admin', 'hr')
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_workflows_company_status ON ai_workflows(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_type ON ai_workflows(company_id, workflow_type);
CREATE INDEX IF NOT EXISTS idx_ai_executions_workflow ON ai_workflow_executions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_executions_company ON ai_workflow_executions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_nl_queries_user ON ai_nl_queries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_nl_queries_company ON ai_nl_queries(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_company_type ON ai_recommendations(company_id, recommendation_type, status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_target ON ai_recommendations(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_company_type ON ai_predictions(company_id, prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_target ON ai_predictions(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_resume_company ON ai_resume_analyses(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_content_company_type ON ai_generated_content(company_id, content_type, status);
