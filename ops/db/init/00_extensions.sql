-- Install required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_cron requires shared_preload_libraries; in dev we can disable jobs if not available
DO $$ BEGIN
  PERFORM 1 FROM pg_available_extensions WHERE name='pg_cron';
  IF FOUND THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
END $$;
