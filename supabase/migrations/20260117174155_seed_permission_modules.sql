/*
  # Seed Permission Modules

  ## Overview
  Seeds all system modules that can have fine-grained permissions assigned

  ## Modules
  - Dashboard & Analytics
  - Employee Management
  - Payroll & Compensation
  - Leave & Attendance
  - Performance Management
  - Recruitment
  - Training
  - Compliance & Documents
  - Administration
*/

INSERT INTO permission_modules (name, display_name, description, icon, route_path, display_order) VALUES
  ('dashboard', 'Dashboard', 'Main dashboard and analytics', 'LayoutDashboard', '/dashboard', 1),
  ('employees', 'Employee Management', 'View and manage employee records', 'Users', '/employees', 2),
  ('payroll', 'Payroll & Compensation', 'Process payroll and manage compensation', 'DollarSign', '/payroll', 3),
  ('leave', 'Leave Management', 'Manage leave requests and balances', 'Calendar', '/leave', 4),
  ('attendance', 'Attendance Tracking', 'Track and manage employee attendance', 'Clock', '/attendance', 5),
  ('performance', 'Performance Management', 'Performance reviews and goal tracking', 'TrendingUp', '/performance', 6),
  ('recruitment', 'Recruitment', 'Manage job postings and candidates', 'UserPlus', '/recruitment', 7),
  ('training', 'Training & Development', 'Training programs and courses', 'GraduationCap', '/training', 8),
  ('documents', 'Document Management', 'Manage company and employee documents', 'FileText', '/documents', 9),
  ('contracts', 'Contracts', 'Employee and vendor contracts', 'FileSignature', '/contracts', 10),
  ('expenses', 'Expense Management', 'Expense claims and approvals', 'Receipt', '/expenses', 11),
  ('loans', 'Loans & Advances', 'Manage employee loans and advances', 'CreditCard', '/loans', 12),
  ('eos', 'End of Service', 'End of service calculations', 'UserMinus', '/end-of-service', 13),
  ('gosi', 'GOSI Integration', 'GOSI reporting and compliance', 'Shield', '/gosi', 14),
  ('nitaqat', 'Nitaqat Compliance', 'Saudization tracking', 'Flag', '/nitaqat', 15),
  ('insurance', 'Insurance Management', 'Employee insurance policies', 'Heart', '/insurance', 16),
  ('visas', 'Visa & Work Permits', 'Visa and work permit tracking', 'Passport', '/visas', 17),
  ('vehicles', 'Vehicle Management', 'Company vehicle tracking', 'Car', '/vehicles', 18),
  ('real_estate', 'Real Estate Assets', 'Property and asset management', 'Building', '/real-estate', 19),
  ('travel', 'Travel Management', 'Business travel requests', 'Plane', '/travel', 20),
  ('org_chart', 'Organization Chart', 'View organizational structure', 'Network', '/org-chart', 21),
  ('reports', 'Reports & Analytics', 'Generate and view reports', 'BarChart', '/reports', 22),
  ('settings', 'System Settings', 'Configure system settings', 'Settings', '/settings', 23),
  ('user_management', 'User Management', 'Manage system users and roles', 'UserCog', '/settings/users', 24),
  ('audit_log', 'Audit Log', 'View system audit logs', 'FileSearch', '/audit-log', 25),
  ('tenant_admin', 'Tenant Administration', 'Multi-tenant administration', 'Building2', '/tenant-administration', 26)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  route_path = EXCLUDED.route_path,
  display_order = EXCLUDED.display_order;
