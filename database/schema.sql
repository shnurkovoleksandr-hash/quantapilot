-- ==============================================
-- QuantaPilot™ Database Schema
-- ==============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- Core Tables
-- ==============================================

-- Projects table - stores information about projects being created
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_repo_url VARCHAR(500) NOT NULL UNIQUE,
    github_repo_name VARCHAR(255) NOT NULL,
    github_owner VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_stage VARCHAR(100),
    total_stages INTEGER DEFAULT 0,
    completed_stages INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    config JSONB,
    metadata JSONB
);

-- Project stages table - tracks individual development stages
CREATE TABLE project_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    ai_role VARCHAR(50) NOT NULL, -- 'pr_architect', 'senior_developer', 'qa_engineer'
    prompt_used TEXT,
    response_received TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- AI interactions table - logs all AI interactions
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES project_stages(id) ON DELETE CASCADE,
    ai_role VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'prompt', 'response', 'error'
    prompt_sent TEXT,
    response_received TEXT,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    duration_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Human-in-the-loop decisions table
CREATE TABLE hitl_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES project_stages(id) ON DELETE CASCADE,
    decision_type VARCHAR(50) NOT NULL, -- 'stage_approval', 'error_resolution', 'info_request'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    telegram_message_id VARCHAR(100),
    telegram_chat_id VARCHAR(100),
    requested_by VARCHAR(100), -- AI role that requested decision
    decided_by VARCHAR(100), -- Human who made decision
    decision_at TIMESTAMP WITH TIME ZONE,
    decision_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- ==============================================
-- Configuration Tables
-- ==============================================

-- AI prompts table - stores prompt templates
CREATE TABLE ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_name VARCHAR(255) NOT NULL UNIQUE,
    ai_role VARCHAR(50) NOT NULL,
    prompt_template TEXT NOT NULL,
    variables JSONB, -- Template variables
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    metadata JSONB
);

-- Workflow configurations table
CREATE TABLE workflow_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_name VARCHAR(255) NOT NULL UNIQUE,
    workflow_type VARCHAR(100) NOT NULL, -- 'project_creation', 'error_handling', 'hitl'
    n8n_workflow_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- ==============================================
-- Monitoring & Logging Tables
-- ==============================================

-- System logs table
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warn', 'error'
    component VARCHAR(100) NOT NULL, -- 'n8n', 'cursor', 'api', 'database'
    message TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES project_stages(id) ON DELETE SET NULL,
    correlation_id VARCHAR(100),
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Performance metrics table
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20), -- 'ms', 'count', 'percentage', 'bytes'
    component VARCHAR(100) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES project_stages(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- ==============================================
-- Integration Tables
-- ==============================================

-- GitHub integration table
CREATE TABLE github_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    github_repo_id VARCHAR(100) NOT NULL,
    github_webhook_id VARCHAR(100),
    access_token_hash VARCHAR(255), -- Hashed token for security
    permissions JSONB,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Telegram integration table
CREATE TABLE telegram_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_token_hash VARCHAR(255) NOT NULL, -- Hashed token
    chat_id VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    notification_types JSONB, -- Types of notifications to send
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- ==============================================
-- Indexes for Performance
-- ==============================================

-- Projects indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_github_repo_url ON projects(github_repo_url);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Project stages indexes
CREATE INDEX idx_project_stages_project_id ON project_stages(project_id);
CREATE INDEX idx_project_stages_status ON project_stages(status);
CREATE INDEX idx_project_stages_ai_role ON project_stages(ai_role);

-- AI interactions indexes
CREATE INDEX idx_ai_interactions_project_id ON ai_interactions(project_id);
CREATE INDEX idx_ai_interactions_stage_id ON ai_interactions(stage_id);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at);
CREATE INDEX idx_ai_interactions_ai_role ON ai_interactions(ai_role);

-- HITL decisions indexes
CREATE INDEX idx_hitl_decisions_project_id ON hitl_decisions(project_id);
CREATE INDEX idx_hitl_decisions_status ON hitl_decisions(status);
CREATE INDEX idx_hitl_decisions_created_at ON hitl_decisions(created_at);

-- System logs indexes
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_component ON system_logs(component);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_correlation_id ON system_logs(correlation_id);

-- Performance metrics indexes
CREATE INDEX idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX idx_performance_metrics_component ON performance_metrics(component);
CREATE INDEX idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);

-- ==============================================
-- Triggers for Updated At
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_stages_updated_at BEFORE UPDATE ON project_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_configs_updated_at BEFORE UPDATE ON workflow_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_github_integrations_updated_at BEFORE UPDATE ON github_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_telegram_integrations_updated_at BEFORE UPDATE ON telegram_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- Initial Data
-- ==============================================

