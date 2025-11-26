/*
  # Add Bootstrap Policy for User Roles

  ## Changes Made

  1. **Add Bootstrap Policy**
     - Allow any authenticated user to insert their first role if they have none
     - This breaks the chicken-and-egg problem
     - Once a user has a role, normal admin policies take over

  2. **Security Notes**
     - Users can only bootstrap their own user_id
     - Can only create one role per company initially
     - Prevents orphaned users who can't create their first role
*/

-- Allow users to create their own first role (bootstrap)
CREATE POLICY "Users can bootstrap their own role"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND company_id = user_roles.company_id
    )
  );
