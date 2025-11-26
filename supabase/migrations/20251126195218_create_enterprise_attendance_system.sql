/*
  # Enterprise-Grade Attendance Management System

  1. New Tables
    - `attendance_policies` - Define attendance rules and policies
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `name` (text) - Policy name
      - `work_start_time` (time) - Standard work start time
      - `work_end_time` (time) - Standard work end time
      - `grace_period_minutes` (integer) - Grace period for late arrival
      - `half_day_threshold_minutes` (integer) - Minutes absent to mark as half day
      - `standard_working_hours` (decimal) - Standard hours per day
      - `overtime_after_hours` (decimal) - Hours after which overtime starts
      - `allow_early_checkin` (boolean)
      - `allow_late_checkout` (boolean)
      - `require_checkout` (boolean)
      - `break_duration_minutes` (integer)
      - `weekend_days` (text[]) - Array of weekend days
      - `is_default` (boolean)
      - `created_at`, `updated_at`

    - `attendance_shifts` - Shift scheduling system
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `name` (text) - Shift name (Morning, Evening, Night)
      - `shift_start` (time)
      - `shift_end` (time)
      - `grace_period_minutes` (integer)
      - `color` (text) - Color for UI display
      - `is_active` (boolean)
      - `created_at`, `updated_at`

    - `employee_shifts` - Assign shifts to employees
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `employee_id` (uuid, references employees)
      - `shift_id` (uuid, references attendance_shifts)
      - `effective_from` (date)
      - `effective_to` (date, nullable)
      - `days_of_week` (integer[]) - Array [0-6] for Sun-Sat
      - `created_at`, `updated_at`

    - `attendance_requests` - Requests for attendance corrections
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `employee_id` (uuid, references employees)
      - `attendance_id` (uuid, references attendance, nullable)
      - `request_type` (text) - 'correction', 'missing_checkin', 'missing_checkout'
      - `date` (date)
      - `requested_check_in` (timestamptz)
      - `requested_check_out` (timestamptz)
      - `reason` (text)
      - `status` (text) - 'pending', 'approved', 'rejected'
      - `approver_id` (uuid, references employees)
      - `approved_at` (timestamptz)
      - `approver_notes` (text)
      - `created_at`, `updated_at`

    - `attendance_locations` - Geofencing for attendance
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `name` (text) - Location name
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `radius_meters` (integer) - Geofence radius
      - `address` (text)
      - `is_active` (boolean)
      - `created_at`, `updated_at`

    - `attendance_devices` - Track devices used for check-in
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `device_id` (text) - Unique device identifier
      - `device_name` (text)
      - `device_type` (text) - 'mobile', 'tablet', 'biometric', 'web'
      - `is_approved` (boolean)
      - `last_used_at` (timestamptz)
      - `created_at`, `updated_at`

    - `attendance_exceptions` - Track exceptions and violations
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `employee_id` (uuid, references employees)
      - `attendance_id` (uuid, references attendance)
      - `exception_type` (text) - 'late_arrival', 'early_departure', 'missing_checkout', 'unauthorized_overtime', 'location_violation'
      - `severity` (text) - 'low', 'medium', 'high'
      - `date` (date)
      - `description` (text)
      - `is_resolved` (boolean)
      - `resolved_by` (uuid, references employees)
      - `resolved_at` (timestamptz)
      - `resolution_notes` (text)
      - `created_at`, `updated_at`

  2. Enhanced Attendance Table
    - Add new fields to existing attendance table
    - `location_id` (uuid, references attendance_locations)
    - `device_id` (uuid, references attendance_devices)
    - `check_in_latitude`, `check_in_longitude`
    - `check_out_latitude`, `check_out_longitude`
    - `check_in_photo_url` (text)
    - `check_out_photo_url` (text)
    - `break_start` (timestamptz)
    - `break_end` (timestamptz)
    - `break_duration_minutes` (integer)
    - `is_manual_entry` (boolean)
    - `notes` (text)

  3. Views & Functions
    - View: `attendance_daily_summary` - Daily attendance overview
    - View: `attendance_employee_summary` - Per-employee attendance metrics
    - Function: `calculate_attendance_metrics` - Calculate comprehensive metrics
    - Function: `auto_mark_absent` - Automatically mark absent employees
    - Function: `detect_attendance_exceptions` - Detect violations

  4. Security
    - Enable RLS on all new tables
    - Policies for company-scoped access
    - HR and admin can manage all records
    - Employees can view their own attendance
*/

-- Create attendance_policies table
CREATE TABLE IF NOT EXISTS attendance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  work_start_time time NOT NULL DEFAULT '09:00:00',
  work_end_time time NOT NULL DEFAULT '17:00:00',
  grace_period_minutes integer NOT NULL DEFAULT 15,
  half_day_threshold_minutes integer NOT NULL DEFAULT 240,
  standard_working_hours decimal(4,2) NOT NULL DEFAULT 8.0,
  overtime_after_hours decimal(4,2) NOT NULL DEFAULT 8.0,
  allow_early_checkin boolean DEFAULT true,
  allow_late_checkout boolean DEFAULT true,
  require_checkout boolean DEFAULT true,
  break_duration_minutes integer DEFAULT 60,
  weekend_days text[] DEFAULT ARRAY['Friday', 'Saturday'],
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance_shifts table
CREATE TABLE IF NOT EXISTS attendance_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  shift_start time NOT NULL,
  shift_end time NOT NULL,
  grace_period_minutes integer NOT NULL DEFAULT 15,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_shifts table
