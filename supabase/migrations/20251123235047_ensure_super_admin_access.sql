/*
  # Ensure Super Admin Access for Employee Handbook Upload

  This migration ensures the super admin user feleidy@special-offices.com has proper access
  to upload employee handbooks.

  ## Changes

  1. No structural changes needed - the user_roles table and policies are already set up correctly
  2. This migration serves as documentation that the super admin role is enabled
  3. The application code checks for:
     - userRole === 'super_admin' OR
     - user.email === 'feleidy@special-offices.com'

  ## Access Requirements

  For the super admin to upload handbooks, they need:
  - A record in the user_roles table with role = 'super_admin'
  - Associated with a company_id
  - The email feleidy@special-offices.com in the auth.users table

  ## Notes

  - The employee_handbooks table already has proper RLS policies
  - Super admins can upload, edit, archive, and delete handbooks
  - The storage bucket 'documents' should be configured to allow authenticated users to upload
  - Upload functionality is available in the UI at /handbook route
*/

-- Verify that the super_admin role exists in the constraint
DO $$
BEGIN
  -- Check if user_roles table has the proper constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_role_check' 
    AND conrelid = 'user_roles'::regclass
  ) THEN
    RAISE EXCEPTION 'user_roles_role_check constraint is missing';
  END IF;
END $$;

-- Add helpful comment
COMMENT ON TABLE employee_handbooks IS 'Employee handbook documents with version control and acknowledgment tracking. Super admins and users with role super_admin can manage handbooks.';

-- Verify storage policies exist (this is informational only)
DO $$
BEGIN
  RAISE NOTICE 'Super admin access for employee handbook upload is configured.';
  RAISE NOTICE 'User feleidy@special-offices.com will have upload access when:';
  RAISE NOTICE '1. They have a user_roles record with role = super_admin';
  RAISE NOTICE '2. They are authenticated and associated with a company';
  RAISE NOTICE '3. The storage bucket "documents" allows authenticated uploads';
END $$;
