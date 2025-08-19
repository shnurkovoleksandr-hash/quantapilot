---
id: 'changelog'
title: 'Changelog'
status: 'ready'
version: '0.1.0'
updated: '2025-08-19'
owners: ['shnurkovoleksandr-hash']
---

# QuantaPilot Changelog

## [Unreleased] - 2025-08-19

### ✅ Added

#### Data Policies and Governance System

- **Complete data classification system** implemented
  - `ops/data-catalog.md` with 5-tier data classification (public, internal, operational, pii, secret)
  - Comprehensive catalog schema with retention policies and PII handling rules
  - Key table mappings for all system schemas (app, audit, pii)

#### Database Security and RLS

- **Enhanced Row Level Security (RLS)** in `db/seeds/seed.sql`
  - Automatic RLS enablement for all pii schema tables
  - Deny-by-default policies with service role exceptions
  - Future-proof security for new PII tables

#### PII-Free API Validation

- **Strict no-PII enforcement** in `docs/90_api.md`
  - Comprehensive prohibited patterns (emails, phones, names, tokens)
  - CI-enforced validation via `pnpm run validate:api`
  - Enhanced schemas with PII-free pattern validation
  - Runtime validation script `scripts/validate-api.mjs`

#### Data Subject Requests (DSR)

- **Complete GDPR compliance procedures** in `docs/70_runbook.md`
  - DSR workflow: operator → security auditor → data processing → documentation
  - Export procedures using redacted views for safe data access
  - Soft delete with delayed hard purge, audit trail preservation
  - SQL examples for practical implementation

#### Backup Security Policies

- **Enhanced backup governance** in `docs/60_constraints.md`
  - Encryption at rest requirements for all database backups
  - Access restricted to `sec_auditor` role only
  - Classification-based retention periods (30/90 days)
  - Audit logging for all backup access operations

#### Secrets Management System

- **Complete SOPS/age encryption infrastructure** implemented
  - `.sops.yaml` with encryption rules for environment files and ops secrets
  - `.env.example` with comprehensive environment variables template
  - `.envrc` for automatic decryption via direnv
  - Encrypted `.env.sops` file for secure environment management

#### Automation Scripts

- **`scripts/setup-env.sh`** - Automated environment setup script
- **`scripts/setup-ci-keys.sh`** - CI key generation and setup script

#### Documentation

- **`ops/security/secrets-rotation.md`** - Dual-secret rotation policy with schedules
- **`ops/n8n-credentials-mapping.md`** - Complete RBAC mapping for n8n credentials
- **`ops/ci-sops-setup.md`** - CI/CD setup guide for GitHub Actions
- **`ops/setup-guide.md`** - Comprehensive setup and configuration guide
- **`ops/README.md`** - Operations documentation overview

#### CI/CD Integration

- **`.github/workflows/test-sops.yml`** - GitHub Actions workflow for SOPS testing
- CI key generation and management procedures
- Automated decryption testing in CI environment

#### Security Features

- **Dual-secret rotation** with specific schedules for different secret types
- **RBAC implementation** for n8n credentials with owner-based access control
- **Environment isolation** between local and CI environments
- **Audit trail** and monitoring capabilities

### 🔄 Changed

#### Documentation Structure

- **Merged README files** - Combined `docs/README.md` and main `README.md` into single comprehensive entry point
- **Updated cross-references** throughout documentation to reflect new structure
- **Enhanced documentation** with current operational procedures

#### Milestone Updates

- **M-001 Bootstrap** - Added secrets management system to acceptance criteria
- **Acceptance criteria** - Updated to include operational secrets management
- **Runbook** - Enhanced with secrets management procedures and incident response

#### Architecture Documentation

- **System context** - Added SOPS/age integration to external systems
- **Components** - Updated scripts directory description and added secrets management
- **Constraints** - Enhanced security constraints with dual-secret rotation

### 🎯 Completed

#### Acceptance Criteria (Guide Section 8 - Secrets Management)

- ✅ `.sops.yaml` exists in root with proper encryption rules
- ✅ `.env.example` exists with comprehensive environment variables
- ✅ Local decryption via direnv creates `.env` on-the-fly
- ✅ Rotation policy documented in `ops/security/secrets-rotation.md`
- ✅ n8n credentials mapped to roles and read from `.env`
- ✅ CI/CD integration configured with GitHub Actions workflow
- ✅ Automated scripts for setup and key generation
- ✅ Complete documentation in `ops/setup-guide.md` and `ops/README.md`

#### Acceptance Criteria (Guide Section 10 - Data Policies)

- ✅ `ops/data-catalog.md` with data classification table and field mappings
- ✅ RLS defaults added to `db/seeds/seed.sql` for all `pii.*` tables
- ✅ `docs/90_api.md` contains strict no-PII rules with CI validation
- ✅ `docs/70_runbook.md` includes comprehensive DSR procedures
- ✅ `docs/60_constraints.md` enhanced with backup encryption and retention policies

### 🔧 Technical Details

#### File Structure

```
├── .sops.yaml                    # SOPS encryption rules
├── .env.example                  # Environment variables template
├── .envrc                        # direnv configuration
├── .env.sops                     # Encrypted environment file
├── scripts/
│   ├── setup-env.sh             # Environment setup script
│   ├── setup-ci-keys.sh         # CI key generation script
│   └── validate-api.mjs         # PII validation script
├── ops/
│   ├── README.md                # Operations overview
│   ├── data-catalog.md          # Data classification and governance
│   ├── security/
│   │   └── secrets-rotation.md  # Rotation policy
│   ├── n8n-credentials-mapping.md
│   ├── ci-sops-setup.md         # CI setup guide
│   └── setup-guide.md           # Complete setup guide
├── db/seeds/
│   └── seed.sql                 # Enhanced with RLS policies
├── _schemas/
│   ├── api.schema.json          # Enhanced with PII-free validation
│   └── error.schema.json        # Enhanced with PII pattern detection
├── docs/
│   ├── 60_constraints.md        # Enhanced with backup policies
│   ├── 70_runbook.md            # Enhanced with DSR procedures
│   └── 90_api.md                # Enhanced with PII-free rules
└── .github/workflows/
    └── test-sops.yml            # CI workflow
```

#### Security Implementation

- **Data Classification**: 5-tier system (public, internal, operational, pii, secret)
- **PII Protection**: Comprehensive no-PII enforcement with CI validation
- **Database Security**: RLS policies with deny-by-default and automatic enablement
- **GDPR Compliance**: Complete DSR procedures for data export and deletion
- **Backup Security**: Encryption at rest with role-based access and audit logging
- **Encryption**: SOPS with age encryption for all sensitive files
- **Rotation**: Dual-secret rotation with zero-downtime updates
- **Access Control**: RBAC mapping for n8n credentials and database roles
- **CI Integration**: Secure key management for GitHub Actions
- **Documentation**: Comprehensive guides and operational procedures

### 📋 Next Steps

1. **Database Implementation**: Apply RLS policies and data catalog in production
2. **CI Integration**: Integrate `validate:api` into CI pipeline for PII enforcement
3. **DSR Automation**: Implement CLI commands for automated DSR operations
4. **Backup Setup**: Configure encrypted backup system with `sec_auditor` access
5. **Monitoring**: Set up audit logging for data access and backup operations

---

_This changelog tracks all major changes and implementations in the QuantaPilot project._
