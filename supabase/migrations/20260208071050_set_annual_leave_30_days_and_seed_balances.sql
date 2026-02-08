/*
  # Set Annual Leave to 30 Calendar Days and Seed Balances

  1. Changes
    - Update `leave_types` table: set `max_days_per_year` to 30 for all "Annual Leave" entries
    - Insert `leave_balances` records for every active employee for the current year
      with 30-day entitlement for their company's Annual Leave type
    - Recalculates used/pending/remaining from existing approved/pending leave requests

  2. Auto-Deduction
    - The existing `trg_update_leave_balance` trigger on `leave_requests` already calls
      `recalculate_leave_balance()` on every insert/update/delete
    - When a leave request status changes to 'approved', the trigger automatically
      recalculates used_days and remaining_days
    - No new trigger is needed

  3. Important Notes
    - Uses ON CONFLICT to avoid duplicates if balances already exist
    - Preserves any existing used_days data
    - Only targets active employees
*/

UPDATE leave_types
SET max_days_per_year = 30
WHERE name_en = 'Annual Leave';

INSERT INTO leave_balances (
  company_id,
  employee_id,
  leave_type_id,
  year,
  total_entitlement,
  used_days,
  pending_days,
  remaining_days,
  created_at,
  updated_at
)
SELECT
  e.company_id,
  e.id AS employee_id,
  lt.id AS leave_type_id,
  EXTRACT(YEAR FROM CURRENT_DATE)::integer AS year,
  30 AS total_entitlement,
  COALESCE((
    SELECT SUM(lr.total_days)
    FROM leave_requests lr
    WHERE lr.employee_id = e.id
      AND lr.leave_type_id = lt.id
      AND lr.status = 'approved'
      AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ), 0) AS used_days,
  COALESCE((
    SELECT SUM(lr.total_days)
    FROM leave_requests lr
    WHERE lr.employee_id = e.id
      AND lr.leave_type_id = lt.id
      AND lr.status = 'pending'
      AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ), 0) AS pending_days,
  30 - COALESCE((
    SELECT SUM(lr.total_days)
    FROM leave_requests lr
    WHERE lr.employee_id = e.id
      AND lr.leave_type_id = lt.id
      AND lr.status = 'approved'
      AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ), 0) AS remaining_days,
  now(),
  now()
FROM employees e
JOIN leave_types lt
  ON lt.company_id = e.company_id
  AND lt.name_en = 'Annual Leave'
WHERE e.status = 'active'
ON CONFLICT (employee_id, leave_type_id, year)
DO UPDATE SET
  total_entitlement = 30,
  remaining_days = 30 - leave_balances.used_days,
  updated_at = now();