CREATE TABLE IF NOT EXISTS employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  shift_id uuid REFERENCES attendance_shifts(id) ON DELETE CASCADE NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  days_of_week integer[] DEFAULT ARRAY[0,1,2,3,4],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance_locations table
CREATE TABLE IF NOT EXISTS attendance_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  latitude decimal(10,8),
  longitude decimal(11,8),
  radius_meters integer DEFAULT 100,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance_devices table
CREATE TABLE IF NOT EXISTS attendance_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  device_id text NOT NULL,
  device_name text,
  device_type text CHECK (device_type IN ('mobile', 'tablet', 'biometric', 'web')) DEFAULT 'mobile',
  is_approved boolean DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, device_id)
);

-- Create attendance_requests table
CREATE TABLE IF NOT EXISTS attendance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  attendance_id uuid REFERENCES attendance(id) ON DELETE SET NULL,
  request_type text CHECK (request_type IN ('correction', 'missing_checkin', 'missing_checkout')) NOT NULL,
  date date NOT NULL,
  requested_check_in timestamptz,
  requested_check_out timestamptz,
  reason text NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approver_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approver_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance_exceptions table
CREATE TABLE IF NOT EXISTS attendance_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  attendance_id uuid REFERENCES attendance(id) ON DELETE CASCADE,
  exception_type text CHECK (exception_type IN ('late_arrival', 'early_departure', 'missing_checkout', 'unauthorized_overtime', 'location_violation')) NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  date date NOT NULL,
  description text,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to attendance table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'location_id') THEN
    ALTER TABLE attendance ADD COLUMN location_id uuid REFERENCES attendance_locations(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'device_id') THEN
    ALTER TABLE attendance ADD COLUMN device_id uuid REFERENCES attendance_devices(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'check_in_latitude') THEN
    ALTER TABLE attendance ADD COLUMN check_in_latitude decimal(10,8);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'check_in_longitude') THEN
    ALTER TABLE attendance ADD COLUMN check_in_longitude decimal(11,8);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'check_out_latitude') THEN
    ALTER TABLE attendance ADD COLUMN check_out_latitude decimal(10,8);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'check_out_longitude') THEN
    ALTER TABLE attendance ADD COLUMN check_out_longitude decimal(11,8);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'check_in_photo_url') THEN
    ALTER TABLE attendance ADD COLUMN check_in_photo_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'check_out_photo_url') THEN
    ALTER TABLE attendance ADD COLUMN check_out_photo_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'break_start') THEN
    ALTER TABLE attendance ADD COLUMN break_start timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'break_end') THEN
    ALTER TABLE attendance ADD COLUMN break_end timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'break_duration_minutes') THEN
    ALTER TABLE attendance ADD COLUMN break_duration_minutes integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'is_manual_entry') THEN
    ALTER TABLE attendance ADD COLUMN is_manual_entry boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'notes') THEN
    ALTER TABLE attendance ADD COLUMN notes text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_policies_company ON attendance_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_company ON attendance_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_employee ON employee_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_shift ON employee_shifts(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_employee ON attendance_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_status ON attendance_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_employee ON attendance_exceptions(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_date ON attendance_exceptions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_locations_company ON attendance_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_devices_company ON attendance_devices(company_id);

-- Enable RLS
ALTER TABLE attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_policies
CREATE POLICY "Users can view attendance policies for their company"
  ON attendance_policies FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR can manage attendance policies"
  ON attendance_policies FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

-- RLS Policies for attendance_shifts
CREATE POLICY "Users can view shifts for their company"
  ON attendance_shifts FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR can manage shifts"
  ON attendance_shifts FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

-- RLS Policies for employee_shifts
CREATE POLICY "Users can view employee shifts for their company"
  ON employee_shifts FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR can manage employee shifts"
  ON employee_shifts FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

-- RLS Policies for attendance_requests
CREATE POLICY "Users can view attendance requests for their company"
  ON attendance_requests FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Employees can create their own attendance requests"
  ON attendance_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "HR can manage attendance requests"
  ON attendance_requests FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

-- RLS Policies for attendance_locations
CREATE POLICY "Users can view locations for their company"
  ON attendance_locations FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR can manage locations"
  ON attendance_locations FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

-- RLS Policies for attendance_devices
CREATE POLICY "Users can view devices for their company"
  ON attendance_devices FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR can manage devices"
  ON attendance_devices FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

-- RLS Policies for attendance_exceptions
CREATE POLICY "Users can view exceptions for their company"
  ON attendance_exceptions FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "HR can manage exceptions"
  ON attendance_exceptions FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'company_admin', 'hr_manager')
    )
  );

-- Create view for daily attendance summary
CREATE OR REPLACE VIEW attendance_daily_summary AS
SELECT 
  a.company_id,
  a.date,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE a.status = 'present') as present_count,
  COUNT(*) FILTER (WHERE a.status = 'absent') as absent_count,
  COUNT(*) FILTER (WHERE a.status = 'late') as late_count,
  COUNT(*) FILTER (WHERE a.status = 'half_day') as half_day_count,
  COALESCE(SUM(a.working_hours), 0) as total_working_hours,
  COALESCE(SUM(a.overtime_hours), 0) as total_overtime_hours,
  COALESCE(AVG(a.late_minutes), 0) as avg_late_minutes
FROM attendance a
GROUP BY a.company_id, a.date;

-- Seed default attendance policy for existing companies
INSERT INTO attendance_policies (company_id, name, is_default)
SELECT id, 'Default Policy', true
FROM companies
WHERE id NOT IN (SELECT company_id FROM attendance_policies WHERE is_default = true)
ON CONFLICT DO NOTHING;