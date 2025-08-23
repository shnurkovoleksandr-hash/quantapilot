# API Documentation

## Overview

QuantaPilot™ provides comprehensive APIs for external integration, webhook processing, and system
management. This document covers all external interfaces including REST APIs, webhooks, and
integration endpoints.

## API Authentication

### API Key Authentication

All API endpoints require authentication via API keys.

```http
Authorization: Bearer <api_key>
```

### API Key Management

```http
POST /api/v1/auth/keys
GET /api/v1/auth/keys
DELETE /api/v1/auth/keys/{keyId}
```

## Core APIs

### Project Management API

#### Create Project

```http
POST /api/v1/projects
Content-Type: application/json

{
  "repository_url": "https://github.com/user/repo",
  "configuration": {
    "tech_stack": ["Node.js", "React", "PostgreSQL"],
    "testing_framework": "Jest",
    "deployment_target": "Docker"
  },
  "budget_limits": {
    "max_tokens": 50000,
    "max_cost_usd": 25.00
  }
}
```

**Response:**

```json
{
  "project_id": "uuid-string",
  "status": "initializing",
  "created_at": "2024-01-20T10:00:00Z",
  "estimated_completion": "2024-01-20T14:00:00Z",
  "estimated_cost": 15.5
}
```

#### Get Project Status

```http
GET /api/v1/projects/{projectId}
```

**Response:**

```json
{
  "project_id": "uuid-string",
  "status": "in_progress",
  "current_stage": "implementation",
  "progress": {
    "completed_stages": ["planning", "architecture"],
    "current_stage": "implementation",
    "remaining_stages": ["testing", "deployment", "review"]
  },
  "resource_usage": {
    "tokens_used": 15000,
    "cost_usd": 7.5,
    "time_elapsed": "02:30:00"
  },
  "artifacts": {
    "repository_url": "https://github.com/user/repo",
    "documentation_url": "https://github.com/user/repo/blob/main/docs/",
    "demo_url": null
  }
}
```

#### List Projects

```http
GET /api/v1/projects?status=active&limit=20&offset=0
```

**Response:**

```json
{
  "projects": [
    {
      "project_id": "uuid-string",
      "repository_url": "https://github.com/user/repo",
      "status": "completed",
      "created_at": "2024-01-20T10:00:00Z",
      "completed_at": "2024-01-20T15:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### Update Project

```http
PATCH /api/v1/projects/{projectId}
Content-Type: application/json

{
  "configuration": {
    "additional_requirements": "Add Redis for caching"
  },
  "budget_limits": {
    "max_tokens": 75000
  }
}
```

#### Delete Project

```http
DELETE /api/v1/projects/{projectId}
```

### Workflow Management API

#### Get Workflow Status

```http
GET /api/v1/projects/{projectId}/workflow
```

**Response:**

```json
{
  "workflow_id": "workflow-uuid",
  "status": "running",
  "current_node": "code_generation",
  "execution_history": [
    {
      "node_name": "project_analysis",
      "status": "completed",
      "started_at": "2024-01-20T10:00:00Z",
      "completed_at": "2024-01-20T10:05:00Z",
      "ai_agent": "pr_architect",
      "tokens_used": 2500
    }
  ],
  "pending_decisions": []
}
```

#### Trigger Workflow Action

```http
POST /api/v1/projects/{projectId}/workflow/actions
Content-Type: application/json

{
  "action": "retry_stage",
  "stage": "code_generation",
  "parameters": {
    "max_retries": 3
  }
}
```

#### Pause/Resume Workflow

```http
POST /api/v1/projects/{projectId}/workflow/pause
POST /api/v1/projects/{projectId}/workflow/resume
```

### Human-in-the-Loop API

#### Get Pending Decisions

```http
GET /api/v1/hitl/decisions?status=pending
```

**Response:**

```json
{
  "decisions": [
    {
      "decision_id": "decision-uuid",
      "project_id": "project-uuid",
      "type": "architecture_approval",
      "context": {
        "proposed_architecture": "Microservices with API Gateway",
        "technology_stack": ["Node.js", "Express", "PostgreSQL", "Redis"],
        "estimated_complexity": "Medium",
        "estimated_timeline": "4 hours"
      },
      "options": ["approve", "reject", "modify"],
      "created_at": "2024-01-20T12:00:00Z",
      "timeout_at": "2024-01-21T12:00:00Z"
    }
  ]
}
```

#### Submit Decision

```http
POST /api/v1/hitl/decisions/{decisionId}
Content-Type: application/json

