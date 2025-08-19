-- Seed data for QuantaPilot application
-- Demonstrates Row Level Security (RLS) and PII handling

-- Example user table with PII
CREATE TABLE IF NOT EXISTS pii."user" (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    telegram_id VARCHAR(100),
    github_username VARCHAR(100),
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on PII tables
ALTER TABLE pii."user" ENABLE ROW LEVEL SECURITY;

-- Enforce RLS by default for all pii schema tables
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='pii' LOOP
    EXECUTE format('ALTER TABLE pii.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Block all by default, allow only svc role
CREATE POLICY pii_deny_all ON pii."user" FOR SELECT USING (false);
CREATE POLICY pii_service_only ON pii."user" FOR SELECT USING (current_user = 'svc_quanta');

-- Create redacted view for safe data access
CREATE OR REPLACE VIEW pii.user_redacted AS
SELECT 
    user_id,
    regexp_replace(email, '(^.).+(@.+$)', '\1***\2') AS email,
    left(telegram_id, 3) || '***' AS telegram_id,
    github_username, 
    display_name, 
    created_at
FROM pii."user";

-- Insert example seed data
INSERT INTO pii."user" (email, telegram_id, github_username, display_name) VALUES
    ('alice@example.com', '123456789', 'alice-dev', 'Alice Developer'),
    ('bob@example.com', '987654321', 'bob-ops', 'Bob Operations'),
    ('charlie@example.com', '555666777', 'charlie-qa', 'Charlie QA')
ON CONFLICT (email) DO NOTHING;
