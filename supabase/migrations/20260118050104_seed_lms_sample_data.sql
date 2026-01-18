/*
  # Seed LMS Sample Data

  Seeds course categories, sample courses, and compliance requirements
*/

-- =====================================================
-- COURSE CATEGORIES
-- =====================================================

INSERT INTO course_categories (name, description, icon, display_order, is_active) VALUES
  ('Leadership & Management', 'Courses on leadership skills, team management, and strategic thinking', '👔', 1, true),
  ('Technical Skills', 'Software development, IT, and technical training', '💻', 2, true),
  ('Compliance & Safety', 'Mandatory compliance, safety, and regulatory training', '⚠️', 3, true),
  ('Soft Skills', 'Communication, presentation, and interpersonal skills', '🤝', 4, true),
  ('Finance & Accounting', 'Financial management, accounting, and budgeting', '💰', 5, true),
  ('Sales & Marketing', 'Sales techniques, marketing strategies, and customer relations', '📈', 6, true),
  ('HR & Talent Development', 'Human resources, recruitment, and employee development', '👥', 7, true),
  ('Operations & Process', 'Operational excellence, process improvement, and productivity', '⚙️', 8, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COURSE TAGS
-- =====================================================

INSERT INTO course_tags (tag_name, tag_color) VALUES
  ('Mandatory', '#EF4444'),
  ('Popular', '#3B82F6'),
  ('New', '#10B981'),
  ('Certificate', '#F59E0B'),
  ('Quick Learn', '#8B5CF6'),
  ('Advanced', '#EC4899'),
  ('Beginner Friendly', '#06B6D4'),
  ('Self-Paced', '#84CC16')
ON CONFLICT DO NOTHING;