{
  "decision": "approve",
  "comments": "Approved with suggestion to add monitoring",
  "modifications": {
    "additional_requirements": "Include Prometheus monitoring"
  }
}
```

#### Get Decision History

```http
GET /api/v1/hitl/decisions?project_id={projectId}&status=completed
```

### Metrics and Analytics API

#### Get System Metrics

```http
GET /api/v1/metrics/system
```

**Response:**

```json
{
  "system_health": {
    "status": "healthy",
    "uptime": "7d 12h 30m",
    "active_projects": 15,
    "queue_length": 3
  },
  "resource_usage": {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "disk_usage": 23.1
  },
  "api_metrics": {
    "requests_per_minute": 125,
    "average_response_time": 450,
    "error_rate": 0.8
  }
}
```

#### Get Project Metrics

```http
GET /api/v1/metrics/projects?period=7d
```

**Response:**

```json
{
  "summary": {
    "total_projects": 42,
    "completed_projects": 38,
    "failed_projects": 2,
    "in_progress_projects": 2,
    "success_rate": 90.5
  },
  "performance": {
    "average_completion_time": "3h 45m",
    "average_cost": 12.5,
    "average_tokens_used": 35000
  },
  "quality_metrics": {
    "average_code_quality": 92.3,
    "average_test_coverage": 87.5,
    "security_score": 95.2
  }
}
```

#### Get Cost Analytics

```http
GET /api/v1/metrics/costs?period=30d&group_by=day
```

**Response:**

```json
{
  "cost_breakdown": {
    "ai_tokens": 450.25,
    "infrastructure": 89.5,
    "external_apis": 12.75,
    "total": 552.5
  },
  "daily_costs": [
    {
      "date": "2024-01-20",
      "cost": 18.75,
      "projects": 3,
      "tokens": 45000
    }
  ],
  "projections": {
    "monthly_estimate": 650.0,
    "cost_per_project": 13.12
  }
}
```

## Webhook APIs

### GitHub Integration Webhooks

#### Repository Events

QuantaPilot™ processes the following GitHub webhook events:

```http
POST /webhooks/github
Content-Type: application/json
X-GitHub-Event: push
X-Hub-Signature-256: sha256=...

{
  "repository": {
    "full_name": "user/repo",
    "clone_url": "https://github.com/user/repo.git"
  },
  "commits": [
    {
      "id": "commit-sha",
      "message": "Initial commit with README.md",
      "added": ["README.md"],
      "modified": [],
      "removed": []
    }
  ]
}
```

**Supported Events:**

- `push` - Triggers project initialization if README.md is added
- `issues` - Processes issue creation and updates
- `pull_request` - Handles PR creation and reviews
- `repository` - Responds to repository settings changes

#### Webhook Verification

All GitHub webhooks are verified using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

### External System Webhooks

#### Project Status Updates

External systems can receive real-time project updates:

```http
POST /your-endpoint
Content-Type: application/json
X-QuantaPilot-Signature: sha256=...

{
  "event": "project.status_changed",
  "timestamp": "2024-01-20T15:30:00Z",
  "data": {
    "project_id": "uuid-string",
    "previous_status": "in_progress",
    "current_status": "completed",
    "stage": "deployment",
    "metadata": {
      "completion_time": "3h 45m",
      "total_cost": 15.75,
      "quality_score": 94.5
    }
  }
}
```

#### Decision Required Webhooks

```http
POST /your-endpoint
Content-Type: application/json

