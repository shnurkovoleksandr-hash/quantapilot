# Operational Runbook

## System Overview

This runbook provides comprehensive operational procedures for QuantaPilot™, covering deployment,
monitoring, troubleshooting, and maintenance tasks.

**System Status**: Core Infrastructure Complete (Stages 1.1-1.2) ✅  
**Services**: 5 core microservices + 4 infrastructure services  
**Deployment**: Docker Compose based, single-machine ready  
**Monitoring**: Prometheus + Grafana with custom dashboards

### Quick Reference - All Services

| Component                | Port | Status Endpoint                    | Log Location                   | Restart Command                               |
| ------------------------ | ---- | ---------------------------------- | ------------------------------ | --------------------------------------------- |
| **API Gateway**          | 3000 | `http://localhost:3000/health`     | `./logs/api-gateway/`          | `docker-compose restart api-gateway`          |
| **Cursor Service**       | 3001 | `http://localhost:3001/health`     | `./logs/cursor-service/`       | `docker-compose restart cursor-service`       |
| **GitHub Service**       | 3002 | `http://localhost:3002/health`     | `./logs/github-service/`       | `docker-compose restart github-service`       |
| **Notification Service** | 3003 | `http://localhost:3003/health`     | `./logs/notification-service/` | `docker-compose restart notification-service` |
| **Web Dashboard**        | 3004 | `http://localhost:3004/health`     | `./logs/dashboard/`            | `docker-compose restart dashboard`            |
| **n8n Workflows**        | 5678 | `http://localhost:5678/healthz`    | Docker logs                    | `docker-compose restart n8n`                  |
| **PostgreSQL**           | 5432 | `pg_isready -h localhost`          | Docker logs                    | `docker-compose restart postgres`             |
| **Redis**                | 6379 | `redis-cli ping`                   | Docker logs                    | `docker-compose restart redis`                |
| **Prometheus**           | 9090 | `http://localhost:9090/-/healthy`  | Docker logs                    | `docker-compose restart prometheus`           |
| **Grafana**              | 3005 | `http://localhost:3005/api/health` | Docker logs                    | `docker-compose restart grafana`              |

### Emergency Contacts

| Role                 | Primary                  | Secondary                    | Escalation          |
| -------------------- | ------------------------ | ---------------------------- | ------------------- |
| **System Admin**     | admin@quantapilot.com    | backup-admin@quantapilot.com | CTO                 |
| **On-Call Engineer** | oncall@quantapilot.com   | +1-555-0123                  | Engineering Manager |
| **Security Team**    | security@quantapilot.com | +1-555-0124                  | CISO                |

## Deployment Procedures

### Initial Deployment

#### Prerequisites Checklist

- [ ] Docker 20.10+ installed
- [ ] Docker Compose v2 installed
- [ ] Minimum 8GB RAM available
- [ ] 100GB+ disk space available
- [ ] All required environment variables set
- [ ] Network connectivity to external APIs verified

#### Deployment Steps (Updated for Stages 1.1-1.2)

```bash
# 1. Clone repository and switch to infrastructure branch
git clone https://github.com/your-org/quantapilot.git
cd quantapilot
git checkout stage-1-2-core-infrastructure

# 2. Run automated setup
./scripts/setup.sh
# This will:
# - Create necessary directories
# - Copy .env.example to .env
# - Optionally generate secure secrets
# - Build and start all services

# 3. Manual configuration (if needed)
cp .env.example .env
# Edit .env with your API keys:
# - CURSOR_API_KEY
# - GITHUB_TOKEN
# - TELEGRAM_BOT_TOKEN (optional)
# - SMTP configuration (optional)

# 4. Generate secure secrets for production
./scripts/generate-secrets.sh

# 5. Validate security configuration
./scripts/validate-security.sh

# 4. Initialize database
docker-compose run --rm postgres-init

# 5. Start services
docker-compose up -d

# 6. Verify deployment
./scripts/health-check.sh
```

#### Post-Deployment Verification

