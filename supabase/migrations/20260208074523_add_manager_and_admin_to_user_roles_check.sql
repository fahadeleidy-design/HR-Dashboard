/*
  # Add manager and admin roles to user_roles check constraint

  1. Changes
    - Update `user_roles_role_check` constraint to include `manager` and `admin` roles
    - These roles were referenced in application code but missing from the database constraint

  2. Notes
    - manager: employee with team management and approval privileges
    - admin: employee with full administrative access
    - Both roles represent employee accounts with additional capabilities
*/

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'manager'::text, 'hr'::text, 'finance'::text, 'employee'::text]));
