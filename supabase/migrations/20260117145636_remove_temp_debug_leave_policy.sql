/*
  # Remove Temporary Debug Policy

  ## Purpose
  Remove the temporary debug policy that was allowing all inserts
  Now that we've fixed the underlying issues with leave_balances and system_notifications policies
*/

DROP POLICY IF EXISTS "TEMP_DEBUG_Allow_all_inserts" ON leave_requests;
