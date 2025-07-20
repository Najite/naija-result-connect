/*
  # Create SMS Records Table

  1. New Tables
    - `sms_records`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to students)
      - `phone_number` (text)
      - `message` (text)
      - `status` (text) - pending, sent, failed, retry
      - `attempts` (integer)
      - `last_attempt` (timestamptz)
      - `error_message` (text, nullable)
      - `sid` (text, nullable) - SMS provider ID
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sms_records` table
    - Add policy for admin access

  3. Functions
    - Add function to increment attempts counter
*/

-- Create SMS records table
CREATE TABLE IF NOT EXISTS sms_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retry')),
  attempts integer NOT NULL DEFAULT 1,
  last_attempt timestamptz DEFAULT now(),
  error_message text,
  sid text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sms_records_student_id ON sms_records(student_id);
CREATE INDEX IF NOT EXISTS idx_sms_records_status ON sms_records(status);
CREATE INDEX IF NOT EXISTS idx_sms_records_created_at ON sms_records(created_at);

-- Enable RLS
ALTER TABLE sms_records ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin full access to sms_records"
  ON sms_records
  FOR ALL
  TO authenticated
  USING (true);

-- Create function to increment attempts
CREATE OR REPLACE FUNCTION increment_attempts(record_id uuid)
RETURNS integer AS $$
DECLARE
  current_attempts integer;
BEGIN
  SELECT attempts INTO current_attempts
  FROM sms_records
  WHERE id = record_id;
  
  UPDATE sms_records
  SET attempts = attempts + 1
  WHERE id = record_id;
  
  RETURN current_attempts + 1;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_records_updated_at
  BEFORE UPDATE ON sms_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();