{
  "event": "hitl.decision_required",
  "timestamp": "2024-01-20T12:00:00Z",
  "data": {
    "decision_id": "decision-uuid",
    "project_id": "project-uuid",
    "type": "architecture_approval",
    "timeout_at": "2024-01-21T12:00:00Z",
    "decision_url": "https://your-quantapilot.com/decisions/decision-uuid"
  }
}
```

## Integration APIs

### Telegram Bot Integration

#### Bot Commands

The Telegram bot supports the following commands:

```
/start - Initialize bot and link account
/create <repo_url> - Create new project
/status <project_id> - Get project status
/projects - List your projects
/approve <decision_id> - Approve pending decision
/reject <decision_id> - Reject pending decision
/help - Show available commands
```

#### Interactive Callbacks

```javascript
// Callback data format for inline keyboards
{
  "action": "approve_decision",
  "decision_id": "decision-uuid",
  "project_id": "project-uuid"
}
```

### Email Integration

#### Email Templates

QuantaPilot™ sends formatted emails for:

- **Project Started**: Confirmation and tracking information
- **Decision Required**: HITL approval requests with context
- **Project Completed**: Summary and deliverables
- **Error Notifications**: System errors requiring attention

#### Email API

```http
POST /api/v1/notifications/email
Content-Type: application/json

{
  "recipient": "user@example.com",
  "template": "project_completed",
  "data": {
    "project_id": "uuid-string",
    "project_name": "E-commerce Platform",
    "completion_time": "3h 45m",
    "repository_url": "https://github.com/user/repo"
  }
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Project ID is required",
    "details": {
      "field": "project_id",
      "provided": null,
      "expected": "UUID string"
    },
    "correlation_id": "req-uuid-12345"
  }
}
```

### HTTP Status Codes

| Code  | Meaning               | Usage                               |
| ----- | --------------------- | ----------------------------------- |
| `200` | OK                    | Successful request                  |
| `201` | Created               | Resource created successfully       |
| `400` | Bad Request           | Invalid request parameters          |
| `401` | Unauthorized          | Authentication required or failed   |
| `403` | Forbidden             | Insufficient permissions            |
| `404` | Not Found             | Resource not found                  |
| `409` | Conflict              | Resource already exists or conflict |
| `429` | Too Many Requests     | Rate limit exceeded                 |
| `500` | Internal Server Error | Server error                        |
| `503` | Service Unavailable   | Service temporarily unavailable     |

### Rate Limiting

API endpoints are rate limited to prevent abuse:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642680000
```

**Rate Limits:**

- **General API**: 1000 requests per hour per API key
- **Project Creation**: 10 projects per hour per user
- **Webhook Endpoints**: 100 requests per minute per source
- **Metrics API**: 60 requests per minute per API key

## SDK and Libraries

### Node.js SDK

```javascript
const QuantaPilot = require('@quantapilot/sdk');

const client = new QuantaPilot({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-quantapilot.com/api/v1',
});

// Create project
const project = await client.projects.create({
  repository_url: 'https://github.com/user/repo',
  configuration: {
    tech_stack: ['Node.js', 'React'],
  },
});

// Monitor progress
const status = await client.projects.get(project.project_id);
console.log(`Project status: ${status.status}`);
```

### Python SDK

```python
from quantapilot import Client

client = Client(
    api_key='your-api-key',
    base_url='https://your-quantapilot.com/api/v1'
)

# Create project
project = client.projects.create(
    repository_url='https://github.com/user/repo',
    configuration={
        'tech_stack': ['Python', 'FastAPI', 'PostgreSQL']
    }
)

# Monitor progress
status = client.projects.get(project['project_id'])
print(f"Project status: {status['status']}")
```

### REST Client Examples

#### cURL

```bash
# Create project
curl -X POST https://your-quantapilot.com/api/v1/projects \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_url": "https://github.com/user/repo",
    "configuration": {
      "tech_stack": ["Node.js", "React"]
    }
  }'

# Get project status
curl -X GET https://your-quantapilot.com/api/v1/projects/project-uuid \
  -H "Authorization: Bearer your-api-key"
```

#### PowerShell

```powershell
# Create project
$headers = @{
    "Authorization" = "Bearer your-api-key"
    "Content-Type" = "application/json"
}

$body = @{
    repository_url = "https://github.com/user/repo"
    configuration = @{
        tech_stack = @("Node.js", "React")
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-quantapilot.com/api/v1/projects" `
                  -Method POST `
                  -Headers $headers `
                  -Body $body
