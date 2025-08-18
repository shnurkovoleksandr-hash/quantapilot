-- QuantaPilot Audit Schema
-- Version: 0.1.0
-- Updated: 2025-08-18

-- Audit events table
CREATE TABLE audit_events (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    action VARCHAR(50),
    details JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit event types lookup
CREATE TABLE audit_event_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'info',
    retention_days INTEGER DEFAULT 90,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default event types
INSERT INTO audit_event_types (name, category, description, severity, retention_days) VALUES
-- Authentication events
('user.login', 'authentication', 'User login attempt', 'info', 90),
('user.logout', 'authentication', 'User logout', 'info', 90),
('user.login.failed', 'authentication', 'Failed login attempt', 'warning', 365),
('user.password.change', 'authentication', 'Password change', 'info', 365),
('user.account.lock', 'authentication', 'Account locked', 'warning', 365),

-- Authorization events
('user.role.assign', 'authorization', 'Role assigned to user', 'info', 365),
('user.role.remove', 'authorization', 'Role removed from user', 'info', 365),
('permission.grant', 'authorization', 'Permission granted', 'info', 365),
('permission.revoke', 'authorization', 'Permission revoked', 'info', 365),

-- Data events
('data.create', 'data', 'Data created', 'info', 90),
('data.update', 'data', 'Data updated', 'info', 90),
('data.delete', 'data', 'Data deleted', 'warning', 365),
('data.export', 'data', 'Data exported', 'info', 365),
('pii.access', 'data', 'PII data accessed', 'warning', 2555), -- 7 years

-- System events
('config.change', 'system', 'Configuration changed', 'warning', 365),
('system.deploy', 'system', 'System deployment', 'info', 90),
('system.error', 'system', 'System error', 'error', 90),
('infrastructure.change', 'system', 'Infrastructure change', 'warning', 365);

-- Audit trails for specific resources
CREATE TABLE audit_trails (
    id BIGSERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    event_id BIGINT REFERENCES audit_events(id),
    previous_state JSONB,
    current_state JSONB,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit queries for compliance
CREATE TABLE audit_queries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    query_text TEXT NOT NULL,
    parameters JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common audit queries
INSERT INTO audit_queries (name, description, query_text) VALUES
('failed_logins', 'Failed login attempts in last 24 hours', 
 'SELECT user_id, ip_address, timestamp FROM audit_events 
  WHERE event_type = ''user.login.failed'' 
  AND timestamp > NOW() - INTERVAL ''24 hours'''),

('pii_access', 'PII access in last 30 days',
 'SELECT user_id, resource_id, timestamp FROM audit_events 
  WHERE event_type = ''pii.access'' 
  AND timestamp > NOW() - INTERVAL ''30 days'''),

('config_changes', 'Configuration changes in last 7 days',
 'SELECT user_id, resource_id, details, timestamp FROM audit_events 
  WHERE event_type = ''config.change'' 
  AND timestamp > NOW() - INTERVAL ''7 days'''),

('user_privilege_changes', 'User privilege changes in last 30 days',
 'SELECT user_id, action, timestamp FROM audit_events 
  WHERE event_type IN (''user.role.assign'', ''user.role.remove'', ''permission.grant'', ''permission.revoke'')
  AND timestamp > NOW() - INTERVAL ''30 days''');

-- Create indexes for performance
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_session_id ON audit_events(session_id);
CREATE INDEX idx_audit_events_ip_address ON audit_events(ip_address);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_events_success ON audit_events(success);

CREATE INDEX idx_audit_trails_resource ON audit_trails(resource_type, resource_id);
CREATE INDEX idx_audit_trails_timestamp ON audit_trails(created_at);

-- Partitioning for large audit tables (optional)
-- CREATE TABLE audit_events_2025_08 PARTITION OF audit_events
-- FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- Functions for audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
    p_event_type VARCHAR(100),
    p_user_id INTEGER DEFAULT NULL,
    p_session_id VARCHAR(100) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id VARCHAR(100) DEFAULT NULL,
    p_action VARCHAR(50) DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_event_id BIGINT;
BEGIN
    INSERT INTO audit_events (
        event_type, user_id, session_id, ip_address, user_agent,
        success, resource_type, resource_id, action, details, metadata
    ) VALUES (
        p_event_type, p_user_id, p_session_id, p_ip_address, p_user_agent,
        p_success, p_resource_type, p_resource_id, p_action, p_details, p_metadata
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for automatic audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_trails (resource_type, resource_id, event_id, current_state)
        VALUES (TG_TABLE_NAME, NEW.id, log_audit_event(
            'data.create',
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.session_id', true),
            current_setting('app.ip_address', true)::INET,
            current_setting('app.user_agent', true),
            TRUE,
            TG_TABLE_NAME,
            NEW.id::VARCHAR,
            'create',
            to_jsonb(NEW)
        ), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_trails (resource_type, resource_id, event_id, previous_state, current_state, changes)
        VALUES (TG_TABLE_NAME, NEW.id, log_audit_event(
            'data.update',
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.session_id', true),
            current_setting('app.ip_address', true)::INET,
            current_setting('app.user_agent', true),
            TRUE,
            TG_TABLE_NAME,
            NEW.id::VARCHAR,
            'update',
            to_jsonb(NEW)
        ), to_jsonb(OLD), to_jsonb(NEW), to_jsonb(NEW - OLD));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_trails (resource_type, resource_id, event_id, previous_state)
        VALUES (TG_TABLE_NAME, OLD.id, log_audit_event(
            'data.delete',
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.session_id', true),
            current_setting('app.ip_address', true)::INET,
            current_setting('app.user_agent', true),
            TRUE,
            TG_TABLE_NAME,
            OLD.id::VARCHAR,
            'delete',
            to_jsonb(OLD)
        ), to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
