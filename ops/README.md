# Operations Documentation

This directory contains operational documentation, security policies, and infrastructure configuration for QuantaPilot.

## Directory Structure

```
ops/
├── README.md                    # This file
├── cicd-policy.md              # CI/CD policies and procedures
├── rbac.sql                    # Role-based access control definitions
├── n8n-credentials-mapping.md  # n8n credentials to env vars mapping
├── ci-sops-setup.md           # SOPS setup for CI/CD environments
├── audit/                      # Audit policies and schemas
│   ├── README.md
│   ├── audit-policy.md
│   └── audit-schema.sql
├── security/                   # Security policies and procedures
│   ├── secrets-rotation.md     # Secrets rotation policy
└── docker/                     # Docker configuration files
    └── docker-compose.yml     # Database and services
└── db/                        # Database configuration
    ├── README.md              # Database setup and management
    ├── init/                  # Database initialization scripts
    └── migrations/            # Database migrations
```

## Security

### Secrets Management

- **SOPS/age**: All secrets are encrypted using SOPS with age encryption
- **Dual-secret Rotation**: Implements dual-secret rotation for zero-downtime updates
- **Environment Isolation**: Separate secrets for dev/staging/prod environments

### Access Control

- **RBAC**: Role-based access control defined in `rbac.sql`
- **n8n Credentials**: Mapped to environment variables with owner-based access
- **Audit Trail**: Comprehensive audit logging and monitoring

### Key Files

- `.sops.yaml`: SOPS encryption rules and public keys
- `.env.example`: Template for environment variables
- `.envrc`: direnv configuration for automatic decryption
- `scripts/setup-env.sh`: Automated environment setup script

## CI/CD

### GitHub Actions

- **SOPS Integration**: Automatic decryption of secrets in CI
- **Security Scanning**: Automated security checks
- **Branch Protection**: Protected main branch with required reviews

### Deployment

- **Docker**: Containerized deployment with security best practices
- **Environment Variables**: Encrypted configuration management
- **Health Checks**: Automated health monitoring

### Database

- **PostgreSQL 15**: Primary database with health checks
- **Migrations**: Managed with `dbmate` for version control
- **Seeds**: Initial data and RLS policies
- **Backup**: Automated backup and retention policies

## Getting Started

### Local Development

1. **Setup Environment**:

   ```bash
   ./scripts/setup-env.sh
   ```

2. **Enable direnv**:

   ```bash
   direnv allow
   ```

3. **Verify Setup**:
   ```bash
   sops -d .env.sops
   ```

### CI/CD Setup

1. **Generate CI Key**:

   ```bash
   age-keygen -o ci-key.txt
   ```

2. **Add to GitHub Secrets**:
   - Go to repository settings
   - Add `SOPS_AGE_KEY` secret with private key content

3. **Update .sops.yaml**:
   - Add CI public key to encryption rules

4. **Test CI Pipeline**:
   - Push changes to trigger CI
   - Verify secrets are decrypted correctly

5. **Setup Database**:
   ```bash
   pnpm run db:setup
   ```

## Security Checklist

- [ ] SOPS/age keys generated and configured
- [ ] Environment files encrypted with `.env.sops`
- [ ] CI/CD secrets properly configured
- [ ] RBAC policies implemented
- [ ] Audit logging enabled
- [ ] Secrets rotation schedule established
- [ ] Security scanning enabled
- [ ] Branch protection configured

## Maintenance

### Regular Tasks

- **Secrets Rotation**: Follow the schedule in `security/secrets-rotation.md`
- **Key Rotation**: Rotate age keys every 180 days
- **Audit Review**: Review audit logs monthly
- **Security Updates**: Keep dependencies updated

### Emergency Procedures

- **Secret Compromise**: Follow emergency rotation procedures
- **Key Loss**: Use backup keys and regenerate as needed
- **CI Failure**: Check SOPS configuration and key availability

## Support

For questions or issues with operations:

1. Check the relevant documentation files
2. Review audit logs for troubleshooting
3. Consult security policies for guidance
4. Contact the operations team for assistance
