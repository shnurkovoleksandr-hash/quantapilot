-- QuantaPilot RBAC (Role-Based Access Control) Schema
-- Version: 0.1.0
-- Updated: 2025-08-18

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER, -- user_id
    PRIMARY KEY (role_id, permission_id)
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Role mapping
CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER, -- user_id
    PRIMARY KEY (user_id, role_id)
);

-- Default roles
INSERT INTO roles (name, description) VALUES
('admin', 'Full system administrator with all permissions'),
('operator', 'System operator with operational permissions'),
('reviewer', 'Code reviewer with read and approve permissions'),
('developer', 'Developer with read and write permissions'),
('viewer', 'Read-only access to system resources');

-- Default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
-- Repository permissions
('repo:read', 'repository', 'read', 'Read repository content'),
('repo:write', 'repository', 'write', 'Write to repository'),
('repo:delete', 'repository', 'delete', 'Delete repository'),
('repo:admin', 'repository', 'admin', 'Administer repository'),

-- Pipeline permissions
('pipeline:read', 'pipeline', 'read', 'Read pipeline status'),
('pipeline:execute', 'pipeline', 'execute', 'Execute pipelines'),
('pipeline:modify', 'pipeline', 'modify', 'Modify pipeline configuration'),
('pipeline:delete', 'pipeline', 'delete', 'Delete pipelines'),

-- User management permissions
('user:read', 'user', 'read', 'Read user information'),
('user:create', 'user', 'create', 'Create new users'),
('user:modify', 'user', 'modify', 'Modify user information'),
('user:delete', 'user', 'delete', 'Delete users'),

-- System permissions
('system:read', 'system', 'read', 'Read system information'),
('system:modify', 'system', 'modify', 'Modify system configuration'),
('system:admin', 'system', 'admin', 'Administer system');

-- Assign permissions to roles
-- Admin role gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

-- Operator role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'operator' AND p.name IN (
    'repo:read', 'pipeline:read', 'pipeline:execute', 'pipeline:modify',
    'user:read', 'system:read'
);

-- Reviewer role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'reviewer' AND p.name IN (
    'repo:read', 'pipeline:read', 'pipeline:execute'
);

-- Developer role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'developer' AND p.name IN (
    'repo:read', 'repo:write', 'pipeline:read', 'pipeline:execute'
);

-- Viewer role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'viewer' AND p.name IN (
    'repo:read', 'pipeline:read', 'system:read'
);

-- Create indexes for performance
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
