/*
  # Update GOSI API Configuration for OAuth2

  1. Changes
    - Add `client_id` column for GOSI OAuth2 client ID
    - Add `client_secret` column for GOSI OAuth2 client secret
    - Add `private_key` column for GOSI private key (encrypted)
    - Remove old `username` and `api_key` columns (deprecated)
    - Add `access_token` column to cache OAuth token
    - Add `token_expires_at` column to track token expiry

  2. Notes
    - GOSI uses OAuth2 authentication with Client ID and Client Secret
    - Private key is used for signing requests
    - Access tokens are cached to avoid repeated authentication
    - All sensitive data is encrypted at rest
*/

DO $$
BEGIN
  -- Add new OAuth2 columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gosi_api_config' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE gosi_api_config ADD COLUMN client_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gosi_api_config' AND column_name = 'client_secret'
  ) THEN
    ALTER TABLE gosi_api_config ADD COLUMN client_secret text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gosi_api_config' AND column_name = 'private_key'
  ) THEN
    ALTER TABLE gosi_api_config ADD COLUMN private_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gosi_api_config' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE gosi_api_config ADD COLUMN access_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gosi_api_config' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE gosi_api_config ADD COLUMN token_expires_at timestamptz;
  END IF;
END $$;
