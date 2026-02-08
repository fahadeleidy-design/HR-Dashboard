/*
  # Fix leave_requests status CHECK constraint for multi-level approval workflow

  1. Changes
    - Drop the existing `leave_requests_status_check` constraint which only allows:
      'pending', 'approved', 'rejected', 'cancelled'
    - Re-create it with the additional 'manager_approved' status required by
      the multi-level approval workflow (manager -> hr -> approved)

  2. Reason
    - The `approve_request_v2` function sets status to 'manager_approved' after
      manager approval, but the CHECK constraint was blocking this value,
      causing a silent error when managers tried to approve leave requests
*/

ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'manager_approved'::text,
    'approved'::text,
    'rejected'::text,
    'cancelled'::text
  ]));
