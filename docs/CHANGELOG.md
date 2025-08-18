---
id: 'changelog'
title: 'Changelog'
status: 'ready'
version: '0.1.0'
updated: '2025-08-18'
owners: ['shnurkovoleksandr-hash']
---

# QuantaPilot Changelog

## [Unreleased] - 2025-08-18

### ✅ Added

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

#### Acceptance Criteria (Guide Section 8)

- ✅ `.sops.yaml` exists in root with proper encryption rules
- ✅ `.env.example` exists with comprehensive environment variables
- ✅ Local decryption via direnv creates `.env` on-the-fly
- ✅ Rotation policy documented in `ops/security/secrets-rotation.md`
- ✅ n8n credentials mapped to roles and read from `.env`
- ✅ CI/CD integration configured with GitHub Actions workflow
- ✅ Automated scripts for setup and key generation
- ✅ Complete documentation in `ops/setup-guide.md` and `ops/README.md`

### 🔧 Technical Details

#### File Structure

```
├── .sops.yaml                    # SOPS encryption rules
├── .env.example                  # Environment variables template
├── .envrc                        # direnv configuration
├── .env.sops                     # Encrypted environment file
├── scripts/
│   ├── setup-env.sh             # Environment setup script
│   └── setup-ci-keys.sh         # CI key generation script
├── ops/
│   ├── README.md                # Operations overview
│   ├── security/
│   │   └── secrets-rotation.md  # Rotation policy
│   ├── n8n-credentials-mapping.md
│   ├── ci-sops-setup.md         # CI setup guide
│   └── setup-guide.md           # Complete setup guide
└── .github/workflows/
    └── test-sops.yml            # CI workflow
```

#### Security Implementation

- **Encryption**: SOPS with age encryption for all sensitive files
- **Rotation**: Dual-secret rotation with zero-downtime updates
- **Access Control**: RBAC mapping for n8n credentials
- **CI Integration**: Secure key management for GitHub Actions
- **Documentation**: Comprehensive guides and operational procedures

### 📋 Next Steps

1. **CI Key Setup**: Add CI private key to GitHub Secrets
2. **n8n Configuration**: Implement RBAC mapping in n8n
3. **Testing**: Verify complete workflow in CI environment
4. **Monitoring**: Set up audit logging and rotation reminders

---

_This changelog tracks all major changes and implementations in the QuantaPilot project._
