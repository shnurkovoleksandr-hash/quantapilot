# QuantaPilot Audit System

This directory contains the audit and compliance components for QuantaPilot.

## Files

- **audit-policy.md** - Audit policy and procedures
- **audit-schema.sql** - Database schema for audit logging
- **README.md** - This file

## Overview

The audit system provides comprehensive logging and monitoring capabilities for:

- **Authentication events** - Login attempts, password changes, account locks
- **Authorization events** - Role assignments, permission changes
- **Data events** - CRUD operations, PII access, data exports
- **System events** - Configuration changes, deployments, errors

## Key Features

### Audit Policy

- Defines what events are logged
- Specifies retention periods
- Outlines compliance requirements (GDPR, SOX, SOC 2)
- Establishes monitoring and alerting procedures

### Database Schema

- `audit_events` - Main audit log table
- `audit_trails` - Change tracking for specific resources
- `audit_event_types` - Event type definitions
- `audit_queries` - Predefined compliance queries

### Functions

- `log_audit_event()` - Manual audit logging
- `audit_trigger_function()` - Automatic audit trails

## Usage

### Manual Logging

```sql
SELECT log_audit_event(
    'user.login',
    user_id,
    session_id,
    ip_address,
    user_agent,
    true,
    'user',
    user_id::varchar,
    'login'
);
```

### Automatic Audit Trails

```sql
-- Enable audit triggers on tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### Compliance Queries

```sql
-- Failed logins in last 24 hours
SELECT * FROM audit_queries WHERE name = 'failed_logins';

-- PII access in last 30 days
SELECT * FROM audit_queries WHERE name = 'pii_access';
```

## Compliance

The audit system supports:

- **GDPR** - PII tracking, consent logging, right to be forgotten
- **SOX** - Financial data changes, critical system access
- **SOC 2** - Access control, configuration changes, incident response

## Retention

- **Standard logs**: 90 days
- **Security logs**: 1 year
- **Compliance logs**: 7 years
- **Development logs**: 30 days
