/*
  # Temporary Password Reset Function
  
  Creates a function to reset user passwords using the auth schema.
*/

-- Create a function to reset user password
CREATE OR REPLACE FUNCTION reset_user_password_temp(user_email TEXT, new_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the user ID from email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN 'User not found';
  END IF;
  
  -- Update the user password using raw_app_meta_data approach
  -- Note: This requires service role key in practice
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = user_id;
  
  RETURN 'Password updated successfully';
END;
$$;