```

## 🆕 Testing and Quality Assurance APIs

### Testing Service API

#### Execute Comprehensive Tests

```http
POST /api/v1/testing/execute
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "project_id": "uuid-string",
  "stage_id": "uuid-string",
  "test_types": ["unit", "integration", "e2e", "security"],
  "frameworks": ["jest", "pytest"],
  "quality_gates": {
    "min_coverage": 85,
    "max_vulnerabilities": 0,
    "min_quality_score": 90
  }
}
```

**Response:**

```json
{
  "execution_id": "test-exec-uuid",
  "status": "running",
  "started_at": "2024-01-20T10:00:00Z",
  "estimated_completion": "2024-01-20T10:05:00Z",
  "tests_scheduled": {
    "unit": 150,
    "integration": 45,
    "e2e": 20,
    "security": 5
  }
}
```

#### Get Test Results

```http
GET /api/v1/testing/results/{executionId}
```

**Response:**

```json
{
  "execution_id": "test-exec-uuid",
  "status": "completed",
  "started_at": "2024-01-20T10:00:00Z",
  "completed_at": "2024-01-20T10:04:30Z",
  "duration_ms": 270000,
  "summary": {
    "total_tests": 220,
    "passed": 218,
    "failed": 2,
    "skipped": 0,
    "coverage_percentage": 87.5
  },
  "quality_gates": {
    "coverage_gate": "passed",
    "security_gate": "passed",
    "quality_gate": "passed",
    "overall_status": "passed"
  },
  "detailed_results": {
    "unit_tests": {
      "framework": "jest",
      "passed": 148,
      "failed": 2,
      "coverage": 89.2
    },
    "integration_tests": {
      "framework": "jest",
      "passed": 45,
      "failed": 0,
      "coverage": 82.1
    },
    "security_scan": {
      "tool": "snyk",
      "vulnerabilities": 0,
      "severity": "none"
    }
  }
}
```

#### Get Quality Gates Status

```http
GET /api/v1/testing/quality-gates/{projectId}
```

**Response:**

```json
{
  "project_id": "uuid-string",
  "current_stage": "stage-2-1",
  "quality_gates": [
    {
      "gate_type": "code_coverage",
      "criteria": { "min_percentage": 85 },
      "current_value": 87.5,
      "status": "passed",
      "evaluated_at": "2024-01-20T10:04:30Z"
    },
    {
      "gate_type": "security_scan",
      "criteria": { "max_critical": 0, "max_high": 2 },
      "current_value": { "critical": 0, "high": 0 },
      "status": "passed",
      "evaluated_at": "2024-01-20T10:04:30Z"
    }
  ]
}
```

### Test Configuration API

#### Update Test Configuration

```http
PUT /api/v1/testing/configuration/{projectId}
Content-Type: application/json

{
  "default_frameworks": {
    "javascript": "jest",
    "python": "pytest",
    "java": "junit"
  },
  "quality_thresholds": {
    "code_coverage": 85,
    "security_score": 90,
    "performance_score": 80
  },
  "timeout_settings": {
    "unit_test_timeout": 300,
    "integration_test_timeout": 600,
    "e2e_test_timeout": 1800
  }
}
```

## 🆕 Git Workflow Management APIs

### Git Operations API

#### Create Stage Branch

```http
POST /api/v1/git/branches
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "project_id": "uuid-string",
  "stage_id": "uuid-string",
  "stage_name": "cursor-integration",
  "stage_number": "2.1",
  "base_branch": "main"
}
```

**Response:**

```json
{
  "operation_id": "git-op-uuid",
  "branch_name": "feature/stage-2-1-cursor-integration",
  "created_at": "2024-01-20T10:00:00Z",
  "status": "created",
  "git_url": "https://github.com/user/repo/tree/feature/stage-2-1-cursor-integration"
}
```

#### Create Pull Request

```http
POST /api/v1/git/pull-requests
Content-Type: application/json

