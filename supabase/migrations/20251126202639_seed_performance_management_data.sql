/*
  # Seed Performance Management Data
  
  Initial data for:
  - Competency frameworks
  - Goal categories
  - Feedback questions
  - Review templates
*/

-- Seed Competency Framework
INSERT INTO competency_frameworks (id, company_id, framework_name, description, is_default)
SELECT 
  gen_random_uuid(),
  c.id,
  'Core Competency Framework',
  'Standard competencies for all employees',
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM competency_frameworks WHERE company_id = c.id
)
ON CONFLICT DO NOTHING;

-- Seed Core Competencies
WITH framework_data AS (
  SELECT id as framework_id, company_id FROM competency_frameworks WHERE is_default = true
)
INSERT INTO competencies (framework_id, competency_name, description, category, weight_percentage)
SELECT 
  fd.framework_id,
  comp.name,
  comp.description,
  comp.category,
  comp.weight
FROM framework_data fd
CROSS JOIN (VALUES
  ('Communication', 'Effectively conveys information and ideas', 'Core Skills', 15),
  ('Teamwork', 'Collaborates effectively with others', 'Core Skills', 15),
  ('Problem Solving', 'Analyzes issues and develops solutions', 'Core Skills', 15),
  ('Leadership', 'Motivates and guides others toward goals', 'Leadership', 20),
  ('Strategic Thinking', 'Thinks long-term and considers broader impact', 'Leadership', 20),
  ('Customer Focus', 'Prioritizes customer needs and satisfaction', 'Business', 15)
) AS comp(name, description, category, weight)
WHERE NOT EXISTS (
  SELECT 1 FROM competencies WHERE framework_id = fd.framework_id
)
ON CONFLICT DO NOTHING;

-- Seed Goal Categories
INSERT INTO goal_categories (company_id, category_name, description, color_code, weight_percentage)
SELECT 
  c.id,
  cat.name,
  cat.description,
  cat.color,
  cat.weight
FROM companies c
CROSS JOIN (VALUES
  ('Business Results', 'Revenue, growth, and business outcomes', '#3B82F6', 40),
  ('Customer Success', 'Customer satisfaction and retention', '#10B981', 25),
  ('Team Development', 'Team growth and collaboration', '#F59E0B', 20),
  ('Personal Development', 'Individual learning and skill building', '#8B5CF6', 15)
) AS cat(name, description, color, weight)
WHERE NOT EXISTS (
  SELECT 1 FROM goal_categories WHERE company_id = c.id
)
ON CONFLICT DO NOTHING;

-- Seed Feedback Questions
INSERT INTO feedback_questions (company_id, question_text, question_type, category, is_active, display_order)
SELECT 
  c.id,
  q.text,
  q.type,
  q.category,
  true,
  q.display_order
FROM companies c
CROSS JOIN (VALUES
  ('Overall, how would you rate this person''s performance?', 'rating', 'Overall', 1),
  ('How effectively does this person communicate?', 'rating', 'Communication', 2),
  ('How well does this person collaborate with team members?', 'rating', 'Teamwork', 3),
  ('How would you rate this person''s technical/job skills?', 'rating', 'Skills', 4),
  ('What are this person''s greatest strengths?', 'text', 'Strengths', 5),
  ('What areas could this person improve?', 'text', 'Development', 6),
  ('Any additional comments or feedback?', 'text', 'General', 7)
) AS q(text, type, category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM feedback_questions WHERE company_id = c.id
)
ON CONFLICT DO NOTHING;

-- Seed Performance Review Template
INSERT INTO performance_review_templates (
  company_id, 
  template_name, 
  description, 
  rating_scale,
  include_self_review,
  include_peer_review,
  include_360_review,
  sections,
  is_default,
  is_active
)
SELECT 
  c.id,
  'Standard Annual Review',
  'Comprehensive annual performance review',
  5,
  true,
  true,
  false,
  jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object('name', 'Goals Achievement', 'weight', 40),
      jsonb_build_object('name', 'Core Competencies', 'weight', 30),
      jsonb_build_object('name', 'Leadership', 'weight', 20),
      jsonb_build_object('name', 'Values Alignment', 'weight', 10)
    )
  ),
  true,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM performance_review_templates WHERE company_id = c.id AND is_default = true
)
ON CONFLICT DO NOTHING;