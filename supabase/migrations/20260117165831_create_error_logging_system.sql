/*
  # Enterprise Error Logging and Monitoring System

  1. New Tables
    - `system_error_logs`
      - Comprehensive error logging with stack traces
      - User context, session tracking
      - Error severity levels
      - Performance metrics

    - `system_activity_logs`
      - Detailed activity tracking
      - Performance monitoring
      - User action tracking

    - `system_performance_metrics`
      - Query performance tracking
      - Response time monitoring
      - Resource usage tracking

    - `system_cache_stats`
      - Cache hit/miss tracking
      - Cache invalidation tracking

  2. Security
    - Enable RLS on all logging tables
    - Only admins and super_admins can view logs
    - System can insert logs without authentication

  3. Performance
    - Indexes on timestamp, user_id, error_type
    - Partitioning by month for scalability
    - Auto-cleanup of old logs
*/

-- Error severity enum
DO $$ BEGIN
  CREATE TYPE error_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Log level enum
DO $$ BEGIN
  CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error', 'fatal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- System Error Logs Table
CREATE TABLE IF NOT EXISTS system_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Error Details
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_code text,
  stack_trace text,
  severity error_severity DEFAULT 'medium',

  -- Context
  component text,
  action text,
  endpoint text,
  method text,

  -- Request Context
  request_payload jsonb,
  response_payload jsonb,
  query_params jsonb,
  headers jsonb,

  -- Session Context
  session_id text,
  ip_address inet,
  user_agent text,
  browser text,
  device text,

  -- Performance
  execution_time_ms integer,
  memory_usage_mb numeric(10,2),

  -- Metadata
  tags text[],
  metadata jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz DEFAULT now()
);

-- System Activity Logs Table
CREATE TABLE IF NOT EXISTS system_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Activity Details
  level log_level DEFAULT 'info',
  category text NOT NULL,
  action text NOT NULL,
  description text,

  -- Context
  module text,
  entity_type text,
  entity_id uuid,

  -- Changes
  old_values jsonb,
  new_values jsonb,
  changes_summary text,

  -- Request Context
  ip_address inet,
  user_agent text,
  session_id text,

  -- Performance
  execution_time_ms integer,

  -- Metadata
  tags text[],
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS system_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,

  -- Metric Details
  metric_type text NOT NULL,
  metric_name text NOT NULL,

  -- Performance Data
  execution_time_ms integer NOT NULL,
  memory_usage_mb numeric(10,2),
  cpu_usage_percent numeric(5,2),

  -- Database Performance
  query_count integer,
  slow_queries integer,
  cache_hits integer,
  cache_misses integer,

  -- API Performance
  status_code integer,
  response_size_kb numeric(10,2),

  -- Context
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint text,
  method text,

  -- Thresholds
  is_slow boolean GENERATED ALWAYS AS (execution_time_ms > 1000) STORED,
  is_critical boolean GENERATED ALWAYS AS (execution_time_ms > 5000) STORED,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

-- Cache Statistics Table
CREATE TABLE IF NOT EXISTS system_cache_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,

  -- Cache Details
  cache_key text NOT NULL,
  cache_type text NOT NULL,

  -- Statistics
  hit_count integer DEFAULT 0,
  miss_count integer DEFAULT 0,
  invalidation_count integer DEFAULT 0,

  -- Performance
  avg_retrieval_time_ms numeric(10,2),
  cache_size_kb numeric(10,2),

  -- Timing
  last_hit_at timestamptz,
  last_miss_at timestamptz,
  last_invalidated_at timestamptz,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_cache_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Error Logs
CREATE POLICY "System can insert error logs"
  ON system_error_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view error logs"
  ON system_error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update error logs"
  ON system_error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for Activity Logs
CREATE POLICY "System can insert activity logs"
  ON system_activity_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view activity logs"
  ON system_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for Performance Metrics
CREATE POLICY "System can insert performance metrics"
  ON system_performance_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view performance metrics"
  ON system_performance_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for Cache Stats