```bash
# Check all services are running
docker-compose ps

# Verify service health
curl -f http://localhost:3000/health
curl -f http://localhost:5678/healthz

# Check database connectivity
docker-compose exec postgres psql -U quantapilot -c "SELECT 1"

# Verify n8n workflows
./scripts/verify-workflows.sh

# Run integration tests
npm run test:integration
```

### Update Procedures

#### Pre-Update Checklist

- [ ] Create full system backup
- [ ] Verify sufficient disk space for new images
- [ ] Check for breaking changes in release notes
- [ ] Schedule maintenance window
- [ ] Notify users of maintenance

#### Rolling Update Process

```bash
# 1. Backup current state
./scripts/backup-system.sh

# 2. Pull latest images
docker-compose pull

# 3. Update database schema (if needed)
docker-compose run --rm db-migrate

# 4. Rolling restart services
docker-compose up -d --no-deps api-gateway
./scripts/wait-for-health.sh api-gateway
docker-compose up -d --no-deps cursor-service
./scripts/wait-for-health.sh cursor-service
docker-compose up -d --no-deps n8n

# 5. Verify update
./scripts/health-check.sh
./scripts/smoke-test.sh
```

#### Rollback Procedure

```bash
# 1. Stop all services
docker-compose down

# 2. Restore previous images
docker-compose -f docker-compose.backup.yml up -d

# 3. Restore database (if needed)
./scripts/restore-database.sh <backup-timestamp>

# 4. Verify rollback
./scripts/health-check.sh
```

## Monitoring & Alerting

### Health Check Procedures

#### Manual Health Checks

```bash
#!/bin/bash
# health-check.sh

echo "Checking system health..."

# API Gateway
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo "✓ API Gateway: Healthy"
else
    echo "✗ API Gateway: Failed"
fi

# n8n
if curl -f -s http://localhost:5678/healthz > /dev/null; then
    echo "✓ n8n: Healthy"
else
    echo "✗ n8n: Failed"
fi

# Database
if docker-compose exec -T postgres pg_isready > /dev/null; then
    echo "✓ PostgreSQL: Healthy"
else
    echo "✗ PostgreSQL: Failed"
fi

# Redis
if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
    echo "✓ Redis: Healthy"
else
    echo "✗ Redis: Failed"
fi
```

#### Automated Monitoring Setup

```yaml
# monitoring/docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - '9093:9093'
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
```

### Key Metrics to Monitor

#### System Metrics

- **CPU Usage**: > 80% for 5 minutes
- **Memory Usage**: > 85% for 5 minutes
- **Disk Usage**: > 90%
- **Network I/O**: Unusual spikes or drops
- **Container Health**: Any container restarts

#### Application Metrics

- **API Response Time**: > 5 seconds (95th percentile)
- **Error Rate**: > 5% over 5 minutes
- **Active Projects**: Current count and trends
- **AI Token Usage**: Daily consumption and costs
- **Workflow Success Rate**: < 90% over 1 hour

#### Business Metrics

- **Project Completion Rate**: < 85% over 24 hours
- **User Satisfaction**: < 80% (from feedback)
- **HITL Response Time**: > 4 hours average
- **System Availability**: < 99.5% over 24 hours

## Troubleshooting Guide

### Common Issues

#### Issue: API Gateway Not Responding

**Symptoms:**

- Health check fails for API Gateway
- Users cannot access dashboard
- 502/503 errors in browser

**Diagnosis:**

```bash
# Check container status
docker-compose ps api-gateway

# Check logs
docker-compose logs --tail=100 api-gateway

# Check resource usage
docker stats api-gateway
```

**Resolution:**

```bash
# Restart service
docker-compose restart api-gateway

# If restart fails, rebuild
docker-compose up -d --force-recreate api-gateway

# Check for configuration issues
./scripts/validate-config.sh
```

#### Issue: Database Connection Problems

**Symptoms:**

- Application errors mentioning database
- Slow response times
- Connection timeout errors

**Diagnosis:**

