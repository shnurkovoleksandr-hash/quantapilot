-- Create base schemas for application organization
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS pii;
CREATE SCHEMA IF NOT EXISTS audit;

-- Create service role for Row Level Security (RLS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'svc_quanta') THEN
    CREATE ROLE svc_quanta LOGIN PASSWORD 'devonly';
  END IF;
END $$;