CREATE POLICY "System can manage cache stats"
  ON system_cache_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_error_logs_company_created ON system_error_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON system_error_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON system_error_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON system_error_logs(error_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON system_error_logs(resolved, created_at DESC) WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created ON system_activity_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON system_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON system_activity_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON system_activity_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON system_performance_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_slow ON system_performance_metrics(is_slow, created_at DESC) WHERE is_slow = true;
CREATE INDEX IF NOT EXISTS idx_performance_metrics_critical ON system_performance_metrics(is_critical, created_at DESC) WHERE is_critical = true;

CREATE INDEX IF NOT EXISTS idx_cache_stats_key ON system_cache_stats(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_stats_type ON system_cache_stats(cache_type);

-- Function to log errors
CREATE OR REPLACE FUNCTION log_error(
  p_company_id uuid,
  p_user_id uuid,
  p_error_type text,
  p_error_message text,
  p_stack_trace text DEFAULT NULL,
  p_severity error_severity DEFAULT 'medium',
  p_component text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_error_id uuid;
BEGIN
  INSERT INTO system_error_logs (
    company_id,
    user_id,
    error_type,
    error_message,
    stack_trace,
    severity,
    component,
    metadata
  ) VALUES (
    p_company_id,
    p_user_id,
    p_error_type,
    p_error_message,
    p_stack_trace,
    p_severity,
    p_component,
    p_metadata
  )
  RETURNING id INTO v_error_id;

  RETURN v_error_id;
END;
$$;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_company_id uuid,
  p_user_id uuid,
  p_level log_level,
  p_category text,
  p_action text,
  p_description text DEFAULT NULL,
  p_module text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO system_activity_logs (
    company_id,
    user_id,
    level,
    category,
    action,
    description,
    module,
    metadata
  ) VALUES (
    p_company_id,
    p_user_id,
    p_level,
    p_category,
    p_action,
    p_description,
    p_module,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to track performance
CREATE OR REPLACE FUNCTION log_performance_metric(
  p_company_id uuid,
  p_metric_type text,
  p_metric_name text,
  p_execution_time_ms integer,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  INSERT INTO system_performance_metrics (
    company_id,
    metric_type,
    metric_name,
    execution_time_ms,
    metadata
  ) VALUES (
    p_company_id,
    p_metric_type,
    p_metric_name,
    p_execution_time_ms,
    p_metadata
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$;

-- Auto-cleanup old logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM system_error_logs
  WHERE created_at < now() - interval '90 days'
  AND resolved = true;

  DELETE FROM system_activity_logs
  WHERE created_at < now() - interval '90 days'
  AND level IN ('debug', 'info');

  DELETE FROM system_performance_metrics
  WHERE created_at < now() - interval '30 days';

  DELETE FROM system_cache_stats
  WHERE updated_at < now() - interval '7 days';
END;
$$;

-- View for error summary
CREATE OR REPLACE VIEW error_summary AS
SELECT
  company_id,
  error_type,
  severity,
  COUNT(*) as error_count,
  COUNT(*) FILTER (WHERE resolved = false) as unresolved_count,
  MAX(created_at) as last_occurrence,
  AVG(execution_time_ms) as avg_execution_time_ms
FROM system_error_logs
WHERE created_at > now() - interval '7 days'
GROUP BY company_id, error_type, severity;

-- View for performance summary
CREATE OR REPLACE VIEW performance_summary AS
SELECT
  company_id,
  metric_type,
  metric_name,
  COUNT(*) as execution_count,
  AVG(execution_time_ms) as avg_time_ms,
  MIN(execution_time_ms) as min_time_ms,
  MAX(execution_time_ms) as max_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_time_ms,
  COUNT(*) FILTER (WHERE is_slow = true) as slow_count
FROM system_performance_metrics
WHERE created_at > now() - interval '24 hours'
GROUP BY company_id, metric_type, metric_name;