-- Insert default AI prompts
INSERT INTO ai_prompts (prompt_name, ai_role, prompt_template, variables, version, created_by) VALUES
(
    'project_analysis',
    'pr_architect',
    'You are a PR/Architect with 20 years of experience. Analyze the project requirements from the README.md and create a comprehensive project plan. Include: 1) Technical stack recommendations 2) Architecture design 3) Development stages breakdown 4) Timeline estimation 5) Risk assessment. Project: {{PROJECT_NAME}} Description: {{PROJECT_DESCRIPTION}}',
    '{"PROJECT_NAME": "string", "PROJECT_DESCRIPTION": "string"}',
    '1.0.0',
    'system'
),
(
    'code_implementation',
    'senior_developer',
    'You are a Senior Developer. Implement the following feature based on the project plan: {{FEATURE_DESCRIPTION}}. Follow the project''s technical stack: {{TECH_STACK}}. Ensure code quality, proper error handling, and comprehensive documentation.',
    '{"FEATURE_DESCRIPTION": "string", "TECH_STACK": "string"}',
    '1.0.0',
    'system'
),
(
    'quality_assurance',
    'qa_engineer',
    'You are a QA Engineer. Test the following component: {{COMPONENT_NAME}}. Create comprehensive test cases including unit tests, integration tests, and end-to-end tests. Report any bugs found with detailed reproduction steps.',
    '{"COMPONENT_NAME": "string"}',
    '1.0.0',
    'system'
);

-- Insert default workflow configurations
INSERT INTO workflow_configs (workflow_name, workflow_type, config) VALUES
(
    'project_creation',
    'project_creation',
    '{
        "stages": [
            {"name": "project_analysis", "ai_role": "pr_architect", "order": 1},
            {"name": "architecture_design", "ai_role": "pr_architect", "order": 2},
            {"name": "code_implementation", "ai_role": "senior_developer", "order": 3},
            {"name": "testing", "ai_role": "qa_engineer", "order": 4},
            {"name": "documentation", "ai_role": "pr_architect", "order": 5}
        ],
        "hitl_points": [2, 4],
        "max_retries": 3,
        "timeout_minutes": 30
    }'
),
(
    'error_handling',
    'error_handling',
    '{
        "retry_strategy": "exponential_backoff",
        "max_retries": 3,
        "escalation_threshold": 2,
        "notification_channels": ["telegram", "email"]
    }'
);

-- ==============================================
-- Views for Common Queries
-- ==============================================

-- Project progress view
CREATE VIEW project_progress AS
SELECT 
    p.id,
    p.github_repo_name,
    p.project_name,
    p.status,
    p.current_stage,
    p.total_stages,
    p.completed_stages,
    CASE 
        WHEN p.total_stages > 0 THEN 
            ROUND((p.completed_stages::DECIMAL / p.total_stages) * 100, 2)
        ELSE 0 
    END as progress_percentage,
    p.created_at,
    p.started_at,
    p.completed_at,
    CASE 
        WHEN p.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (p.completed_at - p.started_at)) / 3600
        ELSE NULL 
    END as total_hours
FROM projects p;

-- AI usage statistics view
CREATE VIEW ai_usage_stats AS
SELECT 
    ai_role,
    COUNT(*) as total_interactions,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_interactions,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_interactions,
    SUM(tokens_used) as total_tokens,
    SUM(cost_usd) as total_cost,
    AVG(duration_ms) as avg_duration_ms,
    DATE_TRUNC('day', created_at) as date
FROM ai_interactions
GROUP BY ai_role, DATE_TRUNC('day', created_at)
ORDER BY date DESC, ai_role;

-- ==============================================
-- Comments
-- ==============================================

COMMENT ON TABLE projects IS 'Stores information about projects being created by QuantaPilot™';
COMMENT ON TABLE project_stages IS 'Tracks individual development stages for each project';
COMMENT ON TABLE ai_interactions IS 'Logs all AI interactions for monitoring and cost tracking';
COMMENT ON TABLE hitl_decisions IS 'Stores human-in-the-loop decisions and approvals';
COMMENT ON TABLE ai_prompts IS 'Stores AI prompt templates for different roles and scenarios';
COMMENT ON TABLE workflow_configs IS 'Stores n8n workflow configurations';
COMMENT ON TABLE system_logs IS 'Centralized logging for system monitoring and debugging';
COMMENT ON TABLE performance_metrics IS 'Stores performance metrics for monitoring and optimization';
COMMENT ON TABLE github_integrations IS 'Stores GitHub integration settings for each project';
COMMENT ON TABLE telegram_integrations IS 'Stores Telegram bot configuration for notifications';