{
  "project_id": "uuid-string",
  "stage_id": "uuid-string",
  "branch_name": "feature/stage-2-1-cursor-integration",
  "target_branch": "main",
  "title": "Stage 2.1: Cursor Integration Complete",
  "description": "Automated PR for stage completion",
  "include_test_results": true,
  "include_quality_report": true
}
```

**Response:**

```json
{
  "operation_id": "git-op-uuid",
  "pr_number": 42,
  "pr_url": "https://github.com/user/repo/pull/42",
  "status": "created",
  "checks_required": ["ci/github-actions", "quality/sonarqube", "security/snyk"],
  "auto_merge": true,
  "created_at": "2024-01-20T10:05:00Z"
}
```

#### Get PR Status

```http
GET /api/v1/git/pull-requests/{prNumber}/status
```

**Response:**

```json
{
  "pr_number": 42,
  "status": "pending_checks",
  "checks": [
    {
      "name": "ci/github-actions",
      "status": "in_progress",
      "started_at": "2024-01-20T10:05:30Z",
      "details_url": "https://github.com/user/repo/actions/runs/123"
    },
    {
      "name": "quality/sonarqube",
      "status": "completed",
      "conclusion": "success",
      "completed_at": "2024-01-20T10:07:00Z"
    }
  ],
  "mergeable": false,
  "merge_when_ready": true
}
```

#### Merge Pull Request

```http
POST /api/v1/git/pull-requests/{prNumber}/merge
Content-Type: application/json

{
  "merge_method": "squash",
  "commit_title": "feat: complete stage 2.1 - cursor integration",
  "commit_message": "- Implement Cursor CLI wrapper\n- Add AI role management\n- Configure token limits",
  "delete_branch": true
}
```

### GitHub CI/CD Integration API

#### Monitor Workflow Status

```http
GET /api/v1/git/workflows/{projectId}/status
```

**Response:**

```json
{
  "project_id": "uuid-string",
  "current_workflow": {
    "workflow_id": "ci.yml",
    "run_id": 123456789,
    "status": "in_progress",
    "started_at": "2024-01-20T10:05:30Z",
    "jobs": [
      {
        "name": "test",
        "status": "completed",
        "conclusion": "success"
      },
      {
        "name": "build",
        "status": "in_progress",
        "conclusion": null
      }
    ]
  },
  "history": [
    {
      "run_id": 123456788,
      "status": "completed",
      "conclusion": "success",
      "completed_at": "2024-01-20T09:30:00Z"
    }
  ]
}
```

#### Trigger Manual Workflow

```http
POST /api/v1/git/workflows/trigger
Content-Type: application/json

{
  "project_id": "uuid-string",
  "workflow": "deploy.yml",
  "ref": "main",
  "inputs": {
    "environment": "staging",
    "version": "v1.2.3"
  }
}
```

### Git Configuration API

#### Update Git Settings

```http
PUT /api/v1/git/configuration
Content-Type: application/json

{
  "branch_protection": {
    "require_pr": true,
    "require_reviews": 1,
    "require_status_checks": true,
    "required_checks": ["ci", "quality-gate"]
  },
  "auto_merge": {
    "enabled": true,
    "require_all_checks": true,
    "merge_method": "squash"
  },
  "commit_settings": {
    "conventional_commits": true,
    "sign_commits": false,
    "author_name": "QuantaPilot Bot",
    "author_email": "bot@quantapilot.com"
  }
}
```

## API Versioning

### Version Strategy

- **Current Version**: v1
- **Versioning Scheme**: URL path versioning (`/api/v1/`)
- **Backward Compatibility**: Maintained for 1 year after version release
- **Deprecation Notice**: 6 months advance notice for breaking changes

### Version Migration

```http
# Check available versions
GET /api/versions

# Response
{
  "versions": ["v1", "v2"],
  "current": "v2",
  "supported": ["v1", "v2"],
  "deprecated": [],
  "sunset_dates": {
    "v1": "2025-01-01T00:00:00Z"
  }
}
```

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
GET /api/v1/openapi.json
GET /api/v1/docs (Swagger UI)
```

This provides machine-readable API documentation for automatic client generation and testing.