```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# Check active connections
docker-compose exec postgres psql -U quantapilot -c "
  SELECT count(*) as active_connections
  FROM pg_stat_activity
  WHERE state = 'active';"

# Check for long-running queries
docker-compose exec postgres psql -U quantapilot -c "
  SELECT query, state, query_start
  FROM pg_stat_activity
  WHERE state = 'active'
  ORDER BY query_start;"
```

**Resolution:**

```bash
# Restart PostgreSQL
docker-compose restart postgres

# If issues persist, check disk space
df -h

# Analyze slow queries
docker-compose exec postgres psql -U quantapilot -c "
  SELECT query, mean_time, calls
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;"
```

#### Issue: AI Agent Failures

**Symptoms:**

- High AI token usage without results
- Workflow timeouts
- Cursor API errors in logs

**Diagnosis:**

```bash
# Check Cursor service logs
docker-compose logs --tail=100 cursor-service

# Check token usage
curl http://localhost:3001/metrics/tokens

# Verify Cursor API connectivity
curl -H "Authorization: Bearer $CURSOR_API_KEY" \
     https://api.cursor.sh/v1/models
```

**Resolution:**

```bash
# Restart Cursor service
docker-compose restart cursor-service

# Check API key validity
./scripts/verify-api-keys.sh

# Review and optimize prompts
./scripts/analyze-token-usage.sh
```

#### Issue: n8n Workflow Failures

**Symptoms:**

- Workflows stuck in "Running" state
- Execution errors in n8n dashboard
- Projects not progressing

**Diagnosis:**

```bash
# Check n8n logs
docker-compose logs --tail=100 n8n

# Access n8n dashboard
open http://localhost:5678

# Check workflow execution history
# (Done through n8n web interface)
```

**Resolution:**

```bash
# Restart n8n
docker-compose restart n8n

# Reimport workflows if corrupted
./scripts/restore-workflows.sh

# Clear stuck executions
./scripts/clear-stuck-executions.sh
```

### Performance Issues

#### High Memory Usage

**Investigation:**

```bash
# Check container memory usage
docker stats --no-stream

# Check system memory
free -h

# Identify memory-heavy processes
docker-compose exec api-gateway ps aux --sort=-%mem | head -10
```

**Mitigation:**

```bash
# Restart memory-heavy services
docker-compose restart <service-name>

# Implement memory limits
# Edit docker-compose.yml to add memory limits
docker-compose up -d
```

#### High CPU Usage

**Investigation:**

```bash
# Check CPU usage by container
docker stats --no-stream

# Check system load
uptime

# Identify CPU-heavy processes
top -p $(docker inspect --format='{{.State.Pid}}' quantapilot_api_1)
```

**Mitigation:**

```bash
# Scale horizontally if possible
docker-compose up -d --scale api-gateway=2

# Optimize resource-heavy operations
./scripts/optimize-operations.sh
```

### Security Incidents

#### Suspected Security Breach

**Immediate Actions:**

1. **Isolate System**: Disconnect from internet if possible
2. **Preserve Evidence**: Take system snapshots
3. **Contact Security Team**: Notify security@quantapilot.com
4. **Document Timeline**: Record all observed events

**Investigation Commands:**

```bash
# Check for unusual activity
./scripts/security-audit.sh

# Review access logs
docker-compose logs nginx | grep -E "(40[0-9]|50[0-9])"

# Check for unauthorized access
docker-compose exec postgres psql -U quantapilot -c "
  SELECT * FROM user_sessions
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC;"
```

#### API Key Compromise

**Immediate Actions:**

```bash
# Rotate compromised keys
./scripts/rotate-api-keys.sh

# Revoke access tokens
./scripts/revoke-tokens.sh

# Update all services with new keys
docker-compose restart
```

## Maintenance Procedures

### Daily Maintenance

#### Automated Daily Tasks

```bash
#!/bin/bash
# daily-maintenance.sh

# Clean up old logs
find /var/log -name "*.log" -mtime +7 -delete

# Database maintenance
docker-compose exec postgres psql -U quantapilot -c "VACUUM ANALYZE;"

# Clear temporary files
docker system prune -f

# Update metrics
./scripts/collect-daily-metrics.sh

# Backup critical data
./scripts/backup-critical-data.sh
```

