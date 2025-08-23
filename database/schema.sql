-- ==============================================
-- QuantaPilot Database Schema
-- ==============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- Core Tables
-- ==============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    technology_stack JSONB,
    architecture_design JSONB,
    requirements JSONB,
    milestones JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    github_repo_url VARCHAR(500),
    github_repo_id VARCHAR(100),
    telegram_chat_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    CONSTRAINT projects_status_check CHECK (status IN ('pending', 'analyzing', 'designing', 'developing', 'testing', 'completed', 'failed', 'paused'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    telegram_id VARCHAR(100),
    github_username VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}',
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'developer', 'qa'))
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    n8n_workflow_id VARCHAR(100),
    input_data JSONB,
    output_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT workflows_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

-- ==============================================
-- AI Integration Tables
-- ==============================================

-- AI Sessions table
CREATE TABLE IF NOT EXISTS ai_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    session_data JSONB,
    token_usage INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10,4) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    CONSTRAINT ai_sessions_role_check CHECK (role IN ('architect', 'developer', 'qa')),
    CONSTRAINT ai_sessions_status_check CHECK (status IN ('active', 'completed', 'failed', 'cancelled'))
);

-- AI Prompts table
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL,
    prompt_type VARCHAR(100) NOT NULL,
    prompt_template TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    CONSTRAINT ai_prompts_role_check CHECK (role IN ('architect', 'developer', 'qa'))
);

-- ==============================================
-- Human-in-the-Loop Tables
-- ==============================================

-- HITL Decisions table
CREATE TABLE IF NOT EXISTS hitl_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    decision_type VARCHAR(100) NOT NULL,
    decision_point VARCHAR(255) NOT NULL,
    context_data JSONB,
    options JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    decision_data JSONB,
    timeout_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT hitl_decisions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'timeout', 'cancelled'))
);

-- ==============================================
-- Integration Tables
-- ==============================================

-- GitHub Integration table
CREATE TABLE IF NOT EXISTS github_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repo_name VARCHAR(255) NOT NULL,
    repo_url VARCHAR(500) NOT NULL,
    repo_id VARCHAR(100),
    access_token_hash VARCHAR(255),
    webhook_secret_hash VARCHAR(255),
    webhook_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Telegram Integration table
CREATE TABLE IF NOT EXISTS telegram_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chat_id VARCHAR(100) NOT NULL,
    bot_token_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Monitoring and Logging Tables
-- ==============================================

-- System Logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    correlation_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT system_logs_level_check CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal'))
);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- Indexes for Performance
-- ==============================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_github_repo_id ON projects(github_repo_id);

-- Workflows indexes
CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(type);
CREATE INDEX IF NOT EXISTS idx_workflows_n8n_workflow_id ON workflows(n8n_workflow_id);

-- AI Sessions indexes
CREATE INDEX IF NOT EXISTS idx_ai_sessions_project_id ON ai_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_role ON ai_sessions(role);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_status ON ai_sessions(status);

-- HITL Decisions indexes
CREATE INDEX IF NOT EXISTS idx_hitl_decisions_project_id ON hitl_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_hitl_decisions_status ON hitl_decisions(status);
CREATE INDEX IF NOT EXISTS idx_hitl_decisions_requested_by ON hitl_decisions(requested_by);
CREATE INDEX IF NOT EXISTS idx_hitl_decisions_timeout_at ON hitl_decisions(timeout_at);

-- System Logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_project_id ON system_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_correlation_id ON system_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- Performance Metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_project_id ON performance_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);

-- ==============================================
-- Triggers for Updated At
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON ai_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hitl_decisions_updated_at BEFORE UPDATE ON hitl_decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_github_integrations_updated_at BEFORE UPDATE ON github_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_telegram_integrations_updated_at BEFORE UPDATE ON telegram_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- Initial Data
-- ==============================================

-- Insert default AI prompts
INSERT INTO ai_prompts (role, prompt_type, prompt_template, variables) VALUES
('architect', 'project_analysis', 'Analyze the following project requirements and create a comprehensive architecture design: {{requirements}}', '{"requirements": "string"}'),
('architect', 'tech_stack_selection', 'Based on the project requirements, recommend the optimal technology stack: {{requirements}}', '{"requirements": "string"}'),
('developer', 'code_generation', 'Generate production-ready code for the following feature: {{feature_description}}', '{"feature_description": "string"}'),
('developer', 'code_review', 'Review the following code for quality, security, and best practices: {{code}}', '{"code": "string"}'),
('qa', 'test_plan', 'Create a comprehensive test plan for the following feature: {{feature_description}}', '{"feature_description": "string"}'),
('qa', 'bug_report', 'Analyze the following issue and create a detailed bug report: {{issue_description}}', '{"issue_description": "string"}')
ON CONFLICT DO NOTHING;

-- Insert default admin user
INSERT INTO users (email, name, role) VALUES
('admin@quantapilot.com', 'System Administrator', 'admin')
ON CONFLICT (email) DO NOTHING;
