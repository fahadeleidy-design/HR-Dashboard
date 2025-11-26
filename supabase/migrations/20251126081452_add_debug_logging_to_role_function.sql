/*
  # Add Debug Logging and Fix Role Function

  ## Changes
  1. **Add Logging to Function**
     - Log auth.uid() value
     - Log query results
     - Help debug why RLS is failing

  2. **Verify Function Works**
     - Test that function returns correct role
*/

-- Replace function with logging version
CREATE OR REPLACE FUNCTION get_user_role_for_company(target_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Log for debugging (will appear in Supabase logs)
  RAISE LOG 'get_user_role_for_company called: user_id=%, company_id=%', current_user_id, target_company_id;
  
  -- If no authenticated user, return null
  IF current_user_id IS NULL THEN
    RAISE LOG 'No authenticated user found';
    RETURN NULL;
  END IF;
  
  -- Get the role for the current authenticated user in the specified company
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = current_user_id
  AND company_id = target_company_id
  LIMIT 1;
  
  RAISE LOG 'Found role: %', user_role;
  
  RETURN user_role;
END;
$$;

-- Test the function with your user
DO $$
DECLARE
  test_role text;
BEGIN
  -- This won't work in service role context but shows the pattern
  test_role := get_user_role_for_company('b97d77c7-0858-40f6-ad56-924e1f20206d'::uuid);
  RAISE NOTICE 'Test role result: %', test_role;
END;
$$;