### Weekly Maintenance

#### Automated Weekly Tasks

```bash
#!/bin/bash
# weekly-maintenance.sh

# Full system backup
./scripts/full-backup.sh

# Security updates
./scripts/check-security-updates.sh

# Performance analysis
./scripts/performance-report.sh

# Capacity planning
./scripts/capacity-report.sh

# Update documentation
./scripts/update-runbook.sh
```

### Monthly Maintenance

#### Security Review

- [ ] Review access logs for anomalies
- [ ] Update all system passwords
- [ ] Scan for security vulnerabilities
- [ ] Review and update security policies
- [ ] Test incident response procedures

#### Performance Review

- [ ] Analyze performance trends
- [ ] Review resource utilization
- [ ] Optimize slow queries
- [ ] Update capacity planning
- [ ] Test auto-scaling procedures

#### Business Review

- [ ] Analyze user satisfaction metrics
- [ ] Review project success rates
- [ ] Update cost analysis
- [ ] Plan feature roadmap
- [ ] Review and update SLAs

## Backup & Recovery

### Backup Procedures

#### Daily Backup Script

```bash
#!/bin/bash
# backup-daily.sh

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec postgres pg_dump -U quantapilot quantapilot > \
    $BACKUP_DIR/database.sql

# Configuration backup
cp -r ./config $BACKUP_DIR/
cp .env $BACKUP_DIR/

# n8n workflows backup
docker-compose exec n8n n8n export:workflow --all --output=$BACKUP_DIR/workflows.json

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# Upload to remote storage (optional)
./scripts/upload-backup.sh $BACKUP_DIR.tar.gz
```

### Recovery Procedures

#### Database Recovery

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

# Stop application services
docker-compose stop api-gateway cursor-service n8n

# Restore database
docker-compose exec postgres dropdb -U quantapilot quantapilot
docker-compose exec postgres createdb -U quantapilot quantapilot
docker-compose exec -T postgres psql -U quantapilot quantapilot < $BACKUP_FILE

# Restart services
docker-compose up -d
```

#### Full System Recovery

```bash
#!/bin/bash
# restore-system.sh

BACKUP_FILE=$1

# Extract backup
tar -xzf $BACKUP_FILE

# Stop all services
docker-compose down

# Restore configuration
cp -r backup/config ./
cp backup/.env ./

# Restore database
./scripts/restore-database.sh backup/database.sql

# Restore workflows
docker-compose up -d n8n
sleep 30
docker-compose exec n8n n8n import:workflow --input=backup/workflows.json

# Start all services
docker-compose up -d

# Verify recovery
./scripts/health-check.sh
```

## Contact Information

### Support Escalation

| Level         | Contact                     | Response Time | Scope                             |
| ------------- | --------------------------- | ------------- | --------------------------------- |
| **L1**        | support@quantapilot.com     | 4 hours       | General issues, user questions    |
| **L2**        | engineering@quantapilot.com | 2 hours       | Technical issues, system problems |
| **L3**        | oncall@quantapilot.com      | 1 hour        | Critical system failures          |
| **Emergency** | +1-555-0123                 | 30 minutes    | Security incidents, data loss     |

### Vendor Contacts

| Service    | Contact            | Support Level | SLA          |
| ---------- | ------------------ | ------------- | ------------ |
| **Cursor** | support@cursor.sh  | Standard      | 24h response |
| **GitHub** | support@github.com | Standard      | 24h response |
| **Docker** | support@docker.com | Community     | Best effort  |

### Internal Team

| Role              | Name   | Email                    | Phone       | Timezone |
| ----------------- | ------ | ------------------------ | ----------- | -------- |
| **CTO**           | [Name] | cto@quantapilot.com      | +1-555-0100 | UTC-8    |
| **Lead Engineer** | [Name] | lead@quantapilot.com     | +1-555-0101 | UTC-8    |
| **DevOps Lead**   | [Name] | devops@quantapilot.com   | +1-555-0102 | UTC-5    |
| **Security Lead** | [Name] | security@quantapilot.com | +1-555-0103 | UTC-8    |
