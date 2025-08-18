-- migrate:up

-- Initial schema migration for QuantaPilot
-- This migration sets up the basic application structure

-- Create application tables in app schema
CREATE TABLE IF NOT EXISTS app.projects (
    project_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    description text,
    status varchar(50) DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.milestones (
    milestone_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES app.projects (project_id) ON DELETE CASCADE,
    title varchar(255) NOT NULL,
    description text,
    status varchar(50) DEFAULT 'pending',
    due_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create audit table for tracking changes
CREATE TABLE IF NOT EXISTS audit.changes (
    change_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name varchar(100) NOT NULL,
    record_id uuid NOT NULL,
    operation varchar(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_data jsonb,
    new_data jsonb,
    changed_by varchar(100),
    changed_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON app.projects (status);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON app.milestones (project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON app.milestones (status);
CREATE INDEX IF NOT EXISTS idx_audit_changes_table_record ON audit.changes (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_changes_timestamp ON audit.changes (changed_at);

-- migrate:down
DROP INDEX IF EXISTS idx_audit_changes_timestamp;
DROP INDEX IF EXISTS idx_audit_changes_table_record;
DROP TABLE IF EXISTS audit.changes;
DROP TABLE IF EXISTS app.milestones;
DROP TABLE IF EXISTS app.projects;